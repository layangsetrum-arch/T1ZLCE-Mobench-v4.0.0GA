# TATA KELOLA AI, ALUR KERJA & STANDAR TEKNIS: [Nama Proyek Baru]

Satu-satunya definisi aturan kerja, enum status, triase revisi, protokol WAL, dan konvensi git. Seluruh agen AI dan pengembang wajib mematuhi dokumen ini.

---

## 1. KONVENSI TEKNIS

1. **Bahasa Dokumentasi:** Teknis murni, ringkas, bullet/tabel, tanpa narasi berlebihan.
2. **Waktu (ATURAN X1 ANTI-EKSTRAPOLASI):**
   - Wajib gunakan waktu nyata persis dari masukan pengguna atau log git (misal `2026-10-14 10:20:00 WIB`).
   - Dilarang mengarang atau memajukan jam secara sintetis (+5/+10 menit).
   - Bila tidak ada data jam baru, gunakan fallback `'jam: ?'` (misal `2026-10-14 jam: ?`).
3. **Penamaan:**
   - Direktori & berkas: `kebab-case` (misal `auth-service.ts`, `user-repository.py`).
   - Kelas/Tipe: `PascalCase` (misal `OrderService`, `PaymentGateway`).
   - Fungsi/Metode: Sesuai konvensi bahasa (`camelCase` untuk JS/TS/Java, `snake_case` untuk Python/Rust).
   - Konstanta: `UPPER_SNAKE_CASE`.

---

## 2. ENUM STATUS TUNGGAL

Nilai status yang sah untuk seluruh berkas proyek:
`PENDING | READY | IN_PROGRESS | BLOCKED | DONE`

| Status | Makna Baku |
| :--- | :--- |
| `PENDING` | Dependensi task belum `DONE`. Dilarang disentuh oleh AI. |
| `READY` | Seluruh dependensi telah `DONE`, siap untuk dimulai. |
| `IN_PROGRESS` | Sedang aktif dikerjakan. **Tepat 1 task** pada satu waktu. |
| `BLOCKED` | Terhenti karena blocker eksternal. Wajib dicatat di `SESSION_STATE.md`. |
| `DONE` | Seluruh acceptance criteria terpenuhi + bukti verifikasi nyata terisi + disetujui pengguna (`Disetujui: ya`). |

---

## 3. GUARDRAIL AI & INTEGRITAS KONTEKS

1. **Dilarang Menghapus/Mengganti Berkas Kontrol:** Dokumen kendali ZLCE tidak boleh diubah namanya atau dihapus tanpa persetujuan tertulis pengguna.
2. **Satu Task IN_PROGRESS:** Tidak diperkenankan menandai lebih dari 1 task `IN_PROGRESS` secara simultan.
3. **Read-Before-Write:** Wajib membaca kode modul target sebelum menulis modifikasi.
4. **Anti-Halusinasi:** Informasi di luar berkas/lampiran repositori dianggap tidak diketahui. Catat sebagai `ASM-xx` / `Q-xx` di `SESSION_STATE.md` bagian 4 dan tanyakan ke pengguna.
5. **Dilarang Mengarang Bukti:** Kolom `Bukti Verifikasi` untuk `DONE` wajib menyertakan bukti nyata (log test lulus, hash commit, atau output linting riil).
6. **Kerahasiaan Kredensial:** Seluruh secret & API keys hanya melalui environment variable (`.env`). Kredensial dilarang di-commit ke Git.

---

## 4. CHECKPOINT BLOCK & PROTOKOL WAL

Setiap perubahan kode oleh AI wajib didahului dengan pencatatan WAL (Bagian 3 `SESSION_STATE.md`) dan diakhiri dengan Checkpoint Block:

```markdown
<!-- CHECKPOINT:TASK-001:v1 -->
### CHECKPOINT: TASK-001 (Langkah 1/1)
- **Status Sesi:** IN_PROGRESS
- **Berkas Dimodifikasi:** src/index.ts, package.json
- **Perintah Verifikasi:** npm test && npm run lint
- **Instruksi Pengguna:** Jalankan perintah verifikasi di terminal lokal Anda.
<!-- /CHECKPOINT -->
```

---

## 5. PROTOKOL TRIASE REVISI

| Level | Kriteria Perubahan | Prosedur Penanganan |
| :--- | :--- | :--- |
| **Level S** | <= 1 berkas & <= 20 baris (typo, komentar, perbaikan konstanta lokal) | Tangani langsung dalam task aktif. Catat 1 baris ringkas di Slot Revisi `SESSION_STATE.md`. |
| **Level M** | 2-5 berkas atau logika lokal terbatas | Buat `TASK-REV-xxx`, tentukan dependensi di Matriks Task, minta persetujuan pengguna sebelum pengerjaan. |
| **Level L** | Perubahan arsitektur, skema basis data inti, atau meluas > 5 berkas | **Halt seketika**. Perbarui spesifikasi di `BLUEPRINT.md`, susun ulang `TASKS.md`, lalu konfirmasi ulang ke pengguna. |
