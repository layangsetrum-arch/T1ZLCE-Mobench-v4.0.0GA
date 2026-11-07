# BLUEPRINT 04: INTEGRASI TERMUX RUNTIME & CLI DISPATCHER
## Lingkungan Eksekusi Native Linux, Penyiapan Termux & CLI Dispatcher `zlce`

Tanggal: 2026-11-04  
Status: **DRAFT BLUEPRINT (BATCH 2)**  
Rujukan Dokumen: `docs/mobile/FEASIBILITY_AND_DECISIONS.md`, `13_COMMAND_TEMPLATES.md`

---

## 1. PENYIAPAN LINGKUNGAN TERMUX (SETUP ENVIRONMENT)

### 1.1 Sumber Instalasi
- **Sumber Wajib:** Termux wajib diinstal dari **F-Droid** (atau GitHub Releases Termux resmi), **BUKAN DARI GOOGLE PLAY STORE** (karena versi Play Store sudah usang dan dibatasi kebijakan API Android).

### 1.2 Paket yang Dibutuhkan
Penyiapan hanya membutuhkan pustaka bawaan standar (*Standard Tooling*):
```bash
pkg update -y
pkg install -y git python bash coreutils
```
- **Versi Minimum:** Python 3.10+ (Termux saat ini menyediakan 3.11 / 3.12).
- **Nol Dependensi PIP:** Skrip ZLCE (`zlce-check.py`, `zlce-collect.py`) beroperasi 100% menggunakan Python Standard Library (`os`, `re`, `subprocess`, `sys`, `json`, `zipfile`).

---

## 2. FILOSOFI "ZERO DAEMON" & KEANDALAN ANDROID

Sistem ZLCE Mobile Workbench memegang prinsip **Zero Daemon**:
1. **Tidak Ada Server Background:** Tidak ada proses server Express, WebSocket, atau daemon Python yang dipaksakan berjalan terus-menerus di Termux.
2. **Kekebalan Terhadap Android Low Memory Killer (LMK):**
   - Saat pengguna berpindah dari Termux ke browser AI atau PWA, Android dapat menghentikan proses Termux yang idle.
   - Karena interaksi bersifat berbasis perintah tunggal (*command invocation per step*), pemutusan proses idle tidak menyebabkan data corrupt atau session break.

---

## 3. CLI DISPATCHER SISI TERMUX (`~/bin/zlce`)

Untuk mempermudah pengetikan di keyboard virtual Android, disediakan skrip pembungkus kecil (*dispatcher*) yang diletakkan di `$HOME/bin/zlce` (atau di root repo):

```bash
#!/usr/bin/env bash
# ZLCE Command Dispatcher untuk Tablet Android
set -euo pipefail

SUBCOMMAND="${1:-help}"
shift 2>/dev/null || true

case "$SUBCOMMAND" in
  check)
    python3 scripts/zlce-check.py . "$@"
    ;;
  snapshot)
    bash scripts/zlce-snapshot.sh . "$@"
    ;;
  collect)
    python3 scripts/zlce-collect.py . "$@"
    ;;
  pull)
    git fetch origin
    git checkout -B "$1" "origin/$1" --ff-only
    ;;
  push)
    git push origin "$(git branch --show-current)"
    ;;
  clean-auth)
    git credential-cache exit 2>/dev/null || true
    echo "[OK] Git credential cache cleared for device handover."
    ;;
  help|-h|--help)
    echo "ZLCE Mobile CLI Dispatcher"
    echo "Perintah yang diizinkan: check, snapshot, collect, pull, push, clean-auth"
    ;;
  *)
    echo "[ERROR] Subperintah '$SUBCOMMAND' tidak dikenal oleh ZLCE Dispatcher allowlist."
    exit 1
    ;;
esac
```

### Keamanan Allowlist Subperintah:
- Dispatcher hanya menerima perintah dalam **allowlist terdaftar**.
- **DILARANG mengeksekusi isi clipboard secara buta (*blind execution*)**. Pengguna selalu melihat teks perintah sebelum menekan Enter.

---

## 4. PENCEGAHAN COMMAND INJECTION & PENGUTIPAN PARAMETER

Seluruh template perintah yang dirakit oleh PWA (misalnya pesan commit, nama task, nama cabang) melalui proses sanitasi dan pengutipan ketat (*strict shell escaping*):

```typescript
// Fungsi utilitas sanitasi PWA
export function sanitizeShellParam(input: string): string {
  // Hanya izinkan karakter alfanumerik, spasi, tanda hubung, titik, dan garis bawah
  const clean = input.replace(/[`$\\]/g, '');
  // Bungkus dalam tanda kutip ganda yang aman
  return `"${clean.replace(/"/g, '\\"')}"`;
}
```
- Contoh keluaran template PWA:
  `git -c user.name="Budi Pratama" -c user.email="budi@dev.id" commit -m "TASK-002: feat(db) skema todos"`

---

## 5. MANAJEMEN KREDENSIAL GITHUB AMAN DI TERMUX

Untuk mendukung 8 anggota tim pada 1 tablet bersama:
1. **Penyimpanan Token Terbatas (Git Credential Cache):**
   ```bash
   git config --global credential.helper 'cache --timeout=900'
   ```
   - Saat anggota melakukan `git push`, Termux meminta Personal Access Token (PAT) GitHub.
   - Token disimpan di memori RAM selama **15 menit (900 detik)**.
   - Token **tidak pernah ditulis ke disk atau berkas repositori**.
2. **Pembersihan Instan Saat Handover:**
   - Sebelum mengoper tablet, anggota cukup menjalankan:
     `zlce clean-auth` (atau `git credential-cache exit`).
   - Token langsung terhapus dari RAM. Anggota berikutnya harus memasukkan token miliknya sendiri saat melakukan push.

---

## 6. ALUR TEMPEL BALIK TERMINAL (PASTE-BACK WORKFLOW)

```
[ Termux: Jalankan zlce check ]
               │
               ▼
[ Salin Luaran: "RESULT: OK (0 error, 0 warn, 6 task)" ]
               │
               ▼
[ Buka PWA -> Tab Command Hub -> Kotak Paste-Back ]
               │
               ▼
[ PWA Regex Parser memvalidasi & menyegarkan badge STATE: OK ]
```
- Menjamin PWA mengetahui hasil verifikasi nyata di Linux Termux tanpa melanggar batasan sandbox browser Android.
