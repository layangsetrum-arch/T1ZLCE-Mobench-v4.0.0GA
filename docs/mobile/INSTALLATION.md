# PANDUAN INSTALASI TABLET ANDROID & ZLCE MOBILE WORKBENCH
## Prosedur Penyiapan Lengkap Samsung Galaxy Tab A7 Lite (SM-T225) dari Nol (TASK-041 / TC-P8-01)

Dokumen ini memuat panduan komprehensif, presisi, dan siap salin (*copy-paste ready*) untuk menyiapkan tablet bersama Samsung Galaxy Tab A7 Lite (SM-T225) agar siap digunakan oleh 8 anggota tim estafet.

---

## 1. RINGKASAN SPESIFIKASI ACUAN PERANGKAT

* **Model Tablet:** Samsung Galaxy Tab A7 Lite (SM-T225)
* **RAM / Penyimpanan:** 3 GB LPDDR4X / 32 GB eMMC 5.1 (microSD opsional)
* **Layar:** 8.7 inci TFT LCD WXGA+ (1340 x 800 piksel, rasio 5:3)
* **Sistem Operasi:** Android 11 s/d Android 14 (One UI Core 6.x)
* **Prinsip Utama:** *Zero Daemon & Zero External Runtime* (Nol daemon background, isolasi memori 15 menit).

---

## 2. LANGKAH 1: INSTALASI TERMUX DARI F-DROID

> ⚠️ **PERINGATAN PENTING:** Jangan mengunduh Termux dari Google Play Store! Versi Play Store sudah dihentikan dan dibatasi kebijakan API Android. Wajib menggunakan build resmi F-Droid.

1. Buka peramban Google Chrome di tablet Samsung A7 Lite.
2. Unduh installer **F-Droid APK** dari situs resmi:  
   `https://f-droid.org/` atau langsung unduh **Termux APK** dari:  
   `https://f-droid.org/packages/com.termux/`
3. Berikan izin instalasi aplikasi tidak dikenal (*Install unknown apps*) pada Chrome.
4. Pasang Termux hingga selesai, lalu buka aplikasi Termux.

---

## 3. LANGKAH 2: PENYIAPAN PAKET LINUX STANDAR TERMUX

Jalankan perintah berikut di jendela Termux (cukup salin satu blok perintah utuh):

```bash
# 1. Update repository dan upgrade paket dasar
pkg update -y && pkg upgrade -y

# 2. Instal pustaka Linux standar yang dibutuhkan ZLCE
pkg install -y git python bash coreutils micro openssh

# 3. Verifikasi instalasi paket
git --version
python3 --version
micro --version
```

*Catatan:* Skrip pemeriksa ZLCE (`zlce-check.py`, `zlce-collect.py`) beroperasi 100% menggunakan pustaka bawaan standar Python (`os`, `sys`, `re`, `json`, `subprocess`). **Nol instalasi pip external** yang membebani memori.

---

## 4. LANGKAH 3: PENGATURAN DIREKTORI PROYEK & CLONE REPOSITORI

```bash
# 1. Buat direktori kerja proyek tim
mkdir -p ~/projects
cd ~/projects

# 2. Clone repositori bersama ZLCE
git clone https://github.com/organization/zlce-mobile-workbench.git
cd zlce-mobile-workbench

# 3. Pastikan branch kerja v4-mobile aktif
git checkout v4-mobile

# 4. Berikan izin eksekusi pada seluruh skrip utilitas ZLCE
chmod +x scripts/zlce/zlce scripts/zlce/clean-auth.sh scripts/zlce-snapshot.sh scripts/security-audit.sh
```

---

## 5. LANGKAH 4: MEMASANG DISPATCHER `zlce` DI PATH TERMUX

Agar perintah diagnostik dapat dipanggil dengan singkat (misalnya `zlce check`), buat tautan simbolik (*symlink*) ke direktori bin Termux:

```bash
# 1. Buat direktori ~/bin jika belum ada
mkdir -p ~/bin

# 2. Buat symlink ke dispatcher zlce
ln -sf ~/projects/zlce-mobile-workbench/scripts/zlce/zlce ~/bin/zlce

# 3. Muat ulang path shell
export PATH="$HOME/bin:$PATH"
echo 'export PATH="$HOME/bin:$PATH"' >> ~/.bashrc

# 4. Uji eksekusi dispatcher
zlce --help
```

Keluaran yang diharapkan:
```
ZLCE Mobile CLI Dispatcher v4.0.0
Subperintah allowlist: check, snapshot, collect, pull, push, clean-auth
```

---

## 6. LANGKAH 5: INSTALASI PWA KE LAYAR UTAMA (HOME SCREEN)

Aplikasi antarmuka web ZLCE Studio beroperasi sebagai **Progressive Web App (PWA)** dengan kapabilitas offline penuh:

1. Buka Google Chrome di Samsung Galaxy Tab A7 Lite.
2. Akses URL aplikasi web ZLCE Studio.
3. Tunggu hingga Service Worker aktif (terindikasi badge online hijau di sudut aplikasi).
4. Ketuk menu **tiga titik vertikal** di pojok kanan atas Chrome -> Pilih **"Instal aplikasi"** atau **"Tambahkan ke Layar Utama" (Add to Home screen)**.
5. Konfirmasi instalasi. Ikon aplikasi **ZLCE Studio** dengan logo petir akan muncul di laci aplikasi atau home screen tablet.
6. Buka aplikasi dari ikon home screen: aplikasi akan berjalan dalam mode **Standalone** (tanpa bilah URL peramban, layar penuh, ergonomis tablet 8.7").

---

## 7. LANGKAH 6: VERIFIKASI INSTALASI AWAL

Jalankan perintah verifikasi diagnostik awal di Termux:

```bash
cd ~/projects/zlce-mobile-workbench
zlce check
```

Bila seluruh berkas kontrol utuh, keluaran terminal akan menampilkan:
```
RESULT: OK (0 error, 0 warn, 82 task)
```

Tablet Samsung Galaxy Tab A7 Lite kini 100% siap digunakan oleh 8 anggota tim estafet!
