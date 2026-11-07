# PANDUAN RINGKAS PENYIAPAN ENVIRONMENT TERMUX
## Standalone Terminal Quick-Reference untuk ZLCE Mobile Workbench v4.0.0 (TASK-041 / TC-P8-01)

Dokumen ini adalah lembar contekan (*cheatsheet*) operasional mandiri penyiapan dan perawatan terminal Termux pada tablet Samsung Galaxy Tab A7 Lite (SM-T225).

---

## 1. PENETAPAN ENV & ALIAS TERMUX

Untuk kenyamanan 8 anggota tim, tambahkan konfigurasi berikut ke berkas `~/.bashrc` di Termux:

```bash
# 1. Buka atau buat file ~/.bashrc
cat << 'EOF' >> ~/.bashrc

# --- ZLCE Mobile Workbench Environment ---
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8
export EDITOR=micro
export VISUAL=micro

# Menambahkan bin lokal ke PATH
export PATH="$HOME/bin:$PATH"

# Shortcut Direktori Proyek
alias cdp="cd ~/projects/zlce-mobile-workbench"

# Shortcut Diagnostik ZLCE
alias zcheck="zlce check"
alias zsnap="zlce snapshot"
alias zclean="zlce clean-auth"
alias zpull="zlce pull"

# Informasi Sesi Awal Terminal
echo "⚡ ZLCE Mobile Workbench v4.0.0 Terminal Ready"
echo "Ketik 'cdp' untuk masuk ke repositori, 'zcheck' untuk validasi status sesi."
EOF

# 2. Terapkan konfigurasi langsung ke sesi saat ini
source ~/.bashrc
```

---

## 2. IZIN PENYIMPANAN ANDROID (`termux-setup-storage`)

Jika ingin mengakses berkas di memori internal tablet (`/sdcard/` atau `~/storage/shared/`):

```bash
# Jalankan perintah penyiapan izin
termux-setup-storage
```
*Akan muncul dialog izin pop-up Android di tablet Samsung. Ketuk "Izinkan" / "Allow".*

---

## 3. PANDUAN PENGGUNAAN EDITOR `micro`

Editor terminal `micro` dipilih karena memiliki navigasi sentuh tablet yang sangat baik, pintasan keyboard umum (`Ctrl+S`, `Ctrl+Q`), dan pewarnaan sintaks (*syntax highlighting*).

| Tindakan | Tombol / Cara di Tablet |
| :--- | :--- |
| **Buka Berkas** | `micro SESSION_STATE.md` |
| **Simpan Berkas** | `Ctrl + S` (atau ketuk ikon simpan) |
| **Keluar** | `Ctrl + Q` |
| **Cari Teks** | `Ctrl + F` lalu ketik kata kunci |
| **Navigasi Layar Sentuh** | Geser jari pada teks dan ketuk posisi kursor |
| **Salin / Tempel** | Tekan lama teks atau gunakan pintasan keyboard |

---

## 4. PEMERIKSAAN KESEHATAN SISTEM TERMUX (DIAGNOSTIK)

Jalankan perintah satu baris berikut untuk memeriksa apakah dependensi dasar telah terpasang dengan benar:

```bash
python3 -c "import sys, os, re, json, subprocess; print('Python 3 Standard Library: OK')" && git --version && micro --version
```

Output yang diharapkan:
```text
Python 3 Standard Library: OK
git version 2.4x.x
micro 2.0.x
```

---

## 5. KEBIJAKAN ZERO-DAEMON (PENTING)

* **DILARANG** menjalankan daemon latar belakang permanen seperti `node server.js`, `sshd`, atau `cron` di Termux.
* Menjaga kapasitas RAM 3GB tablet tetap optimal untuk rendering PWA dan peramban web AI.
* Seluruh operasi ZLCE bersifat **One-Shot Execution**: jalankan perintah, dapatkan output, lalu terminal kembali idle.
