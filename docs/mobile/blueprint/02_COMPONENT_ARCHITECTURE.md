# BLUEPRINT 02: ARSITEKTUR KOMPONEN & BATAS TANGGUNG JAWAB
## Pembagian Peran Komponen pada ZLCE Mobile Workbench

Tanggal: 2026-11-04  
Status: **DRAFT BLUEPRINT (BATCH 1)**  
Rujukan Dokumen: `docs/mobile/FEASIBILITY_AND_DECISIONS.md` & `14_MULTI_AI_TEAM_MODEL.md`

---

## 1. PEMBAGIAN PERAN LIMA KOMPONEN UTAMA

Sistem ZLCE Mobile Workbench beroperasi melalui pemisahan tanggung jawab (*Separation of Concerns*) yang ketat antara lima subsistem:

```
┌────────────────────────────────────────────────────────┐
│               TABLET ANDROID (SM-T225)                 │
│                                                        │
│  ┌────────────────────┐          ┌──────────────────┐  │
│  │   ZLCE PWA HUB     │          │  AI PERAMBAN     │  │
│  │ (Command & Context)│◄─Clipboard─►(Gemini/Claude) │  │
│  └─────────┬──────────┘          └──────────────────┘  │
│            │ (Salin Template /                         │
│            │  Paste-back Hasil)                        │
│            ▼                                           │
│  ┌────────────────────┐          ┌────────────────────┐  │
│  │   TERMUX RUNTIME   │          │ MARKDOWN WORKSPACE │  │
│  │ (Python/Bash/Git)  │          │ (ext4 Git Storage) │  │
│  └─────────┬──────────┘          └────────────────────┘  │
└────────────┼─────────────────────────────────────────────┘
             │ (git push / pull)
             ▼
┌────────────────────────────────────────────────────────┐
│           GITHUB CLOUD REPOSITORY (REMOTE)             │
│        acimau99-netizen/proyek-bersama (main + tasks)  │
└────────────────────────────────────────────────────────┘
```

| Komponen | Batas Tanggung Jawab & Peran | Apa yang DILARANG Dilakukan |
| :--- | :--- | :--- |
| **1. ZLCE PWA (Operasional Hub)** | Antarmuka interaktif pengguna; penyusun Context Pack; pembuat prompt terstruktur; perakit template perintah Git/CLI; validasi real-time status; pengelola profil anggota tim aktif. | **DILARANG** mengeksekusi shell langsung; dilarang mengakses sistem berkas Termux secara privat tanpa izin browser; dilarang menjadi sumber kebenaran data persisten tunggal. |
| **2. Workspace Markdown** | Sumber kebenaran tunggal (*Single Source of Truth*) persisten: `BLUEPRINT.md`, `TASKS.md`, `SESSION_STATE.md`, `AI_WORKFLOW.md`. | Tidak boleh bergantung pada database proprietary; format wajib Markdown standar. |
| **3. Termux Runtime** | Lingkungan eksekusi native Linux: Python 3.11+, Bash, Git; mengeksekusi `zlce-check.py`, `zlce-snapshot.sh`, menjalankan test runner dan kompilasi proyek. | **DILARANG** menjalankan server permanen (daemon) yang mengonsumsi RAM terus-menerus. |
| **4. AI Browser** | Wadah interaksi dengan antarmuka AI (Gemini, Claude, ChatGPT) di peramban; menerima prompt Context Pack dan menghasilkan kode/solusi. | Bukan sistem terisolasi otomatis; pergantian sesi AI ditangani via handover ZLCE. |
| **5. GitHub Remote** | Pusat sinkronisasi tim; penyimpanan cabang kerja (`task/TASK-xxx`) dan perlindungan cabang utama (`main`). | Bukan pengganti review kualitas Gerbang; merge ke main wajib lewat PR teruji. |

---

## 2. ARSITEKTUR INTERNAL ZLCE PWA (FOUR-TIER LAYER)

ZLCE PWA dibangun dengan 4 lapisan modular di sisi klien (React 19 + TypeScript + Tailwind CSS):

```
┌────────────────────────────────────────────────────────────┐
│ 1. PRESENTATION LAYER (Tablet Touch-Optimized UI)           │
│    - Active Member Bar      - Project Switcher             │
│    - Session State Studio   - Context Builder & Hub        │
│    - Command Generator      - Paste-Back Parser            │
├────────────────────────────────────────────────────────────┤
│ 2. CONTEXT & PROMPT ENGINE LAYER                           │
│    - Token Budget Adapter   - Provenance Injector          │
│    - Deterministic Checklist- Zero-Loss Prompt Formatter   │
├────────────────────────────────────────────────────────────┤
│ 3. VALIDATION & PROTOCOL LAYER                             │
│    - Web ZLCE Validator     - Quality Gate Controller      │
│    - Kasus A–D Recovery     - Revision Triage Matrix       │
├────────────────────────────────────────────────────────────┤
│ 4. STORAGE & I/O ADAPTER LAYER                             │
│    - Service Worker Cache   - LocalStorage Draft Cache     │
│    - File Picker Importer   - Markdown Exporter / Blob     │
└────────────────────────────────────────────────────────────┘
```

### Detail Modul Kunci:
1. **Active Member Bar:**
   - Menyediakan pemilih dropdown cepat untuk 8 anggota tim.
   - Mengubah konteks nama dan email pada seluruh template Git secara instan.
2. **Command & Template Hub:**
   - Mengelola katalog perintah berversi (Git status, commit berformat, push, pull, check, snapshot).
   - Menyertakan label risiko:
     - 🟢 *Safe (Read-Only)*: `git status`, `python3 scripts/zlce-check.py`
     - 🟡 *Mutating (Write)*: `git commit`, `git add`
     - 🔴 *High-Risk (Destructive)*: Tidak disertakan secara bawaan.
3. **Paste-Back Parser:**
   - Komponen penerima masukan clipboard keluaran Termux.
   - Membaca baris `RESULT: OK` atau error dari `zlce-check.py` dan langsung menyegarkan status visual di PWA.

---

## 3. ADAPTASI DESAIN TABLET 8.7 INCI (SINGLE-APP SEQUENTIAL)

Sesuai profil Samsung Galaxy Tab A7 Lite (SM-T225):
- **Responsive Stack Layout:** Desain tidak bergantung pada multi-window horizontal; seluruh form dan daftar disusun dalam tumpukan vertikal yang nyaman dioperasikan satu per satu.
- **Large Touch Target Discipline:**
  - Tinggi tombol minimal: `min-h-[44px]`.
  - Jarak antar tombol (gap) minimal: `gap-3`.
  - Tombol aksi utama (Salin Context, Salin Command, Simpan) diletakkan di area jangkauan jempol.
- **Virtual Keyboard Awareness:**
  - Panel aksi penting menggunakan posisi sticky yang terangkat saat input aktif, mencegah tombol tertutup keyboard virtual Android.
