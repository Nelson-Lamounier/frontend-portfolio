import { type Metadata } from 'next'

import { Card } from '@/components/ui'
import { Section, SimpleLayout } from '@/components/layout'

function ToolsSection({
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof Section>) {
  return (
    <Section {...props}>
      <ul role="list" className="space-y-16">
        {children}
      </ul>
    </Section>
  )
}

function Tool({
  title,
  href,
  children,
}: {
  title: string
  href?: string
  children: React.ReactNode
}) {
  return (
    <Card as="li">
      <Card.Title as="h3" href={href}>
        {title}
      </Card.Title>
      <Card.Description>{children}</Card.Description>
    </Card>
  )
}

export const metadata: Metadata = {
  title: "Nelson's Setup | Kubernetes, CDK & DevOps Tooling",
  description:
    'The workstation, editor, Kubernetes tooling, and deployment stack I use daily to build and operate production AWS infrastructure.',
}

export default function Uses() {
  return (
    <SimpleLayout
      title="What I Use"
      intro="The hardware, editor setup, and CLI tools I rely on to build and operate production AWS infrastructure. Nothing here is aspirational. It's all stuff I use daily."
    >
      <div className="space-y-20">
        <ToolsSection title="Workstation">
          <Tool title='MacBook Pro 14", M3 Pro, 36GB RAM (2024)'>
            Moved from Intel to Apple Silicon in 2024. Docker multi-arch builds
            are noticeably faster, and the ARM architecture gives better parity
            with AWS Graviton instances. 36GB handles CDK synth, Docker builds,
            and local container stacks without swapping.
          </Tool>
          <Tool title='LG 34" UltraWide 5K2K Monitor'>
            I keep a terminal, VS Code, and the AWS console open side by side.
            The 21:9 aspect ratio means I rarely switch windows during a
            deployment or debugging session.
          </Tool>
        </ToolsSection>
        <ToolsSection title="Development Tools">
          <Tool title="Visual Studio Code">
            My main editor. I run the AWS Toolkit, CDK snippets, Kubernetes, and
            Docker extensions. The integrated terminal means I can run cdk deploy
            and check pod logs without leaving the editor.
          </Tool>
          <Tool title="AWS CLI v2 + Session Manager Plugin">
            Named profiles for dev, staging, and production. Session Manager
            replaces SSH for instance access, so there are no open ports and no
            key management.
          </Tool>
          <Tool title="Kiro (AWS AI-powered IDE)">
            I&apos;m experimenting with Kiro for CDK generation. It requires careful
            review. I caught it creating unnecessary VPC Interface Endpoints
            that would have added $14/month per AZ. AI-generated infrastructure
            can be syntactically correct but financially expensive.
          </Tool>
        </ToolsSection>
        <ToolsSection title="Kubernetes & Networking">
          <Tool title="kubectl + kubeadm">
            kubectl is my primary interface with the cluster. kubeadm handles
            node provisioning and cluster lifecycle, automated through SSM
            Automation documents and Step Functions orchestration.
          </Tool>
          <Tool title="ArgoCD">
            My GitOps delivery platform. ApplicationSet generates per-service
            applications from a single manifest, and sync waves enforce
            dependency ordering across namespaces. Every deployment is
            declarative and auditable.
          </Tool>
          <Tool title="Helm">
            I deploy the full observability stack (Prometheus Operator, Grafana,
            Loki, Tempo) and networking components (Traefik, Calico) via Helm
            charts managed through ArgoCD. Values files are version-controlled
            alongside the application code.
          </Tool>
          <Tool title="Calico CNI + NetworkPolicy">
            Calico provides pod networking and fine-grained NetworkPolicy
            enforcement. I use it to segment workloads by namespace and restrict
            pod-to-pod traffic to only what each service needs.
          </Tool>
          <Tool title="Traefik Proxy">
            Runs as the cluster ingress controller via IngressRoutes. Traffic
            flows from CloudFront through an NLB to Traefik, which handles TLS
            termination, routing, and middleware (rate limiting, headers).
          </Tool>
        </ToolsSection>
        <ToolsSection title="Infrastructure & Deployment">
          <Tool title="AWS CDK (TypeScript)">
            I write all my infrastructure in CDK. After working directly with
            CloudFormation JSON/YAML, having type-checked constructs and
            refactoring support made a real difference.
          </Tool>
          <Tool title="Docker Desktop">
            I build and test container images locally before they go through the
            CI/CD pipeline. The M3 compatibility improvements have made
            multi-arch builds more reliable.
          </Tool>
          <Tool title="GitHub Actions">
            My CI/CD platform. OIDC integration with AWS means no stored
            credentials. Reusable workflow files handle synthesis, security
            scanning, image builds, deployment, and rollback.
          </Tool>
          <Tool title="AWS CloudFormation">
            I&apos;m CDK-first, but I still read and debug CloudFormation
            templates regularly. Understanding the output that CDK generates
            has helped me fix synthesis issues faster.
          </Tool>
        </ToolsSection>
        <ToolsSection title="AI & Automation">
          <Tool title="Amazon Bedrock + AgentCore">
            Powers the self-healing agent that diagnoses and remediates
            CloudWatch alarms automatically. Uses MCP tool integration for
            live infrastructure access, with Cognito M2M authentication
            and token-budget guardrails.
          </Tool>
          <Tool title="Pinecone (Vector Database)">
            Stores document embeddings for the RAG-powered content pipeline.
            Article generation queries the knowledge base for relevant context
            before passing it to Bedrock for generation.
          </Tool>
        </ToolsSection>
        <ToolsSection title="Monitoring & Debugging">
          <Tool title="CloudWatch Logs Insights">
            I use this more than I expected. The query syntax takes a bit to
            learn, but once you know it, filtering through distributed logs
            gets fast.
          </Tool>
          <Tool title="Grafana + Prometheus + Loki + Tempo">
            The full observability stack runs on Kubernetes, deployed via Helm
            charts through ArgoCD. Dashboards cover cluster health, application
            metrics, and request tracing. Clicking a trace span jumps to the
            matching log entries and metrics panel, which has cut my debugging
            time significantly.
          </Tool>
        </ToolsSection>
      </div>
    </SimpleLayout>
  )
}
