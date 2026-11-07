# MASTER PROJECT INSTRUCTION v5
# ZLCE Mobile Workbench — Pengembangan Lanjutan dari ZLCE3.22
## Dua Track: (1) Revisi ZLCE3.22 → (2) ZLCE Workbench PWA untuk Tablet Android

---

# 0. CARA MEMBACA INSTRUKSI INI (WAJIB)

Dokumen ini adalah **instruksi untuk AI coding agent**. Dokumen ini **bukan bagian dari repositori ZLCE3.22**; ia memerintahkan pekerjaan *terhadap* repositori tersebut dan terhadap proyek baru turunannya.

Pekerjaan dibagi **dua track berurutan**:

- **TRACK 1 — REVISI ZLCE3.22.** Memperbaiki dan merapikan fondasi ZLCE yang ada, tanpa menambah fitur PWA/Termux/Obsidian.
- **TRACK 2 — ZLCE MOBILE WORKBENCH.** Proyek baru turunan hasil Track 1: PWA yang lebih baik, terintegrasi dengan Termux (Python/Bash/Git), GitHub, dan Obsidian, untuk tablet Android.

Track 2 **tidak boleh dimulai** sebelum Track 1 selesai dan disetujui pengguna.

Setiap track berjalan dengan **checkpoint** (P1-CP1…, P2-CP1…). Setiap checkpoint berakhir dengan BERHENTI dan menunggu persetujuan eksplisit ("Setujui P1-CP1", dst.). Tanpa persetujuan itu, dilarang melangkah ke checkpoint berikutnya, track berikutnya, atau pekerjaan lain.

**Saat pertama kali menerima instruksi ini, kerjakan HANYA P1-CP1 (Audit).** Jangan mengubah kode, jangan membuat blueprint, jangan membuat task.

---

# 1. IDENTITAS

## 1.1 Repositori asal dan repositori kerja

`https://github.com/acimau99-netizen/ZLCE3.22-studio.git`

Itu adalah **repositori asal**. Pengguna membuat **repositori kerja baru dengan meng-clone repositori asal**; seluruh pekerjaan Track 1 dan Track 2 dilakukan di repositori kerja ini. Karena itu revisi Track 1 dikerjakan langsung di `main` (dengan pengaman di P1-CP3).

Pada awal P1-CP1, AI wajib mencatat: URL repositori kerja, `git remote -v`, branch default, commit HEAD, dan tanggal commit terakhir. Bila repo tidak dapat diakses (mis. tanpa jaringan), minta pengguna melampirkan arsip repo dan catat bahwa audit dilakukan pada arsip, bukan HEAD remote.

Nama lama lain (`SYSTRUKZLCE3.22`, `ZLCEv3.2.2`) yang ditemukan di dokumen atau badge repo dicatat sebagai **temuan konsistensi**, bukan dijadikan sumber.

## 1.2 Proyek yang dibangun

| | Track 1 | Track 2 |
|---|---|---|
| Nama kerja | ZLCE3.22 Revisi | ZLCE Mobile Workbench |
| Lokasi kerja | Repo kerja baru hasil clone `ZLCE3.22-studio`, langsung di `main` (dengan pengaman P1-CP3) | Repo kerja yang sama, berangkat dari tag baseline Track 1 (strategi cabang diputuskan di P2-CP2) |
| Sifat | Perbaikan, konsolidasi, dokumentasi, uji | Pengembangan fitur dan integrasi |
| Bukan | Menambah PWA/Termux/Obsidian | Menulis ulang inti ZLCE |

Prinsip: **ONE ZLCE CORE — MULTIPLE WORKING ENVIRONMENTS.** Protokol, format dokumen, validator, aturan task, dan 4 Gerbang Kualitas ZLCE harus sama di desktop dan tablet.

## 1.3 Lingkungan target: TABLET ANDROID

Target utama adalah **tablet Android** (bukan ponsel). Konsekuensi desain yang wajib dipertimbangkan:

- Layar lebar: tata letak dua panel (daftar + detail), mode potret dan lanskap.
- **Multi-window / split-screen**: PWA dan Termux (atau browser AI) berdampingan; alur kerja jangan mengasumsikan hanya satu aplikasi tampil.
- Input: layar sentuh **dan** kemungkinan keyboard fisik/stylus; target sentuh memadai; pintasan keyboard sebagai tambahan, bukan syarat.
- RAM dan penyimpanan tetap terbatas; Android dapat menghentikan proses latar belakang (Termux, browser) kapan saja.
- Koneksi tidak stabil; semua operasi lokal harus tetap berjalan offline.
- Ponsel hanya didukung "selama responsif", bukan target uji, kecuali pengguna meminta.

**Profil perangkat tidak boleh diasumsikan.** Tanyakan di P2-CP2: merek/model, versi Android, RAM, penyimpanan bebas, browser utama untuk PWA, browser untuk AI, sumber instal Termux dan add-on-nya, dukungan multi-window/mode desktop, keyboard eksternal. (Status Obsidian ditanyakan nanti, di Fase 8.)

## 1.4 Keterbatasan Android dan peran PWA

Perlakukan sebagai kendala desain (verifikasi di tablet nyata, jangan diasumsikan):

- Browser/PWA berjalan dalam sandbox: tidak dapat menjalankan perintah, tidak dapat mengakses direktori privat Termux, dan akses tulis ke folder penyimpanan bersama dibatasi.
- Android dapat menghentikan Termux dan browser di latar belakang; operasi tidak boleh bergantung pada proses yang hidup lama.
- Mengetik perintah panjang di keyboard layar rawan salah.

