# RENCANA REVISI ZLCE v3.2.2 (P1-CP2)
## Track 1: Penataan Fondasi, Penguatan Skrip, dan Dokumentasi Repositori

Tanggal: 2026-11-04  
Status: Draft Usulan Rencana Revisi  
Rujukan Temuan: `docs/revisi/AUDIT_3.22.md` (P1-CP1)  
Batas Tindakan: Hanya penyusunan dokumen `docs/revisi/REVISION_PLAN.md`. Implementasi kode baru dilakukan setelah persetujuan eksplisit pengguna pada P1-CP3.

---

## 1. PRINSIP EKSEKUSI REVISI TRACK 1

1. **Preserve ZLCE Core**: Tidak mengubah mekanisme 4 Gerbang Kualitas, pola penamaan task atomik, format Write-Ahead Log (WAL), atau protokol recovery Kasus A–D.
2. **Backward Compatibility**: Seluruh format dokumen kontrol, skema validator, dan struktur template tetap kompatibel 100% dengan dokumen yang telah ada.
3. **Pengaman Kerja Langsung di `main`**:
   - Setiap revisi dikerjakan secara atomik (satu REV per task).
   - Pengujian lulus linter (`npm run lint`), build (`npm run build`), dan validator (`zlce-check.py`) sebelum menyatakan selesai.
   - Tidak melakukan destructive reset (`git reset --hard` atau `push --force`).
4. **Pemisahan Track yang Tegas**:
   - Fitur PWA, integrasi Termux/CLI Hub, multi-AI/tim, dan Obsidian **ditunda sepenuhnya ke Track 2**.
   - Track 1 berfokus murni pada pembersihan, konsolidasi, keandalan skrip, dan penambahan test runner.

---

## 2. DAFTAR USULAN REVISI (REV-01 s.d. REV-12)

### [REV-01] Konsolidasi Skrip CLI & Mekanisme Sinkronisasi Otomatis
- **Rujukan Temuan:** AUD-01 (Skrip terduplikasi di `scripts/`, `scripts/zlce/`, `zlce-starter-kit/scripts/`).
- **Masalah:** Duplikasi tiga kali lipat berisiko memicu divergensi saat skrip diperbarui.
- **Perubahan Tepat:**
  1. Tetapkan `scripts/` di root repositori sebagai **sumber kanonik tunggal**.
  2. Tambahkan skrip pemeliharaan otomatis di `package.json` (`"sync:scripts": "node scripts/sync-assets.mjs"` atau bash) untuk menyalin isi kanonik `scripts/` ke `scripts/zlce/` dan `zlce-starter-kit/scripts/`.
  3. Perbarui dokumentasi di `scripts/README.md`.
- **Berkas Terdampak:** `scripts/`, `scripts/zlce/`, `zlce-starter-kit/scripts/`, `scripts/README.md`, `package.json`.
- **Risiko Regresi:** Sangat rendah (seluruh berkas saat ini terbukti identik 100%).
- **Cara Verifikasi:** Jalankan `sha256sum` terhadap ketiga direktori dan pastikan hash selalu identik.
- **Dependensi:** Tidak ada.
- **Prioritas:** Tinggi.
- **Alokasi:** **TRACK 1 (P1-CP3)**.

---

### [REV-02] Konsolidasi Prompt Dokumen & Pembaruan Starter Kit
- **Rujukan Temuan:** AUD-02 (Duplikasi `LANDING_PROMPT.md` dan `HANDOVER_PROMPT.md` di root dan starter kit).
- **Masalah:** Dua sumber kebenaran terpisah tanpa mekanisme sinkronisasi terotomatisasi.
- **Perubahan Tepat:**
  1. Tetapkan berkas di root (`/LANDING_PROMPT.md` dan `/HANDOVER_PROMPT.md`) sebagai sumber kanonik.
  2. Sertakan sinkronisasi berkas prompt ke dalam skrip sinkronisasi aset (`sync:prompts` atau gabungan `sync:assets`).
- **Berkas Terdampak:** `LANDING_PROMPT.md`, `HANDOVER_PROMPT.md`, `zlce-starter-kit/`, `package.json`.
- **Risiko Regresi:** Nol (isi saat ini sudah identik).
- **Cara Verifikasi:** Perintah `diff -u` membuktikan keselarasan nol perbedaan.
- **Dependensi:** REV-01.
- **Prioritas:** Sedang.
- **Alokasi:** **TRACK 1 (P1-CP3)**.

