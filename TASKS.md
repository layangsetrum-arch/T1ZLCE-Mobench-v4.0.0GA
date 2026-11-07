# BACKLOG TASK PENGEMBANGAN: ZLCE MOBILE WORKBENCH v4.0.0
## Rincian Task Atomik Implementasi Tablet Bersama (Samsung Galaxy Tab A7 Lite • 8 Anggota)

Definisi seluruh task implementasi Track 2. **Status task aktif tidak ditulis di sini**; status dan matriks dinamis dikelola di `SESSION_STATE.md`. Aturan, enum, dan protokol: `docs/mobile/blueprint/`.

---

## 1. PETA FASE IMPLEMENTASI

* **FASE 0: Baseline & Persiapan Lingkungan Uji** (`TASK-001` s/d `TASK-002`)
* **FASE 1: Fondasi PWA Tablet Android & Ergonomi Layar Sentuh** (`TASK-003` s/d `TASK-007`)
* **FASE 2: Markdown Workspace & Manajemen Multi-Proyek** (`TASK-008` s/d `TASK-012`)
* **FASE 3: Multi-AI & Context Pack Portabel [PRIORITAS UTAMA]** (`TASK-013` s/d `TASK-018`)
* **FASE 4: Multi-Akun & Tim Estafet 8 Anggota [PRIORITAS UTAMA]** (`TASK-019` s/d `TASK-024`)
* **FASE 5: Command Hub & Termux Dispatcher** (`TASK-025` s/d `TASK-030`)
* **FASE 6: Git Sync & Kolaborasi Cabang Tim** (`TASK-031` s/d `TASK-035`)
* **FASE 7: Uji Integrasi Penuh & Verifikasi Tablet Fisik SM-T225** (`TASK-036` s/d `TASK-040`)
* **FASE 8: Dokumentasi & Panduan Operasional Terpadu** (`TASK-041` s/d `TASK-043`)
* **FASE 9: Audit, Testing & Review Multi-AI Eksternal** (`TASK-044` s/d `TASK-046`)
* **FASE 10: Remediasi Audit & Pengerasan Sistem [AUD-001 s.d. AUD-014]** (`TASK-047` s/d `TASK-060`)
* **FASE 11: Remediasi Audit Lanjutan [CLAUDE 5.5 REVIEW - AUD-015 s.d. AUD-028]** (`TASK-061` s/d `TASK-074`)
* **FASE 12: GA Production Hardening & GPT-6 Audit Remediation [AUD2-001 s.d. AUD2-008]** (`TASK-075` s/d `TASK-082`)

---

## 2. RINCIAN TASK ATOMIK

### ============================================================================
### FASE 0: BASELINE & PERSIAPAN LINGKUNGAN UJI
### ============================================================================

### TASK-001: Verifikasi Baseline Uji & Test Runner
* **Fase:** FASE 0
* **Deskripsi:** Memverifikasi integritas repositori kerja, memastikan skrip `npm test`, linter, dan validator ZLCE berada dalam kondisi 0 error sebagai fondasi awal Track 2.
* **Dependensi:** -
* **File:** `package.json`, `tsconfig.json`
* **Docs Terkait:** `docs/mobile/blueprint/01_SYSTEM_OVERVIEW.md`, `10_TEST_STRATEGY.md`
* **Docs Impact:** `SESSION_STATE.md`
* **Acceptance Criteria:**
  1. `npm test` atau runner test eksisting lulus 100% tanpa error.
  2. `npm run lint` menghasilkan 0 error dan 0 fatal warning.
  3. `npm run build` sukses menghasilkan bundel produksi Vite.
* **Test Case:** `TC-P0-01`
* **Metode Verifikasi:** Jalankan `npm test`, `npm run lint`, dan `npm run build`; tempel output log.

---

### TASK-002: Penyiapan Struktur Direktori Komponen Mobile & Types
* **Fase:** FASE 0
* **Deskripsi:** Membuat direktori terisolasi `src/components/mobile/` dan berkas tipe data TypeScript (`src/types/mobile.ts`) untuk memfasilitasi penambahan modul tablet tanpa merusak kode desktop eksisting.
* **Dependensi:** `TASK-001`
* **File:** `src/types/mobile.ts`, `src/components/mobile/`
* **Docs Terkait:** `docs/mobile/blueprint/06_REPOSITORY_CHANGES.md`, `02_COMPONENT_ARCHITECTURE.md`
* **Docs Impact:** `src/types/index.ts`
* **Acceptance Criteria:**
  1. Direktori `src/components/mobile/` terbuat dan terisolasi.
  2. Berkas `src/types/mobile.ts` memuat tipe `TeamMember`, `ProjectMeta`, `ContextPack`, `CommandTemplate`, `TerminalPasteResult`.
  3. Tipe TypeScript tervalidasi bersih saat `npm run build`.
* **Test Case:** `TC-P0-02`
* **Metode Verifikasi:** Kompilasi proyek dengan TypeScript compiler (`npm run build`).

---

### ============================================================================
### FASE 1: FONDASI PWA TABLET ANDROID & ERGONOMI LAYAR SENTUH
### ============================================================================

### TASK-003: Web App Manifest & Aset Ikon PWA Standalone
* **Fase:** FASE 1
* **Deskripsi:** Membuat berkas Web App Manifest (`manifest.webmanifest`) dengan display mode `standalone`, orientasi `any`, theme color gelap, dan ikon PWA lengkap (192x192, 512x512, maskable) untuk mendukung instalasi ke layar utama Android.
* **Dependensi:** `TASK-002`
* **File:** `public/manifest.webmanifest`, `index.html`, `public/icons/*`
* **Docs Terkait:** `docs/mobile/blueprint/03_PWA_ARCHITECTURE.md`
* **Docs Impact:** `index.html`
* **Acceptance Criteria:**
  1. `manifest.webmanifest` valid sesuai spesifikasi W3C dengan `display: "standalone"` dan short name.
  2. Tag `<link rel="manifest">` dan meta theme-color terpasang di `index.html`.
  3. Ikon 192px dan 512px terhubung dengan benar.
* **Test Case:** `TC-P1-01`
* **Metode Verifikasi:** Validasi manifest via browser audit dan inspeksi DOM di Chrome DevTools.

---

### TASK-004: Service Worker & Strategi Offline Shell Caching
* **Fase:** FASE 1
* **Deskripsi:** Mengimplementasikan Service Worker (`public/sw.js`) dan modul pendaftaran (`src/sw-register.ts`) dengan strategi caching: Cache-First untuk aset statis (HTML/JS/CSS/ikon) dan Network-First/Fallback untuk konten dinamis.
* **Dependensi:** `TASK-003`
* **File:** `public/sw.js`, `src/sw-register.ts`, `src/main.tsx`
* **Docs Terkait:** `docs/mobile/blueprint/03_PWA_ARCHITECTURE.md`
* **Docs Impact:** `src/main.tsx`
* **Acceptance Criteria:**
  1. Service Worker terdaftar sukses saat aplikasi dimuat.
  2. Aplikasi dapat dibuka kembali dan beroperasi secara utuh saat jaringan dimatikan (Offline/Mode Pesawat).
  3. Pembaruan cache otomatis tertrigger saat ada versi aplikasi baru.
* **Test Case:** `TC-P1-02`
* **Metode Verifikasi:** Nonaktifkan koneksi jaringan di DevTools (Offline mode) lalu refresh halaman.

---

### TASK-005: Adaptasi Ergonomi Tablet 8.7" & Viewport Awareness
* **Fase:** FASE 1
* **Deskripsi:** Mengoptimalkan tata letak CSS Tailwind untuk layar 8.7 inci (1340x800): menerapkan target sentuh minimal 44x44 piksel pada semua tombol aksi, spasi kontrol ramah jempol, dan penanganan keyboard virtual melalui `visualViewport` API agar input tidak tertutup.
* **Dependensi:** `TASK-004`
* **File:** `src/index.css`, `src/components/mobile/MobileLayout.tsx`, `src/App.tsx`
* **Docs Terkait:** `docs/mobile/blueprint/02_COMPONENT_ARCHITECTURE.md`, `03_PWA_ARCHITECTURE.md`
* **Docs Impact:** `src/App.tsx`
* **Acceptance Criteria:**
  1. Seluruh tombol interaktif utama memiliki tinggi minimal 44px (`min-h-[44px]`).
  2. Panel input dan tombol aksi utama tetap terlihat saat keyboard virtual Android aktif (`window.visualViewport`).
  3. Antarmuka responsif tanpa horizontal scrollbar yang tidak diinginkan pada resolusi 1340x800 dan orientasi potret/lanskap.
* **Test Case:** `TC-P1-03`
* **Metode Verifikasi:** Uji visual pada preset resolusi 1340x800 dan simulasi resize viewport keyboard virtual.

---

### TASK-006: Komponen Active Member Selector di Header
* **Fase:** FASE 1
* **Deskripsi:** Membangun komponen `ActiveMemberSelector.tsx` di bilah atas PWA yang memungkinkan pemilihan instan salah satu dari 8 anggota tim, menampilkan avatar/inisial, dan menyimpan anggota aktif di LocalStorage.
* **Dependensi:** `TASK-005`
* **File:** `src/components/mobile/ActiveMemberSelector.tsx`, `src/components/Header.tsx`
* **Docs Terkait:** `docs/mobile/blueprint/14_MULTI_AI_TEAM_MODEL.md`, `08_SECURITY_MODEL.md`
* **Docs Impact:** `src/components/Header.tsx`
* **Acceptance Criteria:**
  1. Komponen dropdown/modal cepat menampilkan 8 anggota tim (Budi, Siti, Agus, Dewi, Eko, Rina, Fajar, Hani).
  2. Memilih anggota mengubah state global dan tersimpan di `localStorage.getItem('zlce_active_member')`.
  3. Header menampilkan badge visual anggota yang sedang memegang tablet.
* **Test Case:** `TC-P1-04`
* **Metode Verifikasi:** Pilih anggota di UI, refresh halaman, verifikasi state anggota aktif bertahan.

---

### TASK-007: Komponen Project Switcher & Registry Ringan
* **Fase:** FASE 1
* **Deskripsi:** Membangun komponen `ProjectSwitcher.tsx` untuk mengelola daftar proyek yang dikerjakan pada tablet, memungkinkan penambahan proyek baru, pergantian proyek aktif, dan pencatatan path Termux masing-masing.
* **Dependensi:** `TASK-006`
* **File:** `src/components/mobile/ProjectSwitcher.tsx`, `src/hooks/useProjectRegistry.ts`
* **Docs Terkait:** `docs/mobile/blueprint/05_STORAGE_AND_SYNC.md`
* **Docs Impact:** `src/components/Header.tsx`
* **Acceptance Criteria:**
  1. Registry multi-proyek tersimpan di `localStorage.getItem('zlce_projects_registry')`.
  2. Pengguna dapat menambah, mengedit, dan berpindah antar proyek secara instan.
  3. Berganti proyek memuat context dan draft yang sesuai untuk proyek bersangkutan.
* **Test Case:** `TC-P1-05`
* **Metode Verifikasi:** Tambahkan 2 proyek uji ("Proyek A", "Proyek B"), lakukan pergantian dan verifikasi isolasi state.

---

### ============================================================================
### FASE 2: MARKDOWN WORKSPACE & MANAJEMEN MULTI-PROYEK
### ============================================================================

### TASK-008: Workspace Reader & Parser Dokumen Kontrol ZLCE
* **Fase:** FASE 2
* **Deskripsi:** Membangun parser berkas Markdown kontrol ZLCE (`BLUEPRINT.md`, `TASKS.md`, `SESSION_STATE.md`) untuk mengekstrak metadata, daftar task, status aktif, dan entri WAL ke dalam objek terstruktur di memori PWA.
* **Dependensi:** `TASK-007`
* **File:** `src/utils/markdownParser.ts`, `src/components/mobile/WorkspaceReader.tsx`
* **Docs Terkait:** `docs/mobile/blueprint/02_COMPONENT_ARCHITECTURE.md`, `templates/`
* **Docs Impact:** -
* **Acceptance Criteria:**
  1. Parser mampu membedakan format dokumen `SESSION_STATE.md`, `TASKS.md`, dan `BLUEPRINT.md`.
  2. Matriks task diparsing menjadi array objek dengan ID, Nama, Dependensi, Status, dan Disetujui.
  3. Tidak memicu crash bila terdapat baris Markdown tak terduga.
* **Test Case:** `TC-P2-01`
* **Metode Verifikasi:** Uji unit parsing terhadap berkas contoh di `templates/` dan `examples/`.

---

### TASK-009: Workspace Editor & Integrasi File Picker Impor
* **Fase:** FASE 2
* **Deskripsi:** Membangun antarmuka editor Markdown yang responsif dengan tombol File Picker eksplisit (`input type="file"`) untuk membaca berkas Markdown dari penyimpanan tablet ke editor PWA.
* **Dependensi:** `TASK-008`
* **File:** `src/components/mobile/WorkspaceEditor.tsx`, `src/hooks/useFileImport.ts`
* **Docs Terkait:** `docs/mobile/blueprint/05_STORAGE_AND_SYNC.md`
* **Docs Impact:** -
* **Acceptance Criteria:**
  1. Tombol "Buka Berkas .md" membuka pemilih file bawaan Android tanpa error.
  2. Isi berkas Markdown terimpor langsung ke state editor PWA.
  3. Memberikan feedback visual ukuran berkas dan waktu impor.
* **Test Case:** `TC-P2-02`
* **Metode Verifikasi:** Pilih berkas `.md` lokal via file input dan pastikan teks muncul di editor.

---

