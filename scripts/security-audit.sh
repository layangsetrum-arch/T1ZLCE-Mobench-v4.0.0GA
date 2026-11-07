#!/usr/bin/env bash
# ==============================================================================
# ZLCE Mobile Workbench v4.0.0
# TASK-040: Script Audit Keamanan Zero-Secret & Verifikasi Pembersihan Token
# Rujukan: docs/mobile/blueprint/08_SECURITY_MODEL.md & TASKS.md (TC-P7-05)
# ==============================================================================

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "================================================================="
echo "ZLCE Studio v4.0.0: Zero-Secret Security Audit (TC-P7-05)"
echo "Target: Samsung Galaxy Tab A7 Lite (SM-T225) Shared Environment"
echo "Auditor: Layang Seta (Developer & Testing Engineer)"
echo "================================================================="

VIOLATIONS=0

EXCLUDE_ARGS=(
  --exclude-dir=node_modules
  --exclude-dir=dist
  --exclude-dir=.git
  --exclude-dir=.venv
  --exclude="*.zip"
  --exclude="*.png"
  --exclude="*.ico"
  --exclude="security-audit.sh"
)

echo -n "==> [AUDIT 1] Scanning for Git & Platform Access Tokens (ghp_*, github_pat_*, ghs_*, ghu_*)... "
PAT_MATCHES=$(grep -rnE '(ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{40}|gho_[A-Za-z0-9]{36}|ghs_[A-Za-z0-9]{36}|ghu_[A-Za-z0-9]{36})' . "${EXCLUDE_ARGS[@]}" || true)
if [ -n "$PAT_MATCHES" ]; then
  echo "FAIL - Leaked token detected!"
  echo "$PAT_MATCHES"
  VIOLATIONS=$((VIOLATIONS + 1))
else
  echo "PASS (0 leaks)"
fi

echo -n "==> [AUDIT 2] Scanning for Asymmetric Private Key Headers... "
KEY_MATCHES=$(grep -rnE -e '-----BEGIN (RSA|OPENSSH|DSA|EC|PGP)? ?PRIVATE KEY' . "${EXCLUDE_ARGS[@]}" || true)
if [ -n "$KEY_MATCHES" ]; then
  echo "FAIL - Leaked private key detected!"
  echo "$KEY_MATCHES"
  VIOLATIONS=$((VIOLATIONS + 1))
else
  echo "PASS (0 keys)"
fi

echo -n "==> [AUDIT 3] Scanning for Cloud & AI API Keys (AWS AKIA, Google AIza, Anthropic sk-ant-*, Slack xox*)... "
API_MATCHES=$(grep -rnE '(AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{35}|sk-ant-[a-zA-Z0-9_-]{32,}|xox[baprs]-[0-9a-zA-Z]{10,})' . "${EXCLUDE_ARGS[@]}" || true)
if [ -n "$API_MATCHES" ]; then
  echo "FAIL - Leaked API key detected!"
  echo "$API_MATCHES"
  VIOLATIONS=$((VIOLATIONS + 1))
else
  echo "PASS (0 API keys)"
fi

echo -n "==> [AUDIT 4] Scanning for Literal Secret Assignments across src/ and scripts/... "
SECRET_ASSIGN_MATCHES=$(grep -rnE '(token|password|passwd|secret|api_?key)[[:space:]]*[:=][[:space:]]*["\x27][^"\x27]{4,}["\x27]' src/ scripts/ --exclude-dir=node_modules || true)
if [ -n "$SECRET_ASSIGN_MATCHES" ]; then
  echo "FAIL - Literal secret assignments detected in source!"
  echo "$SECRET_ASSIGN_MATCHES"
  VIOLATIONS=$((VIOLATIONS + 1))
else
  echo "PASS (Zero secret assignments in code)"
fi

echo -n "==> [AUDIT 4b] Scanning for Embedded Credentials in URLs (http(s)://user:pass@host)... "
URL_CREDS=$(grep -rnE 'https?://[^/[:space:]@:]+:[^/[:space:]@]+@' . "${EXCLUDE_ARGS[@]}" --exclude="*.md" || true)
if [ -n "$URL_CREDS" ]; then
  echo "FAIL - Embedded credentials in URLs detected!"
  echo "$URL_CREDS"
  VIOLATIONS=$((VIOLATIONS + 1))
else
  echo "PASS (0 embedded credentials in URLs)"
fi

echo -n "==> [AUDIT 4c] Verifying Git Remote URLs have zero embedded credentials... "
if [ -d ".git" ]; then
  REMOTE_CREDS=$(git remote -v 2>/dev/null | grep -E 'https?://[^/[:space:]@:]+:[^/[:space:]@]+@' || true)
  if [ -n "$REMOTE_CREDS" ]; then
    echo "FAIL - Embedded credentials detected in git remotes!"
    echo "$REMOTE_CREDS"
    VIOLATIONS=$((VIOLATIONS + 1))
  else
    echo "PASS (Remotes clean)"
  fi
else
  echo "PASS (No .git repository)"
fi

echo -n "==> [AUDIT 5] Verifying and Executing clean-auth.sh RAM credential purge script... "
if [ ! -f "scripts/zlce/clean-auth.sh" ]; then
  echo "FAIL - scripts/zlce/clean-auth.sh not found!"
  VIOLATIONS=$((VIOLATIONS + 1))
elif [ ! -x "scripts/zlce/clean-auth.sh" ]; then
  echo "FAIL - scripts/zlce/clean-auth.sh not executable!"
  VIOLATIONS=$((VIOLATIONS + 1))
elif ! grep -q "git credential-cache exit" scripts/zlce/clean-auth.sh; then
  echo "FAIL - clean-auth.sh missing 'git credential-cache exit' command!"
  VIOLATIONS=$((VIOLATIONS + 1))
else
  # Execute clean-auth to test purge behavior
  if bash scripts/zlce/clean-auth.sh >/dev/null 2>&1; then
    echo "PASS (Executable & RAM purge execution verified)"
  else
    echo "FAIL - Execution of scripts/zlce/clean-auth.sh returned non-zero status!"
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
fi

echo -n "==> [AUDIT 6] Verifying Command Catalog for Zero Destructive Commands (Fail-Closed)... "
CHECK_RES=""
if command -v npx >/dev/null 2>&1; then
  CHECK_RES=$(npx tsx -e "
import { verifyNoDestructiveCommands } from './src/data/commandTemplates';
if (!verifyNoDestructiveCommands()) {
  process.exit(1);
}
console.log('OK');
" 2>&1 || true)
fi

if [ "$CHECK_RES" = "OK" ]; then
  echo "PASS (Zero destructive commands in catalog)"
else
  echo "FAIL - Command verification failed or destructive command detected! ($CHECK_RES)"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

echo "================================================================="
if [ "$VIOLATIONS" -eq 0 ]; then
  echo "AUDIT RESULT: ALL SECURITY CHECKS PASSED (0 leaks, Zero-Secret Valid)"
  echo "================================================================="
  exit 0
else
  echo "AUDIT RESULT: $VIOLATIONS SECURITY VIOLATIONS DETECTED"
  echo "================================================================="
  exit 1
fi