---

### [REV-03] Peningkatan Penanganan Berkas Sesi (Ekspor/Impor Markdown di UI)
- **Rujukan Temuan:** AUD-03 (Penyimpanan sesi hanya mengandalkan `localStorage` browser).
- **Masalah:** Bila cache browser dibersihkan atau batasan storage sandbox mobile terpicu, draft sesi berisiko hilang tanpa tersimpan ke file nyata.
- **Perubahan Tepat:**
  1. Tambahkan tombol **"Unduh SESSION_STATE.md"** pada bilah aksi di `SessionStateTab.tsx` dan `Header.tsx` (mengunduh berkas `.md` lokal).
  2. Tambahkan tombol **"Impor / Buka File .md"** untuk memuat berkas Markdown dari penyimpanan lokal ke dalam state editor.
  3. Pertahankan mekanisme auto-save `localStorage` dan stack Undo/Redo yang sudah ada tanpa pengurangan fitur pemulihan sesi.
- **Berkas Terdampak:** `src/components/SessionStateTab.tsx`, `src/components/Header.tsx`, `src/hooks/useSessionPersistence.ts`.
- **Risiko Regresi:** Rendah. Mekanisme persistence eksisting tidak diubah, hanya ditambahkan kanal I/O file manual.
- **Cara Verifikasi:**
  - Klik tombol "Unduh" -> Berkas `SESSION_STATE.md` terunduh dengan isi persis sama dengan editor.
  - Impor berkas `.md` sembarang -> State visual terisi dan linter langsung mengevaluasi.
- **Dependensi:** Tidak ada.
- **Prioritas:** Tinggi.
- **Alokasi:** **TRACK 1 (P1-CP3)**.

---

### [REV-04] Pembersihan Dependensi Tak Terpakai & Penataan Environment
- **Rujukan Temuan:** AUD-04 (`package.json` memuat `@google/genai`, `express`, `dotenv` tak terpakai).
- **Masalah:** Menambah ukuran instalasi dan menimbulkan salah paham bahwa aplikasi mewajibkan konfigurasi backend atau API key eksternal.
- **Perubahan Tepat:**
  1. Hapus `@google/genai`, `express`, `dotenv`, dan `@types/express` dari `package.json`.
  2. Perbarui `.env.example` untuk mencatat bahwa workbench berjalan murni client-side dan tidak memerlukan API key server.
- **Berkas Terdampak:** `package.json`, `.env.example`.
- **Risiko Regresi:** Sangat rendah (telah dibuktikan via pencarian grep bahwa pustaka tersebut tidak pernah diimpor di `src/`).
- **Cara Verifikasi:** Jalankan `npm run build` dan `npm run lint` -> Berhasil tanpa error impor.
- **Dependensi:** Tidak ada.
- **Prioritas:** Sedang.
- **Alokasi:** **TRACK 1 (P1-CP3)**.

---

### [REV-05] Penambahan Skrip Pengujian Otomatis (`npm test`)
- **Rujukan Temuan:** AUD-05 (Tidak ada skrip `test` di `package.json`, tidak ada runner CI).
- **Masalah:** Pengembang tidak memiliki satu perintah baku untuk memvalidasi seluruh aturan ZLCE terhadap contoh dan template.
- **Perubahan Tepat:**
  1. Tambahkan skrip pengujian berbasis Python/Node: `scripts/run-tests.py`.
  2. Uji yang dijalankan:
     - Validasi TypeScript (`tsc --noEmit`).
     - Eksekusi `zlce-check.py` terhadap `examples/SESSION_STATE.example.md`.
     - Eksekusi `zlce-check.py` terhadap `templates/SESSION_STATE.template.md`.
     - Verifikasi keselarasan checksum skrip kanonik.
  3. Daftarkan skrip `"test": "python3 scripts/run-tests.py"` di `package.json`.
- **Berkas Terdampak:** `package.json`, `scripts/run-tests.py`.
- **Risiko Regresi:** Sangat rendah.
- **Cara Verifikasi:** Eksekusi `npm test` menghasilkan laporan kelulusan 100% dengan exit code 0.
- **Dependensi:** REV-07 (opsi `--tasks` pada validator CLI).
- **Prioritas:** Tinggi.
- **Alokasi:** **TRACK 1 (P1-CP3)**.

---

