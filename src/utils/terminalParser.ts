/**
 * Parser Keluaran Terminal Termux & CLI ZLCE
 * Membaca salinan teks dari Termux (zlce-check.py, git status, zlce-snapshot.sh)
 * dan mengekstrak metrik verifikasi serta kesalahan secara terstruktur.
 * Rujukan: TASK-029 & docs/mobile/blueprint/04_TERMUX_INTEGRATION.md
 */

export interface ParsedTerminalResult {
  commandType: 'check' | 'snapshot' | 'git' | 'generic';
  success: boolean;
  rawText: string;
  summary: string;
  errorCount: number;
  warningCount: number;
  taskCount?: number;
  errors: string[];
  warnings: string[];
  infos: string[];
  parsedAt: string;
  verificationEvidence: string;
}

/**
 * Parsing teks keluaran terminal
 */
export function parseTerminalOutput(rawText: string): ParsedTerminalResult {
  const trimmed = rawText.trim();
  const now = new Date().toISOString();

  if (!trimmed) {
    return {
      commandType: 'generic',
      success: false,
      rawText: '',
      summary: 'Tidak ada teks terminal yang dimasukkan.',
      errorCount: 1,
      warningCount: 0,
      errors: ['Teks keluaran terminal kosong'],
      warnings: [],
      infos: [],
      parsedAt: now,
      verificationEvidence: '',
    };
  }

  // 1. Deteksi Keluaran `zlce-check.py` atau `zlce check`
  const resultMatch = trimmed.match(/RESULT:\s*(OK|FAIL)\s*\(([0-9]+)\s*error,\s*([0-9]+)\s*warn(?:,\s*([0-9]+)\s*task)?\)/i);
  const isZlceCheck = resultMatch !== null || trimmed.includes('[ERROR]') || trimmed.includes('[WARN]') || trimmed.includes('zlce-check');

  if (isZlceCheck) {
    const isOk = resultMatch ? resultMatch[1].toUpperCase() === 'OK' : !trimmed.includes('[ERROR]');
    const errorCount = resultMatch ? parseInt(resultMatch[2], 10) : (trimmed.match(/\[ERROR\]/g) || []).length;
    const warningCount = resultMatch ? parseInt(resultMatch[3], 10) : (trimmed.match(/\[WARN\]/g) || []).length;
    const taskCount = resultMatch && resultMatch[4] ? parseInt(resultMatch[4], 10) : undefined;

    const errors: string[] = [];
    const warnings: string[] = [];
    const infos: string[] = [];

    const lines = trimmed.split('\n');
    for (const line of lines) {
      const cleanLine = line.trim();
      if (cleanLine.startsWith('[ERROR]')) {
        errors.push(cleanLine.replace(/^\[ERROR\]\s*/, ''));
      } else if (cleanLine.startsWith('[WARN]')) {
        warnings.push(cleanLine.replace(/^\[WARN\]\s*/, ''));
      } else if (cleanLine.startsWith('[INFO]')) {
        infos.push(cleanLine.replace(/^\[INFO\]\s*/, ''));
      }
    }

    const summary = isOk
      ? `Validasi ZLCE Lolos (0 error, ${warningCount} peringatan${taskCount ? `, ${taskCount} task` : ''})`
      : `Validasi ZLCE Gagal (${errorCount} error, ${warningCount} peringatan)`;

    const verificationEvidence = `zlce-check: ${isOk ? 'PASS' : 'FAIL'} (${errorCount} error, ${warningCount} warn) pada ${now.slice(0, 19).replace('T', ' ')}`;

    return {
      commandType: 'check',
      success: isOk,
      rawText: trimmed,
      summary,
      errorCount,
      warningCount,
      taskCount,
      errors,
      warnings,
      infos,
      parsedAt: now,
      verificationEvidence,
    };
  }

  // 2. Deteksi Git Status / Log / Commit
  const isGit = trimmed.includes('On branch') ||
    trimmed.includes('nothing to commit') ||
    trimmed.includes('Changes to be committed') ||
    trimmed.includes('Untracked files') ||
    trimmed.includes('git ') ||
    /\[[a-f0-9]{7,}\]/i.test(trimmed);

  if (isGit) {
    const isClean = trimmed.includes('nothing to commit, working tree clean');
    const hasConflict = trimmed.includes('CONFLICT') || trimmed.includes('fix conflicts');
    const hasBranch = trimmed.match(/On branch\s+([^\n\r]+)/i);
    const branchName = hasBranch ? hasBranch[1].trim() : 'deteksi git';

    const errors: string[] = [];
    if (hasConflict) errors.push('Konflik Git terdeteksi pada terminal');

    const summary = hasConflict
      ? `Git Konflik pada cabang ${branchName}`
      : isClean
        ? `Git Bersih (${branchName}) - siap commit / push`
        : `Git memiliki perubahan kerja (${branchName})`;

    return {
      commandType: 'git',
      success: !hasConflict,
      rawText: trimmed,
      summary,
      errorCount: hasConflict ? 1 : 0,
      warningCount: isClean ? 0 : 1,
      errors,
      warnings: isClean ? [] : ['Working tree memiliki perubahan belum dicommit'],
      infos: [summary],
      parsedAt: now,
      verificationEvidence: `Git Status (${branchName}): ${isClean ? 'Clean' : 'Modified'} at ${now.slice(0, 19).replace('T', ' ')}`,
    };
  }

  // 3. Deteksi Snapshot / Diff
  const isSnapshot = trimmed.includes('SNAPSHOT') || trimmed.includes('diff --git') || trimmed.includes('SESSION_STATE');
  if (isSnapshot) {
    return {
      commandType: 'snapshot',
      success: true,
      rawText: trimmed,
      summary: 'Snapshot pemulihan atau cuplikan diff ZLCE berhasil ditangkap',
      errorCount: 0,
      warningCount: 0,
      errors: [],
      warnings: [],
      infos: ['Snapshot terdeteksi'],
      parsedAt: now,
      verificationEvidence: `ZLCE Snapshot captured: ${trimmed.length} bytes at ${now.slice(0, 19).replace('T', ' ')}`,
    };
  }

  // 4. Keluaran Generik
  const hasGenericError = /error|fatal|exception|failed/i.test(trimmed);
  return {
    commandType: 'generic',
    success: !hasGenericError,
    rawText: trimmed,
    summary: hasGenericError ? 'Keluaran terminal mengandung indikasi error' : 'Keluaran terminal berhasil ditangkap',
    errorCount: hasGenericError ? 1 : 0,
    warningCount: 0,
    errors: hasGenericError ? ['Terdeteksi indikasi kata kunci kegagalan/error dalam terminal'] : [],
    warnings: [],
    infos: [],
    parsedAt: now,
    verificationEvidence: `Terminal execution output captured at ${now.slice(0, 19).replace('T', ' ')}`,
  };
}
