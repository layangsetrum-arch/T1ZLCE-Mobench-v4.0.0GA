# SPESIFIKASI TEKNIS & BLUEPRINT SISTEM: Todo API (Contoh Terisi)

Spesifikasi sistem, batasan domain, parameter produksi, dan matriks modul.

---

## 1. PARAMETER SISTEM & LINGKUNGAN

* **Nama Sistem:** Todo REST Service & Task Tracker
* **Profil Domain:** Standard Web API (RESTful)
* **Lingkungan Produksi:**
  - Runtime: Python 3.11+
  - Web Server: Uvicorn / Gunicorn
  - Database: SQLite (dev/test), PostgreSQL 16 (staging/production)
  - Framework: FastAPI 0.110+ & Pydantic v2
* **Versi Dependensi Terverifikasi:**

| Dependensi | Versi | Sumber Verifikasi | Tanggal |
| :--- | :--- | :--- | :--- |
| `fastapi` | 0.110.0 | PyPI Official Docs | 2026-10-14 |
| `pydantic` | 2.6.4 | PyPI Official Docs | 2026-10-14 |
| `pytest` | 8.1.1 | PyPI Official Docs | 2026-10-14 |
| `ruff` | 0.3.4 | PyPI Official Docs | 2026-10-14 |

* **Standar Keamanan:**
  - Transit: HTTPS / TLS 1.3
  - Masukan: Validasi skema Pydantic ketat dengan sanitasi HTML
  - Injeksi: Prepared statements / parameterized SQL queries
  - Rahasia: Konfigurasi via environment variable (`.env` tidak di-commit)

---

## 2. BATASAN DOMAIN BISNIS

1. **Aturan Bisnis (BR-xx):**
   - `BR-01`: Panjang judul todo minimal 3 karakter dan maksimal 255 karakter.
   - `BR-02`: Todo yang sudah ditandai selesai (`is_completed = true`) tidak dapat diubah isinya kecuali statusnya dibalikkan ke aktif.
   - `BR-03`: Setiap item todo terikat pada pemilik (`user_id`). Pengguna dilarang membaca atau mengubah todo milik pengguna lain.

2. **Lingkup & Batas Operasional:**
   - Kapasitas: Maksimum 5.000 todo aktif per akun pengguna.
   - Retensi: Todo yang dihapus menerapkan soft-delete selama 30 hari sebelum purgement permanen.

3. **Out of Scope (Non-Goals):**
   - Tidak mencakup sub-tasks bertingkat (hanya single level flat todo).
   - Tidak menyediakan antarmuka web interaktif frontend dalam fase MVP (hanya backend REST JSON).
   - Tidak mencakup fitur kolaborasi real-time / WebSocket pada versi awal.

---

## 3. MATRIKS MODUL

| ID Modul | Nama Modul | Fungsi Utama | Dependensi |
| :--- | :--- | :--- | :--- |
| `MOD-01` | Auth Module | Pembuatan token JWT, verifikasi klaim, & hashing password | PyJWT, passlib |
| `MOD-02` | Todo Core | Operasi CRUD tabel todo, validasi state, filter kueri | MOD-01, Database |
| `MOD-03` | Database Adapter | Koneksi pool, skrip migrasi up/down, transaksi atomik | sqlite3 / asyncpg |
| `MOD-04` | Audit Logger | Pencatatan log mutasi todo dan audit trail keamanan | logging standar |

---

## 4. PERSYARATAN NON-FUNGSIONAL (NFR)

1. **Kinerja:** Waktu respons p95 <= 50ms untuk seluruh kueri baca tunggal.
2. **Ketersediaan:** SLA 99.9% uptime dengan healthcheck endpoint di `/healthz`.
3. **Uji Otomatis:** Cakupan unit test minimal 85% untuk file di bawah `src/`.