### TASK-010: Markdown Exporter & Unduh Berkas Blob
* **Fase:** FASE 2
* **Deskripsi:** Mengimplementasikan fungsi ekspor instan Markdown ke berkas fisik yang dapat diunduh langsung ke folder `Download/` tablet Android via Blob URL dan tombol salin 1-ketukan ke clipboard.
* **Dependensi:** `TASK-009`
* **File:** `src/utils/fileExport.ts`, `src/components/mobile/WorkspaceExportBar.tsx`
* **Docs Terkait:** `docs/mobile/blueprint/05_STORAGE_AND_SYNC.md`
* **Docs Impact:** -
* **Acceptance Criteria:**
  1. Tombol "Unduh .md" mengunduh berkas dengan penamaan yang benar (misal: `SESSION_STATE.md`).
  2. Tombol "Salin Seluruh Markdown" menyalin teks lengkap ke clipboard Android dengan feedback visual.
  3. Karakter baris baru LF dipertahankan secara utuh tanpa rusak menjadi CRLF.
* **Test Case:** `TC-P2-03`
* **Metode Verifikasi:** Unduh berkas uji, periksa kelengkapan konten dan integritas karakter baris baru.

---

### TASK-011: Penegakan Integritas SESSION_STATE sebagai Single Source of Truth
* **Fase:** FASE 2
* **Deskripsi:** Memastikan format berkas `SESSION_STATE.md` yang dihasilkan dan disunting di PWA 100% mematuhi aturan kanonik ZLCE Core (nomor bagian 0–7, header, format tabel matriks task, dan format WAL).
* **Dependensi:** `TASK-010`
* **File:** `src/utils/sessionStateValidator.ts`, `src/components/SessionStateTab.tsx`
* **Docs Terkait:** `templates/SESSION_STATE.template.md`, `docs/mobile/blueprint/01_SYSTEM_OVERVIEW.md`
* **Docs Impact:** `src/components/SessionStateTab.tsx`
* **Acceptance Criteria:**
  1. Output `SESSION_STATE.md` lulus validasi skrip `scripts/zlce-check.py` tanpa error format.
  2. Kolom matriks task memuat header `| ID Task | Nama | Dependensi | Status | Bukti Verifikasi | Disetujui |`.
  3. Bagian 3 (WAL) mematuhi format 7 butir kanonik.
* **Test Case:** `TC-P2-04`
* **Metode Verifikasi:** Validasi teks SESSION_STATE yang dihasilkan PWA menggunakan `scripts/zlce-check.py`.

---

### TASK-012: Cache Draft LocalStorage dengan Debounce 400ms & Auto-Sync
* **Fase:** FASE 2
* **Deskripsi:** Membangun mekanisme persistensi draft lokal di LocalStorage dengan debounce 400ms untuk melindungi perubahan pengguna saat PWA ditutup atau dibunuh oleh Android LMK saat beralih aplikasi.
* **Dependensi:** `TASK-011`
* **File:** `src/hooks/useAutoDraftCache.ts`, `src/components/mobile/WorkspaceEditor.tsx`
* **Docs Terkait:** `docs/mobile/blueprint/09_FAILURE_AND_RECOVERY.md`
* **Docs Impact:** -
* **Acceptance Criteria:**
  1. Setiap ketikan pengguna disimpan otomatis ke LocalStorage setelah jeda 400ms.
  2. Saat aplikasi dibuka kembali setelah di-refresh atau ditutup paksa, draft terakhir dipulihkan secara transparan.
  3. Menampilkan indikator visual ringkas "Draft tersimpan" di sudut layar.
* **Test Case:** `TC-P2-05`
* **Metode Verifikasi:** Ketik perubahan teks, tutup tab / refresh paksa browser, buka kembali, pastikan teks tidak hilang.

---

### ============================================================================
### FASE 3: MULTI-AI & CONTEXT PACK PORTABEL [PRIORITAS UTAMA]
### ============================================================================

### TASK-013: Portable Context Pack Generator (Schema-before-Data)
* **Fase:** FASE 3
* **Deskripsi:** Membangun generator paket konteks mandiri yang merangkum ringkasan proyek, blueprint, task aktif, status sesi terkini, dan keputusan teknis dalam format Markdown terstruktur yang siap dikirimkan ke model AI mana pun.
* **Dependensi:** `TASK-012`
* **File:** `src/utils/contextPackGenerator.ts`, `src/components/mobile/ContextPackTab.tsx`
* **Docs Terkait:** `docs/mobile/blueprint/14_MULTI_AI_TEAM_MODEL.md`
* **Docs Impact:** `src/components/PromptEngineTab.tsx`
* **Acceptance Criteria:**
  1. Context Pack memuat blok metadata wajib (Proyek, Task ID, Anggota Aktif, AI Target, Timestamp).
  2. Menyertakan seluruh informasi yang dibutuhkan AI tanpa mengharuskan riwayat chat sebelumnya (Invarian I1 & I2).
  3. Struktur output konsisten dan deterministik.
* **Test Case:** `TC-P3-01`
* **Metode Verifikasi:** Bangkitkan Context Pack untuk task aktif dan verifikasi kelengkapan komponen konteks.

---

### TASK-014: Context Budget Manager & Adapter Kuota Token per Model AI
* **Fase:** FASE 3
* **Deskripsi:** Membangun modul pengatur anggaran token yang menyesuaikan kedalaman dan panjang Context Pack berdasarkan profil model AI target (misal: mode komprehensif untuk Gemini 1M token vs mode ringkas terkonsolidasi untuk Claude/ChatGPT 8K–30K token).
* **Dependensi:** `TASK-013`
* **File:** `src/utils/tokenBudgetAdapter.ts`, `src/components/mobile/TokenBudgetSelector.tsx`
* **Docs Terkait:** `docs/mobile/blueprint/14_MULTI_AI_TEAM_MODEL.md`
* **Docs Impact:** `src/components/TokenUsageGauge.tsx`
* **Acceptance Criteria:**
  1. Tersedia pilihan profil AI: Gemini (Large Context), Claude (Mid Context), ChatGPT (Compact Context).
  2. Estimasi token ditampilkan secara visual sebelum menyalin Context Pack.
  3. Context Pack otomatis memotong lampiran historis berlebih saat memilih profil kompak agar tidak melampaui kuota.
* **Test Case:** `TC-P3-02`
* **Metode Verifikasi:** Beralih antar profil AI dan periksa variasi panjang teks hasil Context Pack.

---

### TASK-015: Prompt Generator Multi-Model Terstruktur
* **Fase:** FASE 3
* **Deskripsi:** Mengintegrasikan Context Pack dengan instruksi peran AI yang presisi (Landing Prompt, Task Execution Prompt, Review Prompt, Handover Prompt) yang dioptimalkan untuk respons deterministik bebas halusinasi.
* **Dependensi:** `TASK-014`
* **File:** `src/utils/promptGenerator.ts`, `src/components/mobile/PromptStudio.tsx`
* **Docs Terkait:** `LANDING_PROMPT.md`, `HANDOVER_PROMPT.md`, `docs/mobile/blueprint/14_MULTI_AI_TEAM_MODEL.md`
* **Docs Impact:** `src/components/PromptEngineTab.tsx`
* **Acceptance Criteria:**
  1. Generator menghasilkan prompt siap pakai yang menggabungkan Context Pack dan instruksi tugas.
  2. Format prompt menegaskan aturan "Schema-before-Data" dan pelarangan kode placeholder.
  3. Tombol "Salin Prompt Lengkap" menyalin seluruh teks dengan 1 ketukan.
* **Test Case:** `TC-P3-03`
* **Metode Verifikasi:** Salin prompt ke clipboard dan periksa kecocokan teks yang ditempelkan.

---

### TASK-016: Result Capture Module dengan Injeksi Provenance Otomatis
* **Fase:** FASE 3
* **Deskripsi:** Membangun antarmuka untuk menempelkan hasil jawaban dari Browser AI, mengekstrak blok kode/solusi, dan secara otomatis menyematkan metadata *provenance* (Model AI, Alias Akun, Nama Anggota, Timestamp, Task ID).
* **Dependensi:** `TASK-015`
* **File:** `src/components/mobile/ResultCaptureTab.tsx`, `src/utils/provenanceInjector.ts`
* **Docs Terkait:** `docs/mobile/blueprint/14_MULTI_AI_TEAM_MODEL.md`, `08_SECURITY_MODEL.md`
* **Docs Impact:** `src/components/RecoveryTab.tsx`
* **Acceptance Criteria:**
  1. Antarmuka Result Capture menyediakan area tempel hasil AI berukuran besar.
  2. Provenance terinjeksi otomatis dalam format tag komentar Markdown atau baris metadata.
  3. Hasil dapat langsung dialirkan untuk memperbarui draft `SESSION_STATE.md` atau WAL.
* **Test Case:** `TC-P3-04`
* **Metode Verifikasi:** Tempel teks solusi AI, verifikasi tag metadata provenance terbentuk dengan lengkap.

---

### TASK-017: Handover Manager Lintas AI & Deteksi Konflik Keputusan
* **Fase:** FASE 3
* **Deskripsi:** Membangun modul serah terima (*Handover Manager*) saat berpindah dari satu AI ke AI lain (misal dari Claude yang kehabisan limit ke Gemini), termasuk deteksi inkonsistensi keputusan antar-model AI dan pencatatan eskalasi.
* **Dependensi:** `TASK-016`
* **File:** `src/components/mobile/AiHandoverWizard.tsx`, `src/utils/conflictDetector.ts`
* **Docs Terkait:** `HANDOVER_PROMPT.md`, `docs/mobile/blueprint/14_MULTI_AI_TEAM_MODEL.md`
* **Docs Impact:** -
* **Acceptance Criteria:**
  1. Wizard memandu pembuatan handover lintas AI dalam 3 langkah sederhana.
  2. Bila terdeteksi perbedaan keputusan antar AI, sistem menandainya sebagai `CONFLICT_DECISION` dan meminta konfirmasi manusia.
  3. Catatan serah terima terangkum di Bagian 6 `SESSION_STATE.md`.
* **Test Case:** `TC-P3-05`
* **Metode Verifikasi:** Jalankan wizard handover AI dan verifikasi teks handover prompt yang dihasilkan.

---

### TASK-018: Test Suite Uji Cold-Start Lintas AI (Claude -> Gemini)
* **Fase:** FASE 3
* **Deskripsi:** Mengimplementasikan test suite otomatis dan skenario uji verifikasi bahwa sesi pekerjaan dapat dilanjutkan oleh model AI baru secara murni hanya dari berkas repositori dan Context Pack tanpa riwayat chat (Invarian I2).
* **Dependensi:** `TASK-017`
* **File:** `src/tests/coldStartAi.test.ts`, `src/components/TestHarnessTab.tsx`
* **Docs Terkait:** `docs/mobile/blueprint/10_TEST_STRATEGY.md`, `14_MULTI_AI_TEAM_MODEL.md`
* **Docs Impact:** `src/components/TestHarnessTab.tsx`
* **Acceptance Criteria:**
  1. Test harness memverifikasi bahwa Context Pack memuat 100% parameter pemulihan state.
  2. Skenario uji pergantian Claude -> Gemini menghasilkan instruksi kelanjutan yang valid dan identik.
  3. Test suite lulus dengan status PASS pada runner uji.
* **Test Case:** `TC-P3-06`
* **Metode Verifikasi:** Eksekusi test suite via `npm test` atau tombol uji di Test Harness tab PWA.

---

### ============================================================================
### FASE 4: MULTI-AKUN & TIM ESTAFET 8 ANGGOTA [PRIORITAS UTAMA]
### ============================================================================

### TASK-019: Team Member Registry (8 Profil Alias Non-Kredensial)
* **Fase:** FASE 4
* **Deskripsi:** Membangun registry profil 8 anggota tim estafet (Budi, Siti, Agus, Dewi, Eko, Rina, Fajar, Hani) dengan atribut nama alias, email publik non-rahasia, peran, dan preferensi AI — dengan penegakan keras *Zero-Secret Policy* (nol token/password).
* **Dependensi:** `TASK-018`
* **File:** `src/data/teamMembers.ts`, `src/components/mobile/TeamRegistryModal.tsx`
* **Docs Terkait:** `docs/mobile/blueprint/14_MULTI_AI_TEAM_MODEL.md`, `08_SECURITY_MODEL.md`
* **Docs Impact:** `src/types/mobile.ts`
* **Acceptance Criteria:**
  1. Terdaftar 8 profil anggota dengan data valid tanpa informasi rahasia.
  2. Pengguna dapat mengubah email commit publik masing-masing anggota.
  3. Registry tersimpan di LocalStorage dengan fallback data default yang aman.
* **Test Case:** `TC-P4-01`
* **Metode Verifikasi:** Buka modal registry tim di PWA, ubah profil, dan pastikan data tersimpan.

---

### TASK-020: Mekanisme Klaim Task & Penegakan Aturan 1 Task IN_PROGRESS
* **Fase:** FASE 4
* **Deskripsi:** Mengimplementasikan aturan kolaborasi tablet bersama: hanya satu task yang diizinkan berstatus `IN_PROGRESS` pada satu waktu di tablet, dengan pencatatan anggota yang mengklaim task dan waktu mulai klaim.
* **Dependensi:** `TASK-019`
* **File:** `src/utils/taskClaimManager.ts`, `src/components/mobile/TaskClaimBanner.tsx`
* **Docs Terkait:** `docs/mobile/blueprint/14_MULTI_AI_TEAM_MODEL.md`
* **Docs Impact:** `src/components/SessionStateTab.tsx`
* **Acceptance Criteria:**
  1. Sistem menolak transisi status menjadi `IN_PROGRESS` bila sudah ada task lain yang berstatus `IN_PROGRESS`.
  2. Task yang sedang dikerjakan menampilkan badge nama anggota pemegang klaim.
  3. Tombol rilis/selesai klaim tersedia secara jelas.
* **Test Case:** `TC-P4-02`
* **Metode Verifikasi:** Coba klaim TASK-002 saat TASK-001 masih IN_PROGRESS; verifikasi muncul peringatan penolakan.

---

