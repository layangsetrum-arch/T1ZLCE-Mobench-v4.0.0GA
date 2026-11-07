# ZLCE Mobile Workbench — Keputusan P2-CP2 (Tablet Bersama)

Catatan keputusan pengguna untuk checkpoint P2-CP2, berdasarkan Master Prompt v5. Dokumen ini adalah masukan untuk AI agent, bukan keputusan final arsitektur.

## Koreksi atas asumsi sebelumnya

- Sebelumnya diasumsikan tiap anggota menyimpan kredensial Git di Termux masing-masing. Itu tidak berlaku lagi: tabletnya satu untuk 8 orang. Ini sekarang **risiko keamanan terbesar** proyek, karena 8 akun GitHub dan 8 akun AI dipakai di satu perangkat.
- Sebelumnya disarankan multi-window dan tata letak dua panel. Anggota memakai satu aplikasi pada satu waktu, jadi alurnya berpindah aplikasi bergantian dan multi-window tidak dijadikan syarat. Pola ini cocok dengan RAM tablet yang terbatas.

## Blok P2-CP2 (untuk ditempel ke AI)

```
KEPUTUSAN PENGGUNA UNTUK P2-CP2 (jangan tanya ulang)

Perangkat: 1 tablet Samsung Galaxy Tab A7 Lite SM-T225 (8,7") dipakai bergantian
oleh 8 anggota. Tanpa keyboard eksternal (semua input lewat keyboard layar).
Aplikasi TIDAK dijalankan bersamaan: alur kerja berpindah aplikasi satu per satu
(PWA -> salin -> Termux/browser AI -> kembali). Jangan mengasumsikan multi-window.

Tim: 8 anggota, estafet (1 sampai beberapa task per anggota, dioper antar anggota
di AI yang sama atau berbeda), tiap anggota memakai akun AI dan akun GitHub sendiri.
Semua anggota boleh menyetujui Gerbang (persetujuan dicatat dengan nama pemberi).

Repo GitHub: preferensi pengguna = 1 repo utama + 7 fork (clone dari repo utama).
Analisis dan bandingkan dengan alternatif (satu repo + branch per task; repo
masing-masing), termasuk dampaknya pada estafet.

Penamaan versi: SemVer, tag berawalan "v". Track 1 selesai = v3.3.0.
Track 2 = v4.0.0-alpha.N / beta.N / rc.N lalu v4.0.0. Obsidian = v4.1.0.
Baseline asli = baseline-3.22-asli.

Wajib dianalisis karena tablet bersama:
- Isolasi identitas dan kredensial antar anggota (akun GitHub, akun AI, sesi browser).
- Pergantian anggota aktif di PWA dan identitas Git yang benar pada setiap commit.
- Letak clone: satu clone per anggota atau satu clone dengan identitas bergantian.
- Serah terima perangkat: apa yang harus ditutup/keluar saat berganti orang.

Belum diketahui (verifikasi di perangkat): versi Android aktual, RAM, penyimpanan
bebas, dukungan multi-user Android, sumber instal Termux.
```

## Yang akan dianalisis AI di P2-CP2 (masukan, bukan keputusan)

### 1. Isolasi identitas di tablet bersama

Tiga pendekatan yang perlu dibandingkan:

- **Multi-user Android**, satu profil per anggota. Isolasinya terkuat, tetapi dukungan di Tab A7 Lite perlu dicek di perangkat.
- **Satu pengguna dengan prosedur serah terima:** keluar dari akun, menghapus sesi, dan mengganti identitas Git.
- **Opsi di antaranya**, misalnya Secure Folder. Perilaku Termux per profil perlu dicek di perangkat.

Menyimpan 8 token GitHub di satu Termux tanpa isolasi adalah opsi paling berisiko. Prompt sudah melarang token di repo, prompt, dan log.

### 2. Identitas pada commit

Jika commit memakai identitas orang lain, provenance dan jejak persetujuan Gerbang ikut salah. Karena itu PWA perlu konsep **anggota aktif** yang mengisi template Git.

### 3. Fork vs satu repo

Ini bukan keputusan yang jelas-jelas lebih baik, jadi AI diminta menimbangnya:

- Fork melindungi `main` dan cocok untuk review.
- Estafet jadi lebih berat: anggota berikutnya harus mengambil pekerjaan dari fork anggota sebelumnya atau lewat PR sebelum bisa melanjutkan.
- Satu repo dengan branch per task dan proteksi `main` lebih sederhana untuk serah terima.
- Varian hibrida mungkin layak: repo utama sebagai sumber kebenaran, dengan fork hanya untuk anggota yang belum dipercaya menulis langsung.

### 4. Semua boleh menyetujui Gerbang

Ini aturan pengguna dan dicatat dengan nama. AI boleh menawarkan opsi tambahan, misalnya anggota tidak menyetujui hasil kerjanya sendiri. Itu hanya opsi; keputusan tetap pada pengguna.

### 5. Satu tablet berarti tidak ada konkurensi di perangkat

Konflik tetap muncul di Git antar clone atau fork. Skenario uji konkurensi di prompt tetap relevan, tetapi fokusnya bergeser ke merge dan serah terima.

## Yang masih terbuka

- Apakah anggota memakai perangkat lain (PC atau ponsel) di luar tablet ini untuk AI atau Git. Jika ya, sampaikan ke AI saat P2-CP2 karena itu mengubah analisis konkurensi.
- Versi Android aktual, RAM, penyimpanan bebas, dukungan multi-user, dan sumber instal Termux: verifikasi di perangkat.
