# ZLCE Termux CLI Dispatcher (`zlce`)

Panduan konfigurasi dan penggunaan CLI dispatcher `zlce` pada lingkungan **Termux** (tablet Android Samsung Galaxy Tab A7 Lite SM-T225) dan lingkungan workstation pendukung.

Rujukan teknis: `docs/mobile/blueprint/04_TERMUX_INTEGRATION.md` & `docs/mobile/blueprint/13_COMMAND_TEMPLATES.md`.

---

## 1. Pemasangan Symlink Termux

Agar perintah `zlce` dapat dipanggil dari sembarang direktori di terminal Termux tanpa mengetikkan path lengkap:

```bash
# 1. Pastikan folder ~/bin ada dan terdaftar di PATH
mkdir -p "$HOME/bin"

# 2. Buat symlink executable ke skrip dispatcher repositori
ln -sf "$HOME/ZLCE_REPO_DIR/scripts/zlce/zlce" "$HOME/bin/zlce"

# 3. Beri izin eksekusi
chmod +x "$HOME/bin/zlce"

# 4. Tes pemanggilan
zlce help
```

*(Ganti `$HOME/ZLCE_REPO_DIR` dengan direktori clone repositori aktif).*

---

## 2. Daftar Subperintah Resmi (Allowlist)

Dispatcher menerapkan proteksi injeksi dan pembatasan allowlist ketat:

| Subperintah | Perintah Asli / Fungsi | Kategori Risiko |
| :--- | :--- | :--- |
| `zlce check` | `python3 scripts/zlce-check.py .` | Aman (Read-only) |
| `zlce snapshot` | `bash scripts/zlce/zlce-snapshot.sh` | Aman (Read-only / Log) |
| `zlce collect` | `python3 scripts/zlce-collect.py .` | Aman (Export ZIP) |
| `zlce pull` | `git fetch origin && git checkout -B <branch> origin/<branch> --ff-only` | Perubahan Berkas |
| `zlce push` | `git push origin <branch-aktif>` | Perubahan Berkas |
| `zlce clean-auth` | `git credential-cache exit` (Zero-Secret cleanup) | Aman / Proteksi |

---

## 3. Contoh Penggunaan Alur Kerja Mobile

```bash
# 1. Verifikasi konsistensi sebelum commit
zlce check

# 2. Ambil snapshot pemulihan darurat jika AI terputus
zlce snapshot --diff

# 3. Pembersihan kredensial saat pergantian giliran anggota (Device Handover)
zlce clean-auth
```
