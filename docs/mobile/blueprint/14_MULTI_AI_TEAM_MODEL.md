# BLUEPRINT 14: MODEL MULTI-AI, MULTI-AKUN & TIM ESTAFET
## Fondasi Kolaborasi 8 Anggota pada 1 Tablet Bersama (Samsung Galaxy Tab A7 Lite)

Tanggal: 2026-11-04  
Status: **DRAFT BLUEPRINT (BATCH 1)**  
Rujukan Keputusan: `docs/mobile/FEASIBILITY_AND_DECISIONS.md` (P2-CP2)

---

## 1. TAKSONOMI AKTOR SISTEM

Sistem membedakan entitas kolaborasi ke dalam 4 tingkatan aktor:

```
[ Anggota Tim (Manusia) ] ── memegang tablet ──> [ Akun AI (Alias) ]
         │                                               │
         ▼                                               ▼
[ Akun GitHub (Alias) ]   ── menjalankan sesi ──> [ Model AI (Engine) ]
```

1. **Anggota Tim (Human Member - 8 Anggota Estafet Tablet):**
   - 8 anggota tim resmi terdaftar dengan alias, peran non-kredensial, dan email:
     1. `eko`: Eko (Lead / System & Git Coordinator) - `eko.keplek@gmail.com`
     2. `oned`: Oned (Frontend & Mobile UI Specialist) - `oned@zlce.local`
     3. `cxperia`: Cxperia (QA & Test Harness Lead) - `cxperia@zlce.local`
     4. `sulistiyani`: Sulistiyani (PWA & Offline Architect) - `sulistiyani@zlce.local`
     5. `layang`: Layang (Context & Prompt Engineer) - `layang@zlce.local`
     6. `acimau`: Acimau (Git & Sync Hub Specialist) - `acimau@zlce.local`
     7. `kepek`: Kepek (Security & Zero-Secret Officer) - `kepek@zlce.local`
     8. `gete`: Gete (Mobile UX & Ergonomics Reviewer) - `gete@zlce.local`
   - Setiap anggota memiliki wewenang penuh menyetujui Gerbang (Gerbang 1–4) dengan pencatatan provenance eksplisit (ADR-07).
2. **Penyedia & Model AI (AI Provider & Engine):**
   - Berbagai AI coding assistant yang diakses lewat peramban web tablet:
     - Google Gemini (Gemini 1.5 Flash / 1.5 Pro / 2.0 / 3.8 Flash)
     - Anthropic Claude (Claude 3.5 Sonnet / Haiku)
     - ChatGPT (GPT-4o / o1)
     - Layanan lain: DeepSeek, Phind, Qwen, Perplexity.
3. **Akun AI (AI Account Registry):**
   - Registry hanya mencatat **alias dan metadata publik** (nama alias, penyedia, limit/kuota free, status reset token harian/bulanan).
   - **TIDAK MENYIMPAN KREDENSIAL, PASSWORD, ATAU COOKIE PERAMBAN**.
4. **Sesi Sesi Kerja (Work Session):**
   - Satuan giliran kerja seorang anggota pada suatu task di tablet.

---

## 2. LIMA INVARIAN KESINAMBUNGAN ZLCE (I1 s.d. I5)

Kolaborasi tim estafet wajib mematuhi 5 invarian matematis dan logis tanpa kompromi:

| Kode Invarian | Definisi Invarian | Mekanisme Penegakan |
| :---: | :--- | :--- |
| **I1** | **All In Files (Single Source of Truth):** Segala hal yang dibutuhkan untuk melanjutkan proyek tersimpan di berkas repositori Markdown; apa pun yang hanya ada di memori chat AI dianggap tidak ada. | Dokumen `SESSION_STATE.md`, `TASKS.md`, `BLUEPRINT.md` menjadi satu-satunya acuan status. |
| **I2** | **Cold-Start Resume:** Anggota baru atau AI baru dapat melanjutkan pekerjaan secara presisi hanya dari berkas repo dan Context Pack, tanpa riwayat chat sebelumnya. | Uji cold-start resume wajib lulus pada suite verifikasi. |
| **I3** | **ZLCE Core Invariance:** 4 Gerbang Kualitas, aturan task atomik, WAL, dan protokol Kasus A–D tidak berubah oleh pergantian aktor atau AI. | Linter `zlce-check.py` dan validator web memvalidasi struktur yang sama. |
| **I4** | **Strict Provenance Tracking:** Setiap keputusan, perubahan kode, dan persetujuan Gerbang wajib mencantumkan: `[Aktor, AI/Model, Akun Alias, Timestamp, Task ID]`. | Injeksi metadata otomatis pada commit Git (`git -c user.name=...`) dan log audit `SESSION_STATE.md`. |
| **I5** | **Zero Lost Updates:** Tidak ada penimpaan perubahan liar antar anggota tim. | 1 repositori bersama dengan **Branch per Task (`task/TASK-xxx`)** dan proteksi branch `main`. |

---

## 3. PAKET KONTEKS PORTABEL (PORTABLE CONTEXT PACK)

Context Pack adalah bundel teks Markdown mandiri yang dirakit oleh PWA untuk disalin ke sesi AI baru.