### [REV-06] Perbaikan README, URL Repositori, dan Penghapusan Tautan Rusak
- **Rujukan Temuan:** AUD-06 (README menunjuk nama repo lama `ZLCEv3.2.2` dan badge CI 404).
- **Masalah:** Tautan isu, badge CI, dan dokumentasi mengarahkan ke repositori usang atau rusak.
- **Perubahan Tepat:**
  1. Perbarui seluruh URL repositori pada `README.md` ke `https://github.com/acimau99-netizen/ZLCE3.22-studio`.
  2. Ganti badge CI yang mengarah ke file workflow lama dengan badge status linter/test lokal atau tautan ke dokumentasi pengujian.
  3. Perjelas keterangan bahwa ZLCE Studio dapat berjalan sepenuhnya tanpa server tambahan.
- **Berkas Terdampak:** `README.md`.
- **Risiko Regresi:** Nol (hanya dokumentasi).
- **Cara Verifikasi:** Lakukan peninjauan visual dan verifikasi seluruh tautan di `README.md`.
- **Dependensi:** Tidak ada.
- **Prioritas:** Sedang.
- **Alokasi:** **TRACK 1 (P1-CP3)**.

---

### [REV-07] Penguatan Skrip Validator CLI (`zlce-check.py`)
- **Rujukan Temuan:** AUD-11 (Gagal saat validasi `examples/`, kegagalan git disembunyikan tanpa pesan).
- **Masalah:**
  - `zlce-check.py` melakukan hardcode path `TASKS.md`, sehingga validasi terhadap contoh (`SESSION_STATE.example.md` & `TASKS.example.md`) selalu mengeluarkan warning `TASKS.md tidak ditemukan`.
  - Fungsi `git()` mengabaikan error tanpa memberikan informasi kepada pengguna bahwa validasi status git dilewati.
- **Perubahan Tepat:**
  1. Tambahkan argumen opsional `--tasks <path>` pada `scripts/zlce-check.py`. Jika tidak diberikan, default ke `<root>/TASKS.md`.
  2. Bila dijalankan pada direktori yang memiliki `TASKS.example.md` dan tanpa `TASKS.md`, lakukan fallback cerdas ke `TASKS.example.md`.
  3. Tambahkan penanganan pesan peringatan `[WARN] Git tidak tersedia atau direktori bukan git repository (pemeriksaan working tree dilewati)` ketika git gagal, alih-alih mengabaikannya secara diam-diam.
  4. Format pesan keluaran (`[INFO]`, `[WARN]`, `[ERROR]`, `RESULT: ...`) dipertahankan 100% agar tidak merusak parser lain.
- **Berkas Terdampak:** `scripts/zlce-check.py` (dan salinannya via REV-01).
- **Risiko Regresi:** Sangat rendah. Format keluaran tetap kompatibel dengan pola lama.
- **Cara Verifikasi:**
  - `python3 scripts/zlce-check.py examples/ --state examples/SESSION_STATE.example.md --tasks examples/TASKS.example.md --no-git` -> `RESULT: OK (0 error, 0 warn)`.
  - `python3 scripts/zlce-check.py .` -> Menampilkan warning yang jelas bahwa git working tree dilewati bila `.git` tidak ada.
- **Dependensi:** Tidak ada.
- **Prioritas:** Tinggi.
- **Alokasi:** **TRACK 1 (P1-CP3)**.

---

### [REV-08] Penguatan Portabilitas Skrip Pemulihan Bash (`zlce-snapshot.sh`)
- **Rujukan Temuan:** AUD-09 & AUD-11 (Potensi error `date -Iseconds` di Android toybox & error saat argumen `--help`).
- **Masalah:** Argumen `--help` / `-h` memicu error `root tidak valid: --help` (exit 2).
- **Perubahan Tepat:**
  1. Tambahkan parsing argumen `-h` dan `--help` di awal skrip `scripts/zlce-snapshot.sh` yang menampilkan petunjuk penggunaan lengkap dan exit code 0.
  2. Ganti pemanggilan `date -Iseconds` dengan fallback portabel:
     `date -Iseconds 2>/dev/null || date +"%Y-%m-%dT%H:%M:%S%z"`.
- **Berkas Terdampak:** `scripts/zlce-snapshot.sh` (dan salinannya via REV-01).
- **Risiko Regresi:** Nol.
- **Cara Verifikasi:**
  - `bash scripts/zlce-snapshot.sh --help` -> Menampilkan bantuan dan exit 0.
  - `bash scripts/zlce-snapshot.sh .` -> Menghasilkan snapshot pemulihan tanpa error date.
