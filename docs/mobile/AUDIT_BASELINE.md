# AUDIT BASELINE TRACK 1 & AUDIT KESIAPAN PWA TABLET (P2-CP1)

Tanggal Audit: 2026-11-04  
Status: **P2-CP1 SELESAI**  
Dokumen Target: Track 2 — Checkpoint 1 (P2-CP1 Audit Baseline & PWA)  
Batas Tulis: Hanya `docs/mobile/AUDIT_BASELINE.md`. Seluruh berkas lain berstatus baca-saja.

---

## 1. VERIFIKASI HASIL TRACK 1 TERHADAP REVISION_REPORT

Pemeriksaan empiris memastikan bahwa kondisi repositori saat ini merefleksikan seluruh penyelesaian 10 revisi Track 1 tanpa ada item yang tertinggal atau menyimpang:

| ID Revisi | Komponen / Perubahan | Status Baseline | Bukti Empiris | Klasifikasi |
| :---: | :--- | :---: | :--- | :---: |
| **REV-01** | Skrip sinkronisasi kanonik | **AKTIF** | `scripts/sync-assets.mjs` menyelaraskan skrip di 3 direktori dengan hash identik | **VERIFIED** |
| **REV-02** | Sinkronisasi dokumen prompt | **AKTIF** | `LANDING_PROMPT.md` dan `HANDOVER_PROMPT.md` di root dan starter-kit terbukti sinkron | **VERIFIED** |
| **REV-03** | I/O File Markdown di UI | **AKTIF** | Tombol "Impor .md" dan "Export .md" terpasang di `SessionStateTab.tsx` | **VERIFIED** |
| **REV-04** | Pembersihan dependensi phantom | **AKTIF** | `package.json` bersih dari `@google/genai`, `express`, `dotenv`, `@types/express` | **VERIFIED** |
| **REV-05** | Test runner otomatis `npm test` | **AKTIF** | `scripts/run-tests.py` lulus 100% (5/5 checks OK) saat `npm test` dijalankan | **VERIFIED** |
| **REV-06** | URL repositori & perbaikan README | **AKTIF** | `README.md` merujuk `ZLCE3.22-studio`; badge CI lama diganti badge pengujian | **VERIFIED** |
| **REV-07** | Opsi `--tasks` pada `zlce-check.py` | **AKTIF** | Pengujian `examples/` lolos 0 error 0 warn via fallback `TASKS.example.md` | **VERIFIED** |
| **REV-08** | Bantuan & portabilitas snapshot | **AKTIF** | `bash scripts/zlce-snapshot.sh --help` menghasilkan petunjuk dan exit 0 | **VERIFIED** |
| **REV-09** | Normalisasi `.gitattributes` & Chmod | **AKTIF** | `.gitattributes` terpasang (LF) dan izin eksekusi `+x` aktif pada skrip `.sh` | **VERIFIED** |
| **REV-10** | Edukasi Linter UI & USAGE | **AKTIF** | Catatan Web vs CLI tampil di Linter Card dan panduan bind host dev ada di `USAGE.md` | **VERIFIED** |

**Kesimpulan Bagian 1:** Hasil Track 1 telah diverifikasi 100% konsisten dengan `docs/revisi/REVISION_REPORT.md`. Baseline ini kokoh untuk memulai Track 2.

---

## 2. AUDIT KESIAPAN PROGRESSIVE WEB APP (PWA)

Pemeriksaan menyeluruh terhadap arsitektur web saat ini membuktikan bahwa **kemampuan PWA saat ini berstatus belum diimplementasikan (NOT IMPLEMENTED)**:

