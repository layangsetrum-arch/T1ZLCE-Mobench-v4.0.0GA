# PANDUAN OPERASIONAL PRODUKSI NYATA (PRODUCTION OPERATIONS MANUAL)
## ZLCE Mobile Workbench v4.0.0 GA Hardened
### Standar Operasional Prosedur (SOP) Tablet Bersama Samsung Galaxy Tab A7 Lite (SM-T225)

---

## 1. RINGKASAN ARSITEKTUR PRODUKSI

ZLCE Mobile Workbench v4.0.0 GA dirancang khusus untuk memfasilitasi estafet rekayasa perangkat lunak multi-AI (Claude, ChatGPT, Gemini, DeepSeek) oleh **8 anggota tim** yang berbagi satu unit fisik tablet Samsung Galaxy Tab A7 Lite (RAM 3 GB, MediaTek Helio P22T, ROM 32 GB, Android 11–14).

```
   ┌─────────────────────────────────────────────────────────────┐
   │         TABLET BERSAMA (Samsung Galaxy Tab A7 Lite)          │
   ├──────────────────────────────┬──────────────────────────────┤
   │   PROGRESSIVE WEB APP (UI)   │      TERMUX POSIX ENGINE     │
   │  • Offline Service Worker    │  • Git Local Repository      │
   │  • LocalStorage Multi-User   │  • Python 3.11 Runtime       │
   │  • 400ms Debounce LMK Guard  │  • CLI Dispatcher 'zlce'     │
   │  • Ergonomi Sentuh ≥ 44px    │  • Memory Cache (15 menit)   │
   └──────────────▲───────────────┴──────────────▲───────────────┘
                  │                              │
                  ▼                              ▼
      Single Source of Truth: /SESSION_STATE.md & /TASKS.md
```

### 5 Invarian Mutlak Sistem ZLCE:
1. **Invarian I1 (Single Source of Truth):** Segala status proyek hanya diatur oleh `SESSION_STATE.md`.
2. **Invarian I2 (Cold-Start Resume):** Pengemudi baru atau model AI baru harus dapat langsung bekerja hanya dengan membaca `SESSION_STATE.md`.
3. **Invarian I3 (Atomic WAL Handover):** Setiap pekerjaan aktif dicatat di Bagian 3 (WAL). Maksimal 1 task `IN_PROGRESS`.
4. **Invarian I4 (Strict Provenance Tracking):** Persetujuan gerbang kualitas wajib mencantumkan identitas pengesah: `ya (oleh: [Nama])`.
5. **Invarian I5 (Deterministic Quality Gates):** Sebelum menandai `DONE`, wajib menyertakan bukti verifikasi nyata ($\ge 5$ karakter).

---

## 2. SATU PERINTAH PELUNCURAN PRODUKSI (1-TAP START)

Untuk memulai Workbench di lingkungan nyata (Termux di Samsung Tab A7 Lite), buka aplikasi Termux dan jalankan:

```bash
cd ~/projects/zlce-mobile-workbench
bash scripts/zlce-prod-start.sh
```

Skrip ini akan secara otomatis:
1. Menormalkan seluruh izin eksekusi berkas utilitas POSIX (`0755`).
2. Memeriksa ketersediaan runtime Node.js, Python 3, dan Git.
3. Memvalidasi kepatuhan dokumen kontrol via `python3 scripts/zlce-check.py .`.
4. Memeriksa bundel produksi `dist/` (mengompilasi otomatis bila belum ada).
5. Menjalankan static preview server pada `http://localhost:3000` (dapat diakses langsung di Chrome tablet atau browser perangkat lain di LAN).

---

## 3. ALUR KERJA ESTAFET HARIAN (8 LANGKAH STANDAR OPERASIONAL)

Setiap anggota tim yang menerima giliran memegang tablet fisik wajib mengikuti siklus 8 langkah berikut:

```
[1. Terima Tablet] ──> [2. Set Driver UI] ──> [3. Klaim Task] ──> [4. Context Pack]
        │                                                                │
        ▼                                                                ▼
[8. Oper Tablet] <── [7. Clean-Auth] <── [6. Sahkan Gerbang] <── [5. Eksekusi AI]
```

### Langkah 1: Menerima Tablet & Pemeriksaan Status
* Hidupkan tablet, buka aplikasi **ZLCE Studio** dari Layar Utama (PWA Standalone).
* Periksa status header: pastikan tidak ada task `IN_PROGRESS` yang tertinggal dari sesi sebelumnya.

### Langkah 2: Mengalihkan Driver Aktif di UI
* Ketuk selektor anggota di bilah Header pojok kanan atas.
* Pilih nama profil Anda dari 8 anggota tim resmi:
  1. **Eko** (`eko@zlce.local`) - Backend & Engine Architect
  2. **Oned** (`oned@zlce.local`) - Frontend & Mobile UI Specialist
  3. **Cxperia** (`cxperia@zlce.local`) - QA & Test Automation Engineer
  4. **Sulistiyani** (`sulistiyani@zlce.local`) - Documentation & System Analyst
  5. **Layang** (`layang@zlce.local`) - Security & Infrastructure Specialist
  6. **Acimau** (`acimau@zlce.local`) - Data Model & Database Specialist
  7. **Kepek** (`kepek@zlce.local`) - Integration & API Specialist
  8. **Gete** (`gete@zlce.local`) - Performance & Optimization Engineer

