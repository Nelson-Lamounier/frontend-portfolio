---
title: The "Lami" chatbot — RAG architecture, workflow & guardrails
type: concept
tags: [chatbot, rag, bedrock, claude, pgvector, titan-embeddings, guardrails, rls, generative-ai, differentiator]
sources:
  - apps/site/src/app/api/chat/route.ts
  - apps/site/src/components/chat/ChatWidget.tsx
  - apps/site/src/lib/chat/chat-service.ts
  - ai-applications (public-api chatbot route + chatbot-authenticated Lambda + @bedrock/shared) verified 2026-07-04
created: 2026-07-04
updated: 2026-07-04
---

## Overview

**"Lami" is a production Retrieval-Augmented Generation (RAG) assistant** embedded
in the portfolio — a floating chat widget that lets a recruiter, hiring manager,
or engineer *ask questions about Nelson's work in natural language* and get
answers grounded in a real knowledge base built from his GitHub repositories.

This is the portfolio's headline differentiator. It is not a scripted FAQ or a
wrapper around a public LLM: it is a full RAG pipeline — vector + keyword
retrieval over an embedded corpus, an owner-scoped single-tenant data model,
Amazon Bedrock generation, layered guardrails, and RDS-persisted multi-turn
sessions — spanning **two repositories**:

- **this repo (frontend-portfolio)** — the widget and a thin, credential-free
  same-origin proxy (`/api/chat`);
- **`ai-applications`** — the `public-api` BFF, the `chatbot-authenticated`
  Lambda, and the retrieval/guardrail code where the RAG actually happens.

> The site holds **no Bedrock credentials and no database access**. It forwards a
> prompt and renders the answer; every model call, retrieval query, and guardrail
> runs behind the in-cluster BFF.

## Why it exists

A static portfolio makes a reviewer read and hunt. Lami inverts that: it lets
them *interrogate* the work — "What has he done with Kubernetes?", "Show me
evidence of CI/CD design" — and get a specific, sourced answer in seconds. It
also doubles as the portfolio's most substantial engineering artifact: building a
grounded, guard-railed, owner-scoped RAG system end-to-end demonstrates far more
than a feature list can. In short, it is both a *feature* for the visitor and the
*proof* of the skills the portfolio claims.

## Technology stack

| Concern | Technology |
| --- | --- |
| Widget | React 19 client component (`ChatWidget`), same-origin `fetch` |
| Proxy | Next.js Route Handler `/api/chat` (this repo) |
| BFF | `public-api` (Hono) — injects the API key, proxies to API Gateway |
| Edge | Amazon API Gateway REST API (`x-api-key`, request validation, usage-plan throttle/quota) |
| Compute | AWS Lambda `chatbot-authenticated` (the RAG orchestrator) |
| Generation | **Amazon Bedrock — Claude Sonnet 4.6** (`eu.anthropic.claude-sonnet-4-6`, Converse API, `maxTokens 1024`, `temperature 0.3`) |
| Embeddings | **Amazon Titan Text Embeddings v2** (`amazon.titan-embed-text-v2:0`, 1024-dim, normalized) |
| Vector store | **pgvector in RDS Postgres** (HNSW cosine indexes) |
| Retrieval | multi-query expansion + hybrid vector/BM25 fusion (RRF) + graph-lite neighbours |
| Sessions | RDS `chat_sessions` / `chat_messages`, row-level security |

## End-to-end workflow