Karena itu PWA berperan sebagai **Command & Template Hub** (bagian 5.1): PWA tidak mengeksekusi apa pun, tetapi menyiapkan teks yang benar (Markdown, perintah Python/CLI, perintah Git) dan memudahkan menyalinnya ke Termux dengan satu ketukan.

---

# 2. ATURAN BUKTI (BERLAKU DI KEDUA TRACK)

Setiap temuan/klaim memakai satu klasifikasi:

- **VERIFIED** — dibuktikan langsung dari kode/berkas/keluaran perintah yang dikutip.
- **PARTIALLY VERIFIED** — sebagian terbukti; sebutkan bagian yang belum.
- **NOT VERIFIED** — tidak dapat dibuktikan di lingkungan saat ini.
- **NOT IMPLEMENTED** — terbukti tidak ada.

Bukti sah: `path:baris`, kutipan singkat kode, atau keluaran perintah beserta perintahnya. Bukan bukti: README, komentar, klaim AI sebelumnya, atau skor evaluasi (mis. "14/14 lulus") tanpa pengujian ulang.

Perilaku Android, Termux, Obsidian, dan browser **tidak boleh VERIFIED** sebelum diuji di tablet nyata; tandai NOT VERIFIED dan masukkan ke daftar uji perangkat.

---

# 3. PRINSIP WAJIB

1. **Preserve ZLCE Core.** Pertahankan BLUEPRINT, TASKS, SESSION_STATE, HANDOVER, 4 Gerbang Kualitas, Atomic Task, WAL, Recovery Kasus A–D, validator, snapshot, diagnostic collector. Dilarang melemahkan demi kemudahan mobile. Konflik → dokumentasikan dan ajukan solusi sebelum implementasi.
2. **Format harus tetap kompatibel**, dibaca dari kode (bukan dari prompt ini): enum status task, pola ID task, daftar berkas kontrol pada `zlce-check.py`, struktur bagian SESSION_STATE.
3. **Markdown First.** Markdown adalah sumber data persisten; PWA bukan sumber kebenaran. `localStorage` hanya untuk preferensi UI, cache, draft sementara, riwayat navigasi.
4. **Offline First** untuk operasi lokal (baca proyek/task/SESSION_STATE, buat prompt, simpan hasil, handover, validator lokal). Sinkron GitHub saat online.
5. **AI Agnostic.** Tidak terkunci satu penyedia; AI dipakai lewat browser terpisah; API AI bukan ketergantungan wajib.
6. **Termux bukan server permanen.** Tidak boleh ada desain yang menuntut Termux aktif terus-menerus. Dilarang akses shell arbitrer dari PWA; PWA tidak mengeksekusi perintah, ia menyediakan template untuk disalin (bagian 5.1).
7. **Satu sumber kebenaran.** Obsidian bukan sumber kebenaran kedua.
8. **Hormati batas tulis** per checkpoint (lihat bagian 4 dan 5).
9. **Multi-AI, multi-akun, dan tim adalah prioritas utama** (bagian 5.2). Kesinambungan konteks dan alur awal ZLCE tidak boleh bergantung pada satu AI, satu akun, atau satu orang.

Prioritas desain: (1) kesinambungan konteks lintas AI, akun, dan orang serta konsistensi data, (2) keamanan, (3) keandalan recovery, (4) efisiensi RAM, (5) efisiensi penyimpanan, (6) kenyamanan layar tablet, (7) maintainability, (8) kompatibilitas dengan ZLCE yang ada.

Urutan pengerjaan fitur: **Multi-AI, Multi-Akun, dan Tim didahulukan** (bagian 5.2). **Obsidian dan dokumentasi/tutorial lengkap dikerjakan paling akhir.** Bantuan singkat dan knowledge base muncul saat diperlukan (bagian 9.1).

---

# 4. TRACK 1 — REVISI ZLCE3.22

**Tujuan:** menyerahkan fondasi ZLCE yang bersih, konsisten, teruji, dan siap menjadi basis Track 2, tanpa mengubah mekanisme inti.

**Batas:** tidak ada fitur PWA/Termux/Obsidian baru. Perubahan hanya yang didukung temuan audit dan disetujui.

## P1-CP1 — Audit repositori

Langkah 0 (persiapan repo kerja): minta URL repo kerja baru (hasil clone). Pastikan `origin` = repo kerja; repo asal didaftarkan sebagai `upstream` **read-only** (tidak pernah di-push); buat tag `baseline-3.22-asli` pada commit awal sebagai titik kembali. Batas tulis P1-CP1: hanya `docs/revisi/AUDIT_3.22.md`. Semua lain baca-saja.

Output: `docs/revisi/AUDIT_3.22.md`. Setiap temuan memuat: kondisi aktual, bukti, masalah, dampak, rekomendasi, klasifikasi.

Periksa minimal:

**A. Arsitektur & kode** — struktur repo, komponen React, routing, state, penyimpanan, dependensi, integrasi CLI, validasi.

**B. ZLCE Core** — template, LANDING_PROMPT, HANDOVER_PROMPT, SESSION_STATE, TASKS, validator Python dan validator web (`src/utils/zlceValidator.ts`), snapshot Bash, collector, Recovery A–D, 4 Gerbang, harness/pengujian.

**C. Pemeriksaan khusus wajib (dengan bukti).** Daftar berikut adalah **dugaan dari audit pendahuluan atas arsip, belum diverifikasi terhadap HEAD remote**; AI wajib memverifikasi ulang, bukan menyalinnya:

