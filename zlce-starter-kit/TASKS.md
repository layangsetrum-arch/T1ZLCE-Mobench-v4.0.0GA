# BACKLOG TASK PENGEMBANGAN: [Nama Proyek Baru]

Definisi task atomik. **Status task tidak ditulis di sini**; status ada di `SESSION_STATE.md`. Enum dan aturan tata kelola mengikuti `AI_WORKFLOW.md`.

---

## 1. PETA FASE

* **FASE 0: Pondasi & Spesifikasi** (`TASK-001`, `TASK-002`)
* **FASE 1: Implementasi Fitur Inti** (`TASK-003`, `TASK-004`)
* **FASE 2: Integrasi, Pengujian & Rilis** (`TASK-005`)

---

## 2. FORMAT TASK

### TASK-001: Inisialisasi Repositori & Dokumen Kontrol
* **Fase:** FASE 0
* **Deskripsi:** Setup direktori proyek, gitignore, linter/formatter, `.env.example`, dan validasi berkas kendali ZLCE (Mode LITE).
* **Dependensi:** -
* **File:** `.gitignore`, `.env.example`, `SESSION_STATE.md`, `TASKS.md`, `AI_WORKFLOW.md`
* **Docs Terkait (Tier 1):** `AI_WORKFLOW.md`
* **Docs Impact:** -
* **Acceptance Criteria:**
  1. Repositori terinisialisasi bersih dengan linter tervalidasi 0 error.
  2. Berkas kontrol ZLCE lulus verifikasi `python3 scripts/zlce-check.py .`.
  3. Disetujui pengguna di `SESSION_STATE.md`.
* **Test Case:** `TC-001-INIT`
* **Metode Verifikasi:** `python3 scripts/zlce-check.py . --strict`

---

### TASK-002: Fondasi Arsitektur & Spesifikasi Inti
* **Fase:** FASE 0
* **Deskripsi:** Menetapkan parameter runtime, struktur modul, batas domain, dan skema data awal.
* **Dependensi:** `TASK-001`
* **File:** Dokumen spesifikasi atau modul pondasi proyek
* **Docs Terkait:** `BLUEPRINT.md` (atau catatan konteks di SESSION_STATE)
* **Docs Impact:** `BLUEPRINT`
* **Acceptance Criteria:**
  1. Struktur arsitektur disepakati bersama pengguna.
  2. Kriteria non-goals (out-of-scope) tercatat jelas.
* **Test Case:** `TC-002-ARCH`
* **Metode Verifikasi:** Review spesifikasi bersama pengguna; konfirmasi via `SESSION_STATE.md`.

---

### TASK-003: Implementasi Modul Pertama
* **Fase:** FASE 1
* **Deskripsi:** Membangun fungsionalitas logika bisnis utama atau API endpoint tahap pertama.
* **Dependensi:** `TASK-002`
* **File:** Berkas sumber kode modul pertama & berkas pengujian terkait
* **Docs Terkait:** Dokumen arsitektur / API spec
* **Docs Impact:** -
* **Acceptance Criteria:**
  1. Modul lulus pengujian unit dengan cakupan yang ditentukan.
  2. Tidak ada breaking change terhadap modul pondasi.
* **Test Case:** `TC-003-MOD-1`
* **Metode Verifikasi:** Eksekusi unit test modul di terminal lokal; lampirkan output lulus.

---

## 3. TEMPLATE TASK REVISI

### TASK-REV-xxx: [Judul Revisi Level M]
* **Fase:** REVISI
* **Deskripsi:** [Penjelasan spesifik perbaikan/perubahan yang dibutuhkan]
* **Dependensi:** [Task terkait sebelumnya]
* **File:** [Berkas yang terdampak]
* **Acceptance Criteria:**
  1. [Kriteria 1]
  2. [Kriteria 2]
* **Metode Verifikasi:** [Perintah pengujian untuk memvalidasi revisi]
