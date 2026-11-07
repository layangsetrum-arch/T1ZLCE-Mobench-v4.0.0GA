# BLUEPRINT 12: CATATAN KEPUTUSAN ARSITEKTUR (ADR)
## Architecture Decision Records untuk ZLCE Mobile Workbench v4.0.0

Tanggal: 2026-11-04  
Status: **DRAFT BLUEPRINT (BATCH 4 - FINAL)**  
Rujukan Dokumen: `docs/mobile/FEASIBILITY_AND_DECISIONS.md`

---

## ADR-01: Command & Template Hub vs Local Bridge Daemon
- **Konteks:** PWA di peramban Android berjalan dalam sandbox dan tidak memiliki izin mengeksekusi shell Termux secara langsung.
- **Pilihan yang Dipertimbangkan:**
  1. *Local Bridge Daemon:* Menjalankan server HTTP kecil (Express/Python) di Termux di latar belakang untuk menerima perintah dari PWA.
  2. *Command & Template Hub:* PWA merakit template perintah yang benar dan aman, lalu pengguna menyalinnya dengan 1 ketukan ke Termux.
- **Keputusan:** **Memilih Command & Template Hub.**
- **Konsekuensi:** Menghilangkan ketergantungan pada daemon background yang boros RAM (pada tablet 3GB) dan rentan dimatikan oleh Android LMK. Tidak ada port jaringan lokal yang terbuka; keamanan terjamin maksimal.

---

## ADR-02: Pola Satu Aplikasi Bergantian (Single-App) vs Multi-Window
- **Konteks:** Samsung Galaxy Tab A7 Lite (SM-T225) memiliki layar 8.7" dan RAM 3GB (sisa RAM bebas pengguna hanya ~700–1000 MB).
- **Pilihan yang Dipertimbangkan:**
  1. *Multi-Window / Split-Screen:* Membuka PWA dan Termux berdampingan secara horizontal.
  2. *Single-App Sequential Flow:* Pengguna membuka 1 aplikasi bergantian (PWA -> Termux -> AI Browser).
- **Keputusan:** **Memilih Single-App Sequential Flow.**
- **Konsekuensi:** Desain antarmuka dioptimalkan dalam tumpukan vertikal responsif tanpa menuntut split-screen. Menghemat memori RAM secara signifikan dan mencegah Android LMK membunuh aplikasi saat berpindah.

---

## ADR-03: Model Repositori: 1 Repo Bersama + Branch per Task vs 1 Repo + 7 Fork
- **Konteks:** 8 anggota tim bekerja secara estafet pada satu tablet bersama.
- **Pilihan yang Dipertimbangkan:**
  1. *1 Repo Utama + 7 Fork:* Setiap anggota memiliki fork pribadi di GitHub.
  2. *1 Repo Bersama + Branch per Task (`task/TASK-xxx`):* Seluruh anggota bekerja pada 1 repositori bersama dengan cabang terisolasi per task dan proteksi branch `main`.
- **Keputusan:** **Memilih 1 Repo Bersama + Branch per Task (Rekomendasi Optimal).**
- **Konsekuensi:** Menghilangkan kerumitan konfigurasi 7 remote fork di Termux pada tablet tunggal. Estafet berlangsung mulus: Anggota 2 cukup menarik branch `task/TASK-001` milik Anggota 1 dari remote bersama tanpa overhead pergantian remote URL.

---

## ADR-04: Manajemen Kredensial Git di Termux (Credential Cache vs Simpan Token di Disk)
- **Konteks:** Tablet digunakan bersama oleh 8 anggota, masing-masing dengan akun GitHub pribadi. Menyimpan Personal Access Token (PAT) secara permanen di disk berisiko tinggi dicuri anggota lain.
- **Pilihan yang Dipertimbangkan:**
  1. *Simpan PAT di file config:* Token disimpan permanen di `~/.git-credentials`.
  2. *Git Credential Cache (Timeout 15 Menit):* Token hanya disimpan sementara di memori RAM dan dihapus otomatis setelah timeout atau saat serah terima.
- **Keputusan:** **Memilih Git Credential Cache (`cache --timeout=900`) + Perintah Handover `zlce clean-auth`.**
- **Konsekuensi:** Nol token yang tertinggal di media penyimpanan flash tablet. Bila tablet hilang atau dioper, token aman dari penyalahgunaan.

---

## ADR-05: Penegakan Identitas Commit via Flag Perintah vs Git Config Global
- **Konteks:** Setiap anggota wajib mencatatkan namanya sendiri pada commit Git yang dikerjakannya (Invarian I4: Provenance).
- **Pilihan yang Dipertimbangkan:**
  1. *Mengubah git config global:* Menjalankan `git config --global user.name` setiap pergantian orang.
  2. *Injeksi flag identitas per perintah:* PWA menyertakan flag `-c user.name="..." -c user.email="..."` pada setiap template commit yang dihasilkan.
- **Keputusan:** **Memilih Injeksi Flag Identitas per Perintah.**
- **Konsekuensi:** Menjamin 100% commit diatribusikan ke anggota aktif yang dipilih di PWA secara deterministik, tanpa risiko terlupa mengganti config global.