1. Skrip `zlce-check.py`, `zlce-collect.py`, `zlce-snapshot.sh` ada di tiga lokasi (`scripts/`, `scripts/zlce/`, `zlce-starter-kit/scripts/`). Diff isi; tetapkan satu salinan kanonik.
2. `LANDING_PROMPT.md` dan `HANDOVER_PROMPT.md` ada di root dan di `zlce-starter-kit/` (juga arsip di `public/assets/`). Diff dan tetapkan kanonik serta mekanisme menjaga sinkron.
3. Sesi (markdown + state) dipersist ke `localStorage` (`src/hooks/useSessionPersistence.ts`). Petakan semua kunci dan nilai penyimpanannya.
4. `package.json` memuat `@google/genai`, `express`, `dotenv`; `.env.example` berisi `GEMINI_API_KEY`. Periksa pemakaian aktual; periksa `.gitignore` terhadap `.env`.
5. Tidak ada skrip `test` di `package.json`; folder `.github/` tidak ada pada arsip padahal README memuat badge CI. Verifikasi dan nilai klaim "14/14 lulus" (apa yang diuji, di mana artefaknya, apakah dapat diulang).
6. README dan badge menunjuk nama repo lama (`ZLCEv3.2.2`); samakan dengan URL pada 1.1.
7. Cakupan validator web vs CLI (README menyatakan validator web tidak memeriksa silang `TASKS.md` dan git). Petakan kesenjangan.
8. Konfigurasi dev-server (`host: 0.0.0.0`, `allowedHosts: true`) dan implikasi keamanannya.
9. Kompatibilitas Termux (analisis statis) skrip Python/Bash: dependensi eksternal yang dibutuhkan.
10. Nama dan isi 4 Gerbang ZLCE dari dokumentasi repo (agar tidak tertukar dengan istilah lain).
11. **Implementasi Python:** versi Python yang dibutuhkan, impor non-stdlib, penanganan kegagalan pemanggilan `git` (apakah kegagalan terlihat atau diam-diam diabaikan), penanganan path/encoding, dan perilaku di Termux. Jalankan skrip terhadap `examples/` dan catat hasilnya.
12. **Git dan berkas:** keberadaan `.gitattributes`, akhir baris (LF/CRLF), bit eksekusi `.sh`, isi `.gitignore`, dan hal berisiko di Android (izin berkas, `safe.directory`, shared storage).
13. **Asumsi satu aktor:** periksa di template, validator (CLI dan web), HANDOVER_PROMPT, dan WAL apakah ada asumsi satu pengguna/satu AI (satu WAL, satu IN_PROGRESS, satu SESSION_STATE, tanpa identitas aktor atau provenance). Hasilnya menjadi masukan desain tim Track 2; Track 1 tidak mengubahnya.

**BERHENTI. Tunggu "Setujui P1-CP1".**

## P1-CP2 — Rencana revisi

Output: `docs/revisi/REVISION_PLAN.md`. Untuk setiap usulan revisi: ID (REV-n), masalah (rujuk temuan), perubahan tepat, berkas terdampak, risiko regresi, cara verifikasi, dependensi, prioritas, dan **apakah termasuk Track 1** (perbaikan) atau **ditunda ke Track 2** (fitur).

Kandidat (tunduk pada hasil audit, bukan keputusan):

- Konsolidasi skrip dan dokumen duplikat dengan satu sumber kanonik dan pemeriksaan sinkron.
- Penyelarasan penyimpanan sesi: `localStorage` diperlakukan sebagai cache/draft; tambah ekspor/impor Markdown sebagai jalur persisten. Fitur pemulihan sesi yang ada tidak boleh hilang.
- Pembersihan atau pembenaran dependensi tak terpakai dan variabel lingkungan.
- Penambahan test runner dan skrip `test` yang menjalankan validator terhadap contoh di `examples/`; CI bila disetujui.
- Perbaikan README/badge/tautan ke repo yang benar; dokumentasi batasan.
- Penyempitan konfigurasi dev-server bila terbukti berisiko.
- Penyelarasan cakupan validator web dan CLI, atau dokumentasi kesenjangannya.
- Penguatan skrip Python/Bash untuk Termux: versi Python minimum, stdlib saja bila mungkin, kegagalan Git yang terlihat (tidak diam-diam), akhir baris dan mode eksekusi (`.gitattributes`), tanpa mengubah format keluaran yang dipakai validator.

Pengguna memilih REV mana yang masuk. **BERHENTI. Tunggu "Setujui P1-CP2 (REV-…)".**

## P1-CP3 — Eksekusi revisi

Hanya REV yang disetujui. **Pengaman karena kerja langsung di `main`:** tag `baseline-3.22-asli` harus ada sebelum perubahan pertama; satu commit per REV (atau per task atomik) dengan pesan memuat ID REV/TASK; commit hanya setelah validator dan build lulus; dilarang `push --force`, penulisan ulang riwayat, atau squash tanpa persetujuan; kembali ke kondisi aman lewat `git revert` atau tag baseline, bukan `reset --hard` tanpa persetujuan. Gunakan mekanisme ZLCE untuk pekerjaan ini sendiri (task atomik di TASKS, SESSION_STATE, WAL, handover). Lokasi berkas kontrol proyek revisi ditetapkan di P1-CP2 (jangan bercampur dengan folder `templates/` atau `examples/`). Satu task IN_PROGRESS pada satu waktu; DONE hanya dengan bukti uji; validator ZLCE dijalankan setelah tiap task.

