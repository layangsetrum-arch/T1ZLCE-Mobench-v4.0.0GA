# BLUEPRINT 01: GAMBARAN UMUM SISTEM (SYSTEM OVERVIEW)
## ZLCE Mobile Workbench v4.0.0 — Stasiun Kerja Pengembang Mobile untuk Tablet Android

Tanggal: 2026-11-04  
Status: **DRAFT BLUEPRINT (BATCH 2)**  
Rujukan Dokumen: `docs/mobile/FEASIBILITY_AND_DECISIONS.md`, `14_MULTI_AI_TEAM_MODEL.md`

---

## 1. VISI & TUJUAN PRODUK

**ZLCE Mobile Workbench v4.0.0** adalah stasiun kerja pengembang mobile berbasis Progressive Web App (PWA) yang dirancang khusus untuk memungkinkan pengembangan perangkat lunak terpandu AI pada **tablet Android (Samsung Galaxy Tab A7 Lite SM-T225, 8.7", RAM 3GB)** yang digunakan secara bergantian oleh **8 anggota tim**.

Sistem ini mentransformasikan metodologi **Zero-Loss Context Engineering (ZLCE)** dari lingkungan desktop ke lingkungan mobile tanpa mengorbankan integritas dokumen, aturan 4 Gerbang Kualitas (*Quality Gates*), struktur *Write-Ahead Log* (WAL), atau protokol pemulihan darurat Kasus A–D.

---

## 2. PRINSIP UTAMA SISTEM (CORE SYSTEM TENETS)

1. **One ZLCE Core — Multiple Working Environments:**
   Format `SESSION_STATE.md`, enum task atomik (`PENDING`, `READY`, `IN_PROGRESS`, `BLOCKED`, `DONE`), aturan WAL, 4 Gerbang Kualitas, dan validator identik 100% antara desktop dan tablet. Tidak ada pelemahan protokol demi kemudahan mobile.
2. **Markdown as Single Source of Truth:**
   Dokumen Markdown di repositori Git adalah sumber kebenaran permanen. PWA dan peramban bertindak sebagai antarmuka operasional (*operational hub*), bukan tempat penyimpanan database proprietary.
3. **PWA sebagai Command & Template Hub (Bukan Eksekutor Langsung):**
   Mematuhi batasan keamanan sandbox Android: PWA merakit prompt, menyusun Context Pack, dan menyiapkan template perintah Git/CLI yang benar dengan parameter terisi otomatis, lalu disalin pengguna dengan satu ketukan (*One-Tap Copy*) ke Termux.
4. **Single-App Sequential Flow (Tahan Batasan RAM 3GB & LMK):**
   Tidak mengasumsikan multi-window atau split-screen. Anggota bekerja dengan membuka satu aplikasi bergantian: `PWA -> Salin -> Termux / Browser AI -> Paste-Back Hasil -> Kembali ke PWA`.
5. **Zero Daemon Principle:**
   Tidak ada background service atau server lokal permanen yang dipaksakan hidup terus-menerus di Termux. Semua proses bersifat transaksional dan tahan terhadap pemutusan memori oleh Android Low Memory Killer (LMK).
6. **Kolaborasi Estafet 8 Anggota Bebas Konflik:**
   Didukung model **Satu Repositori Bersama di GitHub dengan Branch per Task (`task/TASK-xxx`)**, penegakan identitas commit per giliran via selektor Anggota Aktif di PWA, dan pencatatan nama pemberi persetujuan Gerbang secara transparan.

---

## 3. LINGKUNGAN PENGGUNA & TOPOLOGI SISTEM

```
┌──────────────────────────────────────────────────────────────┐
│                    TABLET SAMSUNG TAB A7 LITE                │
│                                                              │
│  [ PWA WORKBENCH ] ◄────────── Clipboard ────────► [ AI BROWSER ]
│  - Active Member Bar                                - Gemini
│  - Context Builder                                  - Claude
│  - Command Generator                                - ChatGPT
│  - Paste-Back Parser                                         │
│         ▲                                                    │
│         │ (Salin & Tempel                                    │
│         │  Perintah / Hasil)                                 │
│         ▼                                                    │
│  [ TERMUX NATIVE RUNTIME ] ◄─────────────────────────────────┘
│  - Python 3.11+ (zlce-check, zlce-collect)
│  - Bash (zlce-snapshot.sh)
│  - Git Engine (Branch task/TASK-xxx, Credential Cache)
│  - Repositori Lokal di ~/projects/
└─────────┬────────────────────────────────────────────────────┘
          │ (git push / git fetch via Wi-Fi / LTE)
          ▼
┌──────────────────────────────────────────────────────────────┐
│                 GITHUB REMOTE REPOSITORY                     │
│         https://github.com/acimau99-netizen/proyek-bersama   │
│         Branch 'main' (Protected) + Branch 'task/TASK-xxx'   │
└──────────────────────────────────────────────────────────────┘
```

---

## 4. METRIK KEBERHASILAN SISTEM (SUCCESS METRICS)

1. **Kelancaran Handover Estafet:** Pergantian pengerjaan task dari Anggota A (misal di Claude) ke Anggota B (di Gemini) dapat diselesaikan dalam waktu kurang dari 3 menit tanpa kehilangan satu bit pun konteks arsitektur atau keputusan teknis.
2. **Nol Kebocoran Kredensial:** Tidak ada Personal Access Token GitHub, password, atau API key yang tertinggal dalam memori Termux atau berkas repositori saat tablet berpindah tangan antar-anggota.
3. **Kepatuhan 100% ZLCE Core:** Seluruh berkas yang dihasilkan di tablet Android lulus validasi `python3 scripts/zlce-check.py . --strict` dengan 0 error dan 0 warning.
4. **Stabilitas Pengoperasian:** Aplikasi tidak pernah mengalami kehilangan data draft saat diminimalkan atau saat proses dibunuh oleh Android LMK.
