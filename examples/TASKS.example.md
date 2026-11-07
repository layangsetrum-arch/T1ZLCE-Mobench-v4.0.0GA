# BACKLOG TASK PENGEMBANGAN: Todo API (Contoh Terisi)

Definisi task atomik. **Status task tidak ditulis di sini**; status ada di `SESSION_STATE.md`. Enum dan aturan tata kelola mengikuti `AI_WORKFLOW.md`.

---

## 1. PETA FASE

* **FASE 0: Pondasi & Spesifikasi** (`TASK-001`)
* **FASE 1: Skema Database & Migrasi** (`TASK-002`)
* **FASE 2: Engine Bisnis & API Endpoint** (`TASK-003`, `TASK-004`)
* **FASE 3: Hardening, Validasi & Rilis** (`TASK-005`)

---

## 2. FORMAT TASK

### TASK-001: Inisialisasi Repositori & Dokumen Kontrol
* **Fase:** FASE 0
* **Deskripsi:** Inisialisasi struktur direktori proyek, pyproject.toml / requirements.txt, konfigurasi pytest, linter ruff, dan penyiapan berkas kendali ZLCE (Mode LITE).
* **Dependensi:** -
* **File:** `pyproject.toml`, `.gitignore`, `.env.example`, `SESSION_STATE.md`, `TASKS.md`, `AI_WORKFLOW.md`
* **Docs Terkait (Tier 1):** `BLUEPRINT.md`, `AI_WORKFLOW.md`
* **Docs Impact:** -
* **Acceptance Criteria:**
  1. Direktori repositori bersih dengan konfigurasi dependensi tervalidasi.
  2. Perintah linter `ruff check .` dan `pytest` berjalan 0 error.
  3. Dokumen kendali inisial disetujui pengguna di `SESSION_STATE.md`.
* **Test Case:** `TC-001-INIT`
* **Metode Verifikasi:** `ruff check . && pytest tests/test_init.py`

---

### TASK-002: Skema Database & Skrip Migrasi
* **Fase:** FASE 1
* **Deskripsi:** Implementasi tabel `todos` dan relasi status menggunakan SQL migration script (up/down).
* **Dependensi:** `TASK-001`
* **File:** `src/models/todo.py`, `migrations/001_todos.sql`
* **Docs Terkait:** `DATA_MODEL.md` (atau skema di BLUEPRINT)
* **Docs Impact:** `DATA_MODEL`
* **Acceptance Criteria:**
  1. Tabel `todos` memiliki kolom id (UUID/int), title (varchar 255), is_completed (boolean), created_at (timestamp).
  2. Migrasi maju (up) dan rollback (down) teruji tanpa sisa tabel yatim.
* **Test Case:** `TC-002-MIGRATION`
* **Metode Verifikasi:** `pytest tests/test_migrations.py`

---

### TASK-003: Implementasi CRUD Endpoints /todos
* **Fase:** FASE 2
* **Deskripsi:** Pembuatan rute REST API FastAPI: GET /todos, POST /todos, GET /todos/{id}, PUT /todos/{id}, DELETE /todos/{id} beserta validasi skema Pydantic.
* **Dependensi:** `TASK-002`
* **File:** `src/routes/todos.py`, `src/schemas/todo.py`
* **Docs Terkait:** `BLUEPRINT.md` (Bagian Matriks Modul)
* **Docs Impact:** -
* **Acceptance Criteria:**
  1. Semua 5 rute CRUD merespons status code HTTP yang tepat (200, 201, 404, 422).
  2. Masukan divalidasi ketat (title minimal 3 karakter, tolak payload berlebih).
* **Test Case:** `TC-003-CRUD-API`
* **Metode Verifikasi:** `pytest tests/test_todo_api.py -v`

---

### TASK-004: Skema Otentikasi & Proteksi Rute (JWT)
* **Fase:** FASE 2
* **Deskripsi:** Menambahkan middleware proteksi token JWT pada mutasi data todos (POST/PUT/DELETE).
* **Dependensi:** `TASK-003`
* **File:** `src/auth/jwt.py`, `src/middleware/auth.py`
* **Docs Terkait:** `BLUEPRINT.md` (Standar Keamanan)
* **Docs Impact:** -
* **Acceptance Criteria:**
  1. Permintaan tanpa Authorization header mendapat HTTP 401 Unauthorized.
  2. Token valid dapat mengakses sumber daya milik pengguna tersebut.
* **Test Case:** `TC-004-AUTH`
* **Metode Verifikasi:** `pytest tests/test_auth.py`

---

### TASK-005: Uji Integrasi End-to-End & Audit Rilis
* **Fase:** FASE 3
* **Deskripsi:** Uji menyeluruh alur pengguna dari pembuatan todo hingga selesai, pemeriksaan keamanan, dan rilis versi v1.0.0.
* **Dependensi:** `TASK-004`
* **File:** `tests/test_e2e.py`, `CHANGELOG.md`
* **Docs Terkait:** `CHECKLISTS.md`, `TESTING.md`
* **Docs Impact:** `CHANGELOG`
* **Acceptance Criteria:**
  1. Seluruh suite pengujian lolos 100%.
  2. Riwayat changelog terisi sesuai SemVer.
* **Test Case:** `TC-005-E2E`
* **Metode Verifikasi:** `pytest && python3 scripts/zlce-check.py . --strict`

---

## 3. TEMPLATE TASK REVISI (CONTOH)

### TASK-REV-001: Penyesuaian Kolom Prioritas (Revisi Level M)
* **Fase:** REVISI
* **Deskripsi:** Menambahkan kolom `priority` (low, medium, high) pada tabel dan schema todos.
* **Dependensi:** `TASK-003`
* **File:** `migrations/002_add_priority.sql`, `src/schemas/todo.py`
* **Acceptance Criteria:**
  1. Kolom default bernilai 'medium'.
  2. Validasi enum tolak nilai selain ketiga opsi tersebut.
* **Metode Verifikasi:** `pytest tests/test_priority.py`