## P1-CP4 — Verifikasi dan penutupan Track 1

Output: `docs/revisi/REVISION_REPORT.md` (REV selesai, bukti, hasil uji ulang, risiko tersisa) dan tag baseline untuk Track 2 (penamaan versi ditentukan pengguna). Jalankan ulang build, lint, dan validator. **BERHENTI. Tunggu "Setujui Track 1 selesai".**

---

# 5. TRACK 2 — ZLCE MOBILE WORKBENCH

Dimulai hanya setelah "Setujui Track 1 selesai". Basis: baseline hasil Track 1. Track 2 dikerjakan pada repo kerja yang sama (hasil clone), berangkat dari tag baseline Track 1; strategi cabang Track 2 diputuskan di P2-CP2. **Jangan membuat sistem baru dari nol; jangan mengganti mekanisme inti tanpa audit dan alasan teknis terbukti.**

**Tujuan:** pengguna dapat, dari tablet Android: mengelola beberapa proyek, mengelola task, menyimpan konteks persisten, membuat prompt dari konteks aktual, berpindah AI tanpa kehilangan konteks, menyimpan hasil AI, memelihara SESSION_STATE, membuat handover, recovery setelah sesi putus, memvalidasi dokumen kontrol, commit/sinkron ke GitHub — **sebagai individu maupun tim dengan banyak anggota, banyak akun AI, dan banyak AI berbeda, tanpa kehilangan konteks dan alur awal ZLCE** (prioritas utama). Kompatibilitas Obsidian menyusul di tahap akhir. Semua tanpa mengharuskan seluruh aplikasi aktif bersamaan.

Batas tulis P2-CP1 sampai P2-CP4: hanya `docs/mobile/**` pada repo kerja.

## 5.1 Prinsip desain: PWA sebagai Command & Template Hub (arahan pengguna)

PWA mengatasi keterbatasan Android lewat **shortcut dan template**, bukan lewat eksekusi:

1. **Katalog template** disimpan sebagai data berversi di repo (bukan hard-coded) agar dapat diperbarui lewat Git:
   - *Markdown:* salin SESSION_STATE, handover, prompt hasil Context Builder, blok hasil AI siap tempel (template catatan Obsidian ditunda ke Fase 8).
   - *Python/CLI:* validator (`zlce-check.py`, opsi `--strict`/`--no-git`), collector, snapshot, recovery snapshot.
   - *Git:* status, log/diff ringkas, pull aman (`--ff-only`), add, commit (pesan dibuat dari Task ID), push, perintah deteksi dan penanganan konflik.
2. **Parameter terisi otomatis** dari konteks proyek aktif (path proyek, Task ID, nama branch). Input bebas dari pengguna (mis. pesan commit) wajib divalidasi dan di-quote benar agar tidak terjadi command injection saat ditempel ke shell; uji dengan karakter khusus.
3. **Transparansi dan tingkat risiko:** perintah selalu ditampilkan sebelum disalin dan diberi label *baca-saja*, *menulis*, atau *destruktif*. Template destruktif (mis. `reset --hard`, `push --force`, `rm -rf`) tidak masuk katalog bawaan; bila kelak dibutuhkan harus lewat persetujuan pengguna dan konfirmasi tambahan di UI. Konsisten dengan protokol Recovery ZLCE: tidak ada reset/checkout/penghapusan perubahan tanpa persetujuan.
4. **Salin satu ketukan** (Clipboard API) dengan fallback seleksi manual. Clipboard API butuh konteks aman dan gestur pengguna; perilakunya di tablet = NOT VERIFIED sampai diuji.
5. **Shortcut:** manfaatkan shortcut ikon PWA (manifest `shortcuts`) dan, bila layak, Web Share Target; di sisi Termux, Termux:Widget untuk skrip satu ketukan. Ketersediaan di tablet = NOT VERIFIED; dianalisis di P2-CP2.
6. **Dispatcher di sisi Termux (kandidat, diputuskan di P2-CP2):** satu CLI kecil (Python stdlib atau Bash, mis. `zlce <subperintah>`) yang membungkus skrip ZLCE yang sudah ada (check, snapshot, collect, git status/pull/commit/push). Template PWA menjadi pendek (`zlce check`), logika tetap di repo, berversi, dan dapat diuji. Dispatcher hanya menerima subperintah dalam allowlist dan menolak yang tidak dikenal; dilarang mengeksekusi isi clipboard secara buta. Jangan menulis ulang fungsi yang sudah ada; bandingkan dengan template perintah langsung dan pilih yang paling sederhana.
7. **Paste-back:** keluaran perintah (hasil validator, `git status`, dll.) dapat ditempel balik ke PWA untuk dibaca ringkas dan dicatat ke Result Capture/SESSION_STATE, tanpa PWA mengakses Termux.
8. **Python dan Git di Termux:** blueprint wajib menetapkan versi Python minimum, paket yang dibutuhkan (utamakan stdlib), langkah setup Termux (git, python, akses penyimpanan), konfigurasi Git (identitas, akhir baris, mode berkas, `safe.directory` bila repo di shared storage), autentikasi GitHub, dan perilaku saat perintah gagal (kegagalan harus terlihat).

Menampilkan dan menyalin template tidak memerlukan jaringan (tetap offline).

## 5.2 Prinsip desain: Multi-AI, Multi-Akun, dan Tim (PRIORITAS UTAMA)

