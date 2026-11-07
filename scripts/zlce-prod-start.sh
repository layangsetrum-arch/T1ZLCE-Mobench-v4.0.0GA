#!/usr/bin/env bash
# ==============================================================================
# ZLCE Mobile Workbench v4.0.0 GA - Production Runtime Starter
# Lingkungan: Samsung Galaxy Tab A7 Lite (Android / Termux POSIX)
# Rujukan: docs/mobile/PRODUCTION_OPERATIONS.md, docs/mobile/INSTALLATION.md
# ==============================================================================
set -euo pipefail

# ANSI Color codes
BOLD="\033[1m"
GREEN="\033[0;32m"
CYAN="\033[0;36m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
RESET="\033[0m"

# Default configuration
PORT="${PORT:-3000}"
HOST="${HOST:-0.0.0.0}"
WORKSPACE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo -e "${CYAN}${BOLD}"
echo "======================================================================"
echo "    ⚡ ZLCE MOBILE WORKBENCH v4.0.0 GA - PRODUCTION STARTER ⚡       "
echo "    Zero-Loss Context Engineering Studio & Multi-AI Relay Hub       "
echo "    Target: Samsung Galaxy Tab A7 Lite (RAM 3GB LPDDR4X Optimized)   "
echo "======================================================================"
echo -e "${RESET}"

cd "$WORKSPACE_DIR"

# 1. Normalisasi izin eksekusi skrip POSIX
echo -e "${BOLD}[1/5] Normalisasi izin berkas utilitas POSIX...${RESET}"
chmod +x scripts/zlce/zlce scripts/zlce/clean-auth.sh scripts/*.sh scripts/*.py 2>/dev/null || true
echo -e "      ${GREEN}✓ Seluruh skrip di scripts/ telah diberi atribut eksekusi (0755).${RESET}"

# 2. Verifikasi dependensi eksekusi lokal Termux
echo -e "${BOLD}[2/5] Memeriksa ketersediaan runtime lingkungan...${RESET}"
MISSING_DEPS=()
command -v node >/dev/null 2>&1 || MISSING_DEPS+=("node (pkg install nodejs-lts)")
command -v python3 >/dev/null 2>&1 || MISSING_DEPS+=("python3 (pkg install python)")
command -v git >/dev/null 2>&1 || MISSING_DEPS+=("git (pkg install git)")

if [ ${#MISSING_DEPS[@]} -gt 0 ]; then
  echo -e "${RED}[ERROR] Kebutuhan runtime belum lengkap:${RESET}"
  for dep in "${MISSING_DEPS[@]}"; do
    echo -e "  - ${YELLOW}$dep${RESET}"
  done
  echo -e "Silakan instal paket di atas di jendela Termux lalu jalankan ulang skrip ini."
  exit 1
fi
echo -e "      ${GREEN}✓ Runtime siap: Node $(node -v), Python $(python3 --version | cut -d' ' -f2), Git $(git --version | cut -d' ' -f3)${RESET}"

# 3. Validasi integritas dokumen kontrol ZLCE (Single Source of Truth)
echo -e "${BOLD}[3/5] Memvalidasi integritas SESSION_STATE.md (zlce-check)...${RESET}"
if python3 scripts/zlce-check.py . ; then
  echo -e "      ${GREEN}✓ Validasi kanonik lulus (0 error). Sesi aman untuk operasional.${RESET}"
else
  echo -e "${RED}[FAIL] Dokumen kontrol memiliki error kanonik!${RESET}"
  echo "Perbaiki inkonsistensi SESSION_STATE.md sebelum memulai sesi produksi."
  exit 1
fi

# 4. Pengecekan build bundle produksi
echo -e "${BOLD}[4/5] Memeriksa bundel produksi PWA (dist/)...${RESET}"
if [ ! -d "dist" ] || [ ! -f "dist/index.html" ] || [ "${1:-}" == "--build" ] || [ "${1:-}" == "-b" ]; then
  echo -e "      ${YELLOW}Bundel dist/ belum ada atau flag --build terdeteksi. Mengompilasi...${RESET}"
  npm run build
  echo -e "      ${GREEN}✓ Kompilasi build produksi selesai.${RESET}"
else
  echo -e "      ${GREEN}✓ Bundel dist/ terdeteksi siap saji (Vite production assets).${RESET}"
fi

# 5. Mendapatkan alamat IP lokal perangkat di jaringan LAN / WiFi
LOCAL_IP="127.0.0.1"
if command -v ip >/dev/null 2>&1; then
  LOCAL_IP=$(ip -o -4 addr show up | awk '!/^[0-9]+: lo/ {split($4, a, "/"); print a[1]}' | head -n 1 || echo "127.0.0.1")
elif command -v ifconfig >/dev/null 2>&1; then
  LOCAL_IP=$(ifconfig 2>/dev/null | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -n 1 || echo "127.0.0.1")
fi

echo -e "\n${BOLD}${GREEN}======================================================================${RESET}"
echo -e "${BOLD}${GREEN}  🚀 ZLCE MOBILE WORKBENCH SIAP DIOPERASIKAN DALAM PRODUKSI NYATA!    ${RESET}"
echo -e "${BOLD}${GREEN}======================================================================${RESET}"
echo -e "  Akses Lokal Tablet : ${CYAN}${BOLD}http://localhost:${PORT}${RESET}"
if [ "$LOCAL_IP" != "127.0.0.1" ] && [ -n "$LOCAL_IP" ]; then
  echo -e "  Akses LAN / WiFi   : ${CYAN}${BOLD}http://${LOCAL_IP}:${PORT}${RESET}"
fi
echo ""
echo -e "${BOLD}Instruksi Penting Operasi Tablet (Samsung Tab A7 Lite):${RESET}"
echo -e "  1. Buka tautan di atas menggunakan ${BOLD}Google Chrome${RESET} atau ${BOLD}Samsung Internet${RESET}."
echo -e "  2. Ketuk menu tiga titik (⋮) lalu pilih ${BOLD}'Tambahkan ke Layar Utama' (Install PWA)${RESET}."
echo -e "  3. Buka ikon ${BOLD}ZLCE Studio${RESET} dari Layar Utama untuk mode layar penuh standalone (tanpa URL bar)."
echo -e "  4. Semua tombol interaktif dirancang ergonomis $\ge 44\times 44$ piksel."
echo -e "  5. Sebelum menyerahkan tablet ke rekan berikutnya, jalankan: ${YELLOW}bash scripts/zlce/clean-auth.sh${RESET}"
echo ""
echo -e "${YELLOW}Menjalankan web server produksi (Tekan Ctrl+C untuk menghentikan)...${RESET}\n"

# Menjalankan static preview server Vite
exec npx vite preview --port "$PORT" --host "$HOST"
