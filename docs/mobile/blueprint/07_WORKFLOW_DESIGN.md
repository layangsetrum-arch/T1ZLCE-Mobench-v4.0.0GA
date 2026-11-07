# BLUEPRINT 07: DESAIN ALUR KERJA OPERASIONAL (WORKFLOW DESIGN)
## Siklus Kerja Tunggal & Estafet pada Tablet Bersama (Single-App Flow)

Tanggal: 2026-11-04  
Status: **DRAFT BLUEPRINT (BATCH 1)**  
Rujukan Dokumen: `docs/mobile/FEASIBILITY_AND_DECISIONS.md`, `14_MULTI_AI_TEAM_MODEL.md`, `02_COMPONENT_ARCHITECTURE.md`

---

## 1. SIKLUS KERJA UTAMA (THE 8-STEP RELAY CYCLE)

Karena pengguna bekerja pada 1 tablet Samsung Galaxy Tab A7 Lite tanpa multi-window, seluruh alur kerja dirancang berurutan (*sequential single-app sequence*):

```
┌─────────────┐     ┌────────────────┐     ┌──────────────┐     ┌─────────────┐
│ 1. PILIH    │────>│ 2. SUSUN       │────>│ 3. PERAMBAN  │────>│ 4. TERMUX   │
│ ANGGOTA &   │     │ CONTEXT PACK & │     │ AI: KIRIM &  │     │ EKSEKUSI &  │
│ PROYEK      │     │ TEMPLATE       │     │ AMBIL KODE   │     │ UJI KODE    │
└─────────────┘     └────────────────┘     └──────────────┘     └─────────────┘
                                                                       │
┌─────────────┐     ┌────────────────┐     ┌──────────────┐            │
│ 8. OPER     │<────│ 7. COMMIT &    │<────│ 6. VALIDASI  │<───────────┘
│ TABLET KE   │     │ PUSH KE GITHUB │     │ STATE &      │
│ ANGGOTA LAIN│     │ VIA TEMPLATE   │     │ GERBANG      │
└─────────────┘     └────────────────┘     └──────────────┘
```

---

## 2. DETAIL OPERASIONAL LANGKAH DEMI LANGKAH

### Langkah 1: Memulai Sesi & Identifikasi Anggota
- **Aplikasi Aktif:** ZLCE PWA
- **Aksi Anggota:**
  1. Buka PWA di layar tablet.
  2. Pada bilah atas (*Active Member Bar*), pilih nama Anda (misal: `Anggota-2`).
  3. Pilih proyek aktif pada dropdown *Project Switcher*.
- **Keluaran:** Konteks identitas aktif disetel ke `Anggota-2` pada seluruh template.

### Langkah 2: Memilih Task & Menyusun Context Pack
- **Aplikasi Aktif:** ZLCE PWA
- **Aksi Anggota:**
  1. Buka tab **Session State** / **Task Manager**.
  2. Pilih task berstatus `READY` berikutnya (misal: `TASK-002`).
  3. Ubah status menjadi `IN_PROGRESS` (otomatis mengisi WAL di Bagian 3).
  4. Buka tab **Prompt Engine / Context Hub**.
  5. Klik tombol **"Salin Context Pack"** (Clipboard API).

### Langkah 3: Interaksi dengan Model AI
- **Aplikasi Aktif:** Peramban Web (Google Chrome / Brave)
- **Aksi Anggota:**
  1. Beralih ke browser, buka tab penyedia AI (Gemini / Claude / ChatGPT).
  2. Tempelkan Context Pack yang baru disalin.
  3. AI membaca status proyek, batasan arsitektur, dan menghasilkan kode implementasi beserta blok checkpoint.
  4. Salin kode sumber atau patch yang dihasilkan AI ke clipboard.