- **Dependensi:** Tidak ada.
- **Prioritas:** Sedang.
- **Alokasi:** **TRACK 1 (P1-CP3)**.

---

### [REV-09] Penambahan `.gitattributes` & Normalisasi Izin Eksekusi
- **Rujukan Temuan:** AUD-12 (Tidak ada `.gitattributes`, izin file `.sh` adalah `-rw-r--r--`).
- **Masalah:** File bash rawan mengalami konversi baris CRLF di sistem operasi Windows yang menyebabkan error eksekusi di Termux/Linux (`\r: command not found`).
- **Perubahan Tepat:**
  1. Buat berkas `.gitattributes` di root dengan aturan:
     ```gitattributes
     * text=auto eol=lf
     *.sh text eol=lf
     *.py text eol=lf
     *.md text eol=lf
     *.zip binary
     ```
  2. Berikan izin eksekusi (`chmod +x`) pada skrip shell `scripts/zlce-snapshot.sh`.
- **Berkas Terdampak:** `.gitattributes`, `scripts/zlce-snapshot.sh`.
- **Risiko Regresi:** Nol.
- **Cara Verifikasi:** Periksa keberadaan `.gitattributes` dan verifikasi permission bit file `ls -l scripts/zlce-snapshot.sh`.
- **Dependensi:** Tidak ada.
- **Prioritas:** Sedang.
- **Alokasi:** **TRACK 1 (P1-CP3)**.

---

### [REV-10] Dokumentasi Kesenjangan Validasi & Panduan Keamanan Dev-Server
- **Rujukan Temuan:** AUD-07 & AUD-08 (Kesenjangan validasi Web vs CLI dan analisis keamanan `host: 0.0.0.0`).
- **Masalah:** Pengguna antarmuka web perlu memahami mengapa validator web tidak memeriksa working tree Git, serta cara mengamankan port dev-server saat dijalankan di jaringan publik/lokal tablet.
- **Perubahan Tepat:**
  1. Tambahkan catatan informatif di panel Linter `SessionStateTab.tsx` yang menerangkan bahwa validasi silang `TASKS.md` dan working tree Git dilakukan secara presisi oleh skrip CLI `zlce-check.py`.
  2. Tambahkan sub-bagian keamanan pada `docs/USAGE.md` mengenai opsi menjalankan dev server dengan host `127.0.0.1` jika tidak memerlukan akses lintas perangkat di jaringan lokal.
- **Berkas Terdampak:** `src/components/SessionStateTab.tsx`, `docs/USAGE.md`.
- **Risiko Regresi:** Nol.
- **Cara Verifikasi:** Peninjauan antarmuka Session State Tab dan pembacaan `docs/USAGE.md`.
- **Dependensi:** Tidak ada.
- **Prioritas:** Rendah.
- **Alokasi:** **TRACK 1 (P1-CP3)**.

---

### [REV-11] Model Multi-AI, Multi-Akun, Task Leases & State Tim (DITUNDA KE TRACK 2)
- **Rujukan Temuan:** AUD-13 (Invarian 1 task `IN_PROGRESS` dan single WAL membatasi kerja tim paralel).
- **Alasan Penundaan:** Merupakan perubahan konseptual dan arsitektur besar. Sesuai Bagian 0 dan Bagian 4 Master Prompt v5, Track 1 dilarang mengubah mekanisme inti ZLCE. Model ini dirancang secara formal pada Blueprint Track 2 (`docs/mobile/blueprint/14_MULTI_AI_TEAM_MODEL.md`).
- **Alokasi:** **DITUNDA KE TRACK 2 (P2-CP2 / P2-CP3)**.

---

### [REV-12] Arsitektur PWA Mobile, Layout Tablet & Hub Termux (DITUNDA KE TRACK 2)
- **Rujukan Temuan:** Master Prompt v5 Bagian 1.3, 1.4, 5.1.
- **Alasan Penundaan:** Fitur PWA (Service Worker, Web Manifest, Layout Tablet dua panel, Command & Template Hub Termux, integrasi Obsidian) adalah ruang lingkup eksklusif Track 2.
- **Alokasi:** **DITUNDA KE TRACK 2 (P2-CP1 s.d. P2-CP6)**.

---

## 3. MATRIKS RINGKASAN USULAN REVISI TRACK 1