ZLCE Workbench dirancang untuk proyek kerja tim: beberapa orang, beberapa akun AI, beberapa AI berbeda, bergantian atau paralel, tanpa kehilangan konteks dan alur awal.

1. **Aktor.** Definisikan: *Manusia* (anggota tim), *AI* (penyedia + model), *Akun* (alias akun pada suatu penyedia AI), *Sesi*. Registry akun hanya menyimpan alias dan metadata non-rahasia (penyedia, status/batas pemakaian, waktu reset, catatan) — **tanpa kredensial**.
2. **Invarian kesinambungan (wajib dan dapat diuji):**
   - I1. Semua yang dibutuhkan untuk melanjutkan pekerjaan ada di berkas repo; yang tidak tertulis dianggap hilang (prinsip ZLCE).
   - I2. Aktor baru (AI, akun, atau orang) dapat melanjutkan hanya dari berkas dan Context Pack, tanpa riwayat chat.
   - I3. Alur awal ZLCE (Gerbang 1–4, persetujuan pengguna, task atomik, WAL, Recovery A–D) tidak berubah karena pergantian aktor.
   - I4. Setiap keputusan, perubahan, dan hasil memuat provenance: aktor, AI/model, akun (alias), sesi, waktu, Task ID.
   - I5. Tidak ada lost update antar aktor.
3. **Context Pack portabel.** Paket konteks secukupnya per task, dibangun dari berkas (ringkasan BLUEPRINT, task, SESSION_STATE, handover, keputusan relevan) dalam Markdown polos. Budget token dapat diatur per AI (jendela konteks berbeda). Adapter per AI hanya mengatur format dan panjang, bukan logika. API AI bukan ketergantungan wajib.
4. **Handover lintas aktor** memakai HANDOVER_PROMPT ZLCE yang ada (pindah sesi, pindah AI, sesi terputus). Diperluas hanya bila audit membuktikan perlu, tanpa mengubah semantik.
5. **Koordinasi tim.** Analisis dan usulkan: klaim/lease task (siapa, AI/akun mana, sejak kapan, kedaluwarsa); **aturan IN_PROGRESS untuk tim** (aturan ZLCE "satu IN_PROGRESS pada satu waktu" berpotensi bertentangan dengan kerja paralel — dokumentasikan konflik dan ajukan opsi: satu global, satu per aktor, atau kunci per area/berkas; jangan putuskan sendiri); bentuk SESSION_STATE tim (satu berkas vs log per aktor dengan ringkasan teragregasi) yang tetap menjadi sumber kebenaran dan kompatibel dengan validator; penanganan konflik Git antar aktor; siapa yang berwenang menyetujui Gerbang (dicatat bersama provenance).
6. **Multi-akun.** Pergantian akun AI tidak boleh mengubah atau memutus konteks; riwayat pemakaian dan penanda batas/reset tersimpan di Markdown; rotasi akun cukup mengganti alias pada provenance.
7. **Verifikasi lintas AI.** Hasil AI adalah klaim, bukan bukti. Bila dua AI menghasilkan keputusan berbeda, catat sebagai konflik keputusan beserta alasan dan eskalasi ke pengguna/pemilik.
8. **Uji wajib (kriteria lulus ditetapkan di blueprint):** *cold-start resume* AI A → AI B, akun 1 → akun 2, orang 1 → orang 2, masing-masing hanya dari berkas; konkurensi dua aktor pada berkas yang sama; kedaluwarsa klaim; integritas provenance; alur awal ZLCE tetap utuh setelah pergantian aktor.

## P2-CP1 — Audit baseline hasil Track 1 + audit PWA

Output: `docs/mobile/AUDIT_BASELINE.md`.

- Verifikasi bahwa hasil Track 1 sesuai REVISION_REPORT.
- **PWA:** periksa manifest, service worker, ikon, strategi cache, offline shell, mode terpasang. Jangan berasumsi dari README.
- Kesesuaian tablet: komponen yang siap pakai, perlu adaptasi, perlu ditambah, tidak perlu dibuat ulang; keterbatasan Android; risiko Termux; risiko akses filesystem.
- Pemakaian ulang: skrip kanonik dan validator Track 1.

**BERHENTI. Tunggu "Setujui P2-CP1".**

## P2-CP2 — Kelayakan dan keputusan terbuka

Output: `docs/mobile/FEASIBILITY_AND_DECISIONS.md`.

1. **Profil perangkat tablet** (bagian 1.3) — tanyakan satu per satu, dengan opsi dan rekomendasi.
2. **Strategi cabang Track 2** (lanjut di `main` atau branch fitur) dan hubungan dengan repo asal (`upstream` read-only; perlu tidaknya mengambil pembaruan Core dari sumber).
3. **Mekanisme PWA–Termux.** Arah yang ditetapkan pengguna: **Command & Template Hub** dengan salin-tempel ke Termux (bagian 5.1). Putuskan varian (template langsung vs dispatcher `zlce`) dan bandingkan terhadap: A) file-based handoff; B) Android Intent/Share; C) Termux:Widget; D) Local Bridge; E) alternatif lain yang terbukti layak. Kriteria: kompleksitas, keamanan, kebutuhan background process, RAM, kemudahan instal, keandalan, kompatibilitas Android, maintainability. Pilih yang paling sederhana yang memenuhi kebutuhan; Local Bridge tidak dibuat kecuali terbukti perlu (bila dibuat: allowlist perintah, validasi parameter, pembatasan direktori, proteksi akses lokal, penolakan perintah tak dikenal).
   Wajib dianalisis: **bagaimana PWA membaca/menulis berkas Markdown di Android** (batasan akses direktori dari browser; README repo menyatakan web app tidak mengakses filesystem/git). Hasil tanpa uji perangkat = NOT VERIFIED.