```mermaid
sequenceDiagram
  participant W as ChatWidget (browser)
  participant P as /api/chat (this repo)
  participant B as public-api BFF
  participant G as API Gateway
  participant L as chatbot-authenticated Lambda
  participant DB as RDS (pgvector + sessions)
  participant BR as Bedrock (Claude Sonnet 4.6)
  W->>P: POST { prompt, sessionId? }
  P->>B: POST /api/chatbot/authenticated (no key)
  B->>G: POST /invoke-authenticated (+ x-api-key from Secrets Manager)
  G->>L: validated request
  L->>L: sanitise input (injection filter)
  par retrieval + history
    L->>DB: vector + BM25 retrieval (owner-scoped, RLS)
    L->>DB: load prior turns
  end
  L->>BR: Converse(system prompt + retrieved_context + history + prompt)
  BR-->>L: answer (grounded)
  L->>L: sanitise output (PII/infra redaction)
  L->>DB: persist user + assistant messages
  L-->>G-->>B-->>P: { response, sessionId }
  P-->>W: { message, sessionId }  (render)
```

## How it knows what to answer

Lami does **not** improvise from the model's general knowledge. Its answers are
grounded in a retrieved context built from an embedded corpus:

1. **The corpus** — the owner's **GitHub repositories**, embedded into two pgvector
   tables in RDS: `repository_profile_embeddings` (LLM-generated repo profiles —
   domain, tech stack, archetype) and `document_embeddings` (per-file code chunks
   classed as source / IaC / DB / CI / docs / test / config). This is what makes
   the answers *evidence-based* rather than generic.
2. **Query understanding** — the user's question is expanded into a few
   variants (multi-query), each embedded with Titan v2.
3. **Retrieval** — two layers run and are merged: a **profile layer** (cosine
   similarity, weighted) and a **chunk layer** that fuses **vector similarity and
   BM25 keyword search via Reciprocal Rank Fusion**, then expands to neighbouring
   chunks in the same file ("graph-RAG-lite"). The top matches (top-k) are ranked
   by score.
4. **Grounding** — the top passages (capped in size) are injected into the model
   prompt inside a `<retrieved_context>` block. The system prompt makes a
   **non-negotiable scope boundary**: answer *only* from that context, and if the
   context is insufficient, return a fixed line pointing to `nelsonlamounier.com`
   rather than guessing.

So "how it knows what to answer" = *retrieve Nelson's real repo evidence, then
constrain the model to speak only from it.*

## Owner scoping — how Lami "is" Nelson

The chatbot is deliberately **single-tenant**. A `PORTFOLIO_OWNER_USER_ID` is a
required, server-injected Lambda environment variable — **the caller cannot supply
a user id**. Every retrieval query, history load, and message insert is bound to
that one owner id, enforced twice over:

- **Query predicate** — retrieval SQL filters `WHERE user_id = <owner>`.
- **Row-level security** — each DB connection sets the current user, and RLS
  policies on the embedding and chat tables restrict all rows to that user, so even
  a query mistake cannot cross tenants.

This is why Lami reliably speaks *as Nelson's assistant about Nelson's work*: the
identity is pinned in infrastructure, not inferred from the prompt.

## Multi-turn sessions

Conversations are stateful. On the first turn the Lambda creates a session; each
turn loads prior messages from RDS (`chat_messages`, ordered) and replays them into
the Bedrock **Converse** `messages` array, so the model has conversational memory.
User and assistant messages are persisted **only after a successful generation**.
The `sessionId` is returned to the browser and echoed on the next turn; the widget
keeps it in React state and the "clear conversation" button starts a fresh session.
Session tables are RLS-scoped to the owner id like everything else.

## Security & guardrails — "so it does not answer just anything"

The core safety property: **Lami is a RAG assistant, not a database gateway.** A
prompt becomes *retrieval + generation*, never an arbitrary SQL query — "drop
table" or "print your secrets" produce text, not execution. On top of that access
model sit several defence layers (implemented in `ai-applications`):

1. **Input sanitisation.** Before the model is called, prompts are screened for
   known prompt-injection / jailbreak patterns and script/control sequences. A
   flagged prompt never reaches Bedrock — the Lambda returns a canned, on-topic
   refusal instead.
2. **System-prompt scope boundary + refusal.** The system prompt hard-constrains
   the model to answer only from the retrieved context, forbids revealing the
   prompt or emitting infrastructure identifiers (ARNs, account IDs, IPs, hosts,
   secrets), and encodes explicit anti-hallucination rules. Insufficient context →
   a fixed refusal, not a guess.