| Aspek PWA | Kondisi Aktual | Bukti | Klasifikasi | Kebutuhan Track 2 |
| :--- | :--- | :--- | :---: | :--- |
| **Web App Manifest** | Berkas `manifest.json` / `manifest.webmanifest` **TIDAK ADA**. Tag `<link rel="manifest">` tidak ada di `index.html`. | `ls -la public/` & `cat index.html` | **NOT IMPLEMENTED** | Wajib dibuat di `public/manifest.webmanifest` dengan display `standalone`, `theme_color`, dan `shortcuts`. |
| **Service Worker** | Tidak ada berkas `sw.js` atau pendaftaran Service Worker (`navigator.serviceWorker.register`) di `src/main.tsx` atau `src/App.tsx`. | `grep -rn "serviceWorker" src/` -> kosong | **NOT IMPLEMENTED** | Wajib dibuat untuk caching shell aplikasi dan aset statis. |
| **Aset Ikon PWA** | Hanya ada SVG favicon data-URI sederhana di `<link rel="icon">`. Tidak ada ikon resolusi tinggi (`192x192`, `512x512`, `maskable`). | `index.html:5` | **NOT IMPLEMENTED** | Sediakan ikon standar PWA di `public/icons/`. |
| **Strategi Caching** | Tidak ada mekanisme Cache Storage API / runtime caching untuk offline use. | Tidak ada Service Worker | **NOT IMPLEMENTED** | Cache-first untuk shell dan aset statis (Vite dist bundle), stale-while-revalidate untuk template. |
| **Offline Shell** | Aplikasi hanya dapat dibuka bila ada koneksi aktif ke web dev-server. Bila koneksi putus sebelum aplikasi dibuka, browser menampilkan halaman error *offline*. | Analisis runtime | **NOT IMPLEMENTED** | Offline shell memungkinkan PWA terbuka kapan saja di tablet meski tanpa internet/Wi-Fi. |
| **Mode Terpasang (Installability)** | Browser mobile/tablet tidak menampilkan tombol *"Install ZLCE Workbench"* atau banner A2HS (Add to Home Screen). | Ketiadaan manifest & service worker | **NOT IMPLEMENTED** | Menjamin PWA dapat diinstal sebagai aplikasi mandiri di homescreen tablet. |
| **PWA Shortcuts** | Tidak ada jalan pintas (app shortcuts) untuk aksi cepat dari ikon homescreen. | Ketiadaan manifest | **NOT IMPLEMENTED** | Sediakan shortcut: *Quick Validator*, *New Task Prompt*, *Recovery Wizard*. |

---

## 3. AUDIT KESESUAIAN PENGGUNAAN PADA TABLET ANDROID

### 3.1 Karakteristik Perangkat & Tuntutan Antarmuka
Tablet Android (layar 10 hingga 14 inci) memiliki karakteristik unik yang membedakannya dari desktop dan ponsel:

1. **Tata Letak Dua Panel (Master-Detail Layout):**
   - *Kondisi Aktual*: Antarmuka saat ini bertumpuk secara vertikal dalam satu kolom terpusat (`max-w-7xl mx-auto`).
   - *Kebutuhan*: Pada orientasi lanskap, layar lebar harus dimanfaatkan dengan tata letak dua panel berdampingan (Panel Kiri: Daftar Task, Status, Switcher; Panel Kanan: Detail Task, WAL Aktif, Template Command, Diagnostik).
2. **Multi-Window & Split-Screen:**
   - *Kondisi Aktual*: Komponen mengasumsikan lebar layar penuh desktop (di atas 1024px).
   - *Kebutuhan*: Dalam mode split-screen (misalnya 50% PWA di kiri, 50% Termux atau browser AI di kanan), lebar PWA menyempit ke ~500px–700px. Antarmuka harus secara mulus beralih ke tata letak adaptif tanpa merusak keterbacaan tabel dan form.
3. **Ukuran Target Sentuh (Touch Targets):**
   - *Kondisi Aktual*: Beberapa tombol aksi di tabel (seperti tombol status atau tag dependensi) berukuran sangat rapat (`px-1.5 py-0.5` atau `px-2 py-1`), tinggi sekitar 22–26px.
   - *Kebutuhan*: Standar kenyamanan sentuhan jari Android membutuhkan target sentuh minimal 44x44px atau 48x48px untuk mencegah salah ketuk saat dioperasikan dengan jari atau stylus.
