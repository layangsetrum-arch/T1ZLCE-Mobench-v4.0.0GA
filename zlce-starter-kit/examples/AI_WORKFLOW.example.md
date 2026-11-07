# TATA KELOLA AI, ALUR KERJA & STANDAR TEKNIS: Todo API (Contoh Terisi)

Satu-satunya definisi aturan kerja, enum status, triase revisi, dan konvensi git. Berkas lain merujuk ke sini.

---

## 1. KONVENSI TEKNIS

1. **Bahasa dokumentasi:** teknis murni, ringkas, bullet/tabel, tanpa narasi berlebihan.
2. **Waktu (ATURAN X1 ANTI-EKSTRAPOLASI):**
   - Wajib gunakan waktu nyata persis dari masukan pengguna atau snapshot git (misal `2026-10-14 10:20:00 WIB`).
   - Dilarang mengarang atau memajukan jam secara sintetis (+5/+10 menit).
   - Bila tidak ada data jam baru, gunakan fallback `'jam: ?'` (misal `2026-10-14 jam: ?`).
3. **Penamaan:**
   - Direktori & berkas: `kebab-case` (misal `todo-service.py`, `test-todo-api.py`).
   - Kelas: `PascalCase` (misal `TodoItem`, `TodoRepository`).
   - Fungsi/metode: `snake_case` (Python) atau `camelCase` (JS/TS).
   - Konstanta: `UPPER_SNAKE_CASE` (misal `DEFAULT_PAGE_SIZE = 20`).

---

## 2. ENUM STATUS TUNGGAL

Nilai status yang diizinkan untuk semua dokumen:
`PENDING | READY | IN_PROGRESS | BLOCKED | DONE`

| Status | Makna Baku |
| :--- | :--- |
| `PENDING` | Dependensi task belum `DONE`. Dilarang disentuh oleh AI. |
| `READY` | Seluruh dependensi telah `DONE`, siap untuk dimulai. |
| `IN_PROGRESS` | Sedang aktif dikerjakan. **Tepat 1 task** pada satu waktu. |
| `BLOCKED` | Terhenti karena blocker eksternal. Wajib dicatat di `SESSION_STATE.md`. |
| `DONE` | Seluruh kriteria terpenuhi + bukti nyata terisi + disetujui pengguna. |

---

## 3. GUARDRAIL AI

1. **Dilarang Menghapus Berkas Kontrol:** Dokumen ZLCE tidak boleh diubah namanya atau dihapus tanpa persetujuan tertulis pengguna.
2. **Satu Task IN_PROGRESS:** Tidak diperkenankan menandai lebih dari 1 task `IN_PROGRESS` secara simultan.
3. **Read-Before-Write:** Wajib membaca kode modul target sebelum menulis modifikasi.
4. **Anti-Halusinasi:** Informasi di luar lampiran/repo dianggap tidak diketahui. Catat sebagai `ASM-xx` / `Q-xx` di `SESSION_STATE.md` bagian 4.
5. **Dilarang Mengarang Bukti:** Kolom `Bukti Verifikasi` untuk `DONE` wajib menyertakan log uji nyata, hash commit, atau status linting riil.
6. **Kerahasiaan Kredensial:** Seluruh secret/API keys hanya melalui `.env`. Dilarang commit secret ke repositori.

---

## 4. CHECKPOINT BLOCK & PROTOKOL WAL

Setiap respons implementasi kode oleh AI wajib diakhiri dengan Checkpoint Block:

```markdown
<!-- CHECKPOINT:TASK-002:v1 -->
### CHECKPOINT: TASK-002 (Langkah 1/2)
- **Status Sesi:** IN_PROGRESS
- **Berkas Dimodifikasi:** migrations/001_todos.sql
- **Perintah Verifikasi:** pytest tests/test_migrations.py
- **Instruksi Pengguna:** Jalankan perintah uji di terminal lokal dan laporkan hasilnya.
<!-- /CHECKPOINT -->
```

Sebelum menulis berkas baru, agen wajib mencatat rencana kerja ke WAL (Bagian 3 `SESSION_STATE.md`).

---

## 5. PROTOKOL TRIASE REVISI

| Level | Kriteria Perubahan | Prosedur Penanganan |
| :--- | :--- | :--- |
| **Level S** | <= 1 berkas & <= 20 baris (typo, fix komentar, konstanta) | Kerjakan langsung pada task aktif, catat 1 baris di Slot Revisi. |
| **Level M** | 2-5 berkas atau logika lokal terbatas | Buat `TASK-REV-xxx`, update dependensi di Matriks Task, tunggu persetujuan. |
| **Level L** | Perubahan arsitektur, skema inti, atau meluas > 5 berkas | **Halt seketika**. Revisi `BLUEPRINT.md` & `TASKS.md`, evaluasi ulang Gerbang 1. |