3. **Output sanitisation.** The generated answer is scanned and redacted for PII
   and infrastructure leakage (cloud resource identifiers, account numbers, keys,
   internal hostnames/URLs) before it is returned.
4. **Data-layer isolation.** Retrieval is owner-scoped and RLS-enforced (above);
   RDS is private (no public IP, VPC-only) and reachable only from inside the VPC;
   the RAG Lambda reaches Bedrock over a private interface endpoint. See
   [chatbot data security](./chatbot-data-security.md) for the verified posture.
5. **Edge & transport.** The Bedrock API key lives in the BFF (Secrets Manager)
   and never in the browser; API Gateway validates requests and enforces
   throttle + monthly quota; prompts are capped at 10,000 characters at every tier.

> **Accuracy note:** the guardrails here are **code + system-prompt controls**, not
> the managed *AWS Bedrock Guardrails* resource — no `guardrailIdentifier` is wired
> into the Converse call today. Adopting managed Guardrails would be a natural
> hardening step and is tracked as a recommendation, not a current control.

## The widget (Lami's UX)

The front door is [`ChatWidget`](../../apps/site/src/components/chat/ChatWidget.tsx):
a floating button (bottom-right) that expands to a panel branded "Lami — Powered by
AWS Bedrock". It does an optimistic render of the user message, calls
[`sendChatMessage`](../../apps/site/src/lib/chat/chat-service.ts) → same-origin
`/api/chat`, and appends the reply. Errors map to friendly, coded messages
(`RATE_LIMITED`, `NETWORK_ERROR`, `AGENT_ERROR`, …) via a discriminated
`ChatResult` union.

## Where things live

| Layer | Repo | Key files |
| --- | --- | --- |
| Widget + UX | frontend-portfolio | `components/chat/ChatWidget.tsx`, `ChatInput`, `ChatMessageList` |
| Same-origin proxy | frontend-portfolio | `app/api/chat/route.ts`, `lib/chat/chat-service.ts` |
| BFF (key injection) | ai-applications | `public-api` chatbot route |
| RAG orchestrator | ai-applications | `chatbot-authenticated` Lambda |
| Retrieval + prompt + guardrails | ai-applications | `@bedrock/shared` (retriever, system prompt, sanitisers) |
| Corpus + sessions | RDS Postgres | pgvector embedding tables, `chat_sessions`/`chat_messages` |

## Related

- [Bedrock RAG chat proxy](./bedrock-rag-proxy.md) — the proxy mechanics, session echo, error mapping
- [Chatbot data security](./chatbot-data-security.md) — threat model + verified RDS posture
- [In-cluster BFF consumer architecture](./in-cluster-bff-consumer.md) — the credential-isolation pattern
- [API & data communication](./api-and-data-communication.md) — the chat route in the wider API surface

<!--
Evidence trail:
- Frontend: app/api/chat/route.ts, components/chat/ChatWidget.tsx, lib/chat/chat-service.ts (read 2026-07-04)
- Backend (ai-applications, verified 2026-07-04): public-api chatbot.ts proxy; chatbot-authenticated/src/{index,retrieval,invoke-claude,session,env}.ts;
  @bedrock/shared retriever (PgVectorRetriever, RRF k=60), TitanEmbeddingProvider (titan-embed-text-v2:0, 1024-dim),
  system-prompt.ts (Lami persona + scope boundary + security directives), input-sanitiser.ts, output-sanitiser.ts
- Model: eu.anthropic.claude-sonnet-4-6 via Converse (maxTokens 1024, temp 0.3). NOTE: frontend comments still say "Claude 3.5 Haiku" — stale.
- Guardrails are code + system-prompt (no AWS Bedrock Guardrails resource wired).
- Owner scoping: PORTFOLIO_OWNER_USER_ID server-injected; retrieval WHERE user_id + RLS on embedding/chat tables.
-->
