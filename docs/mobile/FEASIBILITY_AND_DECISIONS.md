# ANALISIS KELAYAKAN TEKNIS & KEPUTUSAN TERBUKA (P2-CP2)
## ZLCE Mobile Workbench untuk Tablet Bersama (Samsung Galaxy Tab A7 Lite • 8 Anggota)

Tanggal: 2026-11-04  
Status: **DOKUMEN KEPUTUSAN TEKNIS P2-CP2**  
Dasar Masukan: `Master_Prompt_ZLCE_Mobile_Workbench_v5.md` & `Keputusan_P2-CP2_Tablet_Bersama.md`  
Batas Tindakan: Hanya pembuatan berkas `docs/mobile/FEASIBILITY_AND_DECISIONS.md`. Tidak ada perubahan kode pada tahap ini.

---

## 1. PROFIL PERANGKAT TARGET & KONSEKUENSI DESAIN

Berdasarkan keputusan pengguna, profil perangkat target ditetapkan secara presisi:

| Parameter Perangkat | Spesifikasi Aktual | Konsekuensi Desain Arsitektur ZLCE |
| :--- | :--- | :--- |
| **Model Perangkat** | Samsung Galaxy Tab A7 Lite (SM-T225) | Dimensi ringkas, layar 8.7 inci (WXGA+ 1340 x 800 piksel, rasio 5:3). |
| **Kapasitas RAM** | 3 GB RAM (varian SM-T225) | **Sangat terbatas.** Sistem operasi Android One UI Core mengonsumsi ~1.8–2.2 GB RAM. Sisa RAM bebas untuk aplikasi pengguna hanya ~700–1000 MB. Android Low Memory Killer (LMK) sangat aktif. |
| **Metode Input** | 100% Layar Sentuh & Keyboard Virtual (Tanpa Keyboard Fisik / Stylus) | Semua tombol aksi wajib memiliki target sentuh minimal **44 x 44 piksel**. Mengetik teks panjang di layar lambat dan melelahkan; interaksi harus dioptimalkan via tombol salin 1-ketukan (*One-Tap Copy*), seleksi cepat, dan parameter terisi otomatis. |
| **Pola Aplikasi** | **Satu Aplikasi Bergantian (Single-App Sequential Flow)** | **DILARANG mengasumsikan multi-window / split-screen.** Alur kerja berlangsung linier: Buka PWA -> Salin Template -> Pindah ke Termux / Browser AI -> Jalankan / Kirim -> Salin Hasil -> Kembali ke PWA. |
| **Tuntutan LMK (Low Memory Killer)** | Aplikasi di background rawan dimatikan sewaktu-waktu saat pengguna berpindah app | **Zero Daemon Principle:** Tidak boleh ada background service atau server lokal permanen yang dituntut hidup terus-menerus. Setiap kali PWA ditinggalkan, state disimpan atomik ke storage. |
| **Konektivitas** | Wi-Fi / LTE (sering offline / semi-offline) | PWA offline shell + Termux lokal wajib 100% operasional tanpa internet. Jaringan hanya diperlukan untuk `git push/pull` ke GitHub dan akses browser AI. |

---

## 2. STRATEGI CABANG & PENAMAAN VERSI (SEMVER)

Sesuai arahan pengguna, skema versi dan percabangan diatur sebagai berikut:

```
[baseline-3.22-asli] (Tag Commit Awal Repo)
         │
         ▼
     [v3.3.0] (Tag Penutupan Track 1: Revisi, Linter Test & Konsolidasi)
         │
         ├───> [v4.0.0-alpha.1] (Fase 1: PWA Shell & Layout Tablet)
         ├───> [v4.0.0-alpha.2] (Fase 2: Markdown Workspace & Storage)
         ├───> [v4.0.0-beta.1]  (Fase 3: Multi-AI Context Pack)
         ├───> [v4.0.0-beta.2]  (Fase 4: Multi-Akun & Tim Estafet)
         ├───> [v4.0.0-rc.1]    (Fase 5: Command Hub & Termux)
         ├───> [v4.0.0]         (Rilis Final ZLCE Mobile Workbench)
         │
         └───> [v4.1.0]         (Fase 8: Integrasi Kompatibilitas Obsidian)
```