---

## ADR-06: Lokasi Repositori di Tablet: Termux Home vs Android Shared Storage
- **Konteks:** Pemilihan direktori tempat repositori di-clone di tablet Android.
- **Pilihan yang Dipertimbangkan:**
  1. *Shared Storage (`/sdcard/`):* Mudah diakses oleh aplikasi file manager Android, namun sistem berkas FAT/FUSE menolak izin eksekusi (`chmod +x`), memicu error git `dubious ownership`, dan lambat.
  2. *Termux Home (`~`):* Sistem berkas native ext4 Linux di dalam direktori privat Termux.
- **Keputusan:** **Memilih Termux Home (`~/projects/...`).**
- **Konsekuensi:** Seluruh skrip shell `+x`, Git hooks, dan kompilasi proyek beroperasi normal dengan performa native Linux. Berkas Markdown dapat diekspor ke shared storage sewaktu-waktu via tombol ekspor PWA.

---

## ADR-07: Hak Persetujuan Gerbang Kualitas (Quality Gates)
- **Konteks:** Siapa yang berhak menyetujui Gerbang 1 s.d. 4 pada kolaborasi 8 anggota tim.
- **Pilihan yang Dipertimbangkan:**
  1. *Hanya Ketua Tim / Admin:* Menghambat alur estafet jika ketua tidak memegang tablet.
  2. *Seluruh 8 Anggota Tim (Demokrasi Teknis dengan Provenance Ketat):* Semua anggota berhak menyetujui, namun nama penyetuju wajib dicatat pada matriks task dan log audit `SESSION_STATE.md`.
- **Keputusan:** **Memilih Seluruh 8 Anggota Tim (Sesuai Arahan Pengguna).**
- **Konsekuensi:** Estafet berjalan lancar dan otonom. Akuntabilitas teknis tetap terjaga melalui pencatatan nama penyetuju secara eksplisit (`Disetujui: ya (oleh: [Nama])`).

---

## ADR-08: Skema Penamaan Versi (SemVer Berawalan "v")
- **Konteks:** Standardisasi penomoran rilis dan tag Git di seluruh siklus proyek.
- **Keputusan:** Menggunakan **Semantic Versioning dengan awalan huruf `v`**:
  - `v3.3.0`: Penutupan Track 1 (Revisi ZLCE Core & Test Suite).
  - `v4.0.0-alpha.N`: Fase 1 & 2 (PWA Shell & Markdown Workspace).
  - `v4.0.0-beta.N`: Fase 3 & 4 (Multi-AI Context Pack & Tim Estafet).
  - `v4.0.0-rc.N`: Fase 5 & 6 (Command Hub & Git Sync).
  - `v4.0.0`: Rilis Final ZLCE Mobile Workbench.
  - `v4.1.0`: Rilis Kompatibilitas Eksternal Opsional (Non-Inti).

---

## ADR-09: Eksklusi Obsidian dari Blueprint Inti v4.0.0 (Zero External Note-Tool Architecture)
- **Konteks:** Evaluasi apakah aplikasi pencatat pihak ketiga (Obsidian atau Joplin) perlu dimasukkan ke dalam arsitektur inti ZLCE Mobile Workbench v4.0.0 pada tablet Samsung Galaxy Tab A7 Lite (SM-T225) dengan keterbatasan RAM 3GB (~700–1000 MB RAM bebas).
- **Pilihan yang Dipertimbangkan:**
  1. *Mengintegrasikan Obsidian/Joplin ke dalam Blueprint Inti:* Menjadikan aplikasi catatan pihak ketiga sebagai viewer atau penyimpan dokumen proyek.
  2. *Mengeluarkan Obsidian dari Blueprint Inti v4.0.0 (Self-Contained ZLCE):* Menjaga sistem ZLCE 100% mandiri dengan ZLCE PWA (Command Hub & Markdown Viewer), Termux (Linux environment + editor terminal `micro`), dan Git.
- **Keputusan:** **Memilih Opsi 2 (Keluarkan Obsidian dari Blueprint Inti v4.0.0).**
- **Konsekuensi:**
  - **Efisiensi RAM Maksimal:** Menghemat 120–180 MB RAM latar belakang Android dari beban proses Electron/WebView Obsidian atau database internal Joplin. Menjaga Chrome dan Termux tidak mudah dibunuh oleh Android LMK.
  - **Zero Database Lock-in:** Seluruh dokumen kontrol ZLCE tetap berupa Markdown standar di sistem berkas ext4 Termux (`~/projects/`), dapat dibaca instan dan diedit dengan `micro` (~5 MB RAM) atau via PWA viewer.
  - **Alur Kerja Segitiga Emas Bersih (3 Aplikasi):** 
    1. ZLCE PWA (Command Hub, Role Prompts, Context Builder, Task Board)
    2. Termux (Git, scripts, editor `micro`, pengujian lokal)
    3. AI Browser (Claude, Gemini, ChatGPT)
  - ZLCE Mobile Workbench menjadi sistem berdaya penuh (*powerful*) dan mandiri tanpa ketergantungan pada alat eksternal pihak ketiga apa pun.
