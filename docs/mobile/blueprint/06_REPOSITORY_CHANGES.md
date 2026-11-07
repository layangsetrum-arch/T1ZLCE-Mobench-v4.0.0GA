# BLUEPRINT 06: PERUBAHAN STRUKTUR REPOSITORI
## Analisis Perubahan Minimal, Lokasi Dokumen Kontrol & Penambahan Komponen Mobile

Tanggal: 2026-11-04  
Status: **DRAFT BLUEPRINT (BATCH 2)**  
Rujukan Dokumen: `docs/mobile/AUDIT_BASELINE.md`, `02_COMPONENT_ARCHITECTURE.md`

---

## 1. PRINSIP PERUBAHAN MINIMAL (MINIMAL IMPACT PRINCIPLE)

Pengembangan ZLCE Mobile Workbench memegang teguh prinsip **penambahan lapisan baru tanpa merusak inti yang ada** (*additive, non-breaking changes*):
- Seluruh template kanonik di `templates/` dipertahankan 100%.
- Skrip kanonik di `scripts/` (`zlce-check.py`, `zlce-collect.py`, `zlce-snapshot.sh`) dipertahankan fungsinya.
- Seluruh penambahan fitur mobile (PWA, Project Switcher, Command Hub, Context Pack) ditampung dalam folder komponen terisolasi `src/components/mobile/`.

---

## 2. TABEL PERUBAHAN STRUKTUR KOMPONEN

| Komponen Saat Ini | Kondisi Saat Ini | Perubahan yang Dilakukan | Alasan Teknis |
| :--- | :--- | :--- | :--- |
| **`public/manifest.webmanifest`** | Belum ada | **DITAMBAHKAN** (Manifest PWA mandiri) | Mengaktifkan mode terpasang di homescreen tablet, theme color, dan app shortcuts. |
| **`public/sw.js` & `src/sw-register.ts`** | Belum ada | **DITAMBAHKAN** (Service Worker caching) | Mengaktifkan offline shell, cache asset bundle, dan kesiapan offline 100%. |
| **`public/icons/`** | Hanya SVG favicon | **DITAMBAHKAN** (`icon-192.png`, `icon-512.png`, maskable) | Syarat instalasi PWA dan estetika ikon Android. |
| **`src/components/mobile/`** | Belum ada | **DITAMBAHKAN** (Folder komponen mobile terisolasi):<br>- `ActiveMemberSelector.tsx`<br>- `ProjectSwitcher.tsx`<br>- `CommandHubTab.tsx`<br>- `ContextPackTab.tsx`<br>- `PasteBackModal.tsx` | Memisahkan komponen khusus tablet agar tidak membuat kode desktop menjadi bloated. |
| **`src/components/Header.tsx`** | Layout desktop | **DIADAPTASI**: Menyematkan `ActiveMemberSelector` dan `ProjectSwitcher` di header yang lebih kompak | Memudahkan pergantian anggota aktif dan proyek di tablet. |
| **`src/components/SessionStateTab.tsx`** | Single column desktop | **DIADAPTASI**: Target sentuh 44px+, layout ramah keyboard virtual | Ergonomi sentuhan jari dan mencegah form tertutup keyboard layar. |
| **`src/utils/zlceValidator.ts`** | Validasi aturan v3.2.2 | **DIPERTAHANKAN**: Ditambahkan dukungan validasi nama pemberi persetujuan di kolom Disetujui | Kompatibilitas 100% dengan Core ZLCE. |
| **`scripts/zlce-check.py`** | Baseline Track 1 (v3.3.0) | **DIPERTAHANKAN**: Mendukung `--tasks` dan pesan status git | Skrip kanonik CLI yang dieksekusi di Termux. |
| **`templates/` & `examples/`** | Baseline Track 1 | **DIPERTAHANKAN 100%**: Tidak diubah | Menjaga konsistensi ZLCE Core. |

---

## 3. LOKASI BERKAS KONTROL PROYEK TRACK 2

Sesuai aturan Master Project Instruction v5, pengerjaan proyek Track 2 sendiri dikelola menggunakan metodologi ZLCE:
- **Lokasi Berkas Kontrol Track 2:** Ditempatkan di root proyek kerja (`docs/mobile/` adalah dokumen pendukung arsitektur, bukan pengganti berkas kontrol ZLCE):
  - `BLUEPRINT.md`: Ringkasan visi dan acceptance criteria Track 2.
  - `ARCHITECTURE.md`: Arsitektur mobile dan integrasi Termux.
  - `DATA_MODEL.md`: Skema registry proyek, profil anggota tim, dan context pack.
  - `TASKS.md`: Rincian task atomik (Fase 0 s.d. Fase 7).
  - `TESTING.md`: Skenario uji cold-start, offline, dan LMK recovery.
  - `SESSION_STATE.md`: Single Source of Truth status task aktif saat implementasi Track 2 dimulai.

---

## 4. PENGUJIAN REGRESI NON-BREAKING

Seluruh perubahan struktur kode harus melewati gerbang pengujian:
1. `npm test` wajib menghasilkan **PASS 100%**.
2. `npm run lint` wajib menghasilkan **0 error**.
3. `npm run build` wajib menghasilkan build produksi yang valid.
