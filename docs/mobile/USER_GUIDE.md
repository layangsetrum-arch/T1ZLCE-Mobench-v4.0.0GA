# PANDUAN PENGGUNA & ALUR KERJA ESTAFET 8 ANGGOTA
## ZLCE Mobile Workbench v4.0.0 — Tablet Bersama Samsung Galaxy Tab A7 Lite (TASK-042 / TC-P8-02)

Dokumen ini memuat panduan operasional harian bagi 8 anggota tim estafet (*Relay Team*) yang menggunakan satu unit tablet fisik bersama Samsung Galaxy Tab A7 Lite (SM-T225).

---

## 1. STRUKTUR TIM ESTAFET & MODEL PROFIL ZERO-SECRET

Sesuai **ADR-04** dan **ADR-07**, sistem menggunakan 8 profil anggota tim yang telah didaftarkan dalam *Team Member Registry*. Tidak ada password, token, atau kredensial yang disimpan di tablet:

| Alias | Nama Lengkap | Peran Utama | Preferensi AI Model | Email Non-Kredensial |
| :--- | :--- | :--- | :--- | :--- |
| `eko` | Eko Siswanto | Lead Engineer & System Architect | Claude 3.5 Sonnet | `eko@zlce.internal` |
| `oned` | Oned Wiyono | Quality Assurance & Gate Keeper | Gemini 1.5 Pro | `oned@zlce.internal` |
| `cxperia` | Chris X. Peria | Mobile UI/UX & Tailwind Specialist | GPT-4o | `cxperia@zlce.internal` |
| `sulistiyani` | Sulistiyani | Technical Writer & Documentation | Claude 3.5 Sonnet | `sulistiyani@zlce.internal` |
| `layang` | Layang Seta | Core Logic & POSIX/Shell Engineer | DeepSeek-V3 | `layang@zlce.internal` |
| `acimau` | Acimau Dev | Test Automation & Regression Eng. | Qwen 2.5 Coder | `acimau@zlce.internal` |
| `kepek` | Kepek Aris | Security Auditor & Zero-Secret Officer | Claude 3.5 Sonnet | `kepek@zlce.internal` |
| `gete` | Gete Prakoso | Release Engineer & Deployment | Gemini 1.5 Flash | `gete@zlce.internal` |

### Cara Beralih Anggota di PWA:
1. Di bagian kanan atas Header PWA, ketuk tombol **Active Member Selector** (terdapat badge inisial dan nama).
2. Pilih profil Anda dari modal 8 anggota tim.
3. Status aktif seketika tersimpan di LocalStorage (`zlce_active_member_id`) dan semua aksi commit, generator prompt, serta pengesahan gerbang otomatis terikat ke identitas Anda.

---

## 2. ALUR KERJA ESTAFET 8 LANGKAH (THE 8-STEP DAILY RELAY WORKFLOW)

Setiap anggota tim yang memegang tablet wajib mengikuti alur 8 langkah berurutan:

```
[1. Ambil Tablet] ──> [2. Pilih Anggota & Cek Status] ──> [3. Klaim Task (1 Max)]
        │                                                               │
[8. Serah Terima & Clean-Auth] <── [7. Push Branch] <── [6. Validasi & Commit] <── [5. Eksekusi AI] <── [4. Rancang Context Pack]
```

### Rincian Alur 8 Langkah:

#### Langkah 1: Menerima Tablet & Verifikasi Fisik
- Nyalakan tablet, pastikan baterai mencukupi (>20%) atau sambungkan pengisi daya.
- Buka aplikasi **ZLCE Studio** dari Home Screen.
- Pastikan indikator status koneksi menunjukkan status PWA siap (ikon petir hijau).

#### Langkah 2: Mengaktifkan Profil & Memeriksa Kebenaran Tunggal
- Pilih nama Anda di **Active Member Selector**.
- Buka tab **SESSION_STATE** atau periksa widget **State Health** di Dashboard.
- Pastikan tidak ada task `IN_PROGRESS` yang tertinggal dari sesi sebelumnya, atau jika ada, periksa catatan serah terima di Bagian 6 `SESSION_STATE.md`.

