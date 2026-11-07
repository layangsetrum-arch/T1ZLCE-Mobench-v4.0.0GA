# PANDUAN PENANGANAN MASALAH & RECOVERY MANDIRI
## Troubleshooting & Disaster Recovery Matrix — ZLCE Mobile Workbench v4.0.0 (TASK-043 / TC-P8-03)

Dokumen ini memuat panduan komprehensif penanganan masalah (*troubleshooting*), pemulihan bencana (*disaster recovery*), dan penanganan insiden operasional pada tablet Samsung Galaxy Tab A7 Lite (SM-T225).

---

## 1. MATRIKS TANYA-JAWAB GEJALA & SOLUSI UMUM

| No | Gejala Error / Permasalahan | Penyebab Umum | Tindakan Solusi Tepat |
| :--- | :--- | :--- | :--- |
| **Q1** | PWA me-refresh sendiri saat beralih dari browser AI kembali ke ZLCE. | Android Low Memory Killer (LMK) mematikan tab latar belakang karena RAM 3GB terdesak. | Buka kembali PWA dari Home Screen. Fitur Auto-Draft Cache akan memulihkan ketikan terakhir secara otomatis dari LocalStorage. |
| **Q2** | Terminal Termux menampilkan pesan: `Permission denied` saat menjalankan skrip. | Atribut izin eksekusi (*execute bit*) belum aktif pada berkas shell. | Jalankan perintah: `chmod +x scripts/zlce/zlce scripts/zlce/clean-auth.sh scripts/security-audit.sh` |
| **Q3** | Perintah `zlce check` gagal dengan error: `Missing Section 3 (WAL)`. | Struktur kanonik `SESSION_STATE.md` terpotong atau rusak saat pengeditan manual. | Gunakan fitur pemulihan struktur kanonik di tab **Recovery** PWA atau terapkan template standar dari `templates/SESSION_STATE.template.md`. |
| **Q4** | `git push` ditolak dengan error: `[rejected - non-fast-forward]`. | Cabang remote telah memiliki pembaruan commit dari anggota lain. | Jangan pernah menggunakan `--force`! Jalankan `git pull --ff-only` atau lakukan rebase/merge aman sesuai panduan Conflict Wizard di GitSyncTab. |
| **Q5** | Git meminta username dan token setiap kali commit/push. | Sesi `git credential-cache` telah kedaluwarsa (>900 detik / 15 menit) atau telah dibersihkan via `clean-auth`. | Masukkan token Anda kembali. Ini adalah perilaku yang diharapkan demi keamanan tablet bersama (Zero-Secret Policy). |
| **Q6** | Editor file picker tidak dapat membaca berkas dari penyimpanan internal tablet. | Termux atau Chrome belum memiliki izin akses penyimpanan Android. | Jalankan `termux-setup-storage` di Termux dan ketuk "Izinkan" pada dialog izin sistem Android. |
| **Q7** | Terdeteksi lebih dari 1 task `IN_PROGRESS` pada matriks task. | Pelanggaran aturan Aturan 1 Task IN_PROGRESS di tablet bersama (ADR-04). | Identifikasi task mana yang sedang aktif dikerjakan. Ubah task lainnya kembali ke status `READY` atau `BLOCKED`. |

---

## 2. PROTOKOL RECOVERY KASUS A – D

Sesuai **Blueprint 09** (*Failure and Recovery*), ZLCE mendefinisikan 4 protokol pemulihan terstandarisasi untuk menangani deviasi:

```
┌─────────────────────────────────────────────────────────────┐
│               PROTOKOL PEMULIHAN STANDAR ZLCE               │
├─────────────────┬───────────────────────────────────────────┤
│ Kasus A         │ Konflik Git / Kegagalan Merge             │
│ Kasus B         │ Halusinasi AI / Deviasi Arsitektur        │
│ Kasus C         │ Kerusakan Format SESSION_STATE.md         │
│ Kasus D         │ Desinkronisasi Status Remote & Lokal      │
└─────────────────┴───────────────────────────────────────────┘
```

---

### KASUS A: KONFLIK GIT / MERGE FAILED

**Pemicu:** Anggota tim melakukan pull pada cabang bersama dan Git melaporkan konflik pada berkas teks.

**Langkah Pemulihan:**
1. Amankan status saat ini dan periksa berkas terdampak:
   ```bash
   git status
   ```
