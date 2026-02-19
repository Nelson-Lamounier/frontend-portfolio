#!/usr/bin/env bash
# ============================================================================
# set-github-env.sh — Push variables & secrets to a GitHub environment
#
# Reads KEY=VALUE pairs from .env.github and pushes them to the given
# GitHub Actions environment using the `gh` CLI.
#
#   SECRET_*  → gh secret set  (environment-level)
#   VAR_*     → gh variable set (environment-level)
#
# The .env.github file supports per-environment sections:
#   Lines outside any [env:*] header apply to ALL environments (shared).
#   Lines under [env:NAME] apply only when NAME matches the target env.
#
# Usage:
#   ./scripts/set-github-env.sh <environment>    # Apply shared + env-specific
#   ./scripts/set-github-env.sh production
#   ./scripts/set-github-env.sh staging
#   ./scripts/set-github-env.sh development
#   ./scripts/set-github-env.sh --list           # Show what would be set (dry-run)
#
# Prerequisites:
#   • gh CLI installed and authenticated (gh auth login)
#   • Write access to the repository
# ============================================================================
set -euo pipefail

# ── Resolve paths ──────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$REPO_ROOT/.env.github"

# ── Colours ────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Colour

# ── Helpers ────────────────────────────────────────────────────────────────
info()  { echo -e "${CYAN}ℹ${NC}  $*"; }
ok()    { echo -e "${GREEN}✓${NC}  $*"; }
warn()  { echo -e "${YELLOW}⚠${NC}  $*"; }
fail()  { echo -e "${RED}✗${NC}  $*" >&2; exit 1; }

# ── Validate args ──────────────────────────────────────────────────────────
ENVIRONMENT="${1:-}"
DRY_RUN=false

if [[ -z "$ENVIRONMENT" ]]; then
  fail "Usage: $0 <environment>  (production | staging | development | --list)"
fi

if [[ "$ENVIRONMENT" == "--list" ]]; then
  DRY_RUN=true
  ENVIRONMENT="__all__"
fi

# ── Detect repository ─────────────────────────────────────────────────────
if [[ "$DRY_RUN" == "false" ]]; then
  REPO="$(cd "$REPO_ROOT" && gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null)" \
    || fail "Could not detect repository. Run 'gh auth login' first."
else
  REPO="(dry-run)"
fi

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║  GitHub Environment Configurator                            ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
info "Repository:   ${REPO}"
info "Environment:  ${ENVIRONMENT}"
info "Source file:  ${ENV_FILE}"
[[ "$DRY_RUN" == "true" ]] && info "Mode:         ${YELLOW}DRY-RUN (listing all entries)${NC}"
echo ""

# ── Validate env file ─────────────────────────────────────────────────────
[[ -f "$ENV_FILE" ]] || fail ".env.github not found at $ENV_FILE"

# ── Counters ───────────────────────────────────────────────────────────────
SECRETS_SET=0
SECRETS_SKIPPED=0
VARS_SET=0
LINES_IGNORED=0
CURRENT_SECTION="__shared__"  # Lines before any [env:*] header

# ── Process a KEY=VALUE line ───────────────────────────────────────────────
process_line() {
  local line="$1"
  local section_label="$2"

  # Match KEY=VALUE (tolerates spaces around =)
  if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)\ *=\ *(.*) ]]; then
    RAW_KEY="${BASH_REMATCH[1]}"
    VALUE="${BASH_REMATCH[2]}"

    # ── SECRETS ──────────────────────────────────────────────────────────
    if [[ "$RAW_KEY" == SECRET_* ]]; then
      GH_NAME="${RAW_KEY#SECRET_}"

      if [[ -z "$VALUE" ]]; then
        warn "Secret ${GH_NAME} has no value (${section_label}) — skipped"
        ((SECRETS_SKIPPED++)) || true
        return
      fi

      if [[ "$DRY_RUN" == "true" ]]; then
        echo -e "  ${CYAN}secret${NC}   ${GH_NAME}  (${section_label})"
      else
        echo -n "$VALUE" \
          | gh secret set "$GH_NAME" \
              --repo "$REPO" \
              --env "$ENVIRONMENT" 2>/dev/null \
          && ok "Secret  ${GH_NAME}  → set  (${section_label})" \
          || fail "Failed to set secret ${GH_NAME}"
      fi
      ((SECRETS_SET++)) || true

    # ── VARIABLES ────────────────────────────────────────────────────────
    elif [[ "$RAW_KEY" == VAR_* ]]; then
      GH_NAME="${RAW_KEY#VAR_}"

      if [[ "$DRY_RUN" == "true" ]]; then
        echo -e "  ${GREEN}variable${NC} ${GH_NAME}=${VALUE}  (${section_label})"
      else
        gh variable set "$GH_NAME" \
          --repo "$REPO" \
          --env "$ENVIRONMENT" \
          --body "$VALUE" 2>/dev/null \
          && ok "Variable ${GH_NAME}=${VALUE}  → set  (${section_label})" \
          || fail "Failed to set variable ${GH_NAME}"
      fi
      ((VARS_SET++)) || true

    # ── Unknown prefix ──────────────────────────────────────────────────
    else
      warn "Ignoring unrecognised key: ${RAW_KEY}"
      ((LINES_IGNORED++)) || true
    fi
  fi
}

# ── Parse and push ─────────────────────────────────────────────────────────
while IFS= read -r line || [[ -n "$line" ]]; do
  # Skip blank lines and comments
  [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue

  # Detect section header [env:NAME]
  if [[ "$line" =~ ^\[env:([a-zA-Z0-9_-]+)\]$ ]]; then
    CURRENT_SECTION="${BASH_REMATCH[1]}"
    if [[ "$DRY_RUN" == "true" ]]; then
      echo ""
      echo -e "${BOLD}── ${CURRENT_SECTION} ──${NC}"
    fi
    continue
  fi

  # Determine if this line applies to the target environment
  if [[ "$DRY_RUN" == "true" ]]; then
    # In dry-run, show everything
    process_line "$line" "$CURRENT_SECTION"
  elif [[ "$CURRENT_SECTION" == "__shared__" || "$CURRENT_SECTION" == "$ENVIRONMENT" ]]; then
    process_line "$line" "$CURRENT_SECTION"
  fi

done < "$ENV_FILE"

# ── Summary ────────────────────────────────────────────────────────────────
echo ""
echo "── Summary ──────────────────────────────────────────────────────"
info "Secrets set:     ${SECRETS_SET}"
[[ $SECRETS_SKIPPED -gt 0 ]] && warn "Secrets skipped:  ${SECRETS_SKIPPED} (empty value)"
info "Variables set:   ${VARS_SET}"
[[ $LINES_IGNORED -gt 0 ]] && warn "Lines ignored:    ${LINES_IGNORED}"
echo ""

if [[ "$DRY_RUN" == "true" ]]; then
  ok "Dry-run complete — no changes made"
else
  ok "Done — ${ENVIRONMENT} environment configured on ${REPO}"
fi