- **Strategi Cabang Kerja:**
  - Branch pengembangan Track 2 dilakukan pada cabang `v4-mobile` di repositori kerja (`ZLCE3.22-studio`).
  - Remote asal `acimau99-netizen/ZLCE3.22-studio` didaftarkan sebagai `upstream` berstatus **read-only** untuk mengambil pembaruan inti ZLCE bila kelak ada update Core.

---

## 3. MEKANISME PWA–TERMUX: COMMAND & TEMPLATE HUB

### 3.1 Evaluasi Pilihan Komunikasi PWA ke Termux di Android

| Opsi Komunikasi | Kebutuhan Background | Keamanan & Sandbox Android | Kompleksitas Instalasi | Kesimpulan Kelayakan |
| :--- | :---: | :---: | :---: | :---: |
| **A. Local Bridge Daemon (HTTP server di Termux)** | Tinggi (Node/Python server harus hidup di background) | Berisiko (membuka port lokal, rentan dibunuh LMK Android) | Rumit (pengguna harus start server manual setiap boot) | **DITOLAK** (Boros RAM, tidak andal di Tab A7 Lite). |
| **B. Android Intent / Web Share API** | Nol | Dibatasi (Termux tidak mengekspos intent shell arbitrer dari PWA) | Sedang | **TIDAK MENCUKUPI** untuk eksekusi perintah shell. |
| **C. File-Based Handoff (shared JSON file)** | Rendah | Butuh izin shared storage, rawan konflik read/write | Sedang | Kurang instan untuk interaksi per-langkah. |
| **D. Command & Template Hub (One-Tap Copy + Paste-Back)** | **NOL** | **Sangat Aman** (PWA hanya menghasilkan teks terformat yang divalidasi; eksekusi dilakukan sadar oleh pengguna di Termux) | **Sangat Sederhana** (Cukup salin-tempel standar Android) | **DITERIMA (REKOMENDASI UTAMA)** |

### 3.2 Desain Varian: Template Langsung vs CLI Dispatcher `zlce`

1. **Varian 1 — Template Perintah Langsung:**
   - PWA merender perintah Git dan Python secara lengkap, misal:
     `python3 scripts/zlce-check.py . --tasks TASKS.md`
     `git commit -m "TASK-002: feat(db) skema database todos"`
   - Kelebihan: Tanpa instalasi skrip pembungkus tambahan di Termux; transparan bagi anggota tim.
2. **Varian 2 — CLI Dispatcher `zlce` di Termux:**
   - Disediakan satu skrip kecil `zlce` di Termux (misal diletakkan di `~/bin/zlce` atau root repo):
     `zlce check` -> memanggil `python3 scripts/zlce-check.py .`
     `zlce commit TASK-002 "pesan"` -> otomatis menambahkan format commit atomik.
   - Kelebihan: Perintah sangat pendek, mudah diketik manual bila salin-tempel gagal.
3. **Keputusan Desain:**
   - PWA menyediakan **keduanya**: Template perintah langsung ditampilkan secara default (dengan tombol salin 1-ketukan), dan bila dispatcher `zlce` terpasang, pengguna dapat mengaktifkan toggle *"Mode Perintah Singkat (Dispatcher)"*.
   - Seluruh parameter input (nama task, pesan commit) wajib di-escape dan di-quote dengan benar guna mencegah *command injection* saat ditempel ke shell bash Termux.

### 3.3 Mekanisme Pembacaan dan Penulisan Berkas Markdown di Android
- Karena PWA berjalan di dalam sandbox peramban tanpa akses filesystem langsung ke Termux:
  - **Jalur Baca:** File Picker eksplisit (`input type="file"`) untuk memuat `SESSION_STATE.md` dari penyimpanan lokal, atau menempel teks Markdown langsung ke editor visual PWA.
  - **Jalur Tulis:** Tombol **Export / Unduh `.md`** (mengunduh berkas ke folder `Download/` Android) serta tombol **Salin Markdown Lengkap** ke clipboard untuk ditempel ke editor Markdown di Termux atau Obsidian.
  - **Jalur Paste-Back:** Kotak masukan *"Paste Terminal Output"* di PWA untuk menempelkan hasil dari `zlce-check` atau `git status`, yang akan diparsing oleh PWA untuk memperbarui visual badge dan tabel audit tanpa perlu PWA mengakses disk langsung.

---

## 4. LOKASI REPOSITORI DI TABLET (SHARED STORAGE VS HOME TERMUX)