2. Buka berkas yang mengalami konflik menggunakan editor `micro`:
   ```bash
   micro SESSION_STATE.md
   ```
3. Cari penanda konflik `<<<<<<< HEAD`, `=======`, dan `>>>>>>>`. Pertahankan versi terbaru yang valid, buang penanda konflik tersebut.
4. Simpan (`Ctrl+S`) dan keluar (`Ctrl+Q`).
5. Validasi integritas berkas kontrol:
   ```bash
   zlce check
   ```
6. Lakukan penandaan penyelesaian konflik:
   ```bash
   git add SESSION_STATE.md
   git commit -c user.name="Nama Anda" -c user.email="email@zlce.internal" -m "fix(sync): resolve merge conflict in SESSION_STATE"
   ```

---

### KASUS B: HALUSINASI AI / DEVIASI ARSITEKTUR

**Pemicu:** Respons AI menyarankan penambahan pustaka yang melanggar keputusan arsitektur (misalnya menyarankan Obsidian di luar ADR-09, atau menambahkan runtime backend Express yang membebani RAM tablet).

**Langkah Pemulihan:**
1. Tolak kode hasil keluaran AI (jangan dimasukkan ke repositori).
2. Catat deviasi tersebut pada Bagian 6 `SESSION_STATE.md` (Catatan Serah Terima):
   `"Deviasi terdeteksi pada AI: saran runtime backend dibatalkan sesuai ADR-09."`
3. Bangkitkan ulang Context Pack dengan stop-token ketat dan aturan larangan eksplisit di Prompt Studio.
4. Kirimkan kembali instruksi terkoreksi ke AI.

---

### KASUS C: KERUSAKAN FORMAT `SESSION_STATE.md`

**Pemicu:** Perintah `zlce check` menghasilkan error karena ada baris bagian yang hilang atau format kolom tabel rusak.

**Langkah Pemulihan:**
1. Buat snapshot darurat sebelum perbaikan:
   ```bash
   scripts/zlce-snapshot.sh
   ```
2. Bandingkan berkas `SESSION_STATE.md` dengan template referensi di `templates/SESSION_STATE.template.md`.
3. Pastikan 8 bagian kanonik tetap ada dan utuh:
   - `## 0. KONTEKS PROYEK`
   - `## 1. STATUS AKTIF`
   - `## 2. MATRIKS TASK` (Header: `| ID Task | Nama | Dependensi | Status | Bukti Verifikasi | Disetujui |`)
   - `## 3. WORK IN PROGRESS (WAL)` (7 butir kanonik)
   - `## 4. ASSUMPTIONS & OPEN QUESTIONS`
   - `## 5. SLOT REVISI AKTIF`
   - `## 6. CATATAN SERAH TERIMA`
   - `## 7. LOG AUDIT`
4. Jalankan ulang pemeriksaan diagnostik:
   ```bash
   zlce check
   ```

---

### KASUS D: DESINKRONISASI STATUS REMOTE & LOKAL

**Pemicu:** Tablet tertinggal beberapa commit dari remote setelah pergantian anggota tim atau perbaikan di komputer lain.

**Langkah Pemulihan:**
1. Amankan pekerjaan lokal yang belum di-commit ke branch sementara:
   ```bash
   git checkout -b stash/uncommitted-work
   git add -A
   git commit -m "wip: temporary save before sync"
   ```
2. Kembali ke branch kerja utama:
   ```bash
   git checkout v4-mobile
   ```
3. Lakukan sinkronisasi bersih fast-forward:
   ```bash
   git pull --ff-only origin v4-mobile
   ```
4. Cek integritas sesi:
   ```bash
   zlce check
   ```

---

## 3. PENEGASAN: LARANGAN PERINTAH DESTRUKTIF TANPA BACKUP

> ⛔ **ATURAN MUTLAK SISTEM:**  
> Dilarang keras menjalankan perintah-perintah berikut pada repositori bersama tanpa persetujuan Lead Architect dan tanpa membuat snapshot pencadangan terlebih dahulu:

1. `git reset --hard`  
   *(Dapat memusnahkan perubahan lokal yang belum ter-push secara permanen).*
2. `git push --force` atau `git push -f`  
   *(Dapat menimpa commit anggota tim lain di server remote secara sepihak).*
3. `rm -rf` pada direktori proyek  
   *(Gunakan penghapusan selektif per berkas).*