### TASK-021: Pencatatan Persetujuan Gerbang Kualitas Bersama Provenance Penyetuju
* **Fase:** FASE 4
* **Deskripsi:** Mengimplementasikan hak persetujuan Gerbang Kualitas bagi seluruh 8 anggota (ADR-07) dengan kewajiban mencatatkan nama anggota penyetuju pada kolom `Disetujui` di matriks task (`Disetujui: ya (oleh: [Nama])`) dan di log audit.
* **Dependensi:** `TASK-020`
* **File:** `src/utils/gateApprovalManager.ts`, `src/components/mobile/GateApprovalModal.tsx`
* **Docs Terkait:** `docs/mobile/blueprint/12_ARCHITECTURE_DECISIONS.md`, `14_MULTI_AI_TEAM_MODEL.md`
* **Docs Impact:** `src/utils/zlceValidator.ts`
* **Acceptance Criteria:**
  1. Modal persetujuan gerbang meminta konfirmasi anggota aktif yang sedang memegang tablet.
  2. Kolom `Disetujui` di `SESSION_STATE.md` diperbarui dengan format `ya (oleh: Budi)`.
  3. Log audit Bagian 7 otomatis bertambah satu baris pencatatan persetujuan.
  4. Validator `zlceValidator.ts` memvalidasi keabsahan format nama penyetuju.
* **Test Case:** `TC-P4-03`
* **Metode Verifikasi:** Berikan persetujuan task di PWA, verifikasi teks `SESSION_STATE.md` dan validasi linter.

---

### TASK-022: Device Handover Checklist Wizard & Prosedur Serah Terima Tablet
* **Fase:** FASE 4
* **Deskripsi:** Membangun wizard interaktif 4-langkah serah terima tablet sebelum tablet dioper ke anggota berikutnya: (1) Verifikasi task commit/push, (2) Update catatan handover, (3) Salin perintah `zlce clean-auth` untuk menghapus token di RAM, (4) Pengalihan profil anggota aktif.
* **Dependensi:** `TASK-021`
* **File:** `src/components/mobile/DeviceHandoverModal.tsx`, `src/utils/handoverChecklist.ts`
* **Docs Terkait:** `docs/mobile/blueprint/07_WORKFLOW_DESIGN.md`, `08_SECURITY_MODEL.md`
* **Docs Impact:** `src/components/Header.tsx`
* **Acceptance Criteria:**
  1. Wizard serah terima menampilkan 4 checklist yang wajib dicentang.
  2. Menyediakan tombol 1-ketukan untuk menyalin perintah pembersihan kredensial Termux (`git credential-cache exit`).
  3. Mengalihkan profil aktif ke anggota berikutnya setelah wizard selesai.
* **Test Case:** `TC-P4-04`
* **Metode Verifikasi:** Jalankan alur wizard serah terima di UI dan pastikan semua langkah checklist tereksekusi.

---

### TASK-023: Session History Timeline & Audit Log Terpadu
* **Fase:** FASE 4
* **Deskripsi:** Membangun penampil visual riwayat snapshot sesi (hingga 35 snapshot) dan log audit kronologis yang mencatat setiap peristiwa task, commit, dan pergantian anggota tim di tablet.
* **Dependensi:** `TASK-022`
* **File:** `src/components/mobile/SessionTimelineTab.tsx`, `src/hooks/useSessionHistory.ts`
* **Docs Terkait:** `docs/mobile/blueprint/14_MULTI_AI_TEAM_MODEL.md`
* **Docs Impact:** -
* **Acceptance Criteria:**
  1. Timeline menampilkan daftar riwayat snapshot dengan cap waktu dan nama anggota.
  2. Pengguna dapat melihat diff atau memulihkan draft dari snapshot sebelumnya.
  3. Ukuran data riwayat di LocalStorage dibatasi secara aman agar tidak melampaui kuota browser.
* **Test Case:** `TC-P4-05`
* **Metode Verifikasi:** Lakukan beberapa modifikasi state, buka tab riwayat, dan verifikasi entri snapshot tercatat.

---

### TASK-024: Test Suite Uji Cold-Start Lintas Anggota (Anggota A -> Anggota B)
* **Fase:** FASE 4
* **Deskripsi:** Membangun skenario uji otomatis untuk memverifikasi bahwa Anggota B dapat melanjutkan pengerjaan task yang ditinggalkan oleh Anggota A secara mulus hanya dengan membaca berkas repositori dan catatan serah terima (Invarian I2 & I3).
* **Dependensi:** `TASK-023`
* **File:** `src/tests/coldStartMember.test.ts`, `src/components/TestHarnessTab.tsx`
* **Docs Terkait:** `docs/mobile/blueprint/10_TEST_STRATEGY.md`, `14_MULTI_AI_TEAM_MODEL.md`
* **Docs Impact:** `src/components/TestHarnessTab.tsx`
* **Acceptance Criteria:**
  1. Uji mensimulasikan pergantian giliran dari Budi ke Siti.
  2. Memverifikasi status task, WAL, dan identitas commit otomatis teralihkan ke Siti.
  3. Seluruh invarian I1–I5 terkonfirmasi terpenuhi tanpa anomali data.
* **Test Case:** `TC-P4-06`
* **Metode Verifikasi:** Jalankan test runner untuk skenario cold-start anggota tim.

---

### ============================================================================
### FASE 5: COMMAND HUB & TERMUX DISPATCHER
### ============================================================================

### TASK-025: Katalog Template Perintah Berversi (Git & CLI ZLCE)
* **Fase:** FASE 5
* **Deskripsi:** Menyusun katalog perintah berversi di repositori yang memuat template perintah operasional: pemeriksaan validator (`zlce-check`), snapshot (`zlce-snapshot`), git status, commit atomik, push, pull aman, dan clean-auth, lengkap dengan label risiko.
* **Dependensi:** `TASK-024`
* **File:** `src/data/commandTemplates.ts`, `src/components/mobile/CommandHubTab.tsx`
* **Docs Terkait:** `docs/mobile/blueprint/13_COMMAND_TEMPLATES.md`, `04_TERMUX_INTEGRATION.md`
* **Docs Impact:** -
* **Acceptance Criteria:**
  1. Seluruh 8 template kanonik dari Blueprint 13 terdaftar dengan skema berversi.
  2. Setiap perintah memiliki badge label risiko yang jelas (🟢 Safe, 🟡 Mutating, 🔴 High-Risk).
  3. Tidak ada perintah destruktif (`reset --hard`, `push --force`) di katalog bawaan.
* **Test Case:** `TC-P5-01`
* **Metode Verifikasi:** Periksa daftar template perintah di tab Command Hub PWA.

---