4. **Lokasi repositori:** shared storage vs home Termux — izin Android, performa, perilaku Git (izin berkas, mode eksekusi, symlink), keandalan. Tidak boleh memilih sebelum analisis. Kebutuhan Obsidian dievaluasi di Fase 8; cukup pastikan pilihan tidak menutup kemungkinan itu.
5. **Model multi-proyek:** (a) satu repo per proyek + registry ringan; (b) satu repo dengan subfolder per proyek; atau lainnya.
6. **Pengaturan multi-window tablet:** alur kerja saat PWA, Termux, dan browser AI tampil berdampingan atau bergantian.
7. **Model Multi-AI, Multi-Akun, dan Tim** (bagian 5.2): tanyakan jumlah anggota dan peran, daftar AI yang dipakai, akun yang dipakai (alias saja), siapa yang menyetujui Gerbang, pola kerja (bergantian atau paralel); putuskan aturan IN_PROGRESS tim dan bentuk SESSION_STATE tim.
8. **Open Decisions** dengan opsi, rekomendasi, konsekuensi.

**BERHENTI. Tunggu "Setujui P2-CP2".**

## P2-CP3 — Blueprint (batch kecil)

Tidak ada implementasi, tidak ada perubahan kode/template/struktur repo. Buat di `docs/mobile/blueprint/`: `01_SYSTEM_OVERVIEW`, `02_COMPONENT_ARCHITECTURE`, `03_PWA_ARCHITECTURE`, `04_TERMUX_INTEGRATION`, `05_STORAGE_AND_SYNC`, `06_REPOSITORY_CHANGES`, `07_WORKFLOW_DESIGN`, `08_SECURITY_MODEL`, `09_FAILURE_AND_RECOVERY`, `10_TEST_STRATEGY`, `11_IMPLEMENTATION_ROADMAP`, `12_ARCHITECTURE_DECISIONS` (ADR), `13_COMMAND_TEMPLATES` (katalog template, label risiko, aturan parameter), `14_MULTI_AI_TEAM_MODEL` (aktor, klaim task, Context Pack, provenance, konflik, uji cold-start), ditambah `docs/mobile/MOBILE_BLUEPRINT.md` sebagai ringkasan penghubung. Diagram Mermaid bila membantu. **Kerjakan 3–4 dokumen per batch** (dahulukan `14`, `02`, `05`, `07`, lalu sisanya), ringkas, tunggu "lanjut", jaga konsistensi istilah dan keputusan P2-CP2.

Proyek Track 2 juga dikelola dengan mekanisme ZLCE (BLUEPRINT.md, ARCHITECTURE.md, DATA_MODEL.md, TASKS.md, TESTING.md, SESSION_STATE.md pada lokasi yang ditetapkan di `06_REPOSITORY_CHANGES`). `docs/mobile/**` adalah dokumen pendukung, bukan pengganti.

### Isi wajib (lima bidang)

**1. Batas tanggung jawab komponen**
- *ZLCE PWA* (antarmuka operasional): Project Dashboard, Project Switcher, Task Manager, Context Viewer, Context Builder, Prompt Generator, Result Capture, Handover Manager, Recovery Manager, Validation Status, Git Sync Manager; tata letak tablet dua-panel; tandai fitur offline.
- *Markdown Workspace:* struktur direktori, format, relasi dokumen, mekanisme pembaruan, aturan konsistensi, pengarsipan, versioning. SESSION_STATE tetap sumber kebenaran status.
- *Termux Runtime:* Python, Bash, Git; eksekusi validator, snapshot, recovery; operasi berkas dan Git; perintah operasional; pakai ulang skrip kanonik.
- *AI Browser:* pengiriman prompt, pengambilan hasil, sesi, pergantian AI, penyimpanan hasil, pembaruan konteks; tanpa asumsi otomasi tak terbatas.
- *Git/GitHub:* layout, strategi branch, pull/commit/push, konflik, backup, recovery, sinkron antarperangkat (tablet–desktop).
- *Obsidian:* **ditunda ke Fase 8**; di blueprint cukup catatan kendala non-blocking (gunakan Markdown standar dan penamaan berkas yang ramah) dan penegasan bahwa Obsidian bukan sumber kebenaran kedua.

**2. Komunikasi PWA–Termux** — hasil P2-CP2 dengan ADR.

**3. Penyimpanan & sinkronisasi** — lokasi repo, workspace, vault, skrip Termux, cache PWA, temp, log, backup; pencegahan konflik edit, lost update, duplikasi, Git conflict, state tidak konsisten, sinkron setengah jalan (termasuk saat Termux dihentikan Android di tengah operasi); protokol sinkron aman.

**4. Perubahan minimal struktur** — tabel `| Komponen Saat Ini | Kondisi | Perubahan | Alasan |`; utamakan menambah lapisan baru tanpa merusak Core.

**5. Workflow** — inisialisasi proyek, pilih proyek, mulai task, baca konteks, buat prompt, pindah ke AI Browser, ambil hasil, simpan hasil, perbarui SESSION_STATE, validasi, handover, commit/push, recovery, lanjut dengan AI berbeda. Tiap alur: aktor, input, proses, output, dokumen dibaca/diubah, validasi, kondisi gagal, recovery. Recovery memakai protokol ZLCE Kasus A–D; dilarang membuat prosedur yang bertentangan.