| Lokasi Penyimpanan | Izin Eksekusi POSIX (`chmod +x`) | Performa Git / I/O | Akses oleh Aplikasi Lain (Obsidian / File Manager) | Rekomendasi Teknis |
| :--- | :---: | :---: | :---: | :--- |
| **Shared Storage** (`/sdcard/` atau `/storage/emulated/0/ZLCE/`) | **TIDAK DIDUKUNG** (FUSE/FAT emulated mengabaikan bit eksekusi; symlink terbatas) | Lebih lambat; Git membutuhkan konfigurasi `safe.directory` | Sangat mudah (terbaca langsung oleh Obsidian dan Chrome) | Cocok untuk vault catatan Obsidian atau ekspor Markdown. |
| **Termux Home** (`~` / `/data/data/com.termux/files/home/`) | **DIDUKUNG PENUH** (Native ext4 Linux filesystem) | **Sangat cepat**, Git beroperasi normal dengan integritas SHA256 penuh | Terisolasi; aplikasi Android lain tidak bisa membaca langsung tanpa izin root | **REKOMENDASI UTAMA UNTUK REPO KODE & GIT**. |

**Keputusan Arsitektur Lokasi:**
- Repositori kerja Git dan skrip CLI diletakkan di **Termux Home** (`~/projects/ZLCE3.22-studio`). Ini menjamin Git, Python, dan skrip Bash berjalan tanpa kendala izin atau error `safe.directory`.
- Berkas Markdown hasil ekspor/cadangan dapat disinkronkan ke shared storage sewaktu-waktu saat integrasi Obsidian diaktifkan pada Fase 8.

---

## 5. ANALISIS KRITIS: TABLET BERSAMA (8 ANGGOTA ESTAFET)

Penggunaan satu tablet secara bergantian oleh 8 anggota tim merupakan **aspek arsitektural dan keamanan paling krusial** pada Track 2.

```
       [ 1 Tablet Samsung Galaxy Tab A7 Lite ]
                          │
  ┌───────────────────────┴───────────────────────┐
  ▼                                               ▼
[ Anggota 1 (Sesi Pagi) ]             [ Anggota 2 (Sesi Siang) ]
  Task: TASK-001 (Setup)                Task: TASK-002 (Database)
  AI: Claude 3.5 (Akun Pribadi)         AI: Gemini 1.5 (Akun Pribadi)
  GitHub: github.com/user1              GitHub: github.com/user2
```

### 5.1 Analisis Isolasi Identitas & Kredensial 8 Anggota
Menyimpan 8 token GitHub dan 8 sesi akun AI di satu perangkat tanpa isolasi memiliki risiko pembajakan sesi (*session hijacking*) atau kesalahan commit atas nama orang lain.

1. **Pendekatan A: Multi-User Android (Satu Profil Android per Anggota):**
   - *Kelebihan*: Isolasi mutlak 100%. Data browser, token Termux, dan cookie terpisah sempurna antar profil OS.
   - *Kendala di Tab A7 Lite*: Samsung One UI Core pada perangkat entry-level sering kali menonaktifkan fitur Multi-User bawaan Android di menu pengaturan. Status dukungan pada unit fisik saat ini berstatus **NOT VERIFIED** (wajib diperiksa di menu `Pengaturan -> Akun & Pengguna`).
2. **Pendekatan B: Profil Browser Terpisah + Git Identity Per-Commit (Satu Profil Android):**
   - Bila Multi-User OS tidak tersedia:
     - **Browser AI**: Setiap anggota menggunakan profil browser terpisah (atau mode penyamaran / logout teratur) untuk akun AI masing-masing.
     - **Kredensial GitHub di Termux**:
       - **DILARANG KERAS** menyimpan Personal Access Token (PAT) di dalam skrip, berkas repositori, atau riwayat bash history (`.bash_history`).
       - Gunakan **Git Credential Cache dengan Timeout Singkat** (misal 15 menit):
         `git config --global credential.helper 'cache --timeout=900'`
         Saat anggota selesai dan tablet dioper, cache kedaluwarsa otomatis dan token terhapus dari memori RAM.
       - Atau tiap anggota memiliki kunci SSH terpisah dengan passphrase di `~/.ssh/id_ed25519_userN` yang dipanggil sesuai alias pengguna.

### 5.2 Identitas pada Commit Git (Penegakan Invarian Provenance)
Jika Anggota B melanjutkan task setelah Anggota A, tanpa penanganan khusus maka `git commit` akan memakai identitas `user.name` milik Anggota A. Ini merusak integritas audit dan melanggar prinsip *provenance tracking*.

