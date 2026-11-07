# BLUEPRINT 10: STRATEGI PENGUJIAN & KRITERIA PENERIMAAN
## Piramida Uji, Verifikasi Invarian Tim & Skenario Uji Perangkat Tablet

Tanggal: 2026-11-04  
Status: **DRAFT BLUEPRINT (BATCH 3)**  
Rujukan Dokumen: `docs/mobile/FEASIBILITY_AND_DECISIONS.md`, `14_MULTI_AI_TEAM_MODEL.md`

---

## 1. PIRAMIDA PENGUJIAN ZLCE WORKBENCH (TESTING PYRAMID)

Pengujian dibagi ke dalam lima lapisan ketat guna menjamin kualitas rilis:

```
                  ┌───────────────────────┐
                  │ 5. PENGUJIAN TABLET   │ (Manual & Ergonomi)
                  ├───────────────────────┤
                  │ 4. INTEGRASI COLD-START│ (Lintas AI & Aktor)
                  ├───────────────────────┤
                  │ 3. CLI REGRESI PYTHON │ (zlce-check, snapshot)
                  ├───────────────────────┤
                  │ 2. UNIT LOGIKA RULES  │ (zlceValidator, parser)
                  ├───────────────────────┤
                  │ 1. STATIS & TYPE LINT │ (TypeScript, .gitattrs)
                  └───────────────────────┘
```

---

## 2. PENGUJIAN INVARIAN TIM (I1 s.d. I5)

Setiap rilis versi wajib memenuhi kriteria lulus (*Acceptance Criteria*) atas 5 invarian kesinambungan:

| Uji Invarian | Target yang Diverifikasi | Kriteria Kelulusan (PASS) |
| :--- | :--- | :--- |
| **Uji I1: All in Files** | Seluruh metadata task, WAL, dan audit | Menghapus total `localStorage` peramban tidak merusak proyek; state pulih sempurna saat berkas `SESSION_STATE.md` diimpor kembali. |
| **Uji I2: Cold-Start Resume** | Estafet dari Claude ke Gemini murni via Context Pack | Model AI kedua dapat melanjutkan penulisan kode pada sub-langkah berikutnya secara akurat tanpa riwayat obrolan AI pertama. |
| **Uji I3: Quality Gate Invariance** | 4 Gerbang Kualitas & Aturan Task | `npm test` mengeksekusi `zlce-check.py` terhadap seluruh template dan contoh tanpa error. |
| **Uji I4: Provenance Integrity** | Identitas aktor dan persetujuan Gerbang | Commit Git mencatat `Author: [Nama Anggota]` yang sesuai dengan selektor profil aktif di PWA, dan log audit mencatat nama penyetuju. |
| **Uji I5: Zero Lost Updates** | Kerja paralel pada cabang terpisah | Setiap task di-push ke branch `task/TASK-xxx` tersendiri; cabang `main` tetap terlindungi dari push langsung. |

---

## 3. PENGUJIAN OFFLINE & KETAHANAN LMK

1. **Uji Offline Shell PWA:**
   - Putuskan koneksi jaringan (aktifkan Mode Pesawat di tablet).
   - Buka PWA dari ikon homescreen -> Aplikasi wajib terbuka dalam < 1.5 detik menampilkan shell lengkap, template editor, dan data proyek lokal.
2. **Uji Low Memory Killer (LMK Simulation):**
   - Buka PWA -> Isi draft teks pada form -> Tekan tombol Home Android.
   - Buka 3 aplikasi berat lain (YouTube, Chrome dengan banyak tab) hingga RAM penuh.
   - Buka kembali PWA -> Draft teks tidak boleh hilang (terpulihkan instan via `localStorage`).

---

## 4. DAFTAR UJI MANUAL PADA PERANGKAT FISIK (SAMSUNG TAB A7 LITE)

| ID Uji | Skenario Pengujian Tablet | Prosedur Uji | Kriteria Sukses |
| :---: | :--- | :--- | :--- |
| **DEV-01** | **Ergonomi Target Sentuh** | Sentuh seluruh tombol status, copy, dan navigasi menggunakan jari tangan tanpa stylus. | Target mudah disentuh (min 44px), tidak terjadi salah ketuk (*zero mis-clicks*). |
| **DEV-02** | **Keyboard Virtual Viewport** | Klik textarea Markdown hingga keyboard virtual Android muncul menutupi layar bawah. | Kontainer menyesuaikan tinggi dinamis; tombol aksi utama tetap mengambang di atas batas keyboard. |
| **DEV-03** | **Alur Estafet 1 Tablet** | Simulasikan giliran Anggota 1 (commit) -> Handover checklist -> Giliran Anggota 2 (checkout branch). | Kredensial Anggota 1 bersih dari cache; Anggota 2 berhasil checkout dan commit atas namanya sendiri. |
| **DEV-04** | **One-Tap Copy ke Termux** | Klik tombol *Salin Perintah Git* di PWA -> Pindah ke Termux -> Tekan tahan layar -> Klik *Paste*. | Perintah tertempel persis tanpa karakter aneh atau kesalahan kutip shell. |
