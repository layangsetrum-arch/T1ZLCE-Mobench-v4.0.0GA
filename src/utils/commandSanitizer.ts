/**
 * ZLCE Strict Shell Sanitizer (TASK-026 & TASK-063 AUD-017)
 * Sanitasi dan Pengutipan Parameter Shell POSIX / Bash Anti-Command-Injection
 * Rujukan: docs/mobile/blueprint/04_TERMUX_INTEGRATION.md & 08_SECURITY_MODEL.md
 * 
 * Melindungi dari celah injeksi shell (semicolon, pipe, subshell $(), backtick, redirect, dll)
 * serta injeksi opsi git dan argumen berbahaya (--force, -c core.hooksPath=...).
 */

export interface SanitizationResult {
  sanitized: string;
  hasInjectionAttempt: boolean;
  warnings: string[];
}

/**
 * Karakter berbahaya yang dilarang keras dalam argumen shell biasa:
 * `;`, `&`, `|`, `$`, `` ` ``, `\n`, `\r`, `<`, `>`, `(`, `)`, `"`, `!`, `~`, `{`, `}`
 */
const SHELL_METACHARS_REGEX = /[;&|\$`\n\r<>()"!~{}]/g;

/**
 * Path repositori aman dan deny-list path sensitif
 */
const DENY_PATH = /(^|\/)(\.git(\/|$)|\.env[^/]*$|\.git-credentials$|\.netrc$|id_(rsa|ed25519)[^/]*$|[^/]*\.(pem|key)$)/i;
const SAFE_PATH = /^(?![-/])(?!.*\.\.)[A-Za-z0-9._][A-Za-z0-9._\/-]*$/;

/**
 * Pengutipan string tunggal standar POSIX: membungkus dengan '...' dan meng-escape '
 */
export function shellQuote(value: string): string {
  return `'${(value ?? '').replace(/'/g, `'\\''`)}'`;
}

/**
 * Memvalidasi path berkas yang akan di-stage:
 * Menolak flag argumen (awalan - seperti --force), wildcard (*), traversal (..),
 * dan direktori/berkas sensitif (.env, .git, .git-credentials).
 */
export function assertSafeRepoPath(path: string): string {
  const trimmed = (path ?? '').trim();
  if (!SAFE_PATH.test(trimmed) || DENY_PATH.test(trimmed)) {
    throw new Error(`Path tidak aman ditolak: ${JSON.stringify(path)}`);
  }
  return trimmed;
}

/**
 * Sanitasi argumen shell umum (menghilangkan karakter injeksi berbahaya)
 */
export function sanitizeShellParam(param: string): string {
  if (!param) return '';
  return param.replace(SHELL_METACHARS_REGEX, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Sanitasi umum teks argumen shell (misal pesan commit)
 */
export function sanitizeCommitMessage(message: string): SanitizationResult {
  const warnings: string[] = [];
  let hasInjectionAttempt = false;

  if (!message || message.trim().length === 0) {
    return {
      sanitized: 'chore: pembaruan sesi ZLCE',
      hasInjectionAttempt: false,
      warnings: ['Pesan commit kosong, menggunakan pesan default.']
    };
  }

  // Deteksi upaya injeksi
  if (SHELL_METACHARS_REGEX.test(message)) {
    hasInjectionAttempt = true;
    warnings.push('Terdeteksi karakter metakarakter shell berbahaya. Dinormalisasi.');
  }

  // Hilangkan karakter injeksi berbahaya
  let clean = message.replace(SHELL_METACHARS_REGEX, ' ');
  clean = clean.replace(/\\/g, '');
  clean = clean.replace(/\s+/g, ' ').trim();

  // Batasi panjang pesan commit aman (maks 120 karakter)
  if (clean.length > 120) {
    clean = clean.substring(0, 120).trim();
    warnings.push('Pesan commit dipotong maksimal 120 karakter.');
  }

  return {
    sanitized: clean,
    hasInjectionAttempt,
    warnings
  };
}

/**
 * Alias kemudahan untuk pesan git
 */
export function sanitizeGitMessage(message: string): string {
  return sanitizeCommitMessage(message).sanitized;
}

/**
 * Sanitasi Task ID (harus sesuai format TASK-xxx atau TASK-REV-xxx)
 * Melempar Error jika format tidak valid alih-alih fallback diam-diam (AUD-017).
 */
export function sanitizeTaskId(taskId: string): string {
  const match = /^TASK-(?:REV-)?\d+$/i.exec((taskId ?? '').trim());
  if (!match) {
    throw new Error(`Task ID tidak valid: ${JSON.stringify(taskId)}`);
  }
  return match[0].toUpperCase();
}

/**
 * Sanitasi Nama Anggota (hanya huruf, angka, spasi, titik, tanda hubung)
 */
export function sanitizeMemberName(name: string): string {
  const clean = (name ?? '').replace(/[^a-zA-Z0-9\s.\-_()]/g, '').trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9 ._()-]{0,63}$/.test(clean)) {
    throw new Error('Nama anggota tidak valid untuk identitas commit');
  }
  return clean;
}

/**
 * Sanitasi Email Anggota (menolak spasi dan karakter shell)
 */
export function sanitizeMemberEmail(email: string): string {
  const clean = (email ?? '').replace(/[^a-zA-Z0-9@.\-_+]/g, '').trim();
  if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(clean)) {
    throw new Error('Email anggota tidak valid untuk identitas commit');
  }
  return clean;
}

/**
 * Sanitasi Daftar Berkas yang Disentuh (plannedFiles)
 * Menolak traversal, flag --force, dan berkas sensitif via assertSafeRepoPath
 */
export function sanitizeTouchedFiles(filesStr: string): string {
  if (!filesStr || filesStr.trim() === '-' || filesStr.trim() === '') {
    return 'src/';
  }

  const rawList = filesStr.split(/[,;\s]+/);
  const safeList: string[] = [];

  for (const item of rawList) {
    const trimmed = item.trim();
    if (!trimmed) continue;
    try {
      const safe = assertSafeRepoPath(trimmed);
      if (!safeList.includes(safe)) {
        safeList.push(safe);
      }
    } catch {
      // Abaikan path berbahaya/tidak valid dalam plannedFiles string
    }
  }

  return safeList.length > 0 ? safeList.join(' ') : 'src/';
}

/**
 * Bungkus string ke dalam kutip POSIX aman
 */
export function quoteShellParam(val: string): string {
  return shellQuote(val);
}