- **Solusi Desain ZLCE Mobile:**
  1. PWA memperkenalkan selektor **"Anggota Aktif (Active Member)"** di Header / Navigasi.
  2. Saat pengguna memilih namanya (misal: `Budi (budi@dev.id)`), seluruh template perintah Git yang dihasilkan PWA otomatis menyertakan flag identitas eksplisit:
     ```bash
     git -c user.name="Budi" -c user.email="budi@dev.id" commit -m "TASK-002: feat(db) skema todos"
     ```
  3. Dengan pola `-c user.name=...`, commit Git dijamin mencatat nama anggota yang benar pada riwayat commit, terlepas dari konfigurasi global git di Termux!

### 5.3 Analisis Model Repositori: 1 Repo Utama + 7 Fork vs 1 Repo Bersama + Branch per Task

Pengguna menyatakan preferensi awal: **1 Repo Utama + 7 Fork**. Berikut analisis teknis perbandingannya:

| Kriteria Evaluasi | Opsi A: 1 Repo Utama + 7 Fork | Opsi B: 1 Repo Bersama + Branch per Task | Opsi C: Model Hibrida Berperingkat (Rekomendasi) |
| :--- | :--- | :--- | :--- |
| **Proteksi Kode `main`** | **Sangat Tinggi**: Tidak ada anggota yang bisa merusak `main` repo utama tanpa Pull Request. | **Tinggi**: Dapat diatur via fitur *Branch Protection Rules* di GitHub (require PR / approval). | **Sangat Tinggi**: `main` terkunci, penggabungan hanya via review. |
| **Kelancaran Estafet (Handover)** | **RUMIT & BERAT di Tablet**: Jika Anggota 1 selesai di fork-nya (`user1/repo`), Anggota 2 di tablet yang sama harus menambahkan remote fork Anggota 1 (`git remote add fork1 ...`), fetch branch, lalu checkout. Hal ini memicu overhead manajemen remote yang membingungkan bagi 8 orang di 1 Termux. | **SANGAT LANCAR**: Anggota 1 push ke `origin/task-001`. Anggota 2 cukup `git fetch && git checkout task-002`, berangkat dari branch yang sama di remote bersama. | **OPTIMAL**: Satu remote bersama `origin` dengan branch per task (`task/TASK-xxx`) untuk estafet harian. Fork dipakai untuk anggota luar / kontributor eksternal. |
| **Beban Penyimpanan di Tablet** | Membutuhkan 8 klon terpisah (memakan ~8x ruang penyimpanan disk) atau 1 klon dengan 8 remote URL berbeda. | Cukup **1 klon repositori** di Termux yang dipakai bersama dengan branch terisolasi. Sangat hemat storage. | 1 klon bersama di Termux, hemat memori flash. |
| **Resolusi Konflik** | Konflik antar-fork membutuhkan merge PR di GitHub web sebelum anggota berikutnya bisa lanjut. | Konflik branch dapat diselesaikan langsung di lokal atau via PR standar. | Standard PR merge workflow. |

**Rekomendasi Arsitektur Repositori:**
- **Rekomendasi Kuat: Opsi B / C (Satu Repositori Bersama dengan Branch per Task).**  
  Setiap task atomik dikerjakan di cabang terpisah: `task/TASK-001`, `task/TASK-002`.
  Ketika Anggota 1 selesai, ia melakukan push ke branch task tersebut dan memperbarui `SESSION_STATE.md`.
  Anggota 2 mengambil alih cukup dengan menarik branch tersebut:
  `git checkout task/TASK-002` (atau membuat branch baru dari commit terakhir yang disetujui).
  Dengan cara ini, 8 orang estafet di 1 tablet tidak terbebani oleh konfigurasi 7 remote fork yang rumit di terminal.

### 5.4 Penegakan Persetujuan Gerbang (Semua Boleh Menyetujui)
- Sesuai keputusan pengguna: **Semua 8 anggota memiliki wewenang menyetujui Gerbang (Gerbang 1 s.d. 4).**
- **Aturan Provenance:** Persetujuan tidak boleh anonim (`ya` saja). Pada matriks task dan blok checkpoint, persetujuan wajib mencatat nama anggota pemberi izin:
  `Disetujui: ya (oleh: [Nama Anggota])`
