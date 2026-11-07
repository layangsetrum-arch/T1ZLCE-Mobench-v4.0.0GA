# BLUEPRINT 11: PETA JALAN IMPLEMENTASI (IMPLEMENTATION ROADMAP)
## Tahapan Pengembangan Bertahap dari Fase 0 hingga Fase 9

Tanggal: 2026-11-04  
Status: **DRAFT BLUEPRINT (BATCH 4 - FINAL)**  
Rujukan Dokumen: `Master_Prompt_ZLCE_Mobile_Workbench_v5.md`

---

## 1. URUTAN PRIORITAS PENGEMBANGAN

Sesuai arahan Master Project Instruction v5:
- **Prioritas Utama:** Fitur **Multi-AI, Multi-Akun, dan Tim Estafet** didahulukan (Fase 3 & Fase 4).
- **Ditunda ke Tahap Akhir:** Integrasi **Obsidian** (Fase 8) dan **Dokumentasi Lengkap** (Fase 9). Bantuan kontekstual (*just-in-time help*) dibangun bersamaan dengan setiap fitur UI.

```
[ Fase 0: Baseline & Test Prep ]
              │
              ▼
[ Fase 1: PWA Shell & Ergonomi Tablet ]
              │
              ▼
[ Fase 2: Markdown Workspace & Storage ]
              │
              ▼
[ Fase 3: Multi-AI & Context Pack (PRIORITAS UTAMA) ]
              │
              ▼
[ Fase 4: Multi-Akun & Tim Estafet (PRIORITAS UTAMA) ]
              │
              ▼
[ Fase 5: Command Hub & Termux Dispatcher ]
              │
              ▼
[ Fase 6: Git Sync & Kolaborasi Cabang ]
              │
              ▼
[ Fase 7: Uji Integrasi & Tablet Fisik SM-T225 (v4.0.0 GA) ]
              │
              ▼
[ Fase 8: Dokumentasi, Panduan & Knowledge Base Terpadu ]
```

---

## 2. RINCIAN TAHAPAN PER FASE

### Fase 0 — Baseline Uji & Persiapan (`v3.3.0`)
- **Fokus:** Menetapkan tag `baseline-track1-revised` dan memverifikasi seluruh test runner `npm test`.
- **Hasil:** Lingkungan kerja bersih dan terisolasi untuk cabang `v4-mobile`.

### Fase 1 — Fondasi PWA & Ergonomi Tablet Android
- **Fokus:**
  - Pembuatan Web App Manifest (`manifest.webmanifest`) dengan display standalone dan theme color.
  - Pembuatan Service Worker (`sw.js`) untuk precache App Shell dan offline shell.
  - Aset ikon PWA lengkap (`192x192`, `512x512`, maskable).
  - Penyesuaian layout tablet 8.7" (aturan target sentuh 44px+ dan penanganan keyboard virtual via `visualViewport` API).
  - Komponen bilah atas: **Active Member Selector** dan **Project Switcher**.
- **Versi:** `v4.0.0-alpha.1`

### Fase 2 — Workspace Markdown & Manajemen Multi-Proyek
- **Fokus:**
  - Registry multi-proyek di PWA (`zlce_projects_registry`).
  - Peningkatan I/O file (File Picker impor, Export/Download Markdown instan).
  - Penegakan integritas `SESSION_STATE.md` sebagai sumber kebenaran tunggal status.
- **Versi:** `v4.0.0-alpha.2`

### Fase 3 — Multi-AI & Context Pack (PRIORITAS UTAMA)
- **Fokus:**
  - Perakit paket konteks portabel (*Portable Context Pack Generator*).
  - Adaptasi kuota token per model AI (Gemini 1M vs Claude/GPT 8K–30K).
  - Format output deterministik (Zero-Loss schema-before-data).
  - Penjejak *provenance* (mencatat model AI dan akun alias).
  - Eksekusi Uji Cold-Start Lintas AI (Claude -> Gemini).
- **Versi:** `v4.0.0-beta.1`