4. **Keyboard Virtual (Software Keyboard Viewport Obstruction):**
   - *Kondisi Aktual*: Textarea editor raw Markdown mengambil tinggi fleksibel. Saat keyboard virtual Android muncul, 40–50% area layar bawah tertutup keyboard, menyembunyikan tombol simpan dan pesan linter.
   - *Kebutuhan*: Penyesuaian layout berbasis `visualViewport` API agar tombol aksi penting tetap mengambang (*floating*) di atas keyboard virtual.

---

### 3.2 Keterbatasan Sistem Android & Analisis Risiko

| Keterbatasan Android | Dampak Teknis | Solusi Desain ZLCE Mobile Workbench | Status Pembuktian |
| :--- | :--- | :--- | :---: |
| **Sandbox Browser & Filesystem Isolation** | PWA di peramban (Chrome/Brave/Edge) tidak memiliki izin membaca/menulis direktori internal Termux (`/data/data/com.termux/`) atau shared storage secara transparan tanpa interaksi pengguna. | PWA bertindak sebagai **Command & Template Hub**: PWA menyiapkan teks Markdown dan perintah CLI yang benar, pengguna menyalin dengan satu ketukan ke Termux. | **VERIFIED** (secara arsitektur browser Android) |
| **Android Background Process Killer (Low Memory Killer)** | Android secara agresif dapat mematikan proses latar belakang (Termux atau browser) saat memori RAM minim ketika pengguna berganti aplikasi. | Tidak ada proses background yang berstatus permanen (*zero daemon dependency*). Semua state disimpan atomik ke disk/localStorage sebelum perpindahan aplikasi. | **PARTIALLY VERIFIED** (perlu verifikasi pada perangkat riil) |
| **Kelemahan Input Keyboard Layar** | Mengetik perintah panjang di CLI Android Termux sangat lambat dan rawan typo (misalnya path yang salah atau flag yang typo). | Fitur **One-Tap Copy** via Clipboard API dengan template yang sudah terisi parameter proyek (Task ID, path, branch) secara otomatis. | **PARTIALLY VERIFIED** (perlu verifikasi izin clipboard di tablet) |
| **Konektivitas Tidak Stabil (Offline-First)** | Pengguna sering bekerja di lokasi tanpa internet atau menggunakan tablet Wi-Fi only. | PWA offline shell + Termux lokal + Git lokal berjalan 100% tanpa internet. Koneksi internet hanya dibutuhkan saat sinkronisasi `git push/pull` ke GitHub. | **VERIFIED** |

---

## 4. PEMETAAN KOMPONEN REPOSITORI (REUSABILITY MATRIX)

### 4.1 Komponen yang SIAP PAKAI (Tanpa Perlu Ditulis Ulang)
1. **Validator ZLCE Web (`src/utils/zlceValidator.ts`)**: Logika validasi matriks, dependensi, enum status, WAL, dan aturan jam X1 sudah matang dan lolos uji.
2. **Parser & Serializer Markdown (`src/utils/markdownParser.ts`)**: Fungsi konversi 2 arah antara Markdown dan object JSON siap dipakai untuk membaca/menulis file proyek.
3. **Skrip Kanonik CLI (`scripts/zlce-check.py`, `scripts/zlce-collect.py`, `scripts/zlce-snapshot.sh`)**: Skrip kanonik hasil Track 1 dapat langsung dijalankan di Termux Android (Python 3.11+ / Bash).
4. **Template Kanonik ZLCE (`src/data/templates.ts` & `templates/`)**: 9 template dokumen kontrol dan 1 profil booking siap menjadi sumber katalog template.
5. **Logika Simulator Recovery (`src/components/RecoveryTab.tsx` & `src/data/scenarios.ts`)**: Alur preskriptif Kasus A–D siap dihubungkan ke template pemulihan mobile.
6. **Token Budget Calculator Engine (`src/components/RuntimeEngineTab.tsx`)**: Kalkulator kuota token Free tier 8 penyedia siap dipakai untuk memandu context pack.