### Langkah 3: Mengklaim Task di Matriks Sesi
* Masuk ke tab **SESSION_STATE** atau **Dashboard**.
* Pilih task dengan status `READY`.
* Ubah status menjadi `IN_PROGRESS`. Sistem secara atomik mengunci task dengan urutan revisi monotonik (*Atomic Task Claim Guard*). Hanya 1 task boleh aktif.

### Langkah 4: Menghasilkan Context Pack Portabel
* Buka tab **Context Pack** atau **Prompt Studio**.
* Pilih AI sasaran yang akan Anda gunakan (Claude 3.5/5.5 Sonnet, ChatGPT GPT-4o, Gemini 2.5/3.8, DeepSeek).
* Ketuk tombol **Salin Context Pack (1-Ketukan)** atau unduh `.md`.

### Langkah 5: Eksekusi Rekayasa dengan AI Eksternal
* Buka tab browser AI eksternal atau aplikasi terkait.
* Tempelkan prompt mandat estafet C-I-DI (*Context - Instruction - Details - Invariants*).
* Eksekusi kode di Termux pada cabang Git terisolasi per task:
  ```bash
  git checkout -b task/TASK-xxx
  ```
* Commit perubahan dengan menyertakan identitas per-perintah (Zero-Secret):
  ```bash
  git -c user.name="Nama Pengemudi" -c user.email="nama@zlce.local" commit -m "feat: deskripsi task"
  ```

### Langkah 6: Validasi Bukti & Pengesahan Gerbang Kualitas
* Jalankan uji verifikasi:
  ```bash
  npm run build && python3 scripts/zlce-check.py .
  ```
* Buka modal **Sahkan Gerbang** di UI ZLCE Studio.
* Masukkan bukti verifikasi nyata ($\ge 5$ karakter, contoh: `pytest 10/10 pass, build 0 error`).
* Berikan persetujuan: sistem otomatis mencatat provenance `ya (oleh: [Nama Driver])`.

### Langkah 7: Sanitasi Kredensial RAM (Clean-Auth)
* Sebelum melepaskan tablet fisik ke rekan berikutnya, buka Termux dan jalankan:
  ```bash
  bash scripts/zlce/clean-auth.sh
  ```
* Verifikasi bahwa keluaran menampilkan:
  - `[PASS] Daemon kredensial RAM dihentikan.`
  - `[PASS] Socket in-memory dibersihkan.`
  - Konfigurasi `user.name` dan `user.email` global dipertahankan tanpa penghapusan destruktif.
* Tutup seluruh tab browser AI eksternal dan bersihkan clipboard tablet.

### Langkah 8: Serah Terima Fisik Tablet ke Pengemudi Berikutnya
* Catat serah terima pada Bagian 6 `SESSION_STATE.md` (dapat menggunakan tombol di modal **Serah Terima Tablet** pada UI).
* Serahkan perangkat fisik kepada rekan berikutnya.

---

## 4. PROTOKOL PENYELAMATAN DARURAT DI LAPANGAN (CASES A–D)

Bila terjadi inkonsistensi status, crash browser, atau konflik git di tablet, gunakan panduan cepat berikut:

| Kasus | Gejala | Tindakan Penyelamatan di Termux |
| :--- | :--- | :--- |
| **Kasus A** | Sesi terputus, working-tree bersih, tidak ada uncommitted diff | `python3 scripts/zlce-check.py .`<br>Bila OK, lanjutkan langkah WAL berikutnya. |
| **Kasus B** | Ada berkas berubah uncommitted yang sesuai dengan daftar WAL | Review berkas: `git status`<br>Commit: `git -c user.name="Nama" commit -am "wip: sesuai WAL"` |
| **Kasus C** | Ada commit lokal baru yang belum tercatat di SESSION_STATE | Ekstrak log: `git log -1 --stat`<br>Perbarui `SESSION_STATE.md` mencerminkan commit tersebut. |
| **Kasus D** | Ada perubahan liar di luar daftar WAL | Pisahkan perubahan: `git stash`<br>Kembalikan kontrol ke sesi terencana. |

---

## 5. MANAJEMEN MEMORI RAM 3GB & ANDROID LMK

Tablet Samsung Galaxy Tab A7 Lite memiliki memori fisik 3GB yang rentan terhadap penutupan paksa oleh Android Low Memory Killer (LMK):
1. **Debounce 400ms & Lifecycle Flush:** Antarmuka ZLCE Studio secara otomatis menyimpan draft editor ke `localStorage` dengan penundaan 400ms dan langsung mem-flush data saat aplikasi diminimalkan (`visibilitychange` / `pagehide`).
2. **Loss-Bounded Persistence (RPO $\le$ 400ms):** Maksimal potensi kehilangan ketikan saat tablet dimatikan mendadak oleh kernel adalah 400 milidetik.
3. **Peringatan Hemat RAM:** Jangan membuka lebih dari 5 tab di Google Chrome secara bersamaan di tablet ini.

---

## 6. PEMELIHARAAN & BACKUP PERIODIK

Jalankan skrip backup secara berkala:
```bash
# Snapshot cepat status repositori
bash scripts/zlce-snapshot.sh . --diff

# Pembuatan bundel audit deterministik 162 berkas
python3 scripts/create-audit-bundle.py
```

Arsip ZIP akan tersimpan di `public/assets/zlce-audit-review-bundle.zip` dan siap dipindahkan via USB OTG atau penyimpanan awan.