### Fase 4 — Multi-Akun & Tim Estafet (PRIORITAS UTAMA)
- **Fokus:**
  - Registry 8 anggota tim (nama alias & email non-rahasia).
  - Penegakan aturan 1 task `IN_PROGRESS` per giliran tablet.
  - Aturan pencatatan persetujuan Gerbang 1–4 oleh seluruh 8 anggota dengan nama pemberi.
  - Protokol serah terima perangkat (*Device Handover Checklist*).
  - Eksekusi Uji Cold-Start Lintas Anggota (Budi -> Siti).
- **Versi:** `v4.0.0-beta.2`

### Fase 5 — Command & Template Hub Termux
- **Fokus:**
  - Katalog template perintah berversi di Git dengan label risiko (Safe, Mutating, Destructive).
  - Generator perintah berparameter otomatis dengan sanitasi anti-command-injection.
  - Tombol salin 1-ketukan (*One-Tap Copy*) via Clipboard API.
  - Pembuatan skrip pembungkus CLI Dispatcher `zlce` di Termux.
  - Komponen **Paste-Back Parser** untuk memvalidasi keluaran terminal di PWA.
- **Versi:** `v4.0.0-rc.1`

### Fase 6 — Git & Sinkronisasi Cabang Tim
- **Fokus:**
  - Alur kerja branch per task (`task/TASK-xxx`).
  - Template commit atomik dengan flag identitas eksplisit `-c user.name=...`.
  - Template pull aman (`--ff-only`) dan push cabang.
  - Manajemen cache kredensial git di Termux (`git credential-cache exit`).
  - Panduan resolusi konflik cabang.
- **Versi:** `v4.0.0-rc.2`

### Fase 7 — Pengujian Integrasi Penuh pada Tablet Fisik SM-T225
- **Fokus:**
  - Pengujian end-to-end 14 skenario ZLCE di tablet Samsung Tab A7 Lite.
  - Uji ketahanan Android Low Memory Killer (LMK).
  - Uji operasi offline 100% (Mode Pesawat).
  - Verifikasi ergonomi keyboard virtual dan target sentuh jari.
- **Versi Rilis:** **`v4.0.0` (ZLCE Mobile Workbench GA — Self-Contained Zero Daemon Core)**

### Fase 8 — Dokumentasi, Panduan & Knowledge Base Terpadu
- **Fokus:**
  - `docs/mobile/INSTALLATION.md` (Panduan instalasi Termux & PWA di tablet).
  - `docs/mobile/USER_GUIDE.md` (Alur kerja estafet 8 anggota).
  - `docs/mobile/TERMUX_SETUP.md` (Konfigurasi Git & Python di Termux).
  - `docs/mobile/TROUBLESHOOTING.md` (Penyelesaian masalah LMK & izin penyimpanan).
  - Catatan: Integrasi Obsidian/Joplin dikeluarkan dari core v4.0.0 (ADR-09) demi keandalan RAM 3GB.
- **Versi:** `v4.0.0-rc.3` (TASK-041 s/d TASK-043 tuntas 100%)

### Fase 9 — Audit, Testing & Review Multi-AI Eksternal (Step 1 s.d. 3)
- **Fokus:**
  - `TASK-044`: Generator prompt mandat audit terstruktur dengan stop token model sasaran (Claude 3.5 Sonnet, ChatGPT GPT-4o, DeepSeek-V3, Gemini) dan skrip pembuat bundel ZIP 69 berkas proyek (`scripts/create-audit-bundle.py`, `public/assets/zlce-audit-review-bundle.zip`).
  - `TASK-045`: Modul tanggapan tanya-jawab & klarifikasi awal untuk menanggapi pertanyaan pendalaman AI peninjau (LMK RAM 3GB, Zero-Secret clean-auth, ergonomi 44px, offline 100%) dan pemetaan berkas referensi.
  - `TASK-046`: Integrator review final, pembedah skor dan temuan celah, serta perencana tindakan perbaikan terstruktur berbasis prinsip kehati-hatian ZLCE (checklist persetujuan pengguna sebelum dialirkan ke backlog).
- **Versi Rilis:** **`v4.0.0` GA (46/46 Task Tuntas & Disetujui 100%, 35/35 Test Checks PASS)**