- **Rekomendasi Best-Practice (Non-Blocking):**
  Untuk menjaga objektivitas kualitas, PWA memberikan saran ramah: *"Disarankan Gerbang disetujui oleh anggota selain pembuat kode (peer-review)"*, namun sistem tetap mengizinkan persetujuan mandiri jika situasi estafet mengharuskannya.

### 5.5 Checklist Serah Terima Tablet (Device Handover Protocol)
Setiap kali tablet berpindah tangan antar-anggota tim, anggota yang selesai wajib menjalankan prosedur 4 langkah cepat:
1. **Langkah 1 (PWA):** Pastikan `SESSION_STATE.md` terisi lengkap (task selesai ditandai DONE dengan bukti, atau WAL terisi bila masih in-flight). Buat paket serah terima via tab Handover.
2. **Langkah 2 (Git):** Pastikan seluruh perubahan kode telah di-commit dan di-push ke GitHub:
   `git status` -> *working tree clean*.
3. **Langkah 3 (Kredensial):** Bersihkan cache kredensial Git di Termux jika menggunakan token:
   `git credential-cache exit`
4. **Langkah 4 (Browser & App):** Tutup tab obrolan AI atau logout dari akun AI jika browser dipakai bersama. Anggota berikutnya memilih nama profilnya di PWA.

---

## 6. KEPUTUSAN TERBUKA (DECISION MATRIX)

| No | Topik Keputusan | Pilihan yang Tersedia | Pilihan yang Ditetapkan / Direkomendasikan | Alasan & Konsekuensi Teknis |
| :---: | :--- | :--- | :--- | :--- |
| **D1** | **Mekanisme PWA–Termux** | A. Local Bridge Daemon<br>B. Intent/Share<br>C. Command & Template Hub | **C. Command & Template Hub** | Nol dependensi background process, tahan LMK Android, aman dari sandbox browser. |
| **D2** | **Model Kerja Bersama Git** | A. 1 Utama + 7 Fork<br>B. 1 Repo + Branch per Task | **B. 1 Repo + Branch per Task** | Jauh lebih sederhana dan cepat untuk alur estafet di 1 tablet tunggal tanpa overhead multi-remote. |
| **D3** | **Manajemen Kredensial Git** | A. Hardcode token di git config<br>B. Git Credential Cache (timeout 15m)<br>C. SSH key per anggota | **B. Git Credential Cache + Opsi C** | Mencegah kebocoran token antar anggota di tablet bersama; token tidak tersimpan permanen di disk. |
| **D4** | **Identitas Commit** | A. Global git config bergantian<br>B. Injeksi `-c user.name=...` per template | **B. Injeksi flag identitas per template** | Menjamin 100% commit diatribusikan ke anggota aktif yang dipilih di PWA tanpa risiko salah nama. |
| **D5** | **Lokasi Repo di Tablet** | A. Shared Storage (`/sdcard`)<br>B. Termux Home (`~`) | **B. Termux Home** | Menjamin integritas permission `chmod +x` dan performa native Linux ext4 filesystem. |
| **D6** | **Tampilan & Layout PWA** | A. Multi-window split-screen<br>B. Single-App Responsive Stack | **B. Single-App Responsive Stack** | Disesuaikan dengan masukan pengguna: anggota membuka 1 aplikasi bergantian untuk menghemat RAM 3GB. |
| **D7** | **Persetujuan Gerbang** | A. Hanya ketua tim<br>B. Seluruh anggota dengan nama | **B. Seluruh 8 anggota (dengan nama pemberi)** | Sesuai keputusan pengguna: demokrasi teknis dengan catatan provenance ketat. |

---

## 7. KESIMPULAN & KESIAPAN MELANGKAH KE BLUEPRINT (P2-CP3)

Seluruh aspek kelayakan teknis, batasan perangkat Samsung Tab A7 Lite, model estafet 8 anggota tim, dan mekanisme interaksi telah dianalisis secara komprehensif tanpa meninggalkan ambiguitas arsitektur.

Sesuai aturan Master Project Instruction v5 (Bagian 0, Bagian 5 P2-CP2, dan Bagian 8):
🛑 **PROSES SEKARANG BERHENTI.**

Silakan periksa dokumen keputusan ini dan berikan persetujuan:  
👉 **"Setujui P2-CP2"**  
*(Setelah persetujuan ini, kita akan melangkah ke P2-CP3: Penyusunan Dokumen Arsitektur & Blueprint Track 2 dalam batch kecil di `docs/mobile/blueprint/`).*