### TASK-026: Command Parameter Binder & Strict Shell Sanitizer (Anti-Injection)
* **Fase:** FASE 5
* **Deskripsi:** Mengimplementasikan mesin pengikat parameter otomatis (Task ID, Nama Cabang, Nama Anggota, Pesan Commit) yang dilengkapi fungsi sanitasi dan escaping shell bash ketat guna mencegah celah *command injection*.
* **Dependensi:** `TASK-025`
* **File:** `src/utils/commandSanitizer.ts`, `src/utils/commandBinder.ts`
* **Docs Terkait:** `docs/mobile/blueprint/04_TERMUX_INTEGRATION.md`, `08_SECURITY_MODEL.md`
* **Docs Impact:** -
* **Acceptance Criteria:**
  1. Seluruh parameter dinamis otomatis terisi dari context proyek dan anggota aktif.
  2. Karakter berbahaya (`"`, `'`, `;`, `&`, `|`, `$`, `` ` ``, `\n`) di-escape secara aman dengan penandaan kutip POSIX standar.
  3. Uji injeksi shell gagal mengeksekusi perintah susupan.
* **Test Case:** `TC-P5-02`
* **Metode Verifikasi:** Uji masukan pesan commit dengan karakter injeksi `; rm -rf /` dan verifikasi string hasil escaping aman.

---

### TASK-027: One-Tap Copy Button dengan Status Feedback & Fallback Seleksi
* **Fase:** FASE 5
* **Deskripsi:** Membangun tombol salin satu ketukan (*One-Tap Copy*) menggunakan Clipboard API peramban, dilengkapi animasi feedback visual "Tersalin!", dan fallback seleksi teks manual jika izin clipboard ditolak.
* **Dependensi:** `TASK-026`
* **File:** `src/components/mobile/OneTapCopyButton.tsx`
* **Docs Terkait:** `docs/mobile/blueprint/04_TERMUX_INTEGRATION.md`
* **Docs Impact:** -
* **Acceptance Criteria:**
  1. Tombol salin memiliki target sentuh minimal 44x44px ramah jari tablet.
  2. Menekan tombol langsung menyalin teks perintah ke clipboard Android.
  3. Menampilkan status konfirmasi visual selama 2 detik setelah berhasil menyalin.
* **Test Case:** `TC-P5-03`
* **Metode Verifikasi:** Ketuk tombol di UI, tempel ke aplikasi catatan atau terminal, verifikasi isi teks identik.

---

### TASK-028: CLI Dispatcher `zlce` di Termux (`scripts/zlce/zlce`)
* **Fase:** FASE 5
* **Deskripsi:** Membuat skrip shell POSIX ringan `scripts/zlce/zlce` (dan panduan symlink ke `~/bin/zlce`) yang bertindak sebagai dispatcher lokal di Termux dengan allowlist subperintah (`check`, `snapshot`, `collect`, `pull`, `push`, `clean-auth`).
* **Dependensi:** `TASK-027`
* **File:** `scripts/zlce/zlce`, `scripts/zlce/README.md`
* **Docs Terkait:** `docs/mobile/blueprint/04_TERMUX_INTEGRATION.md`, `13_COMMAND_TEMPLATES.md`
* **Docs Impact:** -
* **Acceptance Criteria:**
  1. Skrip `zlce` mengeksekusi subperintah yang terdaftar di allowlist dengan benar.
  2. Menolak subperintah yang tidak dikenal dengan pesan error edukatif.
  3. Memiliki bit eksekusi `chmod +x` dan akhir baris Unix LF murni.
* **Test Case:** `TC-P5-04`
* **Metode Verifikasi:** Jalankan `./scripts/zlce/zlce check --help` dan `./scripts/zlce/zlce unknown` di lingkungan shell.

---

### TASK-029: Paste-Back Parser untuk Keluaran Terminal & Update Status Visual
* **Fase:** FASE 5
* **Deskripsi:** Membangun komponen modal `PasteBackModal.tsx` yang menerima teks hasil eksekusi terminal (keluaran `zlce-check.py` atau `git status`), memparsing hasil status, dan otomatis memperbarui badge status visual di PWA.
* **Dependensi:** `TASK-028`
* **File:** `src/components/mobile/PasteBackModal.tsx`, `src/utils/terminalParser.ts`
* **Docs Terkait:** `docs/mobile/blueprint/04_TERMUX_INTEGRATION.md`
* **Docs Impact:** `src/components/mobile/CommandHubTab.tsx`
* **Acceptance Criteria:**
  1. Parser mengenali output `RESULT: OK` (0 error) dan menandai verifikasi sukses.
  2. Parser mendeteksi pesan error linter dan menampilkan rincian baris penyebab kegagalan.
  3. Badge verifikasi pada task aktif otomatis terbarui setelah tempel hasil.
* **Test Case:** `TC-P5-05`
* **Metode Verifikasi:** Tempel output log terminal uji ke dalam kotak paste-back, verifikasi perubahan status badge.

---

### TASK-030: Integrasi Protokol Recovery Kasus A–D ke Template Command Hub
* **Fase:** FASE 5
* **Deskripsi:** Mengintegrasikan prosedur pemulihan darurat kanonik ZLCE (Kasus A: Sesi Terputus, Kasus B: Inkonsistensi Dokumen, Kasus C: File Rusak/Hilang, Kasus D: Konflik Git) ke dalam tombol pintas template pemulihan di Command Hub PWA.
* **Dependensi:** `TASK-029`
* **File:** `src/components/mobile/RecoveryCommandSection.tsx`, `src/components/RecoveryTab.tsx`
* **Docs Terkait:** `docs/mobile/blueprint/09_FAILURE_AND_RECOVERY.md`
* **Docs Impact:** `src/components/RecoveryTab.tsx`
* **Acceptance Criteria:**
  1. Tersedia 4 panel pemulihan sesuai Kasus A–D dengan instruksi langkah-demi-langkah.
  2. Perintah pemulihan snapshot lokal dan pemeriksaan integritas dapat disalin dengan 1 ketukan.
  3. Tidak menyertakan perintah berbahaya yang menghapus data tanpa konfirmasi.
* **Test Case:** `TC-P5-06`
* **Metode Verifikasi:** Buka tab Recovery, verifikasi ketersediaan template pemulihan Kasus A–D.

---

### ============================================================================
### FASE 6: GIT SYNC & KOLABORASI CABANG TIM
### ============================================================================

### TASK-031: Template Git Branch per Task (`task/TASK-xxx`) & Proteksi `main`
* **Fase:** FASE 6
* **Deskripsi:** Membangun generator perintah Git branch per task yang otomatis membuat cabang kerja terisolasi `task/TASK-xxx` saat task dimulai, mencegah commit langsung ke cabang `main` yang diproteksi.
* **Dependensi:** `TASK-030`
* **File:** `src/utils/gitBranchManager.ts`, `src/components/mobile/GitSyncTab.tsx`
* **Docs Terkait:** `docs/mobile/blueprint/07_WORKFLOW_DESIGN.md`, `12_ARCHITECTURE_DECISIONS.md`
* **Docs Impact:** -
* **Acceptance Criteria:**
  1. Template checkout cabang otomatis menghasilkan: `git checkout -b task/TASK-xxx`.
  2. PWA memperingatkan pengguna bila bekerja langsung pada branch `main`.
  3. Menampilkan status nama cabang aktif yang sinkron dengan Task ID.
* **Test Case:** `TC-P6-01`
* **Metode Verifikasi:** Periksa kesesuaian perintah checkout yang dihasilkan saat memilih task aktif.

---

### TASK-032: Injeksi Flag Identitas Commit Otomatis (`-c user.name=...`)
* **Fase:** FASE 6
* **Deskripsi:** Mengimplementasikan injeksi flag identitas dinamis pada seluruh template perintah commit Git (`git -c user.name="Budi" -c user.email="..." commit -m "..."`) sesuai anggota aktif yang dipilih, tanpa merusak konfigurasi Git global (ADR-05).
* **Dependensi:** `TASK-031`
* **File:** `src/utils/gitCommitFormatter.ts`, `src/components/mobile/GitSyncTab.tsx`
* **Docs Terkait:** `docs/mobile/blueprint/12_ARCHITECTURE_DECISIONS.md`, `08_SECURITY_MODEL.md`
* **Docs Impact:** -
* **Acceptance Criteria:**
  1. Template commit memuat flag `-c user.name` dan `-c user.email` anggota aktif.
  2. Pesan commit diawali dengan Task ID atomik (misal: `TASK-001: feat(pwa) ...`).
  3. Ganti anggota aktif di PWA seketika mengubah atribusi identitas pada template commit.
* **Test Case:** `TC-P6-02`
* **Metode Verifikasi:** Ganti anggota dari Budi ke Siti, pastikan flag identitas commit berubah seketika.

---

### TASK-033: Safe Pull Template (`--ff-only`) & Sinkronisasi Bertahap
* **Fase:** FASE 6
* **Deskripsi:** Membangun template penarikan pembaruan aman dari remote GitHub menggunakan flag `--ff-only` untuk mencegah merge commit tak disengaja di tablet, serta panduan rebase bila cabang bercabang.
* **Dependensi:** `TASK-032`
* **File:** `src/components/mobile/GitPullSection.tsx`
* **Docs Terkait:** `docs/mobile/blueprint/05_STORAGE_AND_SYNC.md`, `07_WORKFLOW_DESIGN.md`
* **Docs Impact:** -
* **Acceptance Criteria:**
  1. Template pull default menggunakan: `git pull --ff-only origin <branch>`.
  2. Menampilkan petunjuk langkah yang harus dilakukan bila fast-forward gagal.
  3. Memberikan panduan fetch status sebelum memulai task baru.
* **Test Case:** `TC-P6-03`
* **Metode Verifikasi:** Verifikasi sintaks template safe pull yang dihasilkan di tab Git Sync.

---

### TASK-034: Git Credential Cache Manager (`cache --timeout=900`) & Script `clean-auth`
* **Fase:** FASE 6
* **Deskripsi:** Membangun modul pengaturan cache kredensial Git di memori RAM Termux (timeout 15 menit / 900 detik) dan skrip `zlce clean-auth` untuk menghapus token seketika saat pergantian pemegang tablet (ADR-04).
* **Dependensi:** `TASK-033`
* **File:** `scripts/zlce/clean-auth.sh`, `src/components/mobile/SecurityAuthTab.tsx`
* **Docs Terkait:** `docs/mobile/blueprint/08_SECURITY_MODEL.md`, `12_ARCHITECTURE_DECISIONS.md`
* **Docs Impact:** -
* **Acceptance Criteria:**
  1. Template konfigurasi cache menghasilkan: `git config --global credential.helper "cache --timeout=900"`.
  2. Skrip `clean-auth.sh` mematikan daemon credential cache: `git credential-cache exit`.
  3. Nol token atau password tersimpan di disk atau repositori.
* **Test Case:** `TC-P6-04`
* **Metode Verifikasi:** Jalankan skrip `clean-auth.sh` di Termux dan periksa pembersihan socket cache git.

---

### TASK-035: Deteksi & Panduan Resolusi Konflik Cabang Antar-Anggota
* **Fase:** FASE 6
* **Deskripsi:** Membangun antarmuka panduan resolusi konflik cabang Git: memberikan langkah terstruktur bila terjadi konflik saat merge/rebase antar-anggota tanpa menggunakan opsi destruktif (`--force`).
* **Dependensi:** `TASK-034`
* **File:** `src/components/mobile/ConflictResolutionWizard.tsx`
* **Docs Terkait:** `docs/mobile/blueprint/09_FAILURE_AND_RECOVERY.md`, `07_WORKFLOW_DESIGN.md`
* **Docs Impact:** -
* **Acceptance Criteria:**
  1. Wizard mendeteksi laporan konflik Git dari keluaran terminal paste-back.
  2. Menampilkan panduan membuka berkas berkonflik di editor terminal `micro`.
  3. Memandu verifikasi ulang via `zlce-check` sebelum menandai konflik terselesaikan.
* **Test Case:** `TC-P6-05`
* **Metode Verifikasi:** Tempelkan contoh output git conflict dan pastikan wizard panduan aktif.

---

### ============================================================================
### FASE 7: UJI INTEGRASI PENUH & VERIFIKASI TABLET FISIK SM-T225
### ============================================================================

### TASK-036: End-to-End Test Suite 14 Skenario ZLCE di Tablet
* **Fase:** FASE 7
* **Deskripsi:** Mengeksekusi dan memvalidasi seluruh 14 skenario operasional ZLCE (alur lengkap mulai dari pembuatan proyek, task breakdown, eksekusi AI, validasi WAL, hingga commit/push) di lingkungan tablet.
* **Dependensi:** `TASK-035`
* **File:** `src/tests/e2eScenarios.test.ts`, `src/components/TestHarnessTab.tsx`
* **Docs Terkait:** `docs/mobile/blueprint/10_TEST_STRATEGY.md`
* **Docs Impact:** `src/components/TestHarnessTab.tsx`
* **Acceptance Criteria:**
  1. Seluruh 14 skenario uji tereksekusi dengan status PASS 100%.
  2. Tidak ada kebocoran state antar skenario uji.
  3. Hasil uji terekam pada log pengujian terverifikasi.
* **Test Case:** `TC-P7-01`
* **Metode Verifikasi:** Jalankan test harness di browser dan periksa rekapitulasi kelulusan 14/14.

---

### TASK-037: Uji Ketahanan Android Low Memory Killer (LMK) & Recovery State
* **Fase:** FASE 7
* **Deskripsi:** Menguji dan memverifikasi ketahanan state PWA saat aplikasi diminimalkan atau dibunuh oleh Android LMK di latar belakang ketika pengguna berpindah ke Termux atau Browser AI pada perangkat RAM 3GB.
* **Dependensi:** `TASK-036`
* **File:** `src/tests/lmkRecovery.test.ts`
* **Docs Terkait:** `docs/mobile/blueprint/09_FAILURE_AND_RECOVERY.md`, `01_SYSTEM_OVERVIEW.md`
* **Docs Impact:** -
* **Acceptance Criteria:**
  1. Draft editor dan state aktif pulih 100% setelah simulasi pemutusan memori / reload paksa.
  2. Zero loss context: tidak ada ketikan pengguna yang hilang melebihi batas debounce 400ms.
  3. Indikator pemulihan sesi tampil mengonfirmasi keberhasilan restorasi data.
* **Test Case:** `TC-P7-02`
* **Metode Verifikasi:** Simulasikan force kill tab di browser devtools, buka kembali dan verifikasi keutuhan state.

---

### TASK-038: Uji Operasi Offline 100% (Mode Pesawat) & Service Worker Cache
* **Fase:** FASE 7
* **Deskripsi:** Memverifikasi bahwa seluruh antarmuka PWA, perakit Context Pack, template Command Hub, dan pembaca dokumen beroperasi 100% secara lokal tanpa koneksi internet sama sekali.
* **Dependensi:** `TASK-037`
* **File:** `src/tests/offlineOperation.test.ts`
* **Docs Terkait:** `docs/mobile/blueprint/03_PWA_ARCHITECTURE.md`
* **Docs Impact:** -
* **Acceptance Criteria:**
  1. Seluruh tab PWA dapat diakses saat koneksi offline / Mode Pesawat aktif.
  2. Service Worker menyajikan bundel aset dari cache tanpa error network.
  3. Penyimpanan draft dan generator template bekerja normal secara offline.
* **Test Case:** `TC-P7-03`
* **Metode Verifikasi:** Putuskan koneksi internet sepenuhnya, operasikan PWA, dan amati kelancaran fungsi.

---

### TASK-039: Verifikasi Fisik Ergonomi Layar Sentuh & Target 44px+ di SM-T225
* **Fase:** FASE 7
* **Deskripsi:** Melakukan audit ergonomi fisik antarmuka pada layar 8.7 inci Samsung Galaxy Tab A7 Lite: memastikan kenyamanan sentuhan jari tanpa stylus/keyboard eksternal dan tidak ada elemen UI yang terpotong.
* **Dependensi:** `TASK-038`
* **File:** `src/components/mobile/MobileLayout.tsx`, `docs/mobile/DEVICE_AUDIT.md`
* **Docs Terkait:** `docs/mobile/blueprint/02_COMPONENT_ARCHITECTURE.md`, `10_TEST_STRATEGY.md`
* **Docs Impact:** -
* **Acceptance Criteria:**
  1. Semua tombol aksi memiliki target sentuh terukur >= 44x44px.
  2. Kontrol utama dapat dijangkau nyaman oleh jempol tangan pada posisi pegang tablet lanskap/potret.
  3. Teks terbaca jelas dengan kontras memadai pada layar WXGA+ (1340x800).
* **Test Case:** `TC-P7-04`
* **Metode Verifikasi:** Audit ukuran elemen via inspektur DOM dan checklist uji fisik perangkat.

---

### TASK-040: Audit Keamanan Zero-Secret & Verifikasi Pembersihan Token
* **Fase:** FASE 7
* **Deskripsi:** Melakukan pemindaian keamanan menyeluruh pada seluruh berkas repositori, draft LocalStorage, dan riwayat clipboard untuk memastikan nol rahasia (token, password, key) yang bocor atau tersimpan permanen.
* **Dependensi:** `TASK-039`
* **File:** `scripts/security-audit.sh`, `docs/mobile/SECURITY_AUDIT.md`
* **Docs Terkait:** `docs/mobile/blueprint/08_SECURITY_MODEL.md`
* **Docs Impact:** -
* **Acceptance Criteria:**
  1. Pemindaian regex mendeteksi 0 Personal Access Token GitHub (`ghp_*`) dan 0 API key di repo.
  2. LocalStorage hanya memuat metadata publik dan draft Markdown.
  3. Perintah `clean-auth` terbukti membersihkan memori cache kredensial secara tuntas.
* **Test Case:** `TC-P7-05`
* **Metode Verifikasi:** Jalankan skrip pemindai pola rahasia terhadap seluruh direktori kerja.

---

### ============================================================================
### FASE 8: DOKUMENTASI & PANDUAN OPERASIONAL TERPADU
### ============================================================================

### TASK-041: Panduan Instalasi Tablet & Penyiapan Termux (`INSTALLATION.md`)
* **Fase:** FASE 8
* **Deskripsi:** Menyusun panduan instalasi langkah-demi-langkah yang presisi untuk Samsung Galaxy Tab A7 Lite: instalasi Termux dari F-Droid, penyiapan paket Linux (Python, Git, Micro), cloning repositori ke Termux Home, dan instalasi PWA ke layar utama.
* **Dependensi:** `TASK-040`
* **File:** `docs/mobile/INSTALLATION.md`, `docs/mobile/TERMUX_SETUP.md`
* **Docs Terkait:** `docs/mobile/blueprint/04_TERMUX_INTEGRATION.md`, `05_STORAGE_AND_SYNC.md`
* **Docs Impact:** -
* **Acceptance Criteria:**
  1. Panduan memuat perintah copy-paste lengkap penyiapan Termux dari nol.
  2. Memuat instruksi instalasi PWA dari browser Chrome Android.
  3. Bahasa instruktif, jelas, dan bebas ambiguitas teknis.
* **Test Case:** `TC-P8-01`
* **Metode Verifikasi:** Review dokumen instalasi dan uji pembacaan alur instruksi.

---

### TASK-042: Panduan Pengguna & Alur Kerja Estafet 8 Anggota (`USER_GUIDE.md`)
* **Fase:** FASE 8
* **Deskripsi:** Menyusun panduan operasional harian bagi 8 anggota tim estafet: alur kerja 8 langkah, penggunaan selektor profil, pembagian tugas cabang, pengisian Context Pack, hingga checklist serah terima perangkat fisik.
* **Dependensi:** `TASK-041`
* **File:** `docs/mobile/USER_GUIDE.md`
* **Docs Terkait:** `docs/mobile/blueprint/07_WORKFLOW_DESIGN.md`, `14_MULTI_AI_TEAM_MODEL.md`
* **Docs Impact:** -
* **Acceptance Criteria:**
  1. Panduan mengilustrasikan alur kerja harian secara visual dan sistematis.
  2. Memuat protokol pergantian giliran tablet antar anggota tim.
  3. Tersedia panduan ringkas tips efisiensi RAM pada perangkat 3GB.
* **Test Case:** `TC-P8-02`
* **Metode Verifikasi:** Review dokumen panduan pengguna dan kelengkapan materi alur kerja.

---

### TASK-043: Panduan Penanganan Masalah & Recovery Mandiri (`TROUBLESHOOTING.md`)
* **Fase:** FASE 8
* **Deskripsi:** Menyusun panduan pemecahan masalah operasional umum di tablet: penanganan aplikasi terbunuh LMK, pemulihan draft sesi yang belum ter-commit, resolusi error izin penyimpanan, dan recovery Kasus A–D.
* **Dependensi:** `TASK-042`
* **File:** `docs/mobile/TROUBLESHOOTING.md`
* **Docs Terkait:** `docs/mobile/blueprint/09_FAILURE_AND_RECOVERY.md`
* **Docs Impact:** -
* **Acceptance Criteria:**
  1. Memuat daftar gejala error umum dan solusinya dalam bentuk matriks tanya-jawab.
  2. Menyediakan perintah recovery mandiri yang siap disalin ke Termux.
  3. Menegaskan larangan penggunaan perintah destruktif tanpa backup.
* **Test Case:** `TC-P8-03`
* **Metode Verifikasi:** Review matriks troubleshoot dan verifikasi keabsahan perintah recovery.

---

### ============================================================================
### FASE 9: AUDIT, TESTING & REVIEW MULTI-AI EKSTERNAL (CLAUDE, CHATGPT, DEEPSEEK)
### ============================================================================

### TASK-044: Generator Prompt Audit & Bundel File ZIP Review Multi-AI (Step 1)
* **Fase:** FASE 9
* **Deskripsi:** Membangun generator prompt audit, testing, dan arsitektur review komprehensif untuk Claude, ChatGPT, dan DeepSeek dengan format bahasa teknis, singkat, terstruktur, berbasis bukti nyata (anti-placeholder), siap unduh (.md), serta menyiapkan skrip dan berkas bundel ZIP proyek lengkap (public/assets/zlce-audit-review-bundle.zip, 69 berkas).
* **Dependensi:** `TASK-043`
* **File:** `src/utils/auditPromptGenerator.ts`, `scripts/create-audit-bundle.py`, `src/components/mobile/FeedbackReviewTab.tsx`
* **Docs Terkait:** `docs/mobile/blueprint/14_MULTI_AI_TEAM_MODEL.md`, `CLAUDE_CHATGPT_HANDOVER.md`
* **Docs Impact:** `src/components/Header.tsx`, `src/App.tsx`
* **Acceptance Criteria:**
  1. Generator menghasilkan prompt mandat audit terstruktur dengan stop token model sasaran (Claude, ChatGPT, DeepSeek, Gemini).
  2. Prompt mewajibkan jawaban teknis tanpa basa-basi, berbasis bukti kode konkret, dan mengusulkan task terstruktur.
  3. Tersedia skrip pembundel ZIP otomatis yang mengemas 69 berkas kontrol, blueprint, dan kode ke `public/assets/zlce-audit-review-bundle.zip`.
  4. Tersedia aksi 1-ketukan salin, unduh file prompt `.md`, dan unduh bundel ZIP di tab Audit & Feedback.
* **Test Case:** `TC-P9-01`
* **Metode Verifikasi:** Bangkitkan prompt audit untuk 3 model, unduh berkas .md, dan verifikasi integritas berkas bundel ZIP.

---

### TASK-045: Modul Tanggapan Tanya-Jawab & Klarifikasi Permintaan File AI Eksternal (Step 2)
* **Fase:** FASE 9
* **Deskripsi:** Membangun modul dialog teknis untuk menanggapi pertanyaan klarifikasi arsitektur, review awal, dan permintaan berkas dari Claude, ChatGPT, atau DeepSeek saat mereka mengevaluasi proyek.
* **Dependensi:** `TASK-044`
* **File:** `src/utils/auditPromptGenerator.ts`, `src/components/mobile/FeedbackReviewTab.tsx`
* **Docs Terkait:** `docs/mobile/blueprint/09_FAILURE_AND_RECOVERY.md`, `08_SECURITY_MODEL.md`
* **Docs Impact:** -
* **Acceptance Criteria:**
  1. Tersedia kolom input pertanyaan dan tombol cepat preset topik umum (LMK RAM 3GB, Zero-Secret, Ergonomi 44px, Offline 100%).
  2. Generator menghasilkan jawaban teknis terstruktur berbasis Single Source of Truth proyek dengan referensi berkas terkait.
  3. Menyediakan tombol 1-ketukan salin tanggapan untuk dikirimkan kembali ke AI peninjau.
* **Test Case:** `TC-P9-02`
* **Metode Verifikasi:** Masukkan pertanyaan klarifikasi dan verifikasi akurasi serta kelengkapan cuplikan jawaban teknis.

---

### TASK-046: Integrator Review Final & Perencana Task Perbaikan Terstruktur (Step 3)
* **Fase:** FASE 9
* **Deskripsi:** Membangun antarmuka dan modul parser ulasan review final eksternal yang membedah hasil temuan (skor, kelebihan, celah arsitektur), menawarkan proposal tindakan perbaikan, membaginya ke dalam sub-task terstruktur, dan meminta persetujuan pengguna sebelum dialirkan ke backlog.
* **Dependensi:** `TASK-045`
* **File:** `src/utils/auditPromptGenerator.ts`, `src/components/mobile/FeedbackReviewTab.tsx`
* **Docs Terkait:** `docs/mobile/blueprint/07_WORKFLOW_DESIGN.md`
* **Docs Impact:** `SESSION_STATE.md`
* **Acceptance Criteria:**
  1. Tersedia area upload/tempel laporan review final dari Claude, ChatGPT, atau DeepSeek.
  2. Parser mengekstrak skor kesiapan produksi, ringkasan eksekutif, dan temuan risiko beserta tingkat keparahan.
  3. Fitur "Tawarkan Tindakan Perbaikan" memecah rekomendasi menjadi usulan task baru dengan pilihan persetujuan interaktif (checkbox).
  4. Penegakan prinsip kehati-hatian: task baru hanya diterapkan ke `SESSION_STATE.md` setelah tombol persetujuan ditekan oleh pengguna.
* **Test Case:** `TC-P9-03`
* **Metode Verifikasi:** Muat contoh laporan review, periksa daftar usulan task, dan uji integrasi task yang disetujui ke status sesi.

---

### ============================================================================
### FASE 10: REMEDIASI AUDIT & PENGERASAN SISTEM (AUD-001 s/d AUD-014)
### ============================================================================

### TASK-047: Zero-Secret Pre-Commit Hardening (AUD-001)
* **Fase:** FASE 10 (P0 - CRITICAL)
* **Deskripsi:** Membangun skrip instalasi git hook pre-commit otomatis (`scripts/install-hooks.sh`) yang mengeksekusi `scripts/security-audit.sh` secara mandatori di Termux sebelum setiap `git commit` diizinkan, mencegah kebocoran token ghp_*, PAT, dan private key.
* **Dependensi:** `TASK-046`
* **File:** `scripts/install-hooks.sh`, `scripts/security-audit.sh`, `docs/mobile/SECURITY_AUDIT.md`
* **Docs Terkait:** `docs/mobile/blueprint/08_SECURITY_MODEL.md`
* **Docs Impact:** `SESSION_STATE.md`
* **Acceptance Criteria:**
  1. Skrip `scripts/install-hooks.sh` mengonfigurasi `.git/hooks/pre-commit` dengan izin eksekusi (`chmod +x`).
  2. Pre-commit hook memblokir commit jika terdeteksi pola secret sensitif dengan exit code != 0.
  3. Menyediakan pesan instruksi pembersihan ramah layar sentuh jika commit dibatalkan.
* **Test Case:** `TC-P10-01`
* **Metode Verifikasi:** Jalankan `bash scripts/install-hooks.sh` dan simulasi commit dengan secret tiruan.

---

### TASK-048: LMK Hook Integration Lifecycle Test (AUD-002)
* **Fase:** FASE 10 (P0 - CRITICAL)
* **Deskripsi:** Mengimplementasikan uji integrasi siklus hidup React nyata untuk hook `useAutoDraftCache` pada event `visibilitychange` 'hidden' dan `pagehide`, membuktikan synchronous cache flush sebelum memori dihentikan Android LMK.
* **Dependensi:** `TASK-047`
* **File:** `src/tests/lmkRecovery.test.ts`, `src/hooks/useAutoDraftCache.ts`
* **Docs Terkait:** `docs/mobile/blueprint/09_FAILURE_AND_RECOVERY.md`
* **Docs Impact:** `SESSION_STATE.md`
* **Acceptance Criteria:**
  1. Pengujian memvalidasi eksekusi synchronous flush saat transisi tab ke background.
  2. Data draft LocalStorage tidak terpotong (zero data loss) saat komponen di-unmount tiba-tiba.
* **Test Case:** `TC-P10-02`
* **Metode Verifikasi:** Jalankan unit test lmkRecovery dan verifikasi persistensi buffer draft.

---

### TASK-049: Browser Restart Validation (AUD-003)
* **Fase:** FASE 10 (P0 - CRITICAL)
* **Deskripsi:** Memvalidasi pemulihan draft sesi setelah browser di-restart penuh (cold-start recovery) dari LocalStorage tanpa kehilangan status atau dependensi task.
* **Dependensi:** `TASK-048`
* **File:** `src/tests/browserRecovery.test.ts`, `src/hooks/useAutoDraftCache.ts`
* **Docs Terkait:** `docs/mobile/blueprint/09_FAILURE_AND_RECOVERY.md`
* **Docs Impact:** `SESSION_STATE.md`
* **Acceptance Criteria:**
  1. Skenario cold-start browser memulihkan status sesi terakhir dari storage secara otomatis.
  2. State yang dipulihkan tervalidasi 100% lulus aturan kanonik Invarian I1-I5.
* **Test Case:** `TC-P10-03`
* **Metode Verifikasi:** Eksekusi skenario uji cold-start pemulihan LocalStorage.

---

### TASK-050: Physical SM-T225 LMK Verification (AUD-004)
* **Fase:** FASE 10 (P0 - CRITICAL)
* **Deskripsi:** Menyusun panduan protokol dan skrip pengujian alokasi beban RAM nyata di Termux (`scripts/test-lmk-physical.sh`) untuk memicu LMK pada tablet Samsung Galaxy Tab A7 Lite fisik.
* **Dependensi:** `TASK-049`
* **File:** `docs/mobile/DEVICE_AUDIT.md`, `scripts/test-lmk-physical.sh`
* **Docs Terkait:** `docs/mobile/blueprint/09_FAILURE_AND_RECOVERY.md`
* **Docs Impact:** `SESSION_STATE.md`
* **Acceptance Criteria:**
  1. Skrip `test-lmk-physical.sh` mampu mengalokasikan RAM bertahap (1.5GB - 2.2GB) untuk memicu sinyal LMK Android secara aman.
  2. Prosedur pemulihan PWA setelah terminasi background tercatat di DEVICE_AUDIT.md.
* **Test Case:** `TC-P10-04`
* **Metode Verifikasi:** Jalankan skrip alokasi di terminal dan catat log pemulihan state.

---

### TASK-051: Browser Multi-User Session Isolation (AUD-005)
* **Fase:** FASE 10 (P0 - CRITICAL)
* **Deskripsi:** Menerapkan partisi namespace LocalStorage/draft per anggota tim aktif (`zlce_draft_[memberId]`) agar pergantian anggota di tablet bersama tidak menimpa pekerjaan draft anggota lain.
* **Dependensi:** `TASK-050`
* **File:** `src/hooks/useAutoDraftCache.ts`, `src/data/teamMembers.ts`
* **Docs Terkait:** `docs/mobile/blueprint/05_STORAGE_AND_SYNC.md`
* **Docs Impact:** `SESSION_STATE.md`
* **Acceptance Criteria:**
  1. Kunci cache draft otomatis menyertakan alias/ID anggota aktif.
  2. Pergantian anggota tim memuat draft milik anggota terkait tanpa kontaminasi.
* **Test Case:** `TC-P10-05`
* **Metode Verifikasi:** Beralih antar 2 anggota dan periksa independensi isi draft masing-masing.

---

### TASK-052: Task Claim Exclusivity & Conflict Guard (AUD-006)
* **Fase:** FASE 10 (P1 - HIGH)
* **Deskripsi:** Memperkuat pengaman integritas status klaim task untuk mencegah race condition atau klaim ganda tak sengaja pada mode offline.
* **Dependensi:** `TASK-051`
* **File:** `src/utils/taskClaimManager.ts`, `src/types/mobile.ts`
* **Docs Terkait:** `docs/mobile/blueprint/07_WORKFLOW_DESIGN.md`
* **Docs Impact:** `SESSION_STATE.md`
* **Acceptance Criteria:**
  1. Penolakan mutlak klaim jika ada task lain yang sedang berstatus IN_PROGRESS.
  2. Dialog konfirmasi eksplisit jika anggota ingin mengambil alih task dari anggota lain.
* **Test Case:** `TC-P10-06`
* **Metode Verifikasi:** Jalankan unit test taskClaimManager pada skenario tumpang-tindih.

---

### TASK-053: Transactional File Persistence (AUD-007)
* **Fase:** FASE 10 (P1 - HIGH)
* **Deskripsi:** Mengimplementasikan pola penulisan transaksional (double-buffering / temporary file) pada penulisan berkas kontrol untuk mencegah korupsi berkas saat daya baterai habis.
* **Dependensi:** `TASK-052`
* **File:** `src/utils/fileExport.ts`, `src/hooks/useAutoDraftCache.ts`
* **Docs Terkait:** `docs/mobile/blueprint/05_STORAGE_AND_SYNC.md`
* **Docs Impact:** `SESSION_STATE.md`
* **Acceptance Criteria:**
  1. Data ditulis ke buffer sementara sebelum menggantikan target utama.
  2. Mekanisme checksum verifikasi integritas sebelum komit penyimpanan.
* **Test Case:** `TC-P10-07`
* **Metode Verifikasi:** Simulasikan kegagalan penulisan di tengah proses dan verifikasi preservasi state sebelumnya.

---

### TASK-054: Offline E2E Navigation & SW Cache Check (AUD-008)
* **Fase:** FASE 10 (P1 - HIGH)
* **Deskripsi:** Memverifikasi secara menyeluruh seluruh rute navigasi tab, aset ikon, dan komputasi lokal berfungsi 100% saat Service Worker offline tanpa koneksi internet.
* **Dependensi:** `TASK-053`
* **File:** `public/sw.js`, `src/tests/offlineOperation.test.ts`
* **Docs Terkait:** `docs/mobile/blueprint/03_PWA_ARCHITECTURE.md`
* **Docs Impact:** `SESSION_STATE.md`
* **Acceptance Criteria:**
  1. Tidak ada permintaan jaringan eksternal yang menyebabkan UI hang saat offline.
  2. Seluruh 10 tab mobile workbench dapat diakses mulus tanpa sambungan data.
* **Test Case:** `TC-P10-08`
* **Metode Verifikasi:** Jalankan offline test suite dan verifikasi kelengkapan cache sw.js.

---

### TASK-055: Git Workflow Canonicalization (AUD-009)
* **Fase:** FASE 10 (P1 - HIGH)
* **Deskripsi:** Menstandarkan alur kerja git estafet multi-cabang tanpa opsi berbahaya (`--force`), melengkapi template penarikan cepat `--ff-only`, dan panduan resolusi konflik cabang.
* **Dependensi:** `TASK-054`
* **File:** `src/data/commandTemplates.ts`, `docs/mobile/blueprint/06_REPOSITORY_CHANGES.md`
* **Docs Terkait:** `docs/mobile/blueprint/06_REPOSITORY_CHANGES.md`
* **Docs Impact:** `SESSION_STATE.md`
* **Acceptance Criteria:**
  1. Katalog perintah menolak seluruh varian perintah non-fast-forward destruktif.
  2. Panduan langkah resolusi konflik cabang terdokumentasi terpadu.
* **Test Case:** `TC-P10-09`
* **Metode Verifikasi:** Verifikasi template perintah git via commandSanitizer dan verifier rules.

---

### TASK-056: Test Suite Normalization (AUD-010)
* **Fase:** FASE 10 (P1 - HIGH)
* **Deskripsi:** Mengonsolidasikan seluruh unit test, linter, dan pemeriksaan integrasi ke dalam runner CLI tunggal yang terintegrasi dengan `npm test` dan CI/CD pipeline.
* **Dependensi:** `TASK-055`
* **File:** `scripts/run-tests.py`, `package.json`
* **Docs Terkait:** `docs/mobile/blueprint/10_TEST_STRATEGY.md`
* **Docs Impact:** `SESSION_STATE.md`
* **Acceptance Criteria:**
  1. Perintah `npm test` menjalankan runner komprehensif dengan laporan ringkas per fase.
  2. Exit code 0 jika seluruh check pass, exit code 1 jika ada kegagalan.
* **Test Case:** `TC-P10-10`
* **Metode Verifikasi:** Jalankan `npm test` dan periksa status ringkasan akhir.

---

### TASK-057: Blueprint Release Baseline Sync (AUD-011)
* **Fase:** FASE 10 (P2 - MEDIUM)
* **Deskripsi:** Melakukan sinkronisasi silang antara 14 dokumen cetak biru dengan implementasi kode nyata agar tidak ada disparitas atau over-claiming dalam dokumentasi arsitektur.
* **Dependensi:** `TASK-056`
* **File:** `docs/mobile/MOBILE_BLUEPRINT.md`, `docs/mobile/blueprint/*`
* **Docs Terkait:** `docs/mobile/blueprint/01_SYSTEM_OVERVIEW.md`
* **Docs Impact:** `SESSION_STATE.md`
* **Acceptance Criteria:**
  1. Seluruh referensi berkas dan komponen di cetak biru sesuai dengan file tree aktual.
  2. Status implementasi pada master blueprint mencerminkan kondisi riil v4.0.0.
* **Test Case:** `TC-P10-11`
* **Metode Verifikasi:** Jalankan inspeksi integritas tautan dan berkas pada dokumen cetak biru.

---

### TASK-058: Audit Bundle Reproducibility (AUD-012)
* **Fase:** FASE 10 (P2 - MEDIUM)
* **Deskripsi:** Menjamin determinisme dan keterulangan pembuatan berkas bundel ZIP audit dengan pemetaan checksum SHA-256 berkas kontrol.
* **Dependensi:** `TASK-057`
* **File:** `scripts/create-audit-bundle.py`, `scripts/sync-assets.mjs`
* **Docs Terkait:** `docs/mobile/blueprint/14_MULTI_AI_TEAM_MODEL.md`
* **Docs Impact:** `SESSION_STATE.md`
* **Acceptance Criteria:**
  1. Generator bundel menghasilkan checksum manifest yang dapat diverifikasi ulang.
  2. Ukuran dan daftar berkas bundel sinkron di seluruh environment.
* **Test Case:** `TC-P10-12`
* **Metode Verifikasi:** Eksekusi skrip bundel dan bandingkan hash berkas output.

---

### TASK-059: React State Updater Purity (AUD-013)
* **Fase:** FASE 10 (P2 - LOW)
* **Deskripsi:** Mengaudit dan membersihkan pemanggilan fungsi mutasi state pada komponen-komponen mobile agar bebas dari efek samping (functional state updater discipline).
* **Dependensi:** `TASK-058`
* **File:** `src/components/mobile/FeedbackReviewTab.tsx`, `src/App.tsx`
* **Docs Terkait:** `docs/mobile/blueprint/02_COMPONENT_ARCHITECTURE.md`
* **Docs Impact:** `SESSION_STATE.md`
* **Acceptance Criteria:**
  1. Seluruh setState berbasis previous state menggunakan fungsi arrow murni `(prev => ...)`.
  2. Tidak ada mutasi langsung terhadap array atau objek state.
* **Test Case:** `TC-P10-13`
* **Metode Verifikasi:** Linting dan pengujian rendering React component.

---

### TASK-060: Documentation & Troubleshooting Revision (AUD-014)
* **Fase:** FASE 10 (P2 - LOW)
* **Deskripsi:** Memperbarui buku panduan operasional pengguna (`USER_GUIDE.md`) dan matriks pemecahan masalah (`TROUBLESHOOTING.md`) dengan temuan audit terbaru.
* **Dependensi:** `TASK-059`
* **File:** `docs/mobile/USER_GUIDE.md`, `docs/mobile/TROUBLESHOOTING.md`
* **Docs Terkait:** `docs/mobile/blueprint/07_WORKFLOW_DESIGN.md`
* **Docs Impact:** `SESSION_STATE.md`
* **Acceptance Criteria:**
  1. Panduan memuat solusi untuk seluruh 14 temuan audit AUD-001 s/d AUD-014.
  2. Langkah penanganan kegagalan termutakhirkan dengan skrip-skrip baru.
* **Test Case:** `TC-P10-14`
* **Metode Verifikasi:** Tinjau kelengkapan dokumen USER_GUIDE.md dan TROUBLESHOOTING.md.

---

### ============================================================================
### FASE 11: REMEDIASI AUDIT LANJUTAN [CLAUDE 5.5 REVIEW - AUD-015 s.d. AUD-028]
### ============================================================================

### TASK-061: Bundle Closure Verification Gate (AUD-015)
* **Fase:** FASE 11 (P1 - HIGH)
* **Deskripsi:** Memperbarui generator bundel `scripts/create-audit-bundle.py` agar menyertakan seluruh modul dependensi yang hilang (`markdownParser`, `zlceValidator`, `relayHandoverGenerator`, `auditPromptGenerator`, `src/components/**`, `src/index.css`, `package-lock.json`, `scripts/zlce-collect.py`), serta menambahkan fungsi gerbang build `verify_bundle_closure()` yang memvalidasi bahwa seluruh berkas impor relatif terselesaikan sempurna di dalam bundel ZIP.
* **Dependensi:** `TASK-060`
* **File:** `scripts/create-audit-bundle.py`, `scripts/sync-assets.mjs`
* **Docs Terkait:** `docs/mobile/blueprint/10_TEST_STRATEGY.md`
* **Docs Impact:** `SESSION_STATE.md`
* **Acceptance Criteria:**
  1. `FILES_TO_BUNDLE` mencakup seluruh berkas pustaka dan utilitas TypeScript yang diimpor oleh tes dan modul mobile.
  2. Fungsi `verify_bundle_closure` mengaudit AST/regex import di dalam arsip ZIP sebelum selesai dan menghentikan proses (exit 1) jika ada broken import.
  3. Pembuatan bundel ZIP bersih lulus verifikasi closure 100% tanpa celah module tidak ditemukan.
* **Test Case:** `TC-P11-01`
* **Metode Verifikasi:** Jalankan `python3 scripts/create-audit-bundle.py` dan verifikasi bahwa closure check lulus dengan 0 missing modules.

---

### TASK-062: Runner Metrics Truthfulness & Dynamic Counter (AUD-016)
* **Fase:** FASE 11 (P1 - HIGH)
* **Deskripsi:** Mengganti string statis/hardcoded "44/44 checks OK" pada `scripts/run-tests.py` dengan kelas `Counter` dinamis yang mencatat jumlah pemeriksaan nyata. Memperbarui banner runner ke v4.0.0/v4.1.0 dan menyelaraskan versi di `package.json` dari 0.0.0 menjadi 4.0.0.
* **Dependensi:** `TASK-061`
* **File:** `scripts/run-tests.py`, `package.json`, `SESSION_STATE.md`
* **Docs Terkait:** `docs/mobile/blueprint/10_TEST_STRATEGY.md`
* **Docs Impact:** `SESSION_STATE.md`
* **Acceptance Criteria:**
  1. `run-tests.py` menghitung total step dan pass/fail secara real-time via `counter.record(ok)`.
  2. Banner dan keluaran teks mencerminkan versi rilis v4.0.0/v4.1.0 secara konsisten.
  3. `package.json` memiliki field version `4.0.0` sinkron dengan dokumentasi.
* **Test Case:** `TC-P11-02`
* **Metode Verifikasi:** Jalankan `python3 scripts/run-tests.py` dan periksa kesesuaian angka hasil penghitungan dinamis dan banner.

---

### TASK-063: Strict Shell Injection Hardening & POSIX Quoting (AUD-017)
* **Fase:** FASE 11 (P1 - HIGH)
* **Deskripsi:** Menutup celah injeksi argumen dan opsi git (`-c core.hooksPath=...`, `git add --force *`) pada pembangun perintah commit. Menerapkan POSIX single-quote escaping `shellQuote`, validasi ketat path repositori `assertSafeRepoPath`, sanitasi nama/email anggota, dan penolakan eksplisit pada taskId tidak valid (throw error alih-alih silent fallback ke TASK-001).
* **Dependensi:** `TASK-062`
* **File:** `src/utils/commandSanitizer.ts`, `src/utils/gitCommitFormatter.ts`, `src/utils/commandBinder.ts`, `src/data/commandTemplates.ts`
* **Docs Terkait:** `docs/mobile/blueprint/08_SECURITY_MODEL.md`
* **Docs Impact:** `src/tests/gitWorkflow.test.ts`
* **Acceptance Criteria:**
  1. `shellQuote` membungkus argumen dengan kutip tunggal POSIX (`'...'`) dengan escaping `'` yang aman.
  2. `assertSafeRepoPath` menolak flag argumen (`--force`), wildcard (`*`), direktori sensitif (`.git`, `.env`), dan traversal (`..`).
  3. Format `git add` menggunakan pemisah opsi eksplisit `git add -- <files>`.
  4. Unit test memverifikasi penolakan injeksi konfigurasi git dan karakter escape shell (`!`, `"`, `$`).
* **Test Case:** `TC-P11-03`
* **Metode Verifikasi:** Eksekusi unit test `gitWorkflow.test.ts` dan jalankan skenario injeksi payload berbahaya.

---

### TASK-064: Shared Tablet Draft Isolation & Stale Closure Fix (AUD-018)
* **Fase:** FASE 11 (P1 - HIGH)
* **Deskripsi:** Memperbaiki kebocoran draft antar-anggota tim di tablet bersama pada hook `useAutoDraftCache.ts`. Menghilangkan stale closure saat pergantian `zlce_active_member_id`, menghapus fallback berbahaya ke global key `localStorage.getItem(storageKey)`, menggunakan `dirtyKeyRef` untuk pencatatan flush, dan memindahkan side-effects keluar dari updater fungsi state React.
* **Dependensi:** `TASK-063`
* **File:** `src/hooks/useAutoDraftCache.ts`, `src/tests/multiUserIsolation.test.ts`
* **Docs Terkait:** `docs/mobile/blueprint/05_STORAGE_AND_SYNC.md`, `14_MULTI_AI_TEAM_MODEL.md`
* **Docs Impact:** `SESSION_STATE.md`
* **Acceptance Criteria:**
  1. Kunci penyimpanan selalu dikomputasi secara dinamis saat operasi baca/tulis draft dilakukan (`getScopedStorageKey`).
  2. Pergantian anggota aktif memuat draft bersih khusus anggota tersebut tanpa ada kontaminasi draft anggota sebelumnya.
  3. Pemanggilan `setDraftContentState` murni tanpa efek samping asynchronous.
  4. Pengujian multiUserIsolation membuktikan isolasi storage sempurna antara Anggota A dan Anggota B.
* **Test Case:** `TC-P11-04`
* **Metode Verifikasi:** Jalankan unit test `multiUserIsolation.test.ts` dan verifikasi simulasi ganti anggota.

---

### TASK-065: Termux Dispatcher Robustness & Safe Pull (AUD-019)
* **Fase:** FASE 11 (P2 - MEDIUM)
* **Deskripsi:** Memperbaiki logika `pull` pada CLI dispatcher `scripts/zlce/zlce` agar tidak memanggil `checkout -B ... --ff-only` (yang menyebabkan exit 129 atau penghapusan unpushed local commit). Menggantinya dengan alur aman: verifikasi working tree bersih, `fetch origin <branch>`, `checkout <branch>`, dan `merge --ff-only origin/<branch>`. Memblokir `push` langsung ke cabang `main` (exit 1), dan menyatukan pemanggilan `clean-auth` ke skrip kanonik.
* **Dependensi:** `TASK-064`
* **File:** `scripts/zlce/zlce`, `scripts/zlce/README.md`
* **Docs Terkait:** `docs/mobile/blueprint/04_TERMUX_INTEGRATION.md`, `06_REPOSITORY_CHANGES.md`
* **Docs Impact:** `SESSION_STATE.md`
* **Acceptance Criteria:**
  1. `zlce pull` menjalankan fast-forward pull tanpa opsi checkout yang tidak valid.
  2. Perintah menolak pull jika working tree dalam keadaan kotor dan tidak pernah menghapus commit lokal yang belum dipush.
  3. `zlce push main` diblokir dengan exit 1 untuk melindungi integritas branch utama.
  4. `zlce clean-auth` mendelegasikan eksekusi langsung ke `clean-auth.sh`.
* **Test Case:** `TC-P11-05`
* **Metode Verifikasi:** Jalankan perintah `zlce pull`, `zlce push main`, dan `zlce clean-auth` di repositori uji.

---

### TASK-066: Security Audit Coverage & Fail-Closed Pre-Commit Hook (AUD-020)
* **Fase:** FASE 11 (P2 - MEDIUM)
* **Deskripsi:** Memperluas cakupan pemindaian `scripts/security-audit.sh` dan memperkeras pre-commit hook. Memperbaiki regex AUDIT 4 agar mendeteksi kredensial berkutip tunggal (`token: '...'`), menambahkan AUDIT 4b untuk URL remote berkredensial (`https://user:token@...`) dan token tambahan (`ghs_`, `sk-ant-`, `xox*`), membuat AUDIT 6 fail-closed jika interpreter tidak tersedia. Pre-commit hook memindai staged diff (`git diff --cached`) dan fail-closed jika audit script absen.
* **Dependensi:** `TASK-065`
* **File:** `scripts/security-audit.sh`, `scripts/install-hooks.sh`
* **Docs Terkait:** `docs/mobile/blueprint/08_SECURITY_MODEL.md`
* **Docs Impact:** `SESSION_STATE.md`
* **Acceptance Criteria:**
  1. `security-audit.sh` mendeteksi penetapan variabel dengan kutip tunggal, ganda, maupun URL remote dengan user:token.
  2. Pemeriksaan katalog perintah pada AUDIT 6 menangani ketiadaan modul tanpa mematikan skrip diam-diam.
  3. Pre-commit hook memblokir commit yang memuat secret di staged changes dan mencegah bypass fail-open.
* **Test Case:** `TC-P11-06`
* **Metode Verifikasi:** Jalankan `bash scripts/security-audit.sh` dan uji penolakan commit bertoken dengan hook pre-commit.

---

### TASK-067: Bundle Archive File Permissions Normalization (AUD-021)
* **Fase:** FASE 11 (P2 - MEDIUM)
* **Deskripsi:** Menetapkan atribut eksekusi POSIX (`external_attr = 0o100755 << 16` untuk berkas `.sh` dan skrip CLI `zlce`, serta `0o100644 << 16` untuk berkas reguler) di dalam `scripts/create-audit-bundle.py` dan `scripts/create-lmk-bundle.py`. Memperbarui seluruh pemanggilan skrip shell agar menggunakan `bash <skrip>` eksplisit untuk toleransi sistem file Android FAT/sdcard.
* **Dependensi:** `TASK-066`
* **File:** `scripts/create-audit-bundle.py`, `scripts/create-lmk-bundle.py`, `scripts/security-audit.sh`
* **Docs Terkait:** `docs/mobile/blueprint/04_TERMUX_INTEGRATION.md`
* **Docs Impact:** `SESSION_STATE.md`
* **Acceptance Criteria:**
  1. Berkas zip yang dihasilkan memiliki permission file `rwxr-xr-x` untuk seluruh skrip bash.
  2. Ekstraksi zip pada lingkungan Linux bersih langsung mempertahankan hak eksekusi skrip tanpa perlu `chmod +x` manual.
  3. Seluruh skrip audit dan runner memanggil skrip melalui interpreter `bash` eksplisit.
* **Test Case:** `TC-P11-07`
* **Metode Verifikasi:** Buat bundel zip, ekstrak di folder terisolasi, periksa permission berkas dengan `ls -la scripts/`.

---

### TASK-068: Unified Handover Clean-Auth & Credential Verification (AUD-022)
* **Fase:** FASE 11 (P2 - MEDIUM)
* **Deskripsi:** Menyatukan implementasi pembersihan autentikasi serah terima tablet pada `scripts/zlce/clean-auth.sh`, `src/utils/handoverChecklist.ts`, dan katalog template. Menghapus socket git credential cache di semua lokasi standar (`$HOME/.git-credential-cache` dan `$XDG_CACHE_HOME/git/credential`), melepas identitas global `user.name` & `user.email`, dan memverifikasi bahwa URL remote tidak mengandung token tertanam.
* **Dependensi:** `TASK-067`
* **File:** `scripts/zlce/clean-auth.sh`, `src/utils/handoverChecklist.ts`, `src/data/commandTemplates.ts`, `docs/mobile/blueprint/08_SECURITY_MODEL.md`
* **Docs Terkait:** `docs/mobile/blueprint/08_SECURITY_MODEL.md`
* **Docs Impact:** `SESSION_STATE.md`
* **Acceptance Criteria:**
  1. `clean-auth.sh` mematikan daemon credential-cache, menghapus file socket dari kedua path XDG dan HOME, serta melepas konfigurasi global git.
  2. Skrip melakukan verifikasi pasca-pembersihan dan mengembalikan exit code 1 jika ada kredensial yang masih tersisa.
  3. Komponen handover checklist dan panduan operasional merefleksikan instruksi sourcing shell dan pembersihan riwayat terminal.
* **Test Case:** `TC-P11-08`
* **Metode Verifikasi:** Jalankan `bash scripts/zlce/clean-auth.sh` dan verifikasi luaran status bersih 100%.

---

### TASK-069: Active Secret Redaction Layer on Storage & Context Pack (AUD-023)
* **Fase:** FASE 11 (P2 - MEDIUM)
* **Deskripsi:** Membangun modul utilitas `src/utils/redactSecrets.ts` untuk menyaring dan menyamarkan token/kunci API sensitif (`ghp_`, `github_pat_`, `sk-ant-`, `AIza`, AWS, private keys, URL berkredensial) menjadi `[REDACTED]`. Mengintegrasikan fungsi redaksi ini pada penyimpanan auto-draft `useAutoDraftCache`, generator context pack `contextPackGenerator.ts`, dan ekspor berkas `fileExport.ts`.
* **Dependensi:** `TASK-068`
* **File:** `src/utils/redactSecrets.ts`, `src/hooks/useAutoDraftCache.ts`, `src/utils/contextPackGenerator.ts`, `src/utils/fileExport.ts`, `src/utils/promptGenerator.ts`
* **Docs Terkait:** `docs/mobile/blueprint/08_SECURITY_MODEL.md`, `03_PWA_ARCHITECTURE.md`
* **Docs Impact:** `SESSION_STATE.md`
* **Acceptance Criteria:**
  1. Teks yang memuat pola token rahasia otomatis diredaksi sebelum disimpan ke LocalStorage atau diekspor ke context pack.
  2. UI memberikan feedback/peringatan visual jika ada token yang diredaksi dari masukan editor.
  3. Unit test memverifikasi tidak ada token yang lolos ke hasil generate context pack.
* **Test Case:** `TC-P11-09`
* **Metode Verifikasi:** Uji input berisikan sample dummy token dan verifikasi redaksi string pada hasil ekspor.

---

### TASK-070: LMK Documentation Accuracy & Physical Verification Log (AUD-024)
* **Fase:** FASE 11 (P2 - MEDIUM)
* **Deskripsi:** Mengoreksi pernyataan teknis pada `docs/mobile/DEVICE_AUDIT.md` mengenai mekanisme Android LMK (menjelaskan bahwa LMK kernel mengirim SIGKILL saat krisis memori, sedangkan `visibilitychange`/`pagehide` dipicu oleh siklus hidup peramban web saat backgrounding). Memperbarui skrip `scripts/test-lmk-physical.sh` agar mencatat log uji terstruktur berbasis `MemAvailable` dan menghasilkan output bukti uji verifikasi fisik.
* **Dependensi:** `TASK-069`
* **File:** `docs/mobile/DEVICE_AUDIT.md`, `scripts/test-lmk-physical.sh`
* **Docs Terkait:** `docs/mobile/blueprint/09_FAILURE_AND_RECOVERY.md`
* **Docs Impact:** `SESSION_STATE.md`
* **Acceptance Criteria:**
  1. Dokumentasi arsitektur akurat menjelaskan perbedaan antara sinyal daur hidup browser dan tindakan kernel SIGKILL.
  2. `test-lmk-physical.sh` membaca `/proc/meminfo` secara adaptif dan membuat berkas log fisik bertimestamp di Termux.
  3. Batas uji alokasi memori disesuaikan dengan kuota aman perangkat 3GB (maksimum 60% sisa memori).
* **Test Case:** `TC-P11-10`
* **Metode Verifikasi:** Jalankan `bash scripts/test-lmk-physical.sh` dan periksa berkas log hasil pengujian memori.

---

### TASK-071: Localhost Binding & Environment Decoupling (AUD-025)
* **Fase:** FASE 11 (P2 - MEDIUM)
* **Deskripsi:** Mengamankan pengikatan host dev server Vite menjadi `127.0.0.1` pada konfigurasi lokal tablet mandiri guna mencegah akses tanpa otorisasi via jaringan lokal Wi-Fi bersama. Membersihkan capability server AI Studio yang usang pada `metadata.json` (`MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API`) untuk konsistensi model murni offline & zero-secret, serta memastikan kestabilan dependensi.
* **Dependensi:** `TASK-070`
* **File:** `package.json`, `metadata.json`, `vite.config.ts`
* **Docs Terkait:** `docs/mobile/blueprint/08_SECURITY_MODEL.md`
* **Docs Impact:** `SESSION_STATE.md`
* **Acceptance Criteria:**
  1. Dev server mengikat IP localhost lokal `127.0.0.1` secara default untuk mode mandiri.
  2. `metadata.json` bebas dari capability backend eksternal yang tidak digunakan.
  3. Seluruh skrip npm beroperasi tanpa warning konfigurasi port/host.
* **Test Case:** `TC-P11-11`
* **Metode Verifikasi:** Periksa luaran startup server Vite dan inspeksi isi `metadata.json`.

---

### TASK-072: zlce-check Verification Evidence & Approval Authentication (AUD-026)
* **Fase:** FASE 11 (P2 - MEDIUM)
* **Deskripsi:** Memperketat validasi `scripts/zlce-check.py` terhadap integritas tabel SESSION_STATE. Kolom 'Bukti Verifikasi' diwajibkan memiliki rujukan ID test runner valid (`TC-P\d+-\d+`) atau hash commit git yang dapat diverifikasi saat bendera `--git` aktif. Menolak persetujuan kosong atau format nama di luar daftar registri anggota yang sah pada kolom 'Disetujui'.
* **Dependensi:** `TASK-071`
* **File:** `scripts/zlce-check.py`, `SESSION_STATE.md`
* **Docs Terkait:** `docs/mobile/blueprint/10_TEST_STRATEGY.md`
* **Docs Impact:** `SESSION_STATE.md`
* **Acceptance Criteria:**
  1. `zlce-check.py` memvalidasi keberadaan test case ID pada berkas runner uji untuk setiap task `DONE`.
  2. Nilai bukti verifikasi acak/palsu menghasilkan error/warning saat pemeriksaan `--strict`.
  3. Format persetujuan `ya (oleh: Nama)` divalidasi terhadap daftar anggota terdaftar.
* **Test Case:** `TC-P11-12`
* **Metode Verifikasi:** Jalankan `python3 scripts/zlce-check.py . --strict --no-git` dan uji dengan sampel data bukti palsu.

---

### TASK-073: Quantitative Touch Target & Ergonomics Verification (AUD-027)
* **Fase:** FASE 11 (P3 - LOW)
* **Deskripsi:** Mengganti pengujian tautologis TC-P7-04 pada `scripts/run-tests.py` dengan pemeriksaan kuantitatif terhadap pemenuhan standar ergonomi layar sentuh 8.7" (resolusi 1340x800 & 800x1340). Memverifikasi bahwa seluruh tombol dan elemen input interaktif di `src/components/mobile/` menerapkan utilitas kelas `touch-target-44`, `min-h-[44px]`, atau `min-w-[44px]` secara konsisten.
* **Dependensi:** `TASK-072`
* **File:** `scripts/run-tests.py`, `src/tests/touchTarget.test.ts`, `docs/mobile/DEVICE_AUDIT.md`
* **Docs Terkait:** `docs/mobile/blueprint/02_COMPONENT_ARCHITECTURE.md`
* **Docs Impact:** `SESSION_STATE.md`
* **Acceptance Criteria:**
  1. Seluruh komponen interaktif mobile divalidasi memiliki deklarasi ukuran sentuh minimal 44x44px.
  2. Test runner menguji kepatuhan kelas ergonomi pada seluruh elemen tombol dan tab secara terprogram.
  3. Dokumen `DEVICE_AUDIT.md` diperbarui dengan metodologi pengujian kuantitatif.
* **Test Case:** `TC-P11-13`
* **Metode Verifikasi:** Eksekusi unit test `touchTarget.test.ts` dan jalankan runner uji terpadu.

---

### TASK-074: Token Budget Safety Factor & Multi-Model Parameterization (AUD-028)
* **Fase:** FASE 11 (P3 - LOW)
* **Deskripsi:** Menyesuaikan faktor keamanan konversi token pada `tokenBudgetAdapter.ts` dan `contextPackGenerator.ts` (menggunakan rasio konservatif 3.0-3.2 char/token untuk teks bilingual & kode terformat). Memparameterisasi pilihan model AI sehingga mendukung keluarga model `Claude 3.5 Sonnet`, `Claude 5.5 Sonnet`, `Gemini 1.5/2.0 Pro/Flash`, dan `GPT-4o` secara dinamis tanpa hardcoded string model tunggal pada test runner.
* **Dependensi:** `TASK-073`
* **File:** `src/utils/contextPackGenerator.ts`, `src/utils/tokenBudgetAdapter.ts`, `src/components/mobile/TokenBudgetSelector.tsx`, `scripts/run-tests.py`
* **Docs Terkait:** `docs/mobile/blueprint/14_MULTI_AI_TEAM_MODEL.md`
* **Docs Impact:** `SESSION_STATE.md`
* **Acceptance Criteria:**
  1. Estimator token menerapkan rasio aman (3 char/token) pada preset kompak untuk mencegah truncate di LLM eksternal.
  2. Selector dan adapter model mendukung pemilihan model Claude 5.5 Sonnet dan Claude 3.5 Sonnet sebagai parameter dinamis.
  3. Test case `TC-P9-03` menerima identitas model multi-versi secara fleksibel.
* **Test Case:** `TC-P11-14`
* **Metode Verifikasi:** Jalankan unit test token budget dan uji pembuatan context pack dengan preset Claude 5.5 Sonnet.

---

### ============================================================================
### FASE 12: GA PRODUCTION HARDENING & CHATGPT GPT-6 AUDIT REMEDIATION
### ============================================================================

### TASK-075: Bundle Closure & Export Parity Gate (AUD2-001)
* **Fase:** FASE 12 (P0 - CRITICAL)
* **Deskripsi:** Memperbaiki `scripts/create-audit-bundle.py` agar menyertakan modul `src/utils/redactSecrets.ts` dan `src/tests/touchTarget.test.ts` ke dalam `FILES_TO_BUNDLE`. Membangun verifikasi penutup otomatis (*closure checker*) dinamis yang memindai seluruh berkas kode di bawah `src/` dan memastikan 100% berkas produksi dan pengujian masuk ke dalam bundel ZIP tanpa ada berkas yang tertinggal. Menghasilkan ulang bundel ZIP `public/assets/zlce-audit-review-bundle.zip` lengkap dengan `SHA256SUMS.txt`.
* **Dependensi:** `TASK-074`
* **File:** `scripts/create-audit-bundle.py`, `public/assets/zlce-audit-review-bundle.zip`
* **Docs Terkait:** `docs/mobile/blueprint/10_TEST_STRATEGY.md`
* **Docs Impact:** `SESSION_STATE.md`
* **Acceptance Criteria:**
  1. `src/utils/redactSecrets.ts` dan `src/tests/touchTarget.test.ts` hadir dalam bundel ZIP.
  2. `create-audit-bundle.py` memiliki dynamic closure check yang memvalidasi tidak ada berkas `.ts`/`.tsx` di `src/` yang tertinggal.
  3. Bundel ZIP baru berhasil dibuat dengan status closure 100% PASS dan berkas `SHA256SUMS.txt` tervalidasi.
* **Test Case:** `TC-P12-01`
* **Metode Verifikasi:** Jalankan `python3 scripts/create-audit-bundle.py` dan verifikasi isi arsip ZIP serta integritas checksum.

---

### TASK-076: Non-Destructive Auto-Draft Cache & Secret Warning (AUD2-002)
* **Fase:** FASE 12 (P0 - CRITICAL)
* **Deskripsi:** Memperbaiki `src/hooks/useAutoDraftCache.ts` agar tidak memutasi teks draft kerja secara destruktif saat auto-save ke LocalStorage. Draft kerja disimpan murni apa adanya di namespace lokal terisolasi pengguna. Membangun deteksi rahasia (*secret warning banner*) yang memberikan peringatan visual jika terdeteksi kredensial tanpa merusak teks asli. Memindahkan redaksi aktif hanya ke pintu keluar ekspor (*Export Barrier* / Context Pack). Menambahkan pelacakan revisi monotonic (`lastPersistedRevision`, `lastEditedRevision`).
* **Dependensi:** `TASK-075`
* **File:** `src/hooks/useAutoDraftCache.ts`, `src/components/mobile/WorkspaceEditor.tsx`, `src/tests/transactionalPersistence.test.ts`
* **Docs Terkait:** `docs/mobile/blueprint/05_STORAGE_AND_SYNC.md`, `docs/mobile/blueprint/08_SECURITY_MODEL.md`
* **Docs Impact:** `SESSION_STATE.md`
* **Acceptance Criteria:**
  1. `persistDraft` menyimpan teks murni tanpa menimpa substring pengguna dengan tag `[REDACTED_...]`.
  2. Saat draft dipulihkan (`restoreStoredDraft`), teks kembali 100% identik dengan teks yang diketik pengguna (`restore(persist(x)) === x`).
  3. Status deteksi secret diekspos sebagai metadata peringatan visual non-destruktif.
  4. Revisi draft dilacak dengan `lastPersistedRevision` dan `lastEditedRevision`.
* **Test Case:** `TC-P12-02`
* **Metode Verifikasi:** Jalankan uji round-trip persist-restore dan periksa tidak adanya mutasi diam-diam pada teks berformat template.

---

### TASK-077: RPO-Bounded LMK Model & Parameterized Physical Test (AUD2-003)
* **Fase:** FASE 12 (P0 - CRITICAL)
* **Deskripsi:** Merekonsiliasi dokumentasi LMK pada `docs/mobile/DEVICE_AUDIT.md` dan `docs/mobile/MOBILE_BLUEPRINT.md`: mengganti klaim "Zero Data Loss absolut" menjadi model ketahanan terukur **Loss-Bounded Persistence (RPO ≤ 400ms)** dan mendokumentasikan batas teknis kernel `SIGKILL` Android secara arsitektural. Memperbarui `scripts/test-lmk-physical.sh` agar membedakan dengan tegas mode sintaks `--verify-only` dengan prosedur pembebanan memori fisik aktual bertahap.
* **Dependensi:** `TASK-076`
* **File:** `docs/mobile/DEVICE_AUDIT.md`, `docs/mobile/MOBILE_BLUEPRINT.md`, `scripts/test-lmk-physical.sh`
* **Docs Terkait:** `docs/mobile/blueprint/09_FAILURE_AND_RECOVERY.md`
* **Docs Impact:** `SESSION_STATE.md`, `docs/mobile/DEVICE_AUDIT.md`
* **Acceptance Criteria:**
  1. Dokumentasi secara jujur menyatakan model RPO $\le 400$ ms untuk penulisan normal dan RPO = 0 pada transisi terencana, serta menjelaskan batasan `SIGKILL`.
  2. `scripts/test-lmk-physical.sh` memiliki pemisahan yang jelas antara `--verify-only` dan pengujian pembebanan RAM nyata.
  3. Log pengujian mencerminkan parameter target SM-T225 terukur.
* **Test Case:** `TC-P12-03`
* **Metode Verifikasi:** Jalankan `bash scripts/test-lmk-physical.sh --verify-only` dan periksa keselarasan dokumen arsitektur.

---

### TASK-078: Credential Handover Scope Correction (AUD2-004)
* **Fase:** FASE 12 (P1 - HIGH)
* **Deskripsi:** Memperbaiki cakupan pembersihan kredensial pada `scripts/zlce/clean-auth.sh` dan `src/utils/handoverChecklist.ts`. Mengganti klaim luas dengan pelaporan status granular per kontrol (daemon RAM dihentikan, socket dibersihkan, remote URL divalidasi). Memeriksa seluruh helper aktif via `git config --show-origin --get-all credential.helper` dan menghindari penghapusan destruktif identitas global pengguna (`user.name`/`user.email`). Menambahkan checklist serah terima untuk penutupan tab AI peramban, pembersihan clipboard, dan pembersihan riwayat terminal (`history -c`).
* **Dependensi:** `TASK-077`
* **File:** `scripts/zlce/clean-auth.sh`, `src/utils/handoverChecklist.ts`, `docs/mobile/SECURITY_AUDIT.md`
* **Docs Terkait:** `docs/mobile/blueprint/08_SECURITY_MODEL.md`
* **Docs Impact:** `SESSION_STATE.md`
* **Acceptance Criteria:**
  1. `clean-auth.sh` mematikan daemon RAM, membersihkan socket, dan memverifikasi remote URL tanpa merusak identitas pengguna.
  2. Status diekspos sebagai status per kontrol terperinci (PASS/WARN/ADVISORY).
  3. Handover checklist mencakup item sesi peramban AI dan riwayat terminal.
* **Test Case:** `TC-P12-04`
* **Metode Verifikasi:** Jalankan `bash scripts/zlce/clean-auth.sh` dan verifikasi pelaporan status per kontrol.

---

### TASK-079: Deterministic Offline App Shell (AUD2-005)
* **Fase:** FASE 12 (P1 - HIGH)
* **Deskripsi:** Memperbaiki Service Worker (`public/sw.js`) dan modul pendaftaran (`src/sw-register.ts`) agar mem-precache bundel aplikasi produksi secara deterministik. Memisahkan aset shell wajib dari aset opsional, menambahkan message listener `REGISTER_BUILD_ASSETS`, dan menyiarkan seluruh tag script & stylesheet DOM ke Service Worker saat halaman dimuat sehingga offline cold-start terjamin 100%.
* **Dependensi:** `TASK-078`
* **File:** `public/sw.js`, `src/sw-register.ts`, `src/tests/offlineOperation.test.ts`
* **Docs Terkait:** `docs/mobile/blueprint/03_PWA_ARCHITECTURE.md`
* **Docs Impact:** `SESSION_STATE.md`
* **Acceptance Criteria:**
  1. `sw.js` memisahkan aset inti wajib dan menangani kegagalan tanpa silent swallow.
  2. Listener `REGISTER_BUILD_ASSETS` mampu menyimpan berkas JS/CSS produksi ke Cache Storage secara deterministik.
  3. Aplikasi siap offline cold-start tanpa bergantung pada pemuatan chunk lambat.
* **Test Case:** `TC-P12-05`
* **Metode Verifikasi:** Jalankan unit test offlineOperation dan audit event message `REGISTER_BUILD_ASSETS`.

---

### TASK-080: Atomic Task Claim Guard (AUD2-006)
* **Fase:** FASE 12 (P1 - HIGH)
* **Deskripsi:** Memperkuat mekanisme klaim task pada `src/utils/taskClaimManager.ts` dengan pelacakan urutan nomor revisi monotonik (`revision: number`) dan proteksi Compare-and-Swap (CAS) optimis (`expectedRevision`). Menolak mutasi klaim jika terdeteksi konflik revisi usang dari tab/konteks lain. Memperbarui `src/tests/taskClaim.test.ts` dengan pengujian CAS multi-konteks.
* **Dependensi:** `TASK-079`
* **File:** `src/utils/taskClaimManager.ts`, `src/tests/taskClaim.test.ts`
* **Docs Terkait:** `docs/mobile/blueprint/14_MULTI_AI_TEAM_MODEL.md`
* **Docs Impact:** `SESSION_STATE.md`
* **Acceptance Criteria:**
  1. Setiap mutasi klaim menaikkan nomor revisi monotonik (`incrementClaimRevision`).
  2. Pemanggilan `claimTask` atau `takeoverTaskClaim` dengan `expectedRevision` yang tidak cocok ditolak dengan `STALE_REVISION`.
  3. Uji unit `taskClaim.test.ts` membuktikan penolakan race condition dan mutasi basi.
* **Test Case:** `TC-P12-06`
* **Metode Verifikasi:** Jalankan `npx tsx src/tests/taskClaim.test.ts` dan verifikasi kelulusan 7/7 checks.

---

### TASK-081: Test Runner Reconciliation (AUD2-007)
* **Fase:** FASE 12 (P1 - HIGH)
* **Deskripsi:** Merekonsiliasi `scripts/run-tests.py` agar mencakup seluruh fase pengujian hingga FASE 12. Mengintegrasikan penutupan bundel (`create-audit-bundle.py`), uji sentuh ergonomis tablet 44px (`touchTarget.test.ts`), dan inspeksi kredensial clean-auth (`clean-auth.sh`), dengan penghitungan dinamis passing rate nyata.
* **Dependensi:** `TASK-080`
* **File:** `scripts/run-tests.py`, `package.json`
* **Docs Terkait:** `docs/mobile/blueprint/10_TEST_STRATEGY.md`
* **Docs Impact:** `SESSION_STATE.md`
* **Acceptance Criteria:**
  1. `run-tests.py` memuat langkah pengujian terintegrasi untuk seluruh fase FASE 0 s/d FASE 12.
  2. Seluruh langkah pengujian lulus 100% tanpa error.
  3. Pelaporan ringkasan runner mencerminkan jumlah checks aktual secara dinamis.
* **Test Case:** `TC-P12-07`
* **Metode Verifikasi:** Jalankan `python3 scripts/run-tests.py` dan verifikasi kelulusan penuh.

---

### TASK-082: Release Documentation Baseline (AUD2-008)
* **Fase:** FASE 12 (P1 - HIGH)
* **Deskripsi:** Memperbarui baseline dokumentasi arsitektur: menetapkan status resmi seluruh 14 dokumen cetak biru menjadi `APPROVED / AS-BUILT (v4.0.0 GA)`, merekonsiliasi evolusi roadmap (43 baseline -> 46 review -> 60 hardening -> 74 remediasi -> 82 GA tuntas) pada `docs/mobile/MOBILE_BLUEPRINT.md`, serta memperbaiki sintaks perintah `git checkout`/`git pull` pada `05_STORAGE_AND_SYNC.md`.
* **Dependensi:** `TASK-081`
* **File:** `docs/mobile/MOBILE_BLUEPRINT.md`, `docs/mobile/blueprint/*`, `SESSION_STATE.md`, `TASKS.md`
* **Docs Terkait:** `docs/mobile/blueprint/01_SYSTEM_OVERVIEW.md`
* **Docs Impact:** `SESSION_STATE.md`
* **Acceptance Criteria:**
  1. Seluruh dokumen cetak biru berstatus `APPROVED / AS-BUILT` (tidak lagi DRAFT).
  2. Release Manifest pada master blueprint mendokumentasikan rekonsiliasi jumlah task secara transparan.
  3. Perintah Git pada dokumen sinkronisasi valid dan teruji di Termux.
* **Test Case:** `TC-P12-08`
* **Metode Verifikasi:** Periksa konsistensi seluruh dokumen cetak biru dan jalankan `python3 scripts/zlce-check.py .`.

---

## 3. ATURAN EKSEKUSI TASK (P2-CP6 PREPARATION)

1. **Aturan 1 Task IN_PROGRESS:** Tidak boleh ada lebih dari 1 task berstatus `IN_PROGRESS` pada waktu yang sama di tablet bersama.
2. **Definisi Selesai (Definition of Done):** Suatu task hanya boleh diubah statusnya menjadi `DONE` apabila:
   - Seluruh Acceptance Criteria terpenuhi.
   - Perubahan telah diuji secara nyata dengan bukti terlampir pada kolom `Bukti Verifikasi`.
   - Lulus linter dan validator ZLCE dengan 0 error.
   - Disetujui oleh anggota aktif yang dicatat namanya pada kolom `Disetujui`.
3. **Pencatatan WAL Mandatori:** Sebelum menyentuh berkas kode multi-file, rincian langkah wajib ditulis di Bagian 3 (WAL) `SESSION_STATE.md`.
4. **Zero Unapproved Tasks:** Tidak ada pekerjaan di luar nomor task yang terdaftar dalam backlog ini.