#### Langkah 3: Mengklaim Task Baru (Aturan 1 Task IN_PROGRESS)
- Pilih task berikutnya yang berstatus `READY` di Matriks Task.
- Sesuai **ADR-04** dan **Invarian ZLCE**, hanya diperbolehkan **tepat 1 task** bertatus `IN_PROGRESS` di tablet bersama.
- Isi Bagian 3 (WAL - Write-Ahead Log) `SESSION_STATE.md` dengan rencana langkah atomik sebelum menyunting berkas apa pun.

#### Langkah 4: Merancang Portable Context Pack
- Buka tab **Context Pack** di navigasi bawah/samping.
- Pilih task aktif yang baru saja diklaim.
- Pilih profil model AI target (misal: *Claude 30K*, *Gemini 1M*, atau *ChatGPT Compact*).
- Sistem otomatis menyesuaikan anggaran token (*Token Budget Adapter*) dan memangkas log lampiran usang (*Smart Pruning*).
- Ketuk tombol **1-Ketuk Salin Context Pack** (target sentuh nyaman 44px+).

#### Langkah 5: Berpindah ke Browser AI & Eksekusi Prompt
- Beralih ke Google Chrome atau aplikasi peramban AI (Claude / ChatGPT / Gemini web).
- Tempelkan (*paste*) Context Pack lengkap ke jendela percakapan AI baru (*Cold-Start Conversation*).
- Tunggu hingga AI selesai memberikan jawaban kode dan pembaruan berkas.
- Salin kode hasil eksekusi AI ke clipboard.

#### Langkah 6: Result Capture, Terapkan Perubahan & Validasi
- Kembali ke PWA ZLCE Studio. PWA otomatis memulihkan state dari LocalStorage berkat proteksi LMK.
- Buka tab **Result Capture** untuk memvalidasi keluaran dan menyuntikkan metadata provenance otomatis (`[Aktor, AI Model, Timestamp, Task ID]`).
- Simpan perubahan berkas ke disk proyek.
- Buka Termux, masuk ke folder repositori (`cdp` atau `cd ~/projects/zlce-mobile-workbench`).
- Jalankan validasi kanonik:
  ```bash
  zlce check
  ```
  *Wajib mendapatkan: `RESULT: OK (0 error, 0 warn)`.*

#### Langkah 7: Buat Branch Khusus Task, Commit & Push
- Buat branch khusus task:
  ```bash
  git checkout -b task/TASK-xxx
  ```
- Lakukan commit beridentitas otomatis tanpa mengubah config global:
  ```bash
  git commit -c user.name="Nama Anda" -c user.email="email@zlce.internal" -m "feat(scope): implementasi TASK-xxx"
  ```
- Push ke remote:
  ```bash
  git push origin task/TASK-xxx
  ```
  *(Masukkan kredensial jika diminta; token akan tersimpan sementara di RAM selama maks 15 menit melalui git credential-cache).*

#### Langkah 8: Serah Terima Tablet & Eksekusi `clean-auth`
- Tandai task menjadi `DONE` di `SESSION_STATE.md` dengan menyertakan bukti dan format persetujuan:
  `ya (oleh: Nama Anda)`
- Buka modal **Device Handover Wizard** di Header PWA.
- Jalankan checklist 4 langkah serah terima:
  1. Catatan sesi diperbarui di Bagian 6 `SESSION_STATE.md`.
  2. Perubahan ter-push ke branch repositori.
  3. Pembersihan RAM Termux via script:
     ```bash
     zlce clean-auth
     ```
  4. Tutup tab peramban eksternal untuk menghemat RAM.
- Serahkan tablet fisik ke anggota estafet berikutnya dalam keadaan bersih!

---

## 3. PANDUAN PENGGUNAAN COMMAND HUB & 1-TAP COPY

Antarmuka **Command Hub** menyediakan 10 template perintah bersertifikasi aman:
- **Badge Hijau (🟢 SAFE):** Perintah read-only/diagnostik seperti `zlce check`, `git status`, dan `git log`. Bebas dijalankan kapan saja.
- **Badge Kuning (🟡 MUTATING):** Perintah perubahan terkontrol seperti `git commit`, `git checkout -b`, atau `zlce snapshot`.
- **Badge Merah (🔴 DESTRUCTIVE):** Perintah berbahaya seperti `git reset --hard` atau `git push --force`. Sistem v4.0.0 secara ketat memblokir tombol eksekusi langsung perintah destruktif tanpa konfirmasi ganda.

