# BLUEPRINT 09: MANAJEMEN KEGAGALAN & PROTOKOL RECOVERY
## Penanganan Kasus A–D ZLCE & Kegagalan Spesifik Android (LMK, Crash, Konflik Git)

Tanggal: 2026-11-04  
Status: **DRAFT BLUEPRINT (BATCH 3)**  
Rujukan Dokumen: `docs/mobile/FEASIBILITY_AND_DECISIONS.md`, `07_WORKFLOW_DESIGN.md`

---

## 1. PENYELARASAN PROTOKOL RECOVERY ZLCE KASUS A–D

Sistem pemulihan ZLCE Mobile Workbench memetakan kondisi fisik perangkat secara deterministik ke dalam 4 kasus kanonik ZLCE Core:

```
                  [ Deteksi Status Pemulihan ]
                                │
          ┌─────────────────────┴─────────────────────┐
          ▼                                           ▼
[ Working Tree Git Bersih? ]                [ Ada Uncommitted Changes? ]
     │                                                   │
     ├─► KASUS A: Commit sesuai WAL                       ├─► KASUS B: File cocok dengan WAL
     │   (Fast-forward lanjut langkah berikutnya)         │   (Lanjutkan uji & verifikasi)
     │                                                   │
     └─► KASUS C: Ada commit liar mendahului WAL          └─► KASUS D: Ada file di luar daftar WAL
         (Audit commit log, perbarui state)                   (Bahaya data loss, isolasi perubahan)
```

| Kasus Recovery | Kondisi Lapangan di Tablet | Resep Penyelesaian Preskriptif |
| :---: | :--- | :--- |
| **KASUS A** | Working tree di Termux bersih (`git status` clean), sesi peramban terputus di tengah jalan. | 1. Buka Termux, jalankan `bash scripts/zlce-snapshot.sh`.<br>2. Buka PWA, baca field *Langkah Berikutnya (persis)* di WAL.<br>3. Buka sesi AI baru, tempelkan snapshot dan lanjutkan langkah tersebut tanpa menulis ulang kode yang sudah di-commit. |
| **KASUS B** | Ada berkas berubah uncommitted di Termux, dan berkas tersebut tercatat di field *Berkas Direncanakan/Disentuh* pada WAL. | 1. Jangan jalankan git reset atau checkout!<br>2. Jalankan perintah verifikasi task di Termux (`pytest ...`).<br>3. Jika lolos, selesaikan task, perbarui `SESSION_STATE.md` menjadi `DONE`, lalu commit. |
| **KASUS C** | Working tree bersih, tetapi ada commit baru di Git yang belum tercatat pada matriks `SESSION_STATE.md`. | 1. Jalankan `git log -3 --oneline` di Termux.<br>2. Periksa apakah commit tersebut menyelesaikan sub-langkah WAL.<br>3. Sinkronkan `SESSION_STATE.md` di PWA agar mencerminkan commit tersebut sebelum melanjutkan ke task berikutnya. |
| **KASUS D** | Ada berkas berubah uncommitted di Termux yang **TIDAK TERDAFTAR** di field WAL (*perubahan liar*). | 1. **DILARANG reset tanpa konfirmasi.**<br>2. Jalankan `git diff` untuk memeriksa apakah perubahan tersebut adalah revisi Level S atau pekerjaan anggota lain yang tertinggal.<br>3. Bila perubahan sah: masukkan ke daftar WAL aktif. Bila sampah: simpan via `git stash` sebelum melanjutkan. |

---

## 2. PENANGANAN KEGAGALAN SPESIFIK ANDROID (ANDROID-SPECIFIC FAILURE MODES)

### 2.1 Android LMK Mematikan Termux Saat Pengujian Berjalan
- **Gejala:** Pengguna beralih dari Termux ke browser AI. Saat kembali ke Termux, shell ter-restart ke prompt awal (`~ $`) dan proses pengujian mati.
- **Dampak:** Proses uji terhenti di tengah eksekusi, tetapi berkas kode sumber di disk ext4 tetap utuh.
- **Resep Pemulihan:**
  1. Periksa integritas berkas via `git status`.
  2. Jalankan ulang perintah pengujian secara mandiri:
     `pytest tests/test_migrations.py`
  3. Karena arsitektur ZLCE tidak bergantung pada daemon background, tidak ada state sistem yang rusak.

### 2.2 Peramban PWA Dimatikan Android Saat Menyusun Prompt
- **Gejala:** Tab peramban ter-reload saat dibuka kembali.
- **Mitigasi:** Hook `useSessionPersistence` menyimpan draft teks Markdown ke `localStorage` setiap 400ms.
- **Resep Pemulihan:** PWA otomatis memuat ulang draft dari `localStorage` begitu halaman terbuka, mengembalikan teks persis seperti sebelum tertutup.

### 2.3 Konflik Git Antar Cabang Estafet
- **Gejala:** Saat Anggota 2 menarik branch dari Anggota 1 (`git checkout -b task/TASK-002 origin/task/TASK-001`), Git melaporkan konflik pada `SESSION_STATE.md`.
- **Resep Pemulihan:**
  1. Di Termux, buka `SESSION_STATE.md` dengan editor teks.
  2. Prioritaskan state milik task yang lebih baru.
  3. Jalankan `python3 scripts/zlce-check.py .` untuk memastikan hasil resolusi konflik lulus 100% tanpa error linter.

### 2.4 Koneksi Jaringan Putus Saat `git push`
- **Gejala:** Git menampilkan `fatal: unable to access ... Could not resolve host`.
- **Resep Pemulihan:** Commit Git sudah tersimpan aman di disk lokal tablet. Tunggu hingga koneksi internet/Wi-Fi kembali aktif, lalu ulangi perintah `git push origin task/TASK-XXX`.