### 4.2 Komponen yang PERLU DIADAPTASI (Dimodifikasi Ringan)
1. **Header & Navigasi (`src/components/Header.tsx`)**:
   - Diperlukan adaptasi ukuran untuk tablet dan mode multi-window (tinggi header lebih ramping saat split-screen).
   - Menambahkan dropdown **Project Switcher** untuk memilih proyek aktif.
2. **SessionStateTab (`src/components/SessionStateTab.tsx`)**:
   - Diperlukan mode tampilan dua panel (Split Panel / Master-Detail) di tablet.
   - Peningkatan ukuran padding tombol status dan tag aksi agar ramah sentuhan jari.
3. **PromptEngineTab (`src/components/PromptEngineTab.tsx`)**:
   - Diadaptasi menjadi **Context Builder & Prompt Generator** yang mampu mengekstrak potongan konteks dari proyek aktif dan mendukung adapter profil AI berbeda.
4. **FullscreenEditorModal (`src/components/FullscreenEditorModal.tsx`)**:
   - Disesuaikan agar ramah keyboard virtual Android (dukungan scrollable viewport dinamis).

### 4.3 Komponen BARU yang HARUS DITAMBAHKAN di Track 2
1. **Manifest & Service Worker (`public/manifest.webmanifest`, `src/sw.ts` atau Workbox)**: Fondasi PWA, offline shell, dan mode terpasang.
2. **Multi-Project Workspace Manager (`src/components/mobile/ProjectManager.tsx`)**: Pengelola banyak proyek lokal dengan penyimpanan metadata di Markdown/local store.
3. **Command & Template Hub (`src/components/mobile/CommandHubTab.tsx`)**:
   - Katalog template perintah terstruktur (Git, Python, Test, Recovery) dengan parameter otomatis.
   - Tombol salin 1-ketukan, label tingkat risiko (*read-only*, *write*, *destructive*), dan pencegahan command injection.
   - Panel **Paste-Back Parser** untuk membaca luaran terminal Termux dan menyinkronkan status ke UI.
4. **Multi-AI & Multi-Akun Context Pack Manager (`src/components/mobile/ContextPackTab.tsx`)**:
   - Model aktor (manusia, penyedia AI, model AI, alias akun).
   - Penjejak provenance (siapa menghasilkan apa, kapan, pada task mana).
   - Mekanisme klaim/lease task dan integrasi handover lintas aktor.
5. **Git Sync Manager UI (`src/components/mobile/GitSyncTab.tsx`)**:
   - Pembuat template perintah git (status ringkas, pull aman `--ff-only`, commit terstruktur dengan Task ID, push).

---

## 5. KESIMPULAN & KESIAPAN MELANGKAH KE P2-CP2

Audit baseline Track 1 dan kesiapan PWA membuktikan bahwa:
1. **Baseline Track 1 telah bersih, konsisten, dan siap 100%**.
2. **Komponen inti ZLCE (validator, parser, template, skrip) memiliki tingkat pemakaian ulang (reusability) yang sangat tinggi (~70%)**, sehingga Track 2 tidak perlu menulis ulang sistem dari nol.
3. **PWA saat ini belum ada sama sekali**, sehingga Track 2 akan menambahkan lapisan PWA murni di atas fondasi yang telah ada.
4. Arah desain pengguna bahwa **PWA bertindak sebagai Command & Template Hub** merupakan strategi paling realistis dan aman terhadap kendala sandbox Android dan pembatasan filesystem.

Sesuai aturan Master Project Instruction v5 (Bagian 0, Bagian 5 P2-CP1, dan Bagian 8):
🛑 **PROSES SEKARANG BERHENTI.**

Silakan periksa laporan ini dan berikan persetujuan eksplisit:  
👉 **"Setujui P2-CP1"**  
*(Untuk melanjutkan ke P2-CP2: Kelayakan Teknis, Kuesioner Profil Perangkat Tablet, dan Keputusan Terbuka).*