### Struktur Context Pack:
```markdown
# ZLCE CONTEXT PACK (ESTAFET TIM)
Proyek: [Nama Proyek] | Task: [TASK-ID] | Cabang: task/[TASK-ID]
Aktor: [Nama Anggota] | AI Target: [Claude / Gemini / GPT]
Mode: LITE (atau FULL) | Kuota Token Request: <= [Batas Provider]

---
## 1. MANDAT TUGAS AKTIF
- ID Task: TASK-002
- Deskripsi: Skema migrasi database todos
- Acceptance Criteria: Tabel todos dibuat dengan kolom id, title, is_completed
- Perintah Verifikasi: pytest tests/test_migrations.py

---
## 2. JANGKAR KEBENARAN (TIER 0)
[Ringkasan Eksekutif BLUEPRINT.md & ARCHITECTURE.md]

---
## 3. STATUS TERKINI & WAL SEBELUMNYA
- Task Terakhir Selesai: TASK-001 (Inisialisasi repo) oleh Anggota-1
- Catatan Serah Terima: Selesai setup, dependensi ruff/pytest siap
- Langkah WAL Selanjutnya: Buat file migrations/001_todos.sql (up + down)

---
## 4. ATURAN KERJA & STOP TOKEN
Output harus berupa kode murni dan blok checkpoint berformat SESSION_STATE.md.
Dilarang menghalusinasikan waktu nyata (gunakan "jam: ?").
```

- **Adaptasi Jendela Konteks (Token Budget Manager):**
  - Untuk Gemini (1M context): Context pack menyertakan detail lebih lengkap dan referensi file terkait.
  - Untuk Claude / GPT free tier (8K - 30K limit): Context pack dipangkas secara cerdas hanya menyertakan Tier 0 statis + task aktif + WAL.

---

## 4. ALUR KERJA ESTAFET (RELAY HANDOVER) PADA 1 TABLET BERSAMA

```
[ ANGGOTA 1: Task TASK-001 ]
  1. Pilih Profil Anggota-1 di PWA
  2. Susun Context Pack -> Salin -> Buka Browser AI (Claude)
  3. Dapatkan kode -> Buka Termux -> Eksekusi verifikasi
  4. Lulus uji -> PWA: Buat template commit Git -> Salin ke Termux
  5. Push ke GitHub: `git push origin task/TASK-001`
  6. Jalankan Device Handover Checklist -> Serahkan tablet
                     │
                     ▼
[ ANGGOTA 2: Task TASK-002 ]
  1. Ambil tablet -> Buka PWA -> Ganti Profil ke Anggota-2
  2. Buka Termux -> `git fetch origin && git checkout -b task/TASK-002 origin/task/TASK-001`
  3. PWA merakit Context Pack TASK-002 -> Buka Browser AI (Gemini)
  4. Lanjutkan pekerjaan tanpa kehilangan satu bit konteks pun!
```

---

## 5. STRUKTUR GIT & KONTROL IN_PROGRESS TIM

Sesuai persetujuan pengguna atas **Rekomendasi Optimal (Satu Repositori Bersama + Branch per Task)**:

1. **Satu Repositori Bersama di GitHub:** `acimau99-netizen/proyek-bersama`.
2. **Branching Model:**
   - `main`: Branch produksi / rilis stabil (terlindungi, hanya bisa di-merge via Pull Request yang lulus uji).
   - `task/TASK-001`, `task/TASK-002`, dst.: Setiap task dikerjakan pada branch tersendiri.
3. **Aturan IN_PROGRESS di Tablet Bersama:**
   - Karena tablet digunakan bergantian (1 aplikasi/1 orang pada satu waktu), pada tingkat perangkat fisik hanya ada **tepat 1 task `IN_PROGRESS`** yang sedang aktif dikerjakan oleh anggota yang memegang tablet.
   - Dengan demikian, aturan ZLCE Core "maksimum 1 task `IN_PROGRESS` pada `SESSION_STATE.md`" **tetap terpenuhi secara murni** tanpa perlu merusak validator `zlce-check.py`!
4. **Pencatatan Persetujuan Gerbang (Approval Provenance):**
   - Seluruh 8 anggota berhak menyetujui Gerbang 1–4.
   - Kolom "Disetujui" pada matriks task wajib mencatat nama:
     `Disetujui: ya (oleh: Anggota-3)`
   - Log audit Bagian 7 mencatat: `[Timestamp]: Gerbang X disetujui oleh Anggota-3`.

---

## 6. SUITE PENGUJIAN COLD-START TIM

Blueprint ini menetapkan 3 skenario uji wajib sebelum Track 2 dinyatakan lulus:
1. **Uji Cold-Start Lintas AI (AI A -> AI B):**
   - Anggota 1 mengerjakan langkah 1 di Claude. Handover dibuat.
   - Anggota 2 melanjutkan langkah 2 di Gemini murni dari Context Pack tanpa riwayat chat Claude.
   - *Kriteria Lulus*: Gemini menghasilkan langkah berikutnya yang presisi dan lulus uji verifikasi.
2. **Uji Cold-Start Lintas Akun (Akun 1 -> Akun 2):**
   - Sesi terhenti karena limit token akun pribadi A.
   - Dilanjutkan dengan akun pribadi B dengan profil provenance berbeda.
   - *Kriteria Lulus*: Tidak ada kebocoran kredensial dan commit Git teratribusi ke akun B.
3. **Uji Cold-Start Lintas Anggota (Orang 1 -> Orang 2):**
   - Tablet berpindah tangan dari Budi ke Siti.
   - Siti membuka PWA, mengganti profil aktif ke Siti, pull branch, dan commit.
   - *Kriteria Lulus*: Riwayat git log mencatat nama Siti (`Author: Siti <siti@...>`) secara sempurna.
