# ZLCE STARTER KIT (v3.2.2)
### Zero-Loss Context Engineering Starter Kit untuk Proyek Baru

Paket starter kit bersih, siap pakai untuk mengendalikan konteks AI agent (Claude, ChatGPT, Gemini, Cursor, Copilot) agar bekerja secara deterministik, tanpa halusinasi, dan tanpa kehilangan status pengerjaan (*zero context loss*).

---

## 📁 Struktur Direktori Kit

```
.
├── README.md                      # Panduan lengkap starter kit (berkas ini)
├── LANDING_PROMPT.md              # Prompt inisiasi AI sesi pertama
├── HANDOVER_PROMPT.md             # Prompt serah terima sesi / ganti model
├── ZLCE_KIT_SINGLE.md             # Bundel 1 berkas seluruh template untuk AI tanpa multi-upload
├── .gitignore                     # Konfigurasi Git pelacak berkas kontrol ZLCE
│
├── SESSION_STATE.md               # [Single Source of Truth] Status aktif & WAL proyek Anda
├── TASKS.md                       # Daftar tugas atomik terstruktur & kriteria uji
├── AI_WORKFLOW.md                 # Konvensi teknis, guardrail, & aturan kerja AI
│
├── templates/                     # 10 Template Dokumen Kontrol Baku ZLCE v3.2.2
│   ├── SESSION_STATE.template.md  # Template status sesi & WAL
│   ├── TASKS.template.md          # Template backlog tugas atomik
│   ├── AI_WORKFLOW.template.md    # Template tata kelola & alur kerja
│   ├── BLUEPRINT.template.md      # Template Gerbang 1 (Spesifikasi & Parameter)
│   ├── ARCHITECTURE.template.md   # Template arsitektur sistem & ADR
│   ├── DATA_MODEL.template.md     # Template skema & migrasi basis data
│   ├── TESTING.template.md        # Template strategi & matriks pengujian
│   ├── CHECKLISTS.template.md     # Template checklist keamanan & rilis
│   ├── CHANGELOG.template.md      # Template catatan perubahan SemVer
│   └── profiles/
│       └── DOMAIN_BOOKING.profile.md  # Profil domain reservasi & sewa unit
│
├── examples/                      # Berkas Contoh Nyata Terverifikasi (Todo API)
│   ├── SESSION_STATE.example.md   # Contoh status sesi aktif, WAL, dan asumsi
│   ├── TASKS.example.md           # Contoh rincian task atomik (TASK-001 s/d TASK-005)
│   ├── AI_WORKFLOW.example.md     # Contoh aturan eksekusi AI & Checkpoint Block
│   └── BLUEPRINT.example.md       # Contoh blueprint spesifikasi sistem terisi
│
└── scripts/                       # CLI & Skrip Otomasi Python / Bash
    ├── README.md                  # Panduan rinci eksekusi CLI
    ├── zlce-check.py              # Linter otomatis pemeriksa integritas ZLCE
    ├── zlce-collect.py            # Pengumpul diagnostik dan ringkasan git
    └── zlce-snapshot.sh           # Snapshot pemulihan working-tree & WAL
```

---

## 🚀 Panduan Memulai Proyek Baru (Quick Start)

### Langkah 1: Pasang Berkas ke Root Repositori
Ekstrak atau salin seluruh isi kit ini ke dalam direktori root proyek baru Anda.

### Langkah 2: Pilih Mode Operasi
* **Mode LITE (Direkomendasikan / Default):**
  Hanya menggunakan 3 berkas kendali di root:
  - `SESSION_STATE.md`
  - `TASKS.md`
  - `AI_WORKFLOW.md`
  Sangat cepat, hemat token, dan cocok untuk MVP atau aplikasi tunggal.
* **Mode FULL (Proyek Kompleks / Multi-Modul):**
  Salin template tambahan dari folder `templates/` ke root proyek:
  `BLUEPRINT.md`, `ARCHITECTURE.md`, `DATA_MODEL.md`, `TESTING.md`, `CHECKLISTS.md`, `CHANGELOG.md`.

### Langkah 3: Inisiasi Sesi AI Pertama
Buka sesi chat AI baru (Claude, Gemini, ChatGPT, dll.), lalu:
1. Unggah berkas `SESSION_STATE.md`, `TASKS.md`, `AI_WORKFLOW.md` (atau salin isi `ZLCE_KIT_SINGLE.md` bila antarmuka AI hanya mendukung satu masukan teks).
2. Tempelkan isi dari `LANDING_PROMPT.md`.
3. AI akan membaca aturan, menghentikan eksekusi di **Gerbang 1**, dan meminta konfirmasi spesifikasi sebelum menulis kode pertama.

### Langkah 4: Pergantian Sesi (Handover)
Bila jendela konteks AI penuh atau Anda ingin beralih ke sesi/model baru:
1. Pastikan task yang selesai telah diperbarui di `SESSION_STATE.md`.
2. Buka sesi AI baru dan unggah ketiga berkas kendali (`SESSION_STATE.md`, `TASKS.md`, `AI_WORKFLOW.md`).
3. Tempelkan isi dari `HANDOVER_PROMPT.md`.
4. AI baru akan langsung mengenali status terakhir dari WAL tanpa perlu menceritakan ulang riwayat percakapan sebelumnya (*Zero-Loss*).

---

## 🛠️ Validasi Otomatis (CLI Linter)

ZLCE menyertakan skrip linter Python mandiri (tanpa dependensi eksternal / tanpa `pip install`).

Jalankan di terminal lokal Anda:

```bash
# Validasi konsistensi dokumen ZLCE
python3 scripts/zlce-check.py .

# Mode ketat (wajib 0 error dan 0 warning)
python3 scripts/zlce-check.py . --strict
```

### Apa Saja yang Diperiksa oleh Linter?
1. **Aturan Single IN_PROGRESS:** Maksimal hanya ada 1 task yang boleh berstatus `IN_PROGRESS`.
2. **Kesesuaian Header vs Matriks:** Status task aktif di Bagian 1 harus sama persis dengan yang ada di Bagian 2.
3. **Kewajiban Bukti Uji:** Task `DONE` dilarang kosong pada kolom `Bukti Verifikasi` dan wajib `Disetujui: ya`.
4. **Urutan Dependensi:** Task tidak dapat berstatus `IN_PROGRESS` atau `DONE` bila prasyaratnya belum selesai.
5. **Integritas WAL:** Bagian WAL (Bagian 3) harus menunjuk ke task yang sedang `IN_PROGRESS`.

---

## ⚡ Aturan Kunci ZLCE v3.2.2

1. **Aturan X1 Jam (Anti-Ekstrapolasi):**
   AI dilarang mengarang waktu secara sintetis (+5/+10 menit). Gunakan jam persis dari prompt pengguna atau git log. Jika tidak ada waktu baru, gunakan fallback wajib `'jam: ?'` (misal `2026-10-14 jam: ?`).
2. **Triase Revisi:**
   - **Level S (<= 1 file & <= 20 baris):** Dikerjakan langsung di task aktif.
   - **Level M (2-5 file):** Wajib dibuatkan `TASK-REV-xxx`.
   - **Level L (> 5 file / arsitektur):** Halt seketika, revisi spesifikasi terlebih dahulu.
3. **Protokol Pemulihan Cepat (Snapshot):**
   Jika sesi AI terputus tiba-tiba di tengah penulisan berkas:
   ```bash
   bash scripts/zlce-snapshot.sh . --diff
   ```
   Salin output terminal yang dihasilkan ke sesi AI baru untuk melanjutkan persis dari checkpoint terakhir.
