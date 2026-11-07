# Catatan Perubahan (Changelog)

Semua perubahan penting pada proyek **ZLCE (Zero-Loss Context Engineering)** didokumentasikan di sini. Format mengikuti prinsip [Keep a Changelog](https://keepachangelog.com/id/1.0.0/).

## [4.0.0-alpha.TASK-046] - 2026-11-05

### Ditambahkan
- Penuntasan 100% **FASE 9: Audit, Testing & Review Multi-AI Eksternal** (`TASK-044` s/d `TASK-046`).
- **TASK-046**: Integrator Review Final & Perencana Task Perbaikan Terstruktur (`src/utils/auditPromptGenerator.ts`, `src/components/mobile/FeedbackReviewTab.tsx`, `TC-P9-03`).
- Modul pembedah teks laporan ulasan AI eksternal (`parseReviewFeedbackToProposedTasks`) yang mengekstrak skor kesiapan produksi (0-100), ringkasan eksekutif arsitektur, daftar temuan celah & risiko berperingkat (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`), serta memecahnya menjadi daftar usulan sub-task terstruktur (`ProposedSubTask[]`).
- Penegakan **Prinsip Kehati-hatian ZLCE**: usulan task baru tidak langsung mengubah sistem, melainkan disajikan dalam kartu checklist interaktif di mana pengguna menyetujui sub-task sebelum dialirkan ke Bagian 2 (Matriks Task) dan Bagian 7 (Log Audit) `SESSION_STATE.md`.
- Penambahan butir uji Step 35 (`TC-P9-03`) pada runner otomatis `scripts/run-tests.py` dengan hasil 35/35 checks PASS (100% OK).
- Seluruh 46/46 task roadmap v4.0.0 tuntas dan terverifikasi bersih (`zlce-check` 0 error, 0 warn) dengan pengesahan gerbang oleh Layang: `ya (oleh: layang)`.

---

## [4.0.0-alpha.TASK-045] - 2026-11-05

### Ditambahkan
- **TASK-045**: Modul Tanggapan Tanya-Jawab & Klarifikasi Permintaan File AI Eksternal (`src/utils/auditPromptGenerator.ts`, `src/components/mobile/FeedbackReviewTab.tsx`, `TC-P9-02`).
- Generator respon klarifikasi teknis cerdas (`generateTechnicalClarificationResponse`) untuk menanggapi pertanyaan pendalaman dan permintaan berkas dari Claude, ChatGPT, dan DeepSeek.
- Menyediakan 4 preset pertanyaan teknis domain kunci: (1) Ketahanan Android LMK & RAM 3GB, (2) Zero-Secret Policy & pembersihan RAM Termux via `clean-auth.sh`, (3) Audit Ergonomi Layar Sentuh 8.7" target 44px+ & `visualViewport` keyboard awareness, dan (4) Kapabilitas Offline PWA 100% & Service Worker precache.
- Pemetaan otomatis berkas referensi proyek terkait dan aksi 1-ketukan salin jawaban siap kirim kembali ke AI peninjau.
- Penambahan butir uji Step 34 (`TC-P9-02`) pada runner otomatis `scripts/run-tests.py` dengan hasil 35/35 checks PASS (100% OK).
- Pengesahan gerbang kualitas oleh Layang: `ya (oleh: layang)`. Status `TASK-046` beralih ke `READY`.

---

## [4.0.0-alpha.TASK-044] - 2026-11-05

### Ditambahkan
- **TASK-044**: Generator Prompt Audit & Bundel File ZIP Review Multi-AI (`src/utils/auditPromptGenerator.ts`, `scripts/create-audit-bundle.py`, `src/components/mobile/FeedbackReviewTab.tsx`, `TC-P9-01`).
- Generator prompt mandat audit, testing, dan arsitektur review terstruktur untuk 4 model sasaran (`claude-3.5-sonnet`, `chatgpt-4o`, `deepseek-v3`, `gemini-1.5-pro`) dengan injeksi stop token presisi (`=== END CLAUDE AUDIT RESPONSE ===`, dll.), penegakan bahasa teknis tanpa basa-basi, berbasis bukti kode konkret, anti-placeholder, dan target sentuh minimal 44px.
- Skrip pembuat bundel ZIP otomatis `scripts/create-audit-bundle.py` yang mengemas 69 berkas kontrol, blueprint, dan kode sumber ke `public/assets/zlce-audit-review-bundle.zip` (230.4 KB).
- Antarmuka tablet **Audit & Feedback** (`src/components/mobile/FeedbackReviewTab.tsx`) dengan alur 3-langkah (Prompt & Bundel ZIP, Tanya-Jawab Klarifikasi, dan Integrasi Review), aksi 1-ketukan salin, unduh file prompt `.md`, serta unduh bundel ZIP.
- Penambahan butir uji Step 33 (`TC-P9-01`) pada runner uji otomatis `scripts/run-tests.py` dengan hasil 35/35 checks PASS (100% OK).
- Penegakan integritas berkas status `SESSION_STATE.md` (46 task, 0 error, 0 warn) dengan pengesahan gerbang oleh Layang: `ya (oleh: layang)`. Status `TASK-045` beralih ke `READY`.

---

## [4.0.0] - 2026-11-05

### Ditambahkan
- **RILIS RESMI ZLCE MOBILE WORKBENCH v4.0.0**: Penuntasan 100% dari seluruh 43 task roadmap (`TASK-001` s/d `TASK-043`) pada Samsung Galaxy Tab A7 Lite (SM-T225).
- Penuntasan 100% **FASE 8: Dokumentasi & Panduan Operasional Terpadu** (`TASK-041` s/d `TASK-043`).
- **TASK-041**: Panduan Instalasi Tablet & Penyiapan Termux (`docs/mobile/INSTALLATION.md`, `docs/mobile/TERMUX_SETUP.md`, `TC-P8-01`). Menyediakan panduan langkah-demi-langkah instalasi Termux dari F-Droid, instalasi paket dasar Linux (`git`, `python`, `bash`, `coreutils`, `micro`, `openssh`), penyiapan symlink dispatcher `zlce`, instalasi PWA ke Layar Utama (Home Screen) dalam mode Standalone, serta lembar contekan mandiri environment Termux (alias, izin penyimpanan, editor micro).
- **TASK-042**: Panduan Pengguna & Alur Kerja Estafet 8 Anggota (`docs/mobile/USER_GUIDE.md`, `TC-P8-02`). Menyusun alur kerja harian 8 langkah terstruktur (Ambil Tablet -> Cek Status -> Klaim Task -> Context Pack -> Eksekusi AI -> Result Capture -> Commit Beridentitas -> Serah Terima & Clean-Auth), panduan beralih profil 8 anggota tim, panduan penggunaan Command Hub 1-tap copy, serta 4 tips efisiensi memori RAM 3GB.
- **TASK-043**: Panduan Penanganan Masalah & Recovery Mandiri (`docs/mobile/TROUBLESHOOTING.md`, `TC-P8-03`). Menyusun matriks Q&A 7 skenario masalah umum (Android LMK reload, permission denied, kerusakan sesi, non-fast-forward push, credential-cache expiry, storage access, multi-task in progress), protokol pemulihan terstandarisasi Kasus A s/d D, penegakan larangan perintah destruktif tanpa backup, dan prosedur snapshot cadangan `scripts/zlce-snapshot.sh`.
- Penambahan butir uji Step 30 (`TC-P8-01`), Step 31 (`TC-P8-02`), dan Step 32 (`TC-P8-03`) pada runner otomatis `scripts/run-tests.py` dengan hasil 32/32 checks PASS (100% OK).
- Penegakan integritas berkas status `SESSION_STATE.md` (43/43 task DONE, 0 error, 0 warn) dengan pengesahan gerbang oleh Layang: `ya (oleh: layang)`.

---

## [4.0.0-alpha.TASK-040] - 2026-11-05

### Ditambahkan
- Penuntasan 100% **FASE 7: Uji Integrasi Penuh & Verifikasi Tablet Fisik SM-T225** (`TASK-036` s/d `TASK-040`).
- **TASK-040**: Audit Keamanan Zero-Secret & Verifikasi Pembersihan Token (`scripts/security-audit.sh`, `docs/mobile/SECURITY_AUDIT.md`, `TC-P7-05`). Memverifikasi pemindaian regex nol kebocoran rahasia (0 Personal Access Token GitHub `ghp_*`/`github_pat_*`, 0 private key, 0 cloud API key AWS/Google), konfirmasi LocalStorage PWA bebas kredensial rahasia, serta verifikasi pembersihan daemon cache RAM Termux via `clean-auth.sh` (`git credential-cache exit`).
- Kartu runner interaktif live `TC-P7-05` (Audit Keamanan Zero-Secret) di `src/components/TestHarnessTab.tsx`.
- Penambahan butir uji Step 29 (`TC-P7-05`) pada runner uji otomatis `scripts/run-tests.py` dengan hasil kelulusan sempurna (29/29 checks PASS 100%).
- Penegakan integritas berkas status `SESSION_STATE.md` (43 task, 0 error, 0 warn) dengan pengesahan gerbang oleh Layang: `ya (oleh: layang)`. Status `TASK-041` (Panduan Instalasi Tablet & Penyiapan Termux) beralih ke `READY`.

---

## [4.0.0-alpha.TASK-039] - 2026-11-05

### Ditambahkan
- **TASK-038**: Uji Operasi Offline 100% (Mode Pesawat) & Service Worker Cache (`src/tests/offlineOperation.test.ts`, `TC-P7-03`). Memverifikasi 5 kriteria keandalan offline: precache berkas App Shell (`sw.js`, `manifest.webmanifest`, ikon PWA), kebijakan Cache-First & Stale-While-Revalidate dengan fallback `index.html`, perakitan Context Pack portabel tanpa dependensi API eksternal, ketersediaan katalog Command Hub & template CLI lokal, serta pembuatan prompt multi-model offline dengan stop token presisi.
- **TASK-039**: Verifikasi Fisik Ergonomi Layar Sentuh & Target 44px+ di SM-T225 (`docs/mobile/DEVICE_AUDIT.md`, `TC-P7-04`). Audit fisik perangkat Samsung Galaxy Tab A7 Lite 8.7" (1340x800) yang memverifikasi 13 komponen interaktif memiliki target sentuh terukur $\ge 44\times 44\text{px}$ (`min-h-[44px]`), jangkauan jempol mode lanskap/potret, kontras teks memadai, dan adaptasi virtual keyboard Android via `visualViewport` API (`--keyboard-height` awareness).
- Kartu runner interaktif live `TC-P7-03` (Uji Operasi Offline 100%) dan `TC-P7-04` (Audit Ergonomi Fisik Layar Sentuh) di `src/components/TestHarnessTab.tsx`.
- Penambahan butir uji Step 27 (`TC-P7-03`) dan Step 28 (`TC-P7-04`) pada runner uji otomatis `scripts/run-tests.py` dengan hasil kelulusan sempurna (28/28 checks PASS 100%).
- Penegakan integritas berkas status `SESSION_STATE.md` (43 task, 0 error, 0 warn) dengan pengesahan gerbang oleh Eko: `ya (oleh: Eko)`. Status `TASK-040` (Audit Keamanan Zero-Secret) beralih ke `READY`.

---

## [4.0.0-alpha.TASK-030] - 2026-11-05

### Ditambahkan
- Penuntasan 100% **FASE 5: Command Hub & Termux Dispatcher** (`TASK-025` s/d `TASK-030`).
- **TASK-026**: Parameter Binder & Strict POSIX Shell Sanitizer (`src/utils/commandSanitizer.ts`, `src/utils/commandBinder.ts`) yang mencegah celah injeksi shell (semicolon, pipe, subshell `$()`, newline, backtick, redirect).
- **TASK-027**: Komponen tombol salin 1-ketukan `OneTapCopyButton.tsx` dengan target sentuh ergonomis tablet $\ge 44\text{px}$, konfirmasi visual 2 detik, dan seleksi fallback otomatis.
- **TASK-028**: Skrip shell CLI dispatcher `scripts/zlce/zlce` dan dokumentasi instalasi/symlink `scripts/zlce/README.md` dengan penegakan allowlist subperintah Termux (`check`, `snapshot`, `collect`, `pull`, `push`, `clean-auth`).
- **TASK-029**: Komponen `PasteBackModal.tsx` dan parser terminal `src/utils/terminalParser.ts` yang membedah hasil `zlce-check` (OK/FAIL, error count, warning) dan status git untuk validasi instan serta pembaruan bukti verifikasi task.
- **TASK-030**: Modul `RecoveryCommandSection.tsx` yang mengintegrasikan resep preskriptif dan perintah 1-tap untuk Protokol Pemulihan Kasus A–D (Sesi Terputus, Uncommitted WAL, Commit Liar, dan Berkas Liar) ke `CommandHubTab.tsx` dan `RecoveryTab.tsx`.
- Peningkatan runner uji otomatis `scripts/run-tests.py` dengan penambahan butir uji `TC-P5-02`, `TC-P5-03`, `TC-P5-04`, `TC-P5-05`, dan `TC-P5-06` (19/19 checks PASS).
- Sinkronisasi status sesi di `SESSION_STATE.md` dengan persetujuan gerbang oleh Eko & Oned; status task aktif beralih ke `TASK-031` (READY).

---

## [4.0.0-alpha.TASK-025] - 2026-11-05

### Ditambahkan
- Modul katalog perintah berversi **Katalog Template Perintah Berversi (Git & CLI ZLCE)** (`src/data/commandTemplates.ts`), mencakup 10 template kanonik dari Blueprint 13 dan Blueprint 04.
- Komponen antarmuka tablet **Command Hub** (`src/components/mobile/CommandHubTab.tsx`) dengan filter kategori (Validator, Git, Recovery, Handover), penandaan parameter dinamis, dan aksi 1-ketukan salin perintah langsung maupun dispatcher `zlce`.
- Badge label risiko tiga tingkat visual (🟢 SAFE, 🟡 MUTATING, 🔴 DESTRUCTIVE) serta fungsi verifikasi ketiadaan perintah destruktif (`verifyNoDestructiveCommands`).
- Penambahan tab navigasi 'Command Hub' (`TASK-025`) di `src/components/Header.tsx` dan `src/App.tsx`.
- Penambahan Step 14 (`TC-P5-01`) pada runner uji otomatis `scripts/run-tests.py` (14/14 checks PASS).
- Penuntasan tugas pertama **FASE 5: Command Hub & Termux Dispatcher**.

---

## [4.0.0-alpha.TASK-024] - 2026-11-05

### Ditambahkan
- Penuntasan 100% **FASE 4: Multi-Akun & Tim Estafet 8 Anggota** (`TASK-019` s/d `TASK-024`).
- **TASK-019**: Registri 8 anggota tim resmi (`src/data/teamMembers.ts`, `src/components/mobile/TeamRegistryModal.tsx`) dengan Zero-Secret Policy.
- **TASK-020**: Mesin klaim task atomik & penegakan aturan tepat 1 task `IN_PROGRESS` (`src/utils/taskClaimManager.ts`, `src/components/mobile/TaskClaimBanner.tsx`).
- **TASK-021**: Sistem persetujuan Gerbang Kualitas terdesentralisasi (ADR-07) dengan format wajib provenance `ya (oleh: Nama)` (`src/utils/gateApprovalManager.ts`, `src/components/mobile/GateApprovalModal.tsx`).
- **TASK-022**: Wizard checklist serah terima tablet 4-langkah dan sanitasi kredensial `clean-auth` (`src/components/mobile/DeviceHandoverModal.tsx`, `src/utils/handoverChecklist.ts`).
- **TASK-023**: Linimasa riwayat sesi visual hingga 35 snapshot, kalkulasi diff per-baris, dan pembatasan kuota LocalStorage (`src/components/mobile/SessionTimelineTab.tsx`, `src/hooks/useSessionHistory.ts`).
- **TASK-024**: Test suite otomatis uji cold-start lintas anggota tim Eko -> Oned (`src/tests/coldStartMember.test.ts`) dengan kelulusan 100% (5/5 checks PASS).
- Integrasi Step 12 dan Step 13 pada `scripts/run-tests.py` dengan hasil 13/13 test checks PASS.
- Pengaktifan protokol serah terima C-I-D-I kanonik akibat batas kuota token model AI untuk transisi ke FASE 5 (`TASK-025`).

---

## [4.0.0-alpha.TASK-018] - 2026-11-05

### Ditambahkan
- Modul test suite otomatis **Uji Cold-Start Lintas AI Claude -> Gemini** (`src/tests/coldStartAi.test.ts`), memvalidasi 5 invarian matematis dan logis tanpa riwayat chat (Invarian I2).
- Kartu runner uji interaktif live `TC-P3-06` di `src/components/TestHarnessTab.tsx` dengan visualisasi hasil 5 butir uji secara real-time.
- Skenario baru `TC-P3-06` pada daftar evaluasi kit `src/data/scenarios.ts` dengan kategori `multi-ai`.
- Integrasi Step 11 (`TC-P3-06`) ke dalam runner uji `scripts/run-tests.py` (11/11 checks PASS).
- Penuntasan 100% **FASE 3: Multi-AI & Context Pack Portabel** (`TASK-013` s/d `TASK-018`).

---

## [4.0.0-alpha.TASK-017] - 2026-11-05

### Ditambahkan
- Modul **Handover Manager Lintas AI** (`src/components/mobile/AiHandoverWizard.tsx`) dengan alur kerja 3-langkah (Sumber & Alasan, Target & Deteksi Konflik, Bundle & Ekspor).
- Mesin deteksi konflik keputusan (`src/utils/conflictDetector.ts`) yang memindai deviasi ADR-09 Obsidian, multi-task `IN_PROGRESS`, direct commit ke branch `main`, dan kode placeholder.
- Mekanisme penyelesaian konflik berbasis *Human-in-the-Loop* (Tolak / Enforce Baseline, Setujui, Override).
- Injeksi otomatis catatan serah terima ke Bagian 6 `SESSION_STATE.md` (maks. ~10 baris) dan generator prompt C-I-D-I kanonik.
- Tombol navigasi 'Handover Lintas AI' di Header dan tab Context Pack.
- Suite uji `TC-P3-05b` di `scripts/run-tests.py` (10/10 checks PASS).

---

## [3.2.2] - 2026-10-21

### Ditambahkan
- Standar skrip kanonik di `scripts/zlce/` (`zlce-check.py`, `zlce-snapshot.sh`, `zlce-collect.py`) dengan wrapper tipis di `scripts/`.
- Dukungan flag `--state <file>` dan `--no-git` pada `zlce-check.py` untuk menguji contoh berkas tanpa repositori git aktif.
- Dokumentasi modular `docs/USAGE.md`, `SECURITY.md`, dan `CONTRIBUTING.md`.
- Sinkronisasi template impor `?raw` di web app langsung dari direktori `templates/`.

### Diperbaiki
- Paritas validasi `zlceValidator.ts` ditingkatkan untuk mencocokkan logika `zlce-check.py` pada seluruh aturan dokumen `SESSION_STATE.md` (deteksi dependensi, ID duplikat, keselarasan WAL vs IN_PROGRESS, status task aktif).
- Perbaikan parser Markdown agar tidak membuang baris teks yang mengandung kata "ID" dalam daftar asumsi.
- Perbaikan penanganan fallback clipboard di 22 titik menggunakan helper terpadu `copyText()`.
- Optimasi penyimpanan histori `useSessionPersistence` dengan skema *lightweight snapshot* (tanpa duplikasi objek terurai `stateData`).
- Sinkronisasi metadata HTML (`lang="id"`, sinkronisasi title dan deskripsi).

---

## [3.2.1] - 2026-10-18

### Diperbaiki
- Sinkronisasi penamaan profil domain dan pemetaan `DOMAIN_BOOKING.profile.md`.
- Normalisasi penanganan format timestamp UTC ISO 8601 dan fallback aturan jam `X1` ("jam: ?").

---

## [3.2.0] - 2026-10-14

### Ditambahkan
- Inisiasi awal ZLCE Studio web app (React 19 + Vite + Tailwind CSS v4).
- 4 Quality Gates terstruktur: Blueprint, Rules, Tasks/Testing, Session State/Workflow.
- Protokol pemulihan darurat Kasus A–D (Working tree bersih, In-flight diff, Commit desync, Wildcard diff).
- Matriks triase revisi R1–R7 (Level S, M dependen, M independen).
- Modul uji benchmark Test Harness (14 butir evaluasi).