**6. Model Multi-AI, Multi-Akun, dan Tim** — penjabaran bagian 5.2 menjadi desain: model aktor, Context Pack, adapter per AI, provenance, klaim task, SESSION_STATE tim, konflik, handover lintas aktor, dan skenario uji cold-start.

**BERHENTI setelah batch terakhir. Tunggu "Setujui P2-CP3".**

## P2-CP4 — Review blueprint

Output: `docs/mobile/BLUEPRINT_REVIEW.md`. Pakai nama **Review R1–R4** (bukan "Gerbang") dan petakan ke Gerbang ZLCE yang relevan:

- R1 Architecture — kelengkapan dan pembagian tanggung jawab.
- R2 Data & Integration — penyimpanan, PWA–Termux, Git, sinkron.
- R3 Workflow & Security — alur, keamanan, kegagalan, recovery.
- R4 Implementation Readiness — kelayakan, dependensi, risiko, rencana task.

Tiap review: hasil, temuan, bukti, risiko, rekomendasi, PASS/FAIL, serta bagian dokumen yang diperiksa. Laporkan memakai format bagian 8. **BERHENTI. Tunggu "Setujui Blueprint".**

## P2-CP5 — Pemecahan task

Setelah "Setujui Blueprint", masukkan task atomik ke TASKS.md (format ZLCE). Tidak ada task IN_PROGRESS sampai pengguna memerintahkan mulai. Kandidat awal (bukan final; AI wajib menggabung/memecah/mengatur dependensi):

- **Fase 0:** baseline uji dan persiapan.
- **Fase 1 — Fondasi PWA tablet:** manifest + service worker + offline shell; navigasi dan layout dua-panel; Project Dashboard; Project Switcher.
- **Fase 2 — Markdown Workspace:** Workspace Manager; Reader; Editor; integritas SESSION_STATE; persistensi Markdown sebagai sumber.
- **Fase 3 — Multi-AI & Context (PRIORITAS):** Task Manager; Context Pack portabel; Context Builder; Prompt Generator dengan adapter per AI; Context Budget Manager per AI; Result Capture dengan provenance; Handover lintas AI; uji cold-start AI A → AI B.
- **Fase 4 — Multi-Akun & Tim (PRIORITAS):** registry aktor (manusia/AI/akun alias, tanpa kredensial); klaim/lease task dan aturan IN_PROGRESS tim; SESSION_STATE tim; Session History; deteksi konflik antar aktor; handover lintas akun/orang; uji cold-start akun dan orang, uji konkurensi skenario berkas (uji penuh bersama Git menunggu Fase 6).
- **Fase 5 — Command Hub & Termux:** katalog template perintah (data berversi); UI template (parameter, validasi, label risiko, salin); shortcut PWA; dispatcher/CLI sisi Termux (bila dipilih); parser paste-back keluaran validator/Git; integrasi validator, snapshot, recovery.
- **Fase 6 — Git & sinkron tim:** template dan alur status, pull aman, commit dari Task ID, push, deteksi dan penanganan konflik antar aktor.
- **Fase 7 — Integrasi & uji perangkat tablet:** end-to-end, offline, recovery, sinkronisasi, performa, keamanan, serta uji multi-AI/tim penuh.
- **Fase 8 (akhir) — Obsidian:** kompatibilitas vault, internal link, navigasi; uji kompatibilitas.
- **Fase 9 (akhir) — Dokumentasi dan tutorial lengkap** (bagian 9.2).

Bantuan kontekstual (bagian 9.1) dibuat bersamaan dengan fitur terkait, bukan fase tersendiri.

Kriteria task atomik: satu tujuan, ruang lingkup terbatas, kriteria selesai, dependensi, dapat diverifikasi, tanpa perubahan di luar lingkup. Dilarang membuat satu task raksasa "Membuat ZLCE Mobile".

**BERHENTI. Tunggu "Mulai implementasi TASK-xxx".**

## P2-CP6 — Implementasi

Setiap task: cek dependensi → cek ruang lingkup → persetujuan pengguna bila diwajibkan → catat WAL → implementasi → pengujian nyata → validasi → perbarui SESSION_STATE → handover bila sesi berakhir. DONE hanya dengan bukti uji. Bila validator perlu diubah, buat task khusus dan jaga kompatibilitas format lama.

---

# 6. KEAMANAN (KEDUA TRACK)

Bahas dan terapkan: token GitHub, kredensial AI, data sensitif, akses filesystem, Local Bridge, validasi input, akses antar-aplikasi, command injection, backup, konflik perubahan, eksposur dev-server.

Dilarang menyimpan password, API key, token GitHub, cookie autentikasi, atau kredensial produksi di Markdown, prompt, log, atau repository. **Tetapkan di blueprint di mana kredensial Git boleh berada** (mis. credential store/SSH key Termux di luar repo), bagaimana `.gitignore` dan pemeriksaan pra-commit mencegah kebocoran, dan bagaimana sesi GitHub dicabut bila tablet hilang.

Tambahan untuk Command Hub: semua template dan dispatcher harus tahan command injection (quoting, validasi parameter, allowlist subperintah), tidak menyertakan kredensial dalam teks perintah, dan tidak memuat perintah destruktif secara bawaan. Clipboard dapat dibaca aplikasi lain di Android; jangan menaruh rahasia di clipboard. Registry akun AI hanya menyimpan alias dan metadata non-rahasia; akses repo/GitHub per anggota tim diatur di luar aplikasi dan didokumentasikan.

---

