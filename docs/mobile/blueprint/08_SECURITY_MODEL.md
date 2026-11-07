# BLUEPRINT 08: MODEL KEAMANAN & ISOLASI KREDENSIAL
## Proteksi Ancaman Tablet Bersama (8 Anggota), Zero-Secret Policy & Mitigasi Celah

Tanggal: 2026-11-04  
Status: **DRAFT BLUEPRINT (BATCH 3)**  
Rujukan Dokumen: `docs/mobile/FEASIBILITY_AND_DECISIONS.md`, `14_MULTI_AI_TEAM_MODEL.md`

---

## 1. MODEL ANCAMAN TABLET BERSAMA (SHARED TABLET THREAT MODEL)

Penggunaan 1 tablet Samsung Galaxy Tab A7 Lite secara bergantian oleh 8 anggota tim memunculkan vektor ancaman spesifik yang harus dimitigasi:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   VEKTOR ANCAMAN TABLET BERSAMA                        │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Pembajakan Kredensial Git (Anggota B memakai token GitHub Anggota A)│
│ 2. Polusi Identitas Commit (Commit tertulis atas nama orang lain)     │
│ 3. Pembajakan Sesi AI (Anggota B memakai kuota/riwayat AI Anggota A)  │
│ 4. Kebocoran Rahasia ke Berkas Repositori / Log / Markdown             │
│ 5. Eksploitasi Command Injection saat Salin-Tempel Perintah ke Termux  │
│ 6. Pencurian Clipboard oleh Aplikasi Pihak Ketiga di Android           │
│ 7. Risiko Kehilangan atau Pencurian Fisik Tablet                       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. ATURAN ZERO-SECRET TANPA KOMPROMI (ZERO-SECRET POLICY)

1. **Dilarang Keras Menyimpan Rahasia:**
   - Dilarang menyimpan kata sandi (*password*), Personal Access Token (PAT) GitHub, kunci API AI (*API keys*), cookie autentikasi, atau token privat di:
     - Dokumen Markdown (`SESSION_STATE.md`, `TASKS.md`, `BLUEPRINT.md`, dsb.).
     - Prompt masukan atau luaran peramban AI.
     - Riwayat shell terminal (`~/.bash_history` di Termux).
     - Riwayat commit git atau pesan commit.
2. **Registry Akun Non-Rahasia:**
   - Registry akun AI di PWA hanya memuat **metadata publik**: Nama alias (misal: `Akun-Claude-Budi`), penyedia (`Anthropic`), model (`Claude 3.5 Sonnet`), tanggal reset kuota token, dan kuota request gratis. Tidak ada field untuk API key atau password.

---

## 3. MANAJEMEN KREDENSIAL GITHUB PADA TERMUX

Untuk mencegah anggota tim memakai atau mencuri token GitHub anggota lain:

```
[ Anggota Aktif di PWA ]
          │
          ▼ (Template Perintah Git)
`git -c user.name="Budi" -c user.email="budi@dev.id" commit ...`
          │
          ▼ (Eksekusi Push di Termux)
`git push origin task/TASK-002`
          │
          ├──> Meminta PAT GitHub (Disimpan di RAM max 15 menit)
          │    `git config --global credential.helper 'cache --timeout=900'`
          │
          └──> Selesai Sesi -> Eksekusi Handover:
               `git credential-cache exit` (RAM Token Terhapus Instan)
```

- **Pilihan Alternatif SSH Key Per-Anggota:**
  Bila tim memilih otentikasi SSH, setiap anggota memiliki kunci privat berpasfrase:
  `~/.ssh/id_ed25519_anggota1`, `~/.ssh/id_ed25519_anggota2`.
  Template Git dari PWA otomatis menyertakan variabel `GIT_SSH_COMMAND="ssh -i ~/.ssh/id_ed25519_anggotaN"`.

---

## 4. PENCEGAHAN COMMAND INJECTION PADA COMMAND HUB

Karena perintah disalin dari antarmuka web PWA dan ditempelkan ke terminal Bash Termux:
1. **Sanitasi Masukan:**
   - Seluruh variabel dinamis (nama task, pesan commit, path file) dibersihkan dari karakter berbahaya: backtick (`` ` ``), dolar (`$`), backslash (`\`), dan titik koma (`;`).
2. **Pengutipan Ketat (Strict Shell Quoting):**
   - Parameter selalu dibungkus dengan tanda kutip ganda ter-escape:
     `git commit -m "TASK-001: setup initial repository"`
3. **Allowlist Subperintah Dispatcher:**
   - Skrip dispatcher `zlce` hanya mengizinkan subperintah: `check`, `snapshot`, `collect`, `pull`, `push`, `clean-auth`.
   - Perintah destruktif seperti `rm -rf`, `reset --hard`, dan `push --force` **TIDAK ADA** di katalog bawaan.

---

## 5. KEAMANAN CLIPBOARD ANDROID

- Pada sistem operasi Android, clipboard sistem dapat dibaca oleh aplikasi lain yang memiliki izin clipboard.
- **Aturan Keamanan:**
  - PWA **hanya menyalin instruksi prompt, teks Markdown status, dan perintah CLI**.
  - PWA **tidak pernah menaruh token, password, atau rahasia ke dalam clipboard**.

---

## 6. PROTOKOL PENCABUTAN BILA TABLET HILANG (DEVICE REVOCATION PROTOCOL)

Bila tablet fisik hilang atau dicuri:
1. Setiap anggota segera membuka akun GitHub di perangkat lain (PC/ponsel) -> Masuk ke **Settings -> Developer settings -> Personal access tokens** -> Klik **Revoke** pada token yang pernah dipakai di tablet.
2. Cabut sesi login peramban di portal Google, Anthropic, atau OpenAI (fitur *Sign out from all devices*).
3. Karena repositori lokal di Termux tidak menyimpan token permanen, pencuri tidak dapat melakukan manipulasi kode atau push ke GitHub.
