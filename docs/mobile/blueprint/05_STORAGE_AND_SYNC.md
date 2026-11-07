# BLUEPRINT 05: PENYIMPANAN & PROTOKOL SINKRONISASI
## Topologi Sistem Berkas, Manajemen Multi-Proyek & Siklus Git Aman di Android

Tanggal: 2026-11-04  
Status: **DRAFT BLUEPRINT (BATCH 1)**  
Rujukan Dokumen: `docs/mobile/FEASIBILITY_AND_DECISIONS.md` & `14_MULTI_AI_TEAM_MODEL.md`

---

## 1. TOPOLOGI PENYIMPANAN DI TABLET ANDROID

```
[ ANDROID SANDBOX HIERARCHY ]
│
├── Termux Private Storage (/data/data/com.termux/files/home/)
│   ├── ~/projects/
│   │   ├── proyek-a/ (Git repo, Python scripts, source code, tests)
│   │   └── proyek-b/
│   └── ~/.gitconfig (credential cache timeout = 900s)
│
├── Browser Storage Sandbox (Chrome / PWA Cache)
│   ├── Cache Storage: PWA Shell (HTML, CSS, JS bundle, icons)
│   ├── LocalStorage:
│   │   ├── zlce_active_member (Profil anggota aktif)
│   │   ├── zlce_projects_registry (Daftar nama & path proyek)
│   │   ├── zlce_session_raw_markdown (Draft aktif)
│   │   └── zlce_session_history (Snapshot 35 riwayat)
│
└── Shared Storage (/storage/emulated/0/ atau /sdcard/)
    ├── Download/ (Tujuan ekspor berkas SESSION_STATE.md dari PWA)
    └── ZLCE_Export/ (Folder cadangan berkas Markdown bila diekspor)
```

### Mengapa Repositori di Termux Home:
1. **Dukungan POSIX File Permissions:** Sistem berkas ext4 bawaan Termux mendukung `chmod +x` sehingga skrip shell `zlce-snapshot.sh` dapat langsung dieksekusi.
2. **Kecepatan Operasi Git:** Git beroperasi di atas memori internal Linux tanpa overhead lapisan emulasi FUSE Android.
3. **Pencegahan Error Git:** Menghindari error `dubious ownership` yang umum terjadi bila repo ditaruh di shared storage FAT/FUSE.

---

## 2. MANAJEMEN MULTI-PROYEK (PROJECT REGISTRY)

PWA menyediakan **Project Switcher** yang memungkinkan anggota tim mengelola beberapa proyek yang sedang berjalan:
- **Registry Skema di LocalStorage (`zlce_projects_registry`):**
  ```json
  [
    {
      "id": "proj-todo-api",
      "name": "Todo API Service",
      "termuxPath": "~/projects/T1ZLCE-Mobench-v4.0.0GA",
      "mode": "FULL",
      "gitRemote": "https://github.com/layangsetrum-arch/T1ZLCE-Mobench-v4.0.0GA.git",
      "activeBranch": "v4-mobile",
      "lastAccessed": 1730700000000
    }
  ]
  ```
- Saat proyek diganti di antarmuka, draft `SESSION_STATE.md`, riwayat snapshot, dan template perintah otomatis beralih ke proyek yang dipilih.

---

## 3. PROTOKOL SINKRONISASI GIT AMAN (SAFE GIT SYNC)

Sesuai struktur yang disetujui (**Satu Repositori Bersama + Branch per Task**), protokol Git diatur dengan disiplin ketat guna mencegah *lost updates*:

### 3.1 Template Tarik Aman (Safe Pull)
Sebelum memulai task baru, anggota tim menarik pembaruan dari remote menggunakan aturan fast-forward only:
```bash
git fetch origin
git checkout -b task/TASK-XXX origin/main
# Untuk sinkronisasi fast-forward pada cabang aktif:
git pull --ff-only origin task/TASK-XXX
```
- Jika ada divergensi yang membutuhkan merge, Git menolak eksekusi otomatis tanpa intervensi sadar anggota tim.

### 3.2 Template Dorong Atomik (Atomic Push)
Setelah task selesai diverifikasi dan disetujui:
```bash
git add SESSION_STATE.md [daftar_file_di_WAL]
git -c user.name="[Nama]" -c user.email="[Email]" commit -m "[TASK-ID]: [deskripsi]"
git push origin task/TASK-XXX
```
- Anggota tim **DILARANG** melakukan `git push --force` ke remote bersama.
- Penggabungan ke cabang `main` dilakukan melalui GitHub Pull Request setelah seluruh acceptance criteria dan pengujian terpenuhi.

---

## 4. KETAHANAN TERHADAP PEMUTUSAN PROSES OLEH ANDROID LMK

Untuk mengantisipasi Android Low Memory Killer (LMK) yang dapat mematikan Termux atau peramban PWA saat berpindah aplikasi:
1. **Transaksional State di PWA:** Setiap perubahan visual atau form di PWA otomatis tersimpan ke `localStorage` (debounce 400ms). Jika peramban tertutup paksa, membuka kembali PWA akan langsung memulihkan teks sesi persis di titik terakhir.
2. **Git Working Tree di Termux:** Git menyimpan objek commit secara transaksional di `.git/objects`. Jika Termux dimatikan saat menjalankan tes, status berkas tetap aman dan dapat diperiksa via `git status`.
3. **Protokol Pemulihan Kasus A–D:** Bila terjadi ketidaksesuaian antara apa yang tertulis di WAL dan working tree git akibat aplikasi tertutup paksa, tab **Recovery** ZLCE memandu penyelesaian secara deterministik.
