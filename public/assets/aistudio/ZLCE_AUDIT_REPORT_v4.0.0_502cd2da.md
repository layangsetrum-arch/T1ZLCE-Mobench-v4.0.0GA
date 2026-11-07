# LAPORAN AUDIT & REVIEW TEKNIS: [CLAUDE 5.5 SONNET]
Tanggal Audit: 2026-11-07 (jam mengikuti mandat, 06:48 WIB)
Skor Kesiapan Produksi: 58 / 100

Objek: ZLCE Mobile Workbench v4.0.0 — bundel `zlce-audit-review-bundle-1.zip`
Cabang acuan: `v4-mobile` | Perangkat acuan: Samsung Galaxy Tab A7 Lite (SM-T225, 3 GB)

## A. RINGKASAN EKSEKUTIF

**Batasan verifikasi.** Audit dilakukan di sandbox Linux tanpa jaringan, tanpa `node_modules`, tanpa perangkat SM-T225, dan tanpa runtime React. Temuan berlabel **[TERVERIFIKASI]** saya reproduksi lewat eksekusi. Temuan berlabel **[STATIS]** berasal dari pembacaan kode dan belum dijalankan. Kegagalan `tsc` dan paket npm di sandbox tidak dihitung sebagai cacat proyek. Hanya `ERR_MODULE_NOT_FOUND` untuk berkas yang memang tidak ada di zip yang dihitung.

