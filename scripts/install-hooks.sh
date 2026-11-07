#!/usr/bin/env bash
# ==============================================================================
# ZLCE Mobile Workbench v4.0.0
# TASK-047: Zero-Secret Pre-Commit Hook Hardening (AUD-001)
# Menginstal pre-commit hook otomatis penegak Zero-Secret Policy di Termux / Git.
# ==============================================================================

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOOKS_DIR="$ROOT_DIR/.git/hooks"
TARGET_HOOK="$HOOKS_DIR/pre-commit"

echo "================================================================="
echo "ZLCE Studio v4.0.0: Pre-Commit Hook Installer (TASK-047 / AUD-001)"
echo "Target: Penegakan Mandatori Zero-Secret Policy sebelum Git Commit"
echo "================================================================="

# Buat direktori hooks jika git repo aktif
if [ ! -d "$ROOT_DIR/.git" ]; then
  echo "[INFO] Direktori .git belum ada. Membuat placeholder .git/hooks untuk validasi lingkungan..."
  mkdir -p "$HOOKS_DIR"
else
  mkdir -p "$HOOKS_DIR"
fi

# Tulis script pre-commit hook
cat << 'EOF' > "$TARGET_HOOK"
#!/usr/bin/env bash
# ==============================================================================
# ZLCE Automatic Zero-Secret Pre-Commit Hook
# Dijalankan otomatis oleh Git sebelum 'git commit' diizinkan.
# Sifat: FAIL-CLOSED (AUD-020). Jika verifikator tidak ada atau gagal -> REJECT.
# ==============================================================================

set -euo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

echo "------------------------------------------------------------------"
echo "[ZLCE HOOK] Menjalankan pemindaian Zero-Secret Security Audit..."
echo "------------------------------------------------------------------"

# 1. Verifikasi ketersediaan security-audit.sh (FAIL-CLOSED)
if [ ! -f "$ROOT_DIR/scripts/security-audit.sh" ]; then
  echo "❌ [ERROR] scripts/security-audit.sh tidak ditemukan!"
  echo "Kebijakan Keamanan ZLCE: Fail-closed diaktifkan. Commit dibatalkan."
  exit 1
fi

# 2. Pemindaian Cepat Git Staged Diff (Periksa penambahan token di patch)
STAGED_DIFF=$(git diff --cached -U0 2>/dev/null || true)
if [ -n "$STAGED_DIFF" ]; then
  TOKEN_IN_DIFF=$(echo "$STAGED_DIFF" | grep -E '^\+[^+]' | grep -E '(ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{40}|gho_[A-Za-z0-9]{36}|ghs_[A-Za-z0-9]{36}|ghu_[A-Za-z0-9]{36}|sk-ant-[a-zA-Z0-9_-]{32,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{35}|xox[baprs]-[0-9a-zA-Z]{10,})' || true)
  if [ -n "$TOKEN_IN_DIFF" ]; then
    echo "❌ [COMMIT DIBLOKIR: TOKEN/KREDENSIAL DITEMUKAN PADA STAGED CHANGES] ❌"
    echo "$TOKEN_IN_DIFF"
    exit 1
  fi
fi

# 3. Jalankan full security audit suite
if ! bash "$ROOT_DIR/scripts/security-audit.sh"; then
  echo ""
  echo "=================================================================="
  echo "❌ [COMMIT DIBLOKIR: KEBIJAKAN ZERO-SECRET ZLCE DILANGGAR] ❌"
  echo "=================================================================="
  echo "Peringatan Keamanan Tablet Bersama:"
  echo "Terdeteksi Personal Access Token (ghp_*), Private Key, atau API Key!"
  echo "Sesuai Invarian ZLCE dan Blueprint 08 (Security Model), kredensial"
  echo "rahasia DILARANG KERAS disimpan dalam repositori kerja."
  echo ""
  echo "Langkah Remediasi Cepat di Tablet/Termux:"
  echo "1. Periksa berkas yang gagal pada log audit di atas."
  echo "2. Hapus token/key dari berkas atau bersihkan dengan 'git reset HEAD <file>'."
  echo "3. Gunakan flag '-c user.name=\"...\"' saat commit, bukan token di file."
  echo "4. Jalankan ulang 'bash scripts/security-audit.sh' untuk memastikan 0 leaks."
  echo "=================================================================="
  exit 1
fi

echo "[ZLCE HOOK] Verifikasi Zero-Secret PASS. Commit diizinkan."
exit 0
EOF

chmod +x "$TARGET_HOOK"

echo "✅ Pre-commit hook berhasil dipasang di: $TARGET_HOOK"
echo "   Izin eksekusi: $(ls -l "$TARGET_HOOK" | awk '{print $1}')"

# Mode testing
if [ "${1:-}" = "--test" ]; then
  echo ""
  echo "==> Menguji eksekusi mandiri pre-commit hook..."
  bash "$TARGET_HOOK"
  echo "✅ Uji eksekusi hook berhasil lulus 100%."
fi

echo "================================================================="
echo "Selesai: Seluruh commit masa depan akan dilindungi secara otomatis."
echo "================================================================="