| ID | Nama Revisi | Rujukan | Berkas Kunci | Tingkat Risiko | Prioritas | Rekomendasi Alokasi |
| :---: | :--- | :---: | :--- | :---: | :---: | :---: |
| **REV-01** | Konsolidasi Skrip CLI & Sinkronisasi | AUD-01 | `scripts/`, `scripts/zlce/`, `package.json` | Rendah | Tinggi | **Track 1** |
| **REV-02** | Konsolidasi Dokumen Prompt | AUD-02 | `LANDING_PROMPT.md`, `HANDOVER_PROMPT.md` | Nol | Sedang | **Track 1** |
| **REV-03** | Ekspor / Impor File Markdown di UI | AUD-03 | `SessionStateTab.tsx`, `Header.tsx` | Rendah | Tinggi | **Track 1** |
| **REV-04** | Pembersihan Dependensi Phantom | AUD-04 | `package.json`, `.env.example` | Sangat Rendah | Sedang | **Track 1** |
| **REV-05** | Penambahan Test Runner `npm test` | AUD-05 | `package.json`, `scripts/run-tests.py` | Sangat Rendah | Tinggi | **Track 1** |
| **REV-06** | Pembaruan URL README & Badge | AUD-06 | `README.md` | Nol | Sedang | **Track 1** |
| **REV-07** | Penguatan CLI `zlce-check.py` | AUD-11 | `scripts/zlce-check.py` | Rendah | Tinggi | **Track 1** |
| **REV-08** | Portabilitas `zlce-snapshot.sh` | AUD-09, 11 | `scripts/zlce-snapshot.sh` | Nol | Sedang | **Track 1** |
| **REV-09** | Penambahan `.gitattributes` & Chmod | AUD-12 | `.gitattributes`, `zlce-snapshot.sh` | Nol | Sedang | **Track 1** |
| **REV-10** | Dokumentasi Kesenjangan & Keamanan | AUD-07, 08 | `SessionStateTab.tsx`, `docs/USAGE.md` | Nol | Rendah | **Track 1** |
| **REV-11** | Model Multi-AI, Multi-Akun & Tim | AUD-13 | `docs/mobile/blueprint/` | - | - | **Ditunda ke Track 2** |
| **REV-12** | PWA Tablet & Command Hub Termux | Bagian 5 | `docs/mobile/` | - | - | **Ditunda ke Track 2** |

---

## 4. URUTAN EKSEKUSI PADA P1-CP3 (BILA SELURUHNYA DISETUJUI)

Urutan pengerjaan task atomik diatur berdasarkan dependensi teknis:
1. **Langkah 1 (Skrip & Pengujian)**: REV-07 (`zlce-check.py`) + REV-08 (`zlce-snapshot.sh`) + REV-09 (`.gitattributes`).
2. **Langkah 2 (Konsolidasi & Otomasi)**: REV-01 (Konsolidasi Skrip) + REV-02 (Konsolidasi Prompt).
3. **Langkah 3 (Paket & Test Runner)**: REV-04 (Pembersihan Dependensi) + REV-05 (Skrip `npm test`).
4. **Langkah 4 (Penyempurnaan UI & Fitur Sesi)**: REV-03 (Ekspor/Impor File Markdown) + REV-10 (Dokumentasi Linter UI & USAGE.md).
5. **Langkah 5 (Dokumentasi & README)**: REV-06 (Perbaikan README dan URL repo).
6. **Langkah 6 (Verifikasi Final P1-CP4)**: Eksekusi `npm test`, `npm run lint`, `npm run build`, dan pembuatan laporan `REVISION_REPORT.md`.

---

## 5. KESIMPULAN & PANDUAN PERSETUJUAN

Dokumen rencana revisi `REVISION_PLAN.md` telah selesai dirumuskan secara rinci dan terstruktur.

Sesuai aturan Master Project Instruction v5 (Bagian 0, Bagian 4 P1-CP2, dan Bagian 8):
🛑 **PROSES SEKARANG BERHENTI.**

Pengguna dipersilakan memilih dan memberikan persetujuan dengan format:
- **"Setujui P1-CP2 (Semua REV-01 s.d. REV-10)"** — untuk mengeksekusi seluruh 10 revisi Track 1.
- Atau menyebutkan daftar spesifik, contohnya: **"Setujui P1-CP2 (REV-01, REV-03, REV-05, REV-07)"**.