### Prosedur Pencadangan Wajib Sebelum Operasi Berisiko:
Sebelum melakukan operasi perbaikan besar, selalu buat berkas cadangan snapshot:
```bash
bash scripts/zlce-snapshot.sh
```
Berkas snapshot akan disimpan dengan stempel waktu di direktori `.snapshots/` yang diabaikan oleh Git, sehingga aman dari kehilangan data.

---

## 4. MATRIKS PENANGANAN TEMUAN AUDIT EKSTERNAL (AUD-001 s/d AUD-014)

| Kode Audit | Topik & Risiko | Gejala / Indikator | Prosedur Solusi Terverifikasi |
| :--- | :--- | :--- | :--- |
| **AUD-001** | Zero-Secret Pre-Commit Hook | Token bocor saat commit manual di Termux | Pasang hook: `bash scripts/install-hooks.sh`. Skrip memblokir commit jika mendeteksi token GitHub/AWS/Google. |
| **AUD-002** | Lifecycle Flush LMK React Hook | Ketikan hilang saat berpindah cepat ke Termux | Hook `useAutoDraftCache` melakukan synchronous flush pada event `visibilitychange ('hidden')` dan `pagehide`. |
| **AUD-003** | Browser Process Termination Recovery | Tab tertutup total oleh OS Android | Buka kembali PWA; `useAutoDraftCache` memuat ulang draft dari LocalStorage secara transparan (0 loss). |
| **AUD-004** | Tekanan Memori Fisik SM-T225 | UI Android melambat atau reload | Jalankan `bash scripts/test-lmk-physical.sh --verify-only` untuk simulasi beban aman bertahap (500MB s/d 2000MB). |
| **AUD-005** | Isolasi Sesi Multi-Anggota Browser | Draft Anggota A tertimpa oleh Anggota B | Namespace otomatis per anggota: `zlce_workspace_draft_content_[memberId]`. Mengganti anggota memuat draft masing-masing. |
| **AUD-006** | Eksklusivitas Klaim Task | Dua task berstatus `IN_PROGRESS` | `verifyClaimExclusivity()` menolak klaim ganda. Gunakan fungsi `takeoverTaskClaim()` dengan alasan jelas jika perlu alih tugas. |
| **AUD-007** | Penulisan Transaksional Berkas Kontrol | Berkas corrupt saat baterai habis | `atomicWriteStorageWithChecksum()` menulis ke buffer staging dan memvalidasi checksum DJB2a sebelum commit final. |
| **AUD-008** | Navigasi Offline Mode Pesawat PWA | Navigasi antar-tab macet tanpa internet | `public/sw.js` mem-precache App Shell dan memiliki fallback offline `/index.html` untuk seluruh 10 rute tab workbench. |
| **AUD-009** | Standardisasi Alur Git Kanonik | Riwayat commit tertimpa atau konflik rebase | Larangan mutlak `--force`. Gunakan `CMD-GIT-05` (pull `--ff-only`), `CMD-GIT-06` (safe stash & pull), dan `CMD-GIT-07` (`branch -d`). |
| **AUD-010** | Konsolidasi Test Runner Tunggal | Hasil uji parsial / tidak terintegrasi | Jalankan perintah terpadu `npm test` atau `python3 scripts/run-tests.py` yang mengevaluasi 44 checks komprehensif. |
| **AUD-011** | Sinkronisasi Baseline Cetak Biru | Over-claiming atau referensi berkas usang | Dokumen cetak biru `MOBILE_BLUEPRINT.md` disinkronkan 100% dengan 60 task selesai dan 44 test suite. |
| **AUD-012** | Reproduksibilitas Bundel ZIP Audit | Hash bundel zip berubah-ubah di mesin berbeda | `scripts/create-audit-bundle.py` menyertakan `SHA256SUMS.txt` dengan stempel waktu deterministik untuk verifikasi integritas. |
| **AUD-013** | Kemurnian State Updater React | Render race-condition pada aksi cepat | Seluruh mutasi state menggunakan bentuk functional arrow murni `(prev => ...)` tanpa efek samping mutasi objek langsung. |
| **AUD-014** | Pembaruan Panduan Operasional | Anggota ragu menjalankan mitigasi baru | Panduan `USER_GUIDE.md` dan `TROUBLESHOOTING.md` telah memuat protokol remediasi AUD-001 s/d AUD-014 lengkap. |