**Temuan utama.** Desain dan disiplin proses kuat: allowlist dispatcher, WAL di `SESSION_STATE.md`, flush pada `visibilitychange`/`pagehide`, dan checksum staging. Tetapi klaim verifikasi tidak dapat direproduksi dari bundel yang diserahkan. Dari zip, `run-tests.py` keluar dengan exit 1, melaporkan `RESULT: 32 TEST(S) FAILED`, dan hanya 11 langkah lulus. Sebabnya 11 import relatif tidak terselesaikan (Temuan #1). Mandat menyebut 32/32 PASS dan 43 task. Runner mencetak `44/44` secara hardcode dengan banner `v3.2.2`, dan `zlce-check` pada bundel membaca 60 task (Temuan #2). Beberapa tes bersifat tautologis, misalnya TC-P7-04 yang hanya men-grep kata `PASS` di dokumen (Temuan #3).

**Risiko keamanan dan keandalan.** Dua cacat keamanan nyata ada di jalur kerja harian. Pertama, pembangun perintah commit menerima argumen `git add --force *` dan keluar dari kutip lewat nama anggota; hasilnya saya reproduksi (Temuan #4). Kedua, isolasi draft antaranggota di tablet bersama secara statis rusak oleh stale closure dan fallback ke key global (Temuan #5). Kontrol Zero-Secret tidak menemukan kebocoran di bundel, tetapi cakupannya lebih sempit dari yang diklaim (Temuan #7, #8, #9). `zlce pull` selalu gagal (exit 129) dan, jika "diperbaiki" dengan membuang `--ff-only`, akan menghapus commit lokal yang belum di-push (Temuan #6). Tidak ada temuan yang dinilai CRITICAL: tidak ada kebocoran secret terverifikasi dan tidak ada eksploit jarak jauh. Kelayakan tablet 3 GB belum terbukti karena belum ada bukti fisik; skrip uji LMK tidak punya asersi dan dokumen mengklaim mekanisme Android yang tidak akurat (Temuan #11).

## B. MATRIKS EVALUASI PILAR ARSITEKTUR

| Pilar Arsitektur | Status | Catatan Kritis & Bukti |
| :--- | :--- | :--- |
| Zero-Secret & Security Model | CONCERN | `security-audit.sh` 6/6 PASS setelah `chmod +x` pada hasil ekstraksi, 0 secret ditemukan. Regex AUDIT 4 buta terhadap kutip tunggal (`token: 'abc12345'` → rc=1). `.git` dan `*.zip` dikecualikan dari scan. Label "PWA Storage" hanya men-grep `teamMembers.ts`. `unset GIT_*` di `clean-auth.sh` tidak berefek (`parent masih: leak`). Zip kehilangan bit eksekusi sehingga AUDIT 5 gagal pada ekstraksi baru. |
| Ketahanan LMK & Efisiensi RAM 3GB | CONCERN | `useAutoDraftCache`: debounce 400 ms + flush pada `visibilitychange`/`pagehide`, tanpa daemon di sisi PWA. Namun ada side effect di dalam state updater, stale closure saat pergantian anggota, dan `localStorage` dengan commit asinkron. `DEVICE_AUDIT.md` §4 mengklaim kernel mengirim sinyal `visibilitychange`, padahal LMK mengirim SIGKILL. Tidak ada log fisik di bundel. |
| Ergonomi Layar Sentuh 8.7" (44px+) | CONCERN | `MobileLayout.tsx` dan `src/index.css` tidak ada di bundel, tidak dapat diaudit. Kolom "Ukuran Terukur" identik dengan nilai kelas CSS yang dideklarasikan. TC-P7-04 hanya memeriksa string. |
| Format Konteks Portabel & Multi-AI | CONCERN | `getStopTokenDirective` dan preset budget ada. Tidak ada fungsi redaksi secret di `contextPackGenerator.ts`, `fileExport.ts`, `promptGenerator.ts` (grep: 0 hit). Estimator ~4 char/token. TC-P9-03 mengunci nama model `Claude 3.5 Sonnet`. |
| Test Coverage & Integritas Kontrol | FAIL | Dari bundel: exit 1, 11 langkah lulus. 43 `run_step` + 2 pemeriksaan inline, sedangkan string sukses hardcode `44/44` dan mandat menyebut 32. TC-P10-01 hanya memeriksa `-x`. `zlce-check` memvalidasi bentuk, bukan substansi. |

## C. TEMUAN CELAH, RISIKO ATAU SARAN PENINGKATAN

### Temuan #1: Bundel tidak self-contained; test runner gagal pada ekstraksi bersih
* **Tingkat Keparahan:** HIGH
* **Berkas Terdampak:** `scripts/create-audit-bundle.py`, `scripts/run-tests.py`, `src/tests/*`, `src/utils/{gateApprovalManager,sessionStateValidator,taskClaimManager}.ts`
* **Bukti Teknis:** [TERVERIFIKASI] Penutupan import (closure) pada zip menghasilkan 11 import tak terselesaikan:
  * `../utils/markdownParser` dari `browserRecovery`, `coldStartAi`, `coldStartMember`, `e2eScenarios`, `lmkRecovery`, `offlineOperation` (tests)
  * `./markdownParser` dari `gateApprovalManager.ts` dan `taskClaimManager.ts`
  * `./zlceValidator` dari `sessionStateValidator.ts`; `../utils/zlceValidator` dari `coldStartMember.test.ts`
  * `../utils/relayHandoverGenerator` dari `coldStartAi.test.ts`

  Juga hilang: `auditPromptGenerator` (TC-P9-03), `src/components/**` dan `src/index.css` (TC-P7-04), `scripts/zlce-collect.py` (subperintah `collect`), `zlce-starter-kit/**` dan `scripts/zlce/zlce-check.py` (tes sinkronisasi kanonik), `.gitattributes`, `scripts/sync-assets.mjs`, `package-lock.json`. `grep` terhadap `FILES_TO_BUNDLE` untuk semua nama itu menghasilkan 0 hit, jadi bundler memang tidak memasukkannya. Peringatan skip-file di bundler juga tidak membuat exit non-zero.
* **Rekomendasi Preskriptif:** Jadikan verifikasi closure sebagai gerbang build. Perbarui `FILES_TO_BUNDLE`, panggil verifier di akhir `create_bundle()` dan gagalkan build bila ada celah. Verifier berikut sudah dijalankan dan menghasilkan daftar di atas:

```python
import os
import re
import sys
import tempfile
import zipfile

IMPORT_RE = re.compile(r"""(?:from|import)\s*\(?\s*['"](\.{1,2}/[^'"]+)['"]""")
EXTS = (".ts", ".tsx", ".js", ".mjs", ".json", ".css")


def resolves(base_dir, spec):
    target = os.path.normpath(os.path.join(base_dir, spec))
    candidates = [target] + [target + e for e in EXTS] + [os.path.join(target, "index" + e) for e in EXTS]
    return any(os.path.isfile(c) for c in candidates)


def verify_bundle_closure(zip_path):
    missing = set()
    with tempfile.TemporaryDirectory() as tmp:
        with zipfile.ZipFile(zip_path) as zf:
            zf.extractall(tmp)
        for root, _, files in os.walk(tmp):
            for name in files:
                if not name.endswith((".ts", ".tsx")):
                    continue
                path = os.path.join(root, name)
                with open(path, encoding="utf-8") as f:
                    text = f.read()
                for spec in IMPORT_RE.findall(text):
                    if not resolves(root, spec):
                        missing.add(f"{os.path.relpath(path, tmp)} -> {spec}")
    return sorted(missing)


if __name__ == "__main__":
    gaps = verify_bundle_closure(sys.argv[1])
    for gap in gaps:
        print("[MISSING]", gap)
    sys.exit(1 if gaps else 0)
```

Verifier tidak mencakup import di dalam string `tsx -e` pada `run-tests.py` (relatif terhadap cwd). Pindahkan snippet tersebut ke berkas `.test.ts`.

### Temuan #2: Klaim metrik tidak konsisten dan tidak dapat direproduksi
* **Tingkat Keparahan:** HIGH
* **Berkas Terdampak:** `scripts/run-tests.py`, `SESSION_STATE.md`, `TASKS.md`, `package.json`
* **Bukti Teknis:** [TERVERIFIKASI]
  * Banner runner: `ZLCE Studio v3.2.2 Automated Test Runner`.
  * String sukses hardcode: `ALL TESTS PASSED (44/44 checks OK)`.
  * Terdapat 43 `run_step(` plus 2 pemeriksaan inline (sinkronisasi dan `.gitattributes`): bukan 32, bukan 44.
  * Mandat menyatakan `RESULT: OK (… 43 task)`, tetapi `python3 scripts/zlce-check.py . --strict --no-git` pada bundel menghasilkan `RESULT: OK (0 error, 0 warn, 60 task)`.
  * Dugaan: 43 adalah roadmap awal dan TASK-044 s.d. TASK-060 (17 task remediasi) menambah ke 60. Belum dikonfirmasi; "Tier 0 Truth" di mandat tampaknya usang.
  * `package.json` berisi `"version": "0.0.0"` (bukan 4.0.0); `sync:assets` merujuk `scripts/sync-assets.mjs` yang tidak ada.
* **Rekomendasi Preskriptif:** Hitung total secara dinamis dari langkah yang benar-benar dijalankan:

```python
import sys


class Counter:
    def __init__(self):
        self.total = 0
        self.passed = 0

    def record(self, ok):
        self.total += 1
        if ok:
            self.passed += 1

    def summary(self):
        status = "ALL TESTS PASSED" if self.passed == self.total else "TESTS FAILED"
        return f"RESULT: {status} ({self.passed}/{self.total} checks OK)"


def finish(counter):
    print("=" * 60)
    print(counter.summary())
    print("=" * 60)
    return 0 if counter.passed == counter.total else 1


if __name__ == "__main__":
    c = Counter()
    sys.exit(finish(c))
```

Ganti `failures += 1` dengan `counter.record(ok)` di tiap langkah. Perbarui banner ke v4.0.0 dan sinkronkan `package.json` version.

### Temuan #3: Tes tautologis dan asersi lemah
* **Tingkat Keparahan:** HIGH
* **Berkas Terdampak:** `scripts/run-tests.py` (TC-P7-04, TC-P10-01, TC-P9-03), `docs/mobile/DEVICE_AUDIT.md`
* **Bukti Teknis:**
  * TC-P7-04 membaca `DEVICE_AUDIT.md` dan memeriksa `auditDoc.includes('PASS')` serta `includes('min-h-[44px]')`. Dokumen yang menulis "PASS" otomatis lulus tanpa pengukuran.
  * TC-P10-01 (pre-commit hook) hanya menjalankan `test -x scripts/install-hooks.sh && test -f ...`. Tidak ada tes yang memverifikasi hook benar-benar memblokir commit berisi secret.
  * TC-P9-03 hanya memverifikasi sampel dengan model `Claude 3.5 Sonnet`; parser tidak ada di bundel.
  * `multiUserIsolation.test.ts` hanya mengimpor `getScopedStorageKey` dan menguji fungsi key murni. Hook tidak dirender, sehingga Temuan #5 lolos.
* **Rekomendasi Preskriptif:** Ganti dengan tes perilaku. Contoh tes hook end-to-end di repo sementara:

```bash
#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
cp -r "$ROOT/scripts" "$TMP/scripts"
cd "$TMP"
git init -q
git config user.name tester
git config user.email tester@example.com
bash scripts/install-hooks.sh >/dev/null
printf 'const t = { token: "abcd1234efgh" };\n' > leak.ts
git add leak.ts
if git commit -q -m "should be blocked" 2>/dev/null; then
  echo "FAIL: hook mengizinkan commit berisi secret"
  exit 1
fi
echo "PASS: hook memblokir commit berisi secret"
```

Tes ini lulus hanya setelah Temuan #7 diperbaiki (hook men-scan konten staged dengan pola yang benar).

### Temuan #4: Injeksi argumen dan injeksi konfigurasi git pada pembangun perintah commit
* **Tingkat Keparahan:** HIGH
* **Berkas Terdampak:** `src/utils/gitCommitFormatter.ts` (L.66–75), `src/utils/commandSanitizer.ts`
* **Bukti Teknis:** [TERVERIFIKASI] Input `member.name = 'Eko" -c core.hooksPath=/tmp/x -c user.x="'` dan `filesToStage = ['--force','*']` menghasilkan:

  `git add --force * && git -c user.name="Eko" -c core.hooksPath=/tmp/x -c user.x="" -c user.email="a@b.co" commit -m "TASK-001: done !! ok" && git push origin task/TASK-001`

  * `sanitizeShellParam` tidak menghapus `"`, `*`, `(`, `)`, `{`, `}`, `~`, `!`, dan tidak menolak awalan `-`. Akibatnya terjadi injeksi `-c core.hooksPath` (jalur eksekusi kode via konfigurasi git) dan `git add --force *`, yang menstage berkas yang di-ignore (termasuk `.env`) dan menembus Zero-Secret.
  * `sanitizeTouchedFiles` mempertahankan `--force` dan path absolut seperti `/data/data/com.termux/files/home/.git-credentials` (verifikasi).
  * Sumber `filesToStage` adalah teks "Berkas Direncanakan/Disentuh" dari WAL/blok keluaran AI yang di-paste (contoh blok di `run-tests.py` ~L.254): input tidak tepercaya.
  * `!` tetap lolos di dalam kutip ganda (`done !! ok`); pada shell Termux interaktif ini memicu history expansion.
  * `sanitizeTaskId('garbage')` diam-diam mengembalikan `TASK-001`, dan `match` tidak di-anchor sehingga `xxTASK-5yy` menjadi `TASK-5`. Commit dapat tercatat pada task yang salah.
  * `sanitizeMemberName`/`sanitizeMemberEmail` default ke `'Eko'` dan `'eko.keplek@gmail.com'` (PII hardcode dan atribusi keliru).
* **Rekomendasi Preskriptif:** Ganti dengan kutip tunggal POSIX, allowlist path, pemisah `--`, dan penolakan (bukan normalisasi diam-diam). Cuplikan sudah divalidasi (`--force`, `*`, `/etc/passwd`, `../x`, `.env`, `.git/config` → DENY; round-trip kutip OK).

`src/utils/commandSanitizer.ts` (tambahkan dan ganti `sanitizeTaskId`):

```ts
const DENY_PATH = /(^|\/)(\.git(\/|$)|\.env[^/]*$|\.git-credentials$|\.netrc$|id_(rsa|ed25519)[^/]*$|[^/]*\.(pem|key)$)/i;
const SAFE_PATH = /^(?![-/])(?!.*\.\.)[A-Za-z0-9._][A-Za-z0-9._\/-]*$/;

export function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export function assertSafeRepoPath(path: string): string {
  const trimmed = path.trim();
  if (!SAFE_PATH.test(trimmed) || DENY_PATH.test(trimmed)) {
    throw new Error(`Path tidak aman ditolak: ${JSON.stringify(path)}`);
  }
  return trimmed;
}

export function sanitizeTaskId(taskId: string): string {
  const match = /^TASK-(?:REV-)?\d+$/i.exec((taskId ?? '').trim());
  if (!match) {
    throw new Error(`Task ID tidak valid: ${JSON.stringify(taskId)}`);
  }
  return match[0].toUpperCase();
}
```

`src/utils/gitCommitFormatter.ts` (ganti seluruh fungsi; ubah impor menjadi `import { sanitizeGitMessage, sanitizeTaskId, shellQuote, assertSafeRepoPath } from './commandSanitizer';`):

```ts
export function generateIdentityCommitCommand(payload: FormattedCommitPayload): FormattedCommitResult {
  const { taskId, member, message, filesToStage = ['SESSION_STATE.md'], scope } = payload;

  const cleanTaskId = sanitizeTaskId(taskId);
  const formattedMessage = formatAtomicCommitMessage(cleanTaskId, message, scope);

  const name = (member?.name ?? '').trim();
  const email = (member?.email ?? '').trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9 ._()-]{0,63}$/.test(name)) {
    throw new Error('Nama anggota tidak valid untuk identitas commit');
  }
  if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) {
    throw new Error('Email anggota tidak valid untuk identitas commit');
  }

  const files = (filesToStage.length > 0 ? filesToStage : ['SESSION_STATE.md']).map(assertSafeRepoPath);

  const stageCommand = `git add -- ${files.map(shellQuote).join(' ')}`;
  const commitCommand = `git -c user.name=${shellQuote(name)} -c user.email=${shellQuote(email)} commit -m ${shellQuote(formattedMessage)}`;
  const pushCommand = `git push origin ${shellQuote(`task/${cleanTaskId}`)}`;

  const combinedCommand = `${stageCommand} && ${commitCommand} && ${pushCommand}`;

  return {
    fullCommand: `${stageCommand} && ${commitCommand}`,
    stageCommand,
    commitCommand,
    pushCommand,
    combinedCommand,
    formattedMessage,
    attribution: {
      authorName: name,
      authorEmail: email,
    },
  };
}
```

Tes yang mengasersi format lama `-c user.name="..."` (mis. `gitWorkflow.test.ts`, `coldStartMember.test.ts`) harus diperbarui. Tambahkan tes negatif untuk `--force`, `*`, nama dengan `"`, dan Task ID tidak valid. Template di `commandTemplates.ts` L.126–127 memakai `"{MEMBER_NAME}"` dan `"{COMMIT_MESSAGE}"` dengan kutip ganda; jalur binding (`commandBinder.ts`) perlu dimigrasikan ke `shellQuote`.

### Temuan #5: Isolasi draft per anggota di tablet bersama rusak (stale closure + fallback key global)
* **Tingkat Keparahan:** HIGH
* **Berkas Terdampak:** `src/hooks/useAutoDraftCache.ts`
* **Bukti Teknis:** [STATIS, belum dijalankan; React tidak terpasang di sandbox]
  1. Efek lifecycle (L.~370–420) memiliki deps `[persistDraft, storageKey]` tetapi memanggil `restoreStoredDraft` yang tidak ada di deps. Pada event `zlce-active-member-changed` atau `storage` dengan key `zlce_active_member_id`, closure masih memakai `resolvedStorageKey` **anggota lama**. `restoreStoredDraft()` memuat ulang draft anggota lama ke editor; keystroke berikutnya menulis konten itu ke key anggota baru lewat `persistDraft` versi baru: **draft A tercatat di namespace B**.
  2. `restoreStoredDraft` dan inisialisasi `useState` memakai `localStorage.getItem(resolvedStorageKey) ?? localStorage.getItem(storageKey)`. Anggota baru tanpa draft membaca draft global (`zlce_workspace_draft_content`) yang bisa milik anggota sebelumnya atau data legacy.
  3. `hasStoredDraft` awal dibaca dari `storageKey` (tanpa scope), bukan `resolvedStorageKey`.
  4. `setDraftContent` menjalankan side effect (timer, `setIsSaving`, penulisan ref) di dalam updater `setDraftContentState((prev) => …)`. Updater harus murni; React dapat menjalankannya ditunda atau dua kali (StrictMode). Jika `visibilitychange` terjadi sebelum updater dieksekusi, `isDirtyRef.current` masih `false` dan ketikan terakhir tidak ter-flush.
* **Rekomendasi Preskriptif:** (a) hitung key saat dipanggil, bukan saat render; (b) hapus fallback global; (c) pindahkan side effect keluar dari updater; (d) catat key tempat draft kotor ditulis agar flush selalu masuk ke namespace pemilik draft. Sisipkan setelah `contentRef`:

```ts
const dirtyKeyRef = useRef<{ content: string; meta: string }>({
  content: resolvedStorageKey,
  meta: resolvedMetaKey
});

const readScopedDraft = (): { text: string | null; meta: AutoDraftMeta | null } => {
  if (typeof window === 'undefined') return { text: null, meta: null };
  try {
    const contentKey = getScopedStorageKey(storageKey, memberId);
    const metaStoreKey = getScopedStorageKey(metaKey, memberId);
    const text = localStorage.getItem(contentKey);
    const rawMeta = localStorage.getItem(metaStoreKey);
    return { text, meta: rawMeta ? (JSON.parse(rawMeta) as AutoDraftMeta) : null };
  } catch (e) {
    console.warn('[useAutoDraftCache] Gagal membaca draft terisolasi:', e);
    return { text: null, meta: null };
  }
};

const restoreStoredDraft = useCallback((): string | null => {
  const { text, meta } = readScopedDraft();
  if (text === null || text.trim().length === 0) {
    contentRef.current = initialContentRef.current;
    setDraftContentState(initialContentRef.current);
    setIsRestoredFromDraft(false);
    setHasStoredDraft(false);
    setStoredDraftMeta(null);
    setIsDraftSaved(true);
    isDirtyRef.current = false;
    return null;
  }
  contentRef.current = text;
  setDraftContentState(text);
  setIsRestoredFromDraft(true);
  setHasStoredDraft(true);
  setIsDraftSaved(true);
  setStoredDraftMeta(meta);
  setLastSavedAt(meta ? new Date(meta.savedAt) : null);
  isDirtyRef.current = false;
  onRestore?.(text, meta);
  return text;
}, [storageKey, metaKey, memberId, onRestore]);

const setDraftContent = useCallback(
  (newContentOrFn: string | ((prev: string) => string)) => {
    const prev = contentRef.current;
    const nextContent =
      typeof newContentOrFn === 'function' ? newContentOrFn(prev) : newContentOrFn;
    if (nextContent === prev) return;

    contentRef.current = nextContent;
    isDirtyRef.current = true;
    dirtyKeyRef.current = {
      content: getScopedStorageKey(storageKey, memberId),
      meta: getScopedStorageKey(metaKey, memberId)
    };
    setDraftContentState(nextContent);
    setIsDraftSaved(false);
    setIsSaving(true);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      persistDraft(contentRef.current, 'debounce-400ms');
      timerRef.current = null;
    }, debounceMs);
  },
  [storageKey, metaKey, memberId, debounceMs, persistDraft]
);
```

Di `persistDraft`, ganti dua `setItem` dengan `localStorage.setItem(dirtyKeyRef.current.content, textToSave)` dan `localStorage.setItem(dirtyKeyRef.current.meta, JSON.stringify(meta))`. Inisialisasi `useState` untuk `draftContent` dan `hasStoredDraft` juga harus memakai `readScopedDraft` tanpa `?? localStorage.getItem(storageKey)`. Tambahkan tes yang merender hook (React Testing Library + `jsdom`): ketik sebagai anggota A, picu `zlce-active-member-changed` ke B, asersi editor kosong dan key B tidak berisi teks A.

### Temuan #6: `zlce pull` selalu gagal; varian "diperbaiki" menghapus commit lokal
* **Tingkat Keparahan:** MEDIUM
* **Berkas Terdampak:** `scripts/zlce/zlce` (case `pull`, `push`, `clean-auth`, `collect`)
* **Bukti Teknis:** [TERVERIFIKASI]
  * `git checkout -B "$TARGET_BRANCH" "origin/$TARGET_BRANCH" --ff-only` → `error: unknown option 'ff-only'`, rc=129; mati di bawah `set -e`.
  * Tanpa `--ff-only`, `checkout -B` mereset branch ke `origin/*` dan membuang commit lokal yang belum di-push (hanya tersisa di reflog: `HEAD@{2}: commit: local-unpushed`). Bertentangan dengan klaim "aman (ff-only)".
  * Default `main` tidak cocok dengan cabang proyek `v4-mobile`. `push` ke `main` hanya mencetak peringatan padahal bantuan menyebutnya "dibatasi". `collect` merujuk `zlce-collect.py` yang tidak ada di bundel. `clean-auth` di dispatcher adalah versi inline yang lebih lemah dari `scripts/zlce/clean-auth.sh` dan tidak memanggilnya.
* **Rekomendasi Preskriptif:** Ganti case `pull` (diuji: working tree kotor ditolak; cabang divergen ditolak rc=128 tanpa menghapus commit lokal):

```bash
  pull)
    TARGET_BRANCH="${1:-$(git -C "$REPO_ROOT" branch --show-current)}"
    if [ -z "$TARGET_BRANCH" ]; then
      echo "[ERROR] HEAD detached; sebutkan cabang secara eksplisit." >&2
      exit 1
    fi
    if [ -n "$(git -C "$REPO_ROOT" status --porcelain)" ]; then
      echo "[ERROR] Working tree kotor. Commit atau jalankan 'zlce snapshot' terlebih dahulu." >&2
      exit 1
    fi
    echo "[ZLCE] Menarik pembaruan aman untuk cabang: $TARGET_BRANCH"
    git -C "$REPO_ROOT" fetch origin "$TARGET_BRANCH"
    git -C "$REPO_ROOT" checkout "$TARGET_BRANCH"
    git -C "$REPO_ROOT" merge --ff-only "origin/$TARGET_BRANCH"
    echo "[OK] Cabang $TARGET_BRANCH tersinkronisasi (ff-only)."
    ;;
```

Ganti case `clean-auth` dengan `bash "$SCRIPT_DIR/clean-auth.sh"`. Ubah `push` agar `exit 1` jika cabang `main`. Tambahkan tes integrasi dengan repo `origin` lokal di `mktemp -d`.

### Temuan #7: Cakupan `security-audit.sh` dan pre-commit hook lebih sempit dari klaim
* **Tingkat Keparahan:** MEDIUM
* **Berkas Terdampak:** `scripts/security-audit.sh`, `scripts/install-hooks.sh`, `docs/mobile/SECURITY_AUDIT.md`
* **Bukti Teknis:**
  1. **[TERVERIFIKASI]** AUDIT 4 memakai `["\x27]` di dalam kutip tunggal bash. GNU grep tidak menafsirkan `\x27`, sehingga kutip tunggal tidak terdeteksi: `token: 'abc12345'` → rc=1, sedangkan `password: "hunter2"` terdeteksi.
  2. Label "Team Registry & PWA Storage" menyesatkan: hanya `src/data/teamMembers.ts` yang di-grep.
  3. `EXCLUDE_ARGS` mengecualikan `.git` (riwayat commit tidak pernah dipindai), `*.zip`, dan `security-audit.sh` sendiri.
  4. Pola hanya `ghp_`, `github_pat_`, `gho_`, AKIA, AIza. Tidak ada `ghs_`/`ghu_`/`ghr_`, `sk-ant-`, `xox*-`, dan yang paling relevan untuk Termux: kredensial di URL remote (`https://user:token@github.com/...`).
  5. Hook memindai working tree, bukan konten staged; bisa dilewati `--no-verify`; tidak berversi (`.git/hooks`); jika `security-audit.sh` tidak ada, hook hanya mencetak `[WARNING] ... bypass pemeriksaan` lalu mengizinkan commit (fail-open).
  6. [STATIS] AUDIT 6: `CHECK_RES=$(node … || npx tsx …)` di bawah `set -e`. Jika keduanya gagal (offline tanpa `node_modules`, atau Node di Termux tanpa dukungan `.ts`), assignment mengembalikan non-zero dan skrip berhenti tanpa pesan FAIL; commit diblokir tanpa alasan terlihat. Di sandbox Node 22 `require('./x.ts')` berhasil; versi Node di Termux belum diverifikasi.
* **Rekomendasi Preskriptif:** Ganti blok AUDIT 4 dengan pemindaian seluruh `src/` dan `scripts/`, tambahkan audit kredensial-di-URL dan pola token tambahan. Regex pengganti sudah diuji (kutip tunggal, ganda, dan `apiKey = '...'` terdeteksi; nilai kosong dan `process.env` tidak):

```bash
echo -n "==> [AUDIT 4] Scanning for hardcoded credential assignments in src/ and scripts/... "
SECRET_ASSIGN_RE="(token|password|passwd|secret|api_?key)[[:space:]]*[:=][[:space:]]*[\"'][^\"']{4,}[\"']"
ASSIGN_MATCHES=$(grep -rnEi -e "$SECRET_ASSIGN_RE" src scripts \
  --exclude=security-audit.sh --exclude-dir=node_modules || true)
if [ -n "$ASSIGN_MATCHES" ]; then
  echo "FAIL - Hardcoded credential assignment detected!"
  echo "$ASSIGN_MATCHES"
  VIOLATIONS=$((VIOLATIONS + 1))
else
  echo "PASS (0 hardcoded credential assignments)"
fi

echo -n "==> [AUDIT 4b] Scanning for credentials embedded in URLs and extra token formats... "
URL_RE='https?://[^/[:space:]@:]+:[^/[:space:]@]+@'
EXTRA_RE='(ghs_|ghu_|ghr_)[A-Za-z0-9]{36}|sk-ant-[A-Za-z0-9_-]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}'
URL_MATCHES=$(grep -rnE -e "$URL_RE" -e "$EXTRA_RE" . "${EXCLUDE_ARGS[@]}" || true)
if [ -n "$URL_MATCHES" ]; then
  echo "FAIL - Embedded credential detected!"
  echo "$URL_MATCHES"
  VIOLATIONS=$((VIOLATIONS + 1))
else
  echo "PASS (0 embedded credentials)"
fi

echo -n "==> [AUDIT 4c] Scanning git remote URLs and git history for token patterns... "
REMOTE_MATCHES=$(git remote -v 2>/dev/null | grep -E "$URL_RE" || true)
HISTORY_MATCHES=$(git log --all -p -G'ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{40}' --format=%h 2>/dev/null | head -5 || true)
if [ -n "$REMOTE_MATCHES$HISTORY_MATCHES" ]; then
  echo "FAIL - Credential found in remote URL or history!"
  VIOLATIONS=$((VIOLATIONS + 1))
else
  echo "PASS"
fi
```

Ganti blok AUDIT 6 agar tidak mematikan skrip secara diam-diam:

```bash
echo -n "==> [AUDIT 6] Verifying Command Catalog for Zero Destructive Commands... "
CHECK_RES="$(node -e "
const { verifyNoDestructiveCommands } = require('./src/data/commandTemplates.ts');
if (!verifyNoDestructiveCommands()) { process.exit(1); }
console.log('OK');
" 2>/dev/null || npx --no-install tsx -e "
import { verifyNoDestructiveCommands } from './src/data/commandTemplates';
if (!verifyNoDestructiveCommands()) { process.exit(1); }
console.log('OK');
" 2>/dev/null || echo "UNAVAILABLE")"

if [ "$CHECK_RES" = "OK" ]; then
  echo "PASS (Zero destructive commands in catalog)"
elif [ "$CHECK_RES" = "UNAVAILABLE" ]; then
  echo "FAIL - Tidak dapat mengeksekusi pemeriksaan katalog (node/tsx tidak tersedia)"
  VIOLATIONS=$((VIOLATIONS + 1))
else
  echo "FAIL - Destructive commands detected in catalog!"
  VIOLATIONS=$((VIOLATIONS + 1))
fi
```

Untuk hook: pindai hanya konten staged (`git diff --cached -U0 | grep '^+'`), jadikan hook gagal-tertutup bila skrip audit tidak ada, dan sebarkan lewat `git config core.hooksPath scripts/hooks` agar berversi.

### Temuan #8: Zip kehilangan bit eksekusi, sehingga AUDIT 5 gagal pada ekstraksi baru
* **Tingkat Keparahan:** MEDIUM
* **Berkas Terdampak:** `scripts/create-audit-bundle.py` (L.~153), `scripts/create-lmk-bundle.py`, `scripts/security-audit.sh` (AUDIT 5)
* **Bukti Teknis:** [TERVERIFIKASI] `unzip -Zl` menampilkan `?rw-------` untuk semua berkas `scripts/*`. Penyebab: `ZipInfo(rel_path, date_time=...)` tanpa `external_attr`. AUDIT 5 mensyaratkan `-x scripts/zlce/clean-auth.sh`, sehingga lulus hanya setelah `chmod +x` manual (dijalankan sebelum audit ini). Di penyimpanan bersama Android (`/sdcard`) bit eksekusi memang tidak dapat disimpan.
* **Rekomendasi Preskriptif:** Set mode eksplisit saat menulis zip:

```python
                zinfo = zipfile.ZipInfo(rel_path, date_time=deterministic_time)
                zinfo.compress_type = zipfile.ZIP_DEFLATED
                is_exec = rel_path.endswith(".sh") or rel_path == "scripts/zlce/zlce"
                zinfo.external_attr = (0o100755 if is_exec else 0o100644) << 16
                zipf.writestr(zinfo, file_data)
```

Ubah juga AUDIT 5 dan dokumentasi agar memanggil skrip dengan `bash scripts/zlce/clean-auth.sh`, tidak bergantung pada bit eksekusi.

### Temuan #9: Pembersihan kredensial tidak menjamin handover bersih
* **Tingkat Keparahan:** MEDIUM
* **Berkas Terdampak:** `scripts/zlce/clean-auth.sh`, `src/utils/handoverChecklist.ts` (L.44, 61), `src/data/commandTemplates.ts` (L.178), `docs/mobile/blueprint/08_SECURITY_MODEL.md`
* **Bukti Teknis:**
  1. **[TERVERIFIKASI]** `unset GIT_AUTHOR_NAME` dst. di dalam skrip yang dijalankan sebagai proses anak tidak berefek pada shell induk (`parent masih: leak`). Skrip lalu mencetak `Nol token/kredensial tersisa di RAM tablet` tanpa verifikasi.
  2. Tiga implementasi berbeda: `clean-auth.sh` (hapus socket, tidak hapus `user.name`), dispatcher (hanya `credential-cache exit`), `handoverChecklist.ts` (`git config --global --unset user.name/email`). Hanya yang terakhir menghapus identitas global.
  3. Path socket yang dihapus: `~/.git-credential-cache/socket*`. Git modern memakai `$XDG_CACHE_HOME/git/credential/socket` bila direktori lama tidak ada.
  4. Jendela 900 detik (`cache --timeout=900`): jika anggota berikutnya mengambil tablet sebelum `clean-auth` dijalankan, token masih aktif. Penegakan murni prosedural.
  5. [BELUM DIVERIFIKASI] Tidak ada bukti di bundel bahwa `git credential-cache` tersedia dan berfungsi di build git Termux (butuh dukungan unix socket). Verifikasi fisik wajib.
  6. Jejak lain yang tidak dibersihkan: riwayat bash Termux (`git remote set-url` dengan token), riwayat clipboard Samsung (One UI), riwayat kamus keyboard.
* **Rekomendasi Preskriptif:** Satukan semua jalur ke satu skrip, verifikasi hasilnya, dan hapus identitas global:

```bash
#!/usr/bin/env bash
set -u

echo "==> [ZLCE] Membersihkan jejak autentikasi untuk handover..."
FAILED=0

git credential-cache exit 2>/dev/null || true
for sock in \
  "$HOME/.git-credential-cache/socket" \
  "${XDG_CACHE_HOME:-$HOME/.cache}/git/credential/socket" \
  "${TMPDIR:-/data/data/com.termux/files/usr/tmp}/.git-credential-cache/socket"; do
  rm -f "$sock" 2>/dev/null || true
  if [ -e "$sock" ]; then
    echo "    [GAGAL] Socket masih ada: $sock"
    FAILED=1
  fi
done

git config --global --unset user.name 2>/dev/null || true
git config --global --unset user.email 2>/dev/null || true
if [ -n "$(git config --global --get user.name 2>/dev/null)" ] || [ -n "$(git config --global --get user.email 2>/dev/null)" ]; then
  echo "    [GAGAL] Identitas global masih terpasang"
  FAILED=1
fi

if git remote -v 2>/dev/null | grep -Eq 'https?://[^/[:space:]@:]+:[^/[:space:]@]+@'; then
  echo "    [GAGAL] URL remote mengandung kredensial; ganti dengan 'git remote set-url origin <url-tanpa-token>'"
  FAILED=1
fi

history -c 2>/dev/null || true
echo "    [INFO] Hapus juga riwayat clipboard Samsung secara manual (Setelan > Papan ketik)."

if [ "$FAILED" -eq 0 ]; then
  echo "==> [ZLCE] Status: BERSIH (diverifikasi)."
  exit 0
fi
echo "==> [ZLCE] Status: TIDAK BERSIH. Perbaiki item [GAGAL] sebelum menyerahkan tablet." >&2
exit 1
```

Catatan: `history -c` pada proses anak hanya membersihkan riwayat proses itu; dokumentasikan agar skrip ini di-`source` (`. scripts/zlce/clean-auth.sh`) atau riwayat dibersihkan manual di shell induk. Lakukan juga uji fisik ketersediaan `git credential-cache` di Termux sebelum klaim ADR-04 dipertahankan.

### Temuan #10: Tidak ada redaksi secret pada draft, context pack, dan ekspor
* **Tingkat Keparahan:** MEDIUM
* **Berkas Terdampak:** `src/hooks/useAutoDraftCache.ts`, `src/utils/contextPackGenerator.ts`, `src/utils/fileExport.ts`, `src/utils/promptGenerator.ts`
* **Bukti Teknis:** [TERVERIFIKASI via grep] 0 hit untuk `redact`/`sanitiz`/pola token pada ketiga util. Zero-Secret hanya berupa teks kebijakan di dalam prompt (`contextPackGenerator.ts` L.161, 171, 255). `persistDraft` menyimpan teks apa pun yang di-paste sebagai plaintext di `localStorage` tablet bersama. Token yang tidak sengaja di-paste ke editor tersimpan lintas sesi dan lintas anggota (diperparah Temuan #5), lalu ikut keluar dalam context pack ke AI eksternal.
* **Rekomendasi Preskriptif:** Tambahkan modul redaksi yang dipakai di `persistDraft`, generator context pack, dan ekspor:

```ts
const SECRET_PATTERNS: RegExp[] = [
  /\bgh[pousr]_[A-Za-z0-9]{36}\b/g,
  /\bgithub_pat_[A-Za-z0-9_]{40,}\b/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\bAIza[0-9A-Za-z_-]{35}\b/g,
  /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,
  /-----BEGIN (?:RSA |OPENSSH |DSA |EC |PGP )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |OPENSSH |DSA |EC |PGP )?PRIVATE KEY-----/g,
  /(https?:\/\/)[^\/\s@:]+:[^\/\s@]+@/g
];

export interface RedactionResult {
  text: string;
  redactedCount: number;
}

export function redactSecrets(input: string): RedactionResult {
  let redactedCount = 0;
  let text = input;
  for (const pattern of SECRET_PATTERNS) {
    text = text.replace(pattern, (...args) => {
      redactedCount += 1;
      const prefix = typeof args[1] === 'string' && args[1].startsWith('http') ? args[1] : '';
      return `${prefix}[REDACTED]`;
    });
  }
  return { text, redactedCount };
}
```

Di `persistDraft`, simpan `redactSecrets(textToSave).text` dan tampilkan peringatan UI bila `redactedCount > 0`. Tambahkan tes bahwa context pack tidak pernah memuat pola token. (Cuplikan ini belum dijalankan; uji dengan sampel token sebelum integrasi.)

### Temuan #11: Verifikasi LMK: skrip tanpa asersi, klaim mekanisme tidak akurat, durabilitas storage belum dibuktikan
* **Tingkat Keparahan:** MEDIUM
* **Berkas Terdampak:** `scripts/test-lmk-physical.sh`, `docs/mobile/DEVICE_AUDIT.md` §4, `src/hooks/useAutoDraftCache.ts`, `src/utils/fileExport.ts` (`atomicWriteStorageWithChecksum`)
* **Bukti Teknis:**
  1. `DEVICE_AUDIT.md` §4 menyatakan bahwa saat Termux mengalokasikan >1500 MB "kernel Android mengirimkan sinyal `visibilitychange ('hidden')` dan `pagehide` ke peramban", dan flush selesai `< 5ms` (terverifikasi). Secara mekanisme keliru: LMK/lmkd mengirim SIGKILL tanpa sinyal pra-pembunuhan ke halaman web; `visibilitychange` terjadi saat UI berpindah ke latar belakang. Tidak ada pengukuran 5 ms di bundel.
  2. `test-lmk-physical.sh` hanya mengalokasikan memori dan mencetak panduan manual: tidak ada asersi pemulihan draft PWA, tidak ada pencatatan hasil, tidak ada pemeriksaan proses mana yang dibunuh. Alokasi 2000 MB di perangkat 3 GB lebih mungkin membunuh Termux sendiri; pada Android 12+ proses anak Termux juga rentan pada phantom process killer. Catatan: `bytearray(500MB)` langsung resident di sandbox (RSS 509 MB), jadi alokasi memang menekan memori. Cacatnya adalah ketiadaan verifikasi.
  3. Fallback `MemAvailable ... || grep MemFree` tidak pernah dieksekusi karena status pipeline ditentukan `awk` (rc=0 meski grep gagal).
  4. `localStorage` sinkron di main thread, tetapi commit ke disk dilakukan asinkron oleh proses browser. Jika seluruh proses Chrome dibunuh beberapa detik setelah backgrounding, penulisan terakhir berpotensi hilang [BELUM DIVERIFIKASI pada perangkat]. `beforeunload` juga tidak andal di mobile. `atomicWriteStorageWithChecksum` memverifikasi baca-ulang dari store yang sama: membuktikan konsistensi, bukan durabilitas, dan menggandakan kebutuhan kuota (staging + target + draft).
  5. `persistDraft` hanya `console.error` pada `QuotaExceededError`: tanpa notifikasi UI dan tanpa retry. Dua `setItem` (konten lalu meta) tidak atomik.
* **Rekomendasi Preskriptif:** Koreksi `DEVICE_AUDIT.md` §4 (hapus klaim sinyal kernel dan `<5ms`, ganti dengan data terukur). Tambahkan jalur IndexedDB dengan `durability: 'strict'` sebagai penyimpanan utama dan `localStorage` sebagai cermin sinkron. Perbaikan skrip fisik (ganti blok pembacaan memori dan akhiri dengan log yang dilampirkan ke audit):

```bash
if [ -f /proc/meminfo ]; then
  TOTAL_MEM_KB=$(awk '/^MemTotal:/ {print $2}' /proc/meminfo)
  FREE_MEM_KB=$(awk '/^MemAvailable:/ {print $2}' /proc/meminfo)
  if [ -z "$FREE_MEM_KB" ]; then
    FREE_MEM_KB=$(awk '/^MemFree:/ {print $2}' /proc/meminfo)
  fi
  TOTAL_MB=$((TOTAL_MEM_KB / 1024))
  FREE_MB=$((FREE_MEM_KB / 1024))
  echo "[INFO] Memori Terdeteksi: Total ${TOTAL_MB} MB | Tersedia ${FREE_MB} MB"
else
  echo "[INFO] /proc/meminfo tidak tersedia."
  TOTAL_MB=0
  FREE_MB=0
fi

LOG_FILE="${HOME}/zlce-lmk-$(date +%Y%m%dT%H%M%S).log"
{
  echo "device=SM-T225 total_mb=${TOTAL_MB} free_mb_before=${FREE_MB}"
  echo "langkah_manual: ketik 200 karakter di editor PWA, jalankan skrip ini, buka PWA, catat apakah teks pulih"
} | tee "$LOG_FILE"
echo "Log disimpan: $LOG_FILE"
```

Tentukan tahap beban berdasarkan `MemAvailable` (mis. 60% sebagai batas atas), bukan angka tetap 2000 MB.

### Temuan #12: Jejak sisa scaffold, ekspos jaringan, dan reprodusibilitas offline
* **Tingkat Keparahan:** MEDIUM
* **Berkas Terdampak:** `package.json`, `metadata.json`
* **Bukti Teknis:**
  * `"dev": "vite --port=3000 --host=0.0.0.0"` mengikat dev server ke semua antarmuka; di Wi-Fi/hotspot bersama server dev terekspos ke jaringan lokal. Untuk satu perangkat, `127.0.0.1` cukup.
  * `metadata.json` memuat `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API` (sisa scaffold AI Studio) dan nama `10Remix ZLCE3.22-MobBenc` / "Bencmark". Capability ini bertentangan dengan klaim offline 100% dan Zero-Secret karena mengisyaratkan kunci Gemini di sisi server.
  * Tidak ada `package-lock.json` di bundel dan semua dependensi memakai caret (`^`): build tidak reprodusibel. Di Termux tanpa jaringan tidak ada jalan membangun ulang `dist`.
  * Tidak ada dependensi atau konfigurasi service worker (`vite-plugin-pwa`/Workbox) di `package.json`, dan `sw.js` tidak ada di bundel. Klaim offline 100% dan TC-P10-08 (SW cache) tidak dapat diaudit.
* **Rekomendasi Preskriptif:** Ubah skrip dev menjadi `"dev": "vite --port=3000 --host=127.0.0.1"`. Hapus capability Gemini dari `metadata.json`. Commit `package-lock.json` dan pin versi. Sertakan `dist/` hasil build beserta SW dalam bundel audit, dan tambahkan tes offline nyata (Playwright `context.setOffline(true)` setelah `vite preview`).

### Temuan #13: `zlce-check` memvalidasi bentuk, bukan substansi; persetujuan tidak terautentikasi
* **Tingkat Keparahan:** MEDIUM
* **Berkas Terdampak:** `scripts/zlce-check.py`, `SESSION_STATE.md`
* **Bukti Teknis:** Kolom "Bukti Verifikasi" lolos dengan teks apa pun selain `""` atau `-`. Persetujuan lolos untuk string `ya` atau `ya (oleh: X)` tanpa identitas yang dapat diverifikasi; anggota mana pun dapat menulisnya. Staleness commit memakai `getmtime(SESSION_STATE.md) + 60 < commit_time`, bergantung pada mtime (berubah saat checkout). `zlce-check` menghasilkan `RESULT: OK` pada bundel yang test runner-nya gagal total (Temuan #1): kontrol ini tidak mendeteksi regresi.
* **Rekomendasi Preskriptif:** Wajibkan format bukti yang dapat diperiksa mesin (`TC-xxx` yang ada di `run-tests.py`, atau hash commit yang ada di `git log`). Tambahan untuk `zlce-check.py` (belum dijalankan; uji dengan `SESSION_STATE.md` berbukti palsu):

```python
import os
import re
import subprocess

EVIDENCE_RE = re.compile(r"\b(TC-P\d+-\d+|[0-9a-f]{7,40})\b")


def evidence_is_verifiable(evidence, root, use_git):
    token = EVIDENCE_RE.search(evidence or "")
    if not token:
        return False
    value = token.group(1)
    if value.startswith("TC-"):
        runner = os.path.join(root, "scripts", "run-tests.py")
        if not os.path.exists(runner):
            return False
        with open(runner, encoding="utf-8") as f:
            return value in f.read()
    if use_git:
        result = subprocess.run(
            ["git", "cat-file", "-e", value + "^{commit}"],
            cwd=root, capture_output=True, timeout=15
        )
        return result.returncode == 0
    return True
```

Panggil di blok `status == "DONE"`: `if not evidence_is_verifiable(r["evidence"], root, use_git): warns.append(...)`, dan `errors.append(...)` dengan `--strict`. Untuk persetujuan, catat trailer `Approved-by:` pada commit dan cocokkan dengan registri anggota. Perbarui "Tier 0 Truth" di mandat agar mencerminkan 60 task.

### Temuan #14: Ergonomi 8.7" tidak dapat diaudit dan audit "terukur" tidak bermetode
* **Tingkat Keparahan:** LOW
* **Berkas Terdampak:** `docs/mobile/DEVICE_AUDIT.md`, `src/components/mobile/MobileLayout.tsx` (tidak ada di bundel), `src/index.css` (tidak ada di bundel)
* **Bukti Teknis:** Tabel §2 memuat kolom "Ukuran Terukur" (mis. `48 x 44 px`) yang sama dengan nilai minimum kelas yang dideklarasikan. Tidak ada alat ukur dan tidak ada tangkapan layar. Klaim `useVisualViewport` (ambang delta 2 px, `--keyboard-height`) tidak dapat diperiksa karena berkas tidak disertakan.
* **Rekomendasi Preskriptif:** Ukur dengan Playwright pada viewport 1340×800 dan 800×1340 (belum dijalankan; sesuaikan URL dan selector):

```ts
import { test, expect } from '@playwright/test';

for (const viewport of [{ width: 1340, height: 800 }, { width: 800, height: 1340 }]) {
  test(`touch target >= 44px @ ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('http://127.0.0.1:4173/');
    const targets = page.locator('button, a[href], [role="button"], [role="tab"], input, select');
    const count = await targets.count();
    const undersized: string[] = [];
    for (let i = 0; i < count; i++) {
      const el = targets.nth(i);
      if (!(await el.isVisible())) continue;
      const box = await el.boundingBox();
      if (box && (box.width < 44 || box.height < 44)) {
        undersized.push(`${await el.evaluate((n) => n.outerHTML.slice(0, 80))} => ${Math.round(box.width)}x${Math.round(box.height)}`);
      }
    }
    expect(undersized, undersized.join('\n')).toEqual([]);
  });
}
```

Ganti TC-P7-04 dengan pemanggilan tes ini dan lampirkan berkas komponen ke bundel.

### Temuan #15: Estimator token kasar dan nama model terkunci
* **Tingkat Keparahan:** LOW
* **Berkas Terdampak:** `src/utils/contextPackGenerator.ts` (`estimateTokenCount`, ~4 char/token), `src/utils/tokenBudgetAdapter.ts`, `scripts/run-tests.py` (TC-P9-03), template mandat
* **Bukti Teknis:** Rasio 4 char/token tidak cocok untuk teks Indonesia, tabel Markdown, dan blok kode, yang cenderung lebih padat token; preset `claude-30k` dan `compact-8k` berisiko meleset ke sisi tidak aman. TC-P9-03 mengasersi `modelName === 'Claude 3.5 Sonnet'`, sedangkan target audit ini 5.5. Template laporan juga masih bertuliskan `[CLAUDE 3.5 SONNET]`.
* **Rekomendasi Preskriptif:** Terapkan faktor keamanan (mis. 3 char/token untuk preset kompak) dan jadikan nama model parameter, bukan konstanta. Tambahkan tes bahwa parser menerima `Claude 5.5 Sonnet`.

## D. USULAN RANCANGAN TASK PERBAIKAN (SIAP DIINTEGRASIKAN)

1. **TASK-061 Bundle Closure Gate:** perbarui `FILES_TO_BUNDLE` di `scripts/create-audit-bundle.py`, tambahkan `verify_bundle_closure` sebagai gerbang gagal-build, sertakan `markdownParser`, `zlceValidator`, `relayHandoverGenerator`, `auditPromptGenerator`, `src/components/**`, `src/index.css`, `package-lock.json`, `zlce-collect.py`.
2. **TASK-062 Runner Metrics Truthfulness:** `scripts/run-tests.py` dengan penghitung dinamis, banner v4.0.0, hapus string `44/44`; sinkronkan `package.json` version dan `SESSION_STATE.md`/mandat ke 60 task.
3. **TASK-063 Shell Injection Hardening:** `commandSanitizer.ts`, `gitCommitFormatter.ts`, `commandBinder.ts`, `commandTemplates.ts`; terapkan `shellQuote` dan `assertSafeRepoPath`, `sanitizeTaskId` yang melempar error; tes negatif di `gitWorkflow.test.ts`.
4. **TASK-064 Draft Isolation Fix:** `useAutoDraftCache.ts` (key dihitung saat dipanggil, `dirtyKeyRef`, hapus fallback global, side effect keluar dari updater); tes render hook untuk pergantian anggota A→B.
5. **TASK-065 Dispatcher Repair:** `scripts/zlce/zlce` (`pull` ff-only aman, `push` blok `main`, `clean-auth` delegasi, hapus/sediakan `collect`); tes integrasi repo `origin` lokal.
6. **TASK-066 Security Audit Coverage:** `scripts/security-audit.sh` (AUDIT 4/4b/4c, AUDIT 6 gagal-tertutup), `scripts/install-hooks.sh` (scan konten staged, `core.hooksPath`, fail-closed); tes hook end-to-end menggantikan TC-P10-01.
7. **TASK-067 Bundle Permission Fix:** `create-audit-bundle.py` dan `create-lmk-bundle.py` dengan `external_attr`; AUDIT 5 memakai `bash` eksplisit.
8. **TASK-068 Handover Clean-Auth v2:** `scripts/zlce/clean-auth.sh` terpadu dan terverifikasi; selaraskan `handoverChecklist.ts`, `commandTemplates.ts`, dan blueprint 08; uji fisik ketersediaan `git credential-cache` di Termux.
9. **TASK-069 Secret Redaction Layer:** modul `redactSecrets` di `persistDraft`, `contextPackGenerator.ts`, `fileExport.ts`; tes bahwa pack tidak memuat pola token.
10. **TASK-070 LMK Evidence & Durability:** koreksi `DEVICE_AUDIT.md` §4; perbaiki `test-lmk-physical.sh` (log, asersi pemulihan, batas berbasis `MemAvailable`); tambahkan penyimpanan IndexedDB `durability: 'strict'`; penanganan `QuotaExceededError` dengan notifikasi UI.
11. **TASK-071 Offline & Supply-Chain Baseline:** `package.json` (`--host=127.0.0.1`, lockfile, pin versi), bersihkan `metadata.json`, sertakan `dist/` dan SW, tambahkan tes offline Playwright.
12. **TASK-072 zlce-check Evidence Validation:** `scripts/zlce-check.py` dengan `evidence_is_verifiable` dan trailer `Approved-by:`; tes dengan `SESSION_STATE.md` berbukti palsu.
13. **TASK-073 Touch Target Measurement:** ganti TC-P7-04 dengan tes Playwright 1340×800 / 800×1340; perbarui `DEVICE_AUDIT.md` dengan data terukur dan tangkapan layar.
14. **TASK-074 Token Budget & Model Name Parameterization:** `contextPackGenerator.ts`, `tokenBudgetAdapter.ts`, TC-P9-03 dan template mandat (5.5 sebagai parameter).

=== END CLAUDE AUDIT RESPONSE ===