### Langkah 4: Eksekusi & Pengujian di Termux
- **Aplikasi Aktif:** Termux
- **Aksi Anggota:**
  1. Beralih ke aplikasi Termux.
  2. Tulis/modifikasi berkas target (menggunakan `nano`, `vim`, atau skrip patch).
  3. Jalankan perintah verifikasi yang tercatat di acceptance criteria task:
     `pytest tests/test_migrations.py`
  4. Pastikan hasil pengujian lulus 100% (0 error).
  5. Salin ringkasan hasil pengujian terminal (misal: `1 passed in 0.05s`).

### Langkah 5: Validasi Dokumen Kontrol di PWA
- **Aplikasi Aktif:** ZLCE PWA
- **Aksi Anggota:**
  1. Beralih kembali ke PWA.
  2. Buka tab **Session State**:
     - Masukkan bukti pengujian pada kolom *Bukti Verifikasi* (Aturan R5).
     - Berikan persetujuan: `ya (oleh: Anggota-2)`.
     - Tandai status task menjadi `DONE`.
  3. Linter otomatis memverifikasi bahwa matriks valid, tidak ada task tertinggal, dan WAL siap dibersihkan.
  4. PWA menampilkan badge hijau: `STATE: OK`.

### Langkah 6: Pembuatan Template Git & Eksekusi di Termux
- **Aplikasi Aktif:** ZLCE PWA -> Termux
- **Aksi Anggota:**
  1. Buka tab **Command Hub** di PWA.
  2. PWA telah menyiapkan template commit yang aman dan beridentitas:
     ```bash
     git add SESSION_STATE.md src/models/todo.py migrations/001_todos.sql
     git -c user.name="Anggota-2" -c user.email="anggota2@dev.id" commit -m "TASK-002: feat(db) skema todos"
     git push origin task/TASK-002
     ```
  3. Klik tombol **"Salin Perintah Git (1-Tap)"**.
  4. Beralih ke Termux -> Tempelkan perintah -> Tekan Enter.
  5. Branch `task/TASK-002` terdorong ke repositori GitHub bersama.

### Langkah 7: Pengambilan Hasil Terminal (Paste-Back)
- **Aplikasi Aktif:** Termux -> ZLCE PWA
- **Aksi Anggota:**
  1. Di Termux, jalankan validator lokal: `python3 scripts/zlce-check.py .`
  2. Salin baris keluaran terakhir (`RESULT: OK (0 error, 0 warn, 6 task)`).
  3. Buka tab **Command Hub** di PWA, tempelkan ke kotak **"Paste-Back Terminal Output"**.
  4. PWA langsung mencatat cap verifikasi CLI pada log audit internal.

### Langkah 8: Serah Terima Perangkat (Device Handover Checklist)
- **Aplikasi Aktif:** Tablet (Sistem)
- **Aksi Anggota:**
  1. Buka tab **Handover** di PWA: Catat catatan serah terima singkat untuk anggota berikutnya.
  2. Di Termux, bersihkan cache token git: `git credential-cache exit 2>/dev/null || true`.
  3. Di browser, tutup tab sesi obrolan AI Anda.
  4. Serahkan tablet fisik ke Anggota berikutnya (Anggota-3).

---

## 3. PENANGANAN KONDISI GAGAL & RECOVERY KASUS A–D

Bila terjadi interupsi mendadak di tengah siklus (baterai habis, crash, atau LMK mematikan Termux):
- **Kasus A (Working tree bersih, sesi terputus):**
  Anggota baru menarik commit terakhir, membaca WAL di `SESSION_STATE.md`, dan melanjutkan langkah berikutnya persis dari titik tercatat.
- **Kasus B (Ada file uncommitted yang sesuai dengan field WAL):**
  Perubahan in-flight dipertahankan; anggota melanjutkan eksekusi perintah verifikasi.
- **Kasus C (Ada commit di git yang lebih baru dari `SESSION_STATE.md`):**
  PWA memberi peringatan; status disinkronkan dengan membaca pesan commit terakhir.
- **Kasus D (Ada file uncommitted di luar daftar yang tercatat di WAL):**
  PWA mengaktifkan peringatan bahaya; pengguna dipandu untuk meninjau perubahan liar tersebut sebelum melanjutkan.
