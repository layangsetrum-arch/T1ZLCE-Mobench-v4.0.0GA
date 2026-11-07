# BLUEPRINT 13: KATALOG TEMPLATE PERINTAH (COMMAND TEMPLATES)
## Desain Perintah Terstruktur, Label Risiko, Binding Konteks & Sanitasi Eksekusi

Tanggal: 2026-11-04  
Status: **DRAFT BLUEPRINT (BATCH 3)**  
Rujukan Dokumen: `docs/mobile/FEASIBILITY_AND_DECISIONS.md`, `04_TERMUX_INTEGRATION.md`

---

## 1. STRUKTUR DATA KATALOG PERINTAH (SCHEMA DEFINITION)

Setiap template perintah disimpan sebagai data berversi di dalam repositori (bukan hardcoded di komponen UI) agar dapat diperbarui melalui Git:

```typescript
export type CommandRiskLevel = 'safe' | 'mutating' | 'destructive';

export interface CommandTemplate {
  id: string;
  category: 'git' | 'validator' | 'recovery' | 'handover';
  title: string;
  description: string;
  riskLevel: CommandRiskLevel;
  directCommand: string;       // Perintah Bash/CLI langsung
  dispatcherCommand?: string;  // Format singkat bila dispatcher 'zlce' terpasang
  requiredParams: string[];    // Parameter yang wajib terisi otomatis dari state
}
```

---

## 2. LABEL TINGKAT RISIKO (RISK LABELS)

| Label Risiko | Ikon UI | Definisi | Kebijakan Eksekusi |
| :---: | :---: | :--- | :--- |
| **🟢 SAFE (Read-Only)** | `ShieldCheck` | Perintah hanya membaca status sistem berkas atau Git tanpa mengubah berkas apa pun (misal: `status`, `diff`, `check`). | Bebas disalin dan dijalankan kapan saja. |
| **🟡 MUTATING (Write)** | `AlertTriangle` | Perintah mengubah berkas atau membuat commit baru di Git (misal: `add`, `commit`, `checkout -b`). | Ditampilkan dengan warna kuning; parameter divalidasi ketat sebelum disalin. |
| **🔴 DESTRUCTIVE (High-Risk)** | `XCircle` | Perintah berpotensi menghapus kode tanpa bisa di-undo (misal: `reset --hard`, `push --force`, `rm -rf`). | **DIKELUARKAN DARI KATALOG BAWAAN.** Bila kelak diperlukan pada protokol darurat, wajib melalui modal konfirmasi ganda di UI. |

---

## 3. ATURAN BINDING PARAMETER & SANITASI PENCEGAHAN INJECTION

Parameter dinamis diikat secara otomatis (*auto-bound*) dari status proyek dan profil anggota aktif di PWA:

| Nama Parameter | Sumber Nilai di PWA | Aturan Sanitasi |
| :--- | :--- | :--- |
| `{ACTIVE_TASK_ID}` | `stateData.status.activeTask` | Regex strict: `/^TASK-(?:REV-)?\d+$/` |
| `{MEMBER_NAME}` | Profil aktif di `ActiveMemberSelector` | Escape kutip ganda, tolak karakter `$`, `` ` ``, `\` |
| `{MEMBER_EMAIL}` | Profil aktif di `ActiveMemberSelector` | Format email valid, tolak spasi dan karakter shell |
| `{COMMIT_MESSAGE}` | Input pengguna di Command Hub | Escape kutip ganda, tolak tanda titik koma (`;`) |
| `{TOUCHED_FILES}` | `stateData.wal.plannedFiles` | Daftar path dipisahkan spasi; path divalidasi relatif terhadap root |

---

## 4. DAFTAR KATALOG PERINTAH KANONIK (CANONICAL CATALOG)

### 4.1 Kategori Validator & Diagnostik
1. **CMD-VAL-01: Validasi Status ZLCE (Lokal)**
   - **Risiko:** 🟢 SAFE
   - **Perintah Langsung:** `python3 scripts/zlce-check.py .`
   - **Format Dispatcher:** `zlce check`
   - **Fungsi:** Memvalidasi matriks `SESSION_STATE.md`, dependensi, dan WAL.
2. **CMD-VAL-02: Validasi Mode Ketat (Strict Check)**
   - **Risiko:** 🟢 SAFE
   - **Perintah Langsung:** `python3 scripts/zlce-check.py . --strict`
   - **Format Dispatcher:** `zlce check --strict`
   - **Fungsi:** Menganggap peringatan (*warning*) sebagai error (syarat lulus Gerbang 3).
3. **CMD-VAL-03: Snapshot Status Pemulihan**
   - **Risiko:** 🟢 SAFE
   - **Perintah Langsung:** `bash scripts/zlce-snapshot.sh --diff`
   - **Format Dispatcher:** `zlce snapshot --diff`
   - **Fungsi:** Menghasilkan ringkasan git dan diff untuk sesi AI baru saat crash.

### 4.2 Kategori Sinkronisasi Git
4. **CMD-GIT-01: Periksa Status Working Tree**
   - **Risiko:** 🟢 SAFE
   - **Perintah Langsung:** `git status --short`
   - **Fungsi:** Memeriksa berkas yang berubah sebelum melakukan serah terima.
5. **CMD-GIT-02: Tarik Pembaruan Cabang Aman (Safe Fetch & Checkout)**
   - **Risiko:** 🟡 MUTATING
   - **Perintah Langsung:**  
     `git fetch origin && git checkout -b task/{ACTIVE_TASK_ID} origin/main --ff-only`
   - **Fungsi:** Membuat branch kerja baru dari origin/main untuk memulai task.
6. **CMD-GIT-03: Commit Atomik dengan Atribusi Anggota Aktif**
   - **Risiko:** 🟡 MUTATING
   - **Perintah Langsung:**  
     `git add SESSION_STATE.md {TOUCHED_FILES}`  
     `git -c user.name="{MEMBER_NAME}" -c user.email="{MEMBER_EMAIL}" commit -m "{ACTIVE_TASK_ID}: {COMMIT_MESSAGE}"`
   - **Fungsi:** Mencatat commit atomik dengan atribusi nama anggota yang benar.
7. **CMD-GIT-04: Dorong Cabang Task ke GitHub Bersama**
   - **Risiko:** 🟡 MUTATING
   - **Perintah Langsung:** `git push origin task/{ACTIVE_TASK_ID}`
   - **Format Dispatcher:** `zlce push`
   - **Fungsi:** Mendorong cabang task ke repositori bersama.

### 4.3 Kategori Serah Terima Tablet (Device Handover)
8. **CMD-AUTH-01: Bersihkan Kredensial RAM Termux**
   - **Risiko:** 🟢 SAFE
   - **Perintah Langsung:** `git credential-cache exit 2>/dev/null || true`
   - **Format Dispatcher:** `zlce clean-auth`
   - **Fungsi:** Menghapus Personal Access Token GitHub dari memori RAM sebelum tablet dioper ke anggota berikutnya.