Gunakan tombol **Salin Perintah** untuk menyalin perintah ke clipboard dan langsung tempelkan di Termux.

---

## 4. RESOLUSI KONFLIK PERCABANGAN ANTAR-ANGGOTA

Jika saat melakukan sinkronisasi terjadi konflik (*merge conflict*):
1. PWA **GitSyncTab** menyediakan **Conflict Resolution Wizard**.
2. Salin pesan error dari terminal Termux dan tempelkan ke form deteksi konflik di PWA.
3. Wizard akan menunjukkan berkas yang berkonflik dan panduan membuka editor `micro`:
   ```bash
   micro nama_berkas_konflik.md
   ```
4. Bersihkan penanda konflik (`<<<<<<<`, `=======`, `>>>>>>>`), simpan (`Ctrl+S`), dan keluar (`Ctrl+Q`).
5. Validasi ulang sebelum commit:
   ```bash
   zlce check
   ```

---

## 5. TIPS EFISIENSI MEMORI RAM 3GB DI TABLET ANDROID

Samsung Galaxy Tab A7 Lite memiliki RAM 3GB yang dibagi bersama GPU dan sistem One UI. Untuk mencegah penutupan paksa aplikasi oleh Android Low Memory Killer (LMK):
1. **Maksimal 1 Tab Tambahan:** Jangan membuka lebih dari 2 tab di Google Chrome (cukup tab PWA ZLCE dan tab Web AI aktif).
2. **Tutup Aplikasi Latar Belakang:** Selalu ketuk tombol *Recent Apps* Android dan bersihkan aplikasi YouTube, media sosial, atau game saat sesi kerja dimulai.
3. **Nol Daemon:** Jangan pernah menjalankan script perulangan tanpa henti (`while true; do ... sleep 1; done`) atau server Node di Termux.
4. **Debounce 400ms Aman:** Ketikan Anda di Workspace Editor otomatis aman tersimpan ke LocalStorage setiap 400ms jeda ketik, sehingga Anda tidak perlu khawatir kehilangan data saat beralih ke Termux.

---

## 6. PANDUAN PENGAMANAN & REMEDIASI AUDIT (AUD-001 s/d AUD-014)

Sistem ZLCE v4.0.0 dilengkapi pengaman mutlak hasil audit eksternal:
1. **Pre-Commit Hook Mandatori (AUD-001):** Jalankan `bash scripts/install-hooks.sh` saat penyiapan repositori pertama kali di Termux untuk memasang git hook otomatis yang memblokir commit jika terdeteksi secret/token GitHub.
2. **Partisi Multi-User Otomatis (AUD-005):** Draft editor otomatis disimpan terpisah per anggota (`zlce_workspace_draft_content_[memberId]`). Saat berpindah anggota, draft anggota lain tidak akan terhapus atau tertimpa.
3. **Eksklusivitas Klaim Task & Takeover (AUD-006):** Aturan ketat 1 task `IN_PROGRESS`. Jika perlu mengambil alih tugas anggota lain yang berhalangan, gunakan wizard takeover dengan menyertakan alasan transparan minimal 5 karakter untuk jejak audit.
4. **Penulisan Transaksional Double-Buffering (AUD-007):** Setiap penyimpanan sesi menggunakan mekanisme staging buffer dan checksum DJB2a 32-bit untuk mencegah korupsi data saat tablet kehabisan baterai mendadak.
5. **Verifikasi Tekanan Fisik LMK (AUD-004):** Untuk memverifikasi kesiapan pemulihan sesi Android, gunakan skrip `bash scripts/test-lmk-physical.sh --verify-only` atau uji alokasi bertahap di Termux.
6. **Alur Git Non-Destruktif (AUD-009):** Gunakan template aman `CMD-GIT-05` (pull `--ff-only`), `CMD-GIT-06` (safe stash & pull), dan `CMD-GIT-07` (branch delete aman `-d`). Dilarang keras menggunakan `--force` atau `branch -D`.

