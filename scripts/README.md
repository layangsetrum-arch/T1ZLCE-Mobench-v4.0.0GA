# PANDUAN SKRIP OTOMASI & CLI ZLCE v3.2.2

Skrip-skrip ini dirancang untuk memvalidasi konsistensi, mengumpulkan laporan diagnostik, dan mengambil snapshot pemulihan pada repositori proyek yang menerapkan **Zero-Loss Context Engineering (ZLCE)**.

---

## 1. Skrip yang Tersedia

| Skrip | Kebutuhan Runtime | Kegunaan Utama |
| :--- | :--- | :--- |
| `zlce-check.py` | Python 3.7+ (hanya standard library, tanpa pip) | Memeriksa kepatuhan `SESSION_STATE.md` & `TASKS.md` terhadap aturan ZLCE |
| `zlce-collect.py` | Python 3.7+ (hanya standard library, tanpa pip) | Mengumpulkan ringkasan status git & dokumen kontrol ke satu arsip ZIP aman |
| `zlce-snapshot.sh` | Bash & Git | Mengambil snapshot cepat working-tree, commit log, uncommitted diff & WAL |

---

## 2. Cara Menjalankan

### A. Validasi State Proyek (`zlce-check.py`)
Jalankan di root repositori:

```bash
# Pemeriksaan standar
python3 scripts/zlce-check.py .

# Mode ketat (menganggap semua warning sebagai error kegagalan)
python3 scripts/zlce-check.py . --strict

# Pemeriksaan tanpa membaca status Git lokal
python3 scripts/zlce-check.py . --no-git

# Menentukan lokasi berkas SESSION_STATE secara spesifik
python3 scripts/zlce-check.py --state path/to/SESSION_STATE.md
```

**Aturan yang divalidasi:**
1. Enum status sah: `PENDING | READY | IN_PROGRESS | BLOCKED | DONE`.
2. Maksimal **satu** task berstatus `IN_PROGRESS`.
3. Seluruh dependensi harus sudah `DONE` sebelum task dimulai (`IN_PROGRESS` atau `DONE`).
4. Task berstatus `DONE` wajib memiliki **Bukti Verifikasi** nyata dan status **Disetujui: ya**.
5. Kesesuaian Header (Bagian 1) dan WAL (Bagian 3) terhadap task aktif di Matriks (Bagian 2).
6. Konsistensi silang antara `SESSION_STATE.md` dan `TASKS.md`.

---

### B. Pengambilan Snapshot Pemulihan (`zlce-snapshot.sh`)
Digunakan saat sesi AI terputus atau context-window wipeout untuk ditempelkan ke prompt sesi AI berikutnya:

```bash
# Snapshot standar (ringkasan status, branch, log 5 terakhir, status WAL)
bash scripts/zlce-snapshot.sh

# Snapshot lengkap dengan uncommitted diff & file baru (maks. 400 baris diff)
bash scripts/zlce-snapshot.sh . --diff
```

---

### C. Pengumpulan Diagnostik Proyek (`zlce-collect.py`)
Mengemas berkas kontrol dan ringkasan git ke format `.zip` aman (otomatis menyamarkan berkas .env, secret, dan kredensial):

```bash
# Menghasilkan berkas arsip zlce-bundle.zip
python3 scripts/zlce-collect.py . --out zlce-diagnostics.zip

# Menyertakan cuplikan diff perubahan terbaru
python3 scripts/zlce-collect.py . --diff
```