# 7. PENGUJIAN & KRITERIA PENERIMAAN

Aplikasi terbuka ≠ siap. Uji nyata atas: membuka dan berpindah proyek, membaca task, membuat prompt, menyimpan hasil, memperbarui SESSION_STATE, handover, validator, recovery, git pull/commit/push, deteksi konflik, operasi offline, Termux dihentikan Android, pemulihan setelah aplikasi ditutup, **multi-window dan rotasi layar di tablet**, perangkat RAM terbatas, **template perintah** (diuji dengan karakter khusus pada parameter dan dijalankan nyata di Termux; hasil harus sama dengan yang ditampilkan), salin-tempel PWA → Termux dalam multi-window, shortcut PWA/Widget, serta perilaku saat Python/Git gagal.

**Uji prioritas Multi-AI/Tim:** cold-start resume lintas AI, akun, dan orang; konkurensi dua aktor; kedaluwarsa klaim; integritas provenance; alur awal ZLCE utuh setelah pergantian aktor. Uji kompatibilitas Obsidian dilakukan di Fase 8.

Bedakan Automated, Manual, Device, Integration Test; semua dengan bukti. Jangan mengklaim kompatibilitas Android yang belum diuji pada tablet nyata.

---

# 8. ATURAN AI CODING AGENT & FORMAT LAPORAN

1. Baca dokumentasi sebelum mengubah apa pun; audit → rancang → implementasi.
2. Patuhi batas tulis tiap checkpoint; jangan ubah berkas tak terkait atau hapus fitur lama tanpa persetujuan.
3. Task atomik; satu IN_PROGRESS (untuk kerja tim, aturan mengikuti keputusan P2-CP2); tidak mengerjakan di luar lingkup.
4. Jangan mengubah Gerbang Kualitas ZLCE.
5. Catat WAL sebelum modifikasi multi-berkas; perbarui SESSION_STATE; buat handover sebelum sesi berakhir.
6. Jangan menyatakan DONE tanpa bukti; jangan menyembunyikan kegagalan uji; hasil AI bukan bukti.
7. Tanpa bukti → NOT VERIFIED. Ambigu desain → hentikan bagian terdampak dan minta keputusan.
8. Tanya pengguna satu per satu, dengan opsi dan rekomendasi.
9. Jangan melangkah ke checkpoint/track lain tanpa persetujuan eksplisit.

Setiap laporan memuat: ID checkpoint/task, tujuan, berkas diperiksa, berkas diubah, implementasi, pengujian, bukti, status, risiko tersisa, langkah berikutnya.

Laporan blueprint (P2-CP4) memakai urutan: **A** Audit · **B** Temuan Teknis · **C** Arsitektur · **D** Mekanisme PWA–Termux · **E** Storage & Sync · **F** Perubahan Struktur Repo · **G** Workflow · **H** Security · **I** Roadmap · **J** Hasil Review R1–R4 · **K** Open Decisions · **L** Rekomendasi kesiapan. Cukup ringkasan dengan tautan ke dokumen rinci; jangan menggandakan isi.

---

# 9. DOKUMENTASI DAN BANTUAN

## 9.1 Bantuan kontekstual saat diperlukan (just-in-time)

- Setiap fitur PWA membawa bantuan singkat sendiri: tip 3–5 baris pada pemakaian pertama atau lewat ikon bantuan, langkah singkat, dan penjelasan label risiko serta kode galat.
- **Knowledge base** berupa entri Markdown pendek (± 15 baris per entri) di repo: berversi, tersedia offline, dapat dicari, dan tertaut ke konteks (fitur, kode galat validator, label risiko template, kondisi Recovery A–D, pergantian AI/akun).
- Muncul saat diperlukan (mis. galat validator → entri penanganannya; Termux dihentikan → entri pemulihan), bukan dokumen panjang.
- Dibuat bersamaan dengan fiturnya sebagai bagian kriteria selesai task UI, tanpa menjadi fase tersendiri.

## 9.2 Dokumentasi dan tutorial lengkap — dikerjakan paling akhir (Fase 9)

Setelah fitur stabil: `docs/mobile/INSTALLATION.md`, `USER_GUIDE.md`, `TERMUX_SETUP.md`, `TROUBLESHOOTING.md` (termasuk pengaturan tablet: multi-window, izin penyimpanan, pembatasan baterai), tutorial kerja multi-AI/multi-akun/tim, dan setup Obsidian (setelah Fase 8). Perbarui README tanpa menghilangkan dokumentasi desktop. Susun dengan memakai ulang entri knowledge base.

---

# 10. HASIL AKHIR

Satu sistem ZLCE dengan dua lingkungan kerja — **Desktop** (pengembangan, konfigurasi, dokumentasi, arsitektur, uji/diagnostik) dan **Tablet Android** (task, context engineering, prompt, result capture, handover, recovery, Git sync) — dengan protokol, format dokumen, validator, aturan task, dan Gerbang Kualitas yang sama. Keduanya mendukung kerja tim dengan banyak akun dan banyak AI tanpa kehilangan konteks dan alur awal. ZLCE bukan sekadar dashboard; ia menjaga kesinambungan kerja manusia dan AI tanpa kehilangan konteks, keputusan, status, dan bukti.

---

# 11. PERINTAH MULAI

Kerjakan **P1-CP1 saja**. Setelah laporan ringkas, **BERHENTI** dan tunggu "Setujui P1-CP1". Jangan mengubah kode, membuat blueprint, atau memulai Track 2 sebelum persetujuan eksplisit.
