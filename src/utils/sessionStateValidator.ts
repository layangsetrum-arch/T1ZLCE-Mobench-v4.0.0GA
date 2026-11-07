/**
 * ZLCE Core SESSION_STATE.md Integrity Enforcement Engine
 * 
 * Memastikan dokumen SESSION_STATE.md mematuhi 100% aturan kanonik ZLCE Core:
 * 1. Bagian kanonik 0 s.d. 7 (nomor bagian, judul persis).
 * 2. Header matriks task persis: | ID Task | Nama | Dependensi | Status | Bukti Verifikasi | Disetujui |
 * 3. 7 butir kanonik WAL pada Bagian 3:
 *    - Task
 *    - Langkah Sedang Dikerjakan
 *    - Berkas Direncanakan/Disentuh
 *    - Sudah Dilakukan
 *    - Langkah Berikutnya (persis)
 *    - Perintah Verifikasi
 *    - Diperbarui
 * 4. Aturan Invarian ZLCE (R1 s.d. R5, X1):
 *    - R4: Maksimal tepat 1 task IN_PROGRESS
 *    - Done gate: Bukti Verifikasi wajib terisi dan Disetujui: ya
 *    - Dependencies: Seluruh dependensi harus DONE sebelum task dapat IN_PROGRESS atau DONE
 * 5. Kompatibilitas 100% dengan runner `scripts/zlce-check.py`.
 */

import { ValidationResult, ValidationIssue, TaskStatus } from '../types/zlce';
import { validateSessionState } from './zlceValidator';

export interface IntegrityCheckResult extends ValidationResult {
  hasCanonicalHeaders: boolean;
  hasCanonicalWalItems: boolean;
  hasMatrixHeaderValid: boolean;
  canonicalSectionsFound: string[];
  canonicalSectionsMissing: string[];
  walItemsFound: string[];
  walItemsMissing: string[];
  isCheckScriptCompliant: boolean;
}

export const CANONICAL_SECTIONS = [
  '0. KONTEKS PROYEK',
  '1. STATUS AKTIF',
  '2. MATRIKS TASK',
  '3. WORK IN PROGRESS (WAL)',
  '4. ASSUMPTIONS & OPEN QUESTIONS',
  '5. SLOT REVISI AKTIF',
  '6. CATATAN SERAH TERIMA',
  '7. LOG AUDIT'
];

export const CANONICAL_WAL_ITEMS = [
  'Task',
  'Langkah Sedang Dikerjakan',
  'Berkas Direncanakan/Disentuh',
  'Sudah Dilakukan',
  'Langkah Berikutnya (persis)',
  'Perintah Verifikasi',
  'Diperbarui'
];

export const REQUIRED_MATRIX_HEADERS = [
  'ID Task',
  'Nama',
  'Dependensi',
  'Status',
  'Bukti Verifikasi',
  'Disetujui'
];

/**
 * Validasi ketat integritas SESSION_STATE.md
 */
export function validateSessionStateIntegrity(content: string): IntegrityCheckResult {
  const baseResult = validateSessionState(content);
  const issues: ValidationIssue[] = [...baseResult.issues];
  let errorsCount = baseResult.errorsCount;
  let warningsCount = baseResult.warningsCount;

  // 1. Periksa 8 Bagian Kanonik
  const foundSections: string[] = [];
  const missingSections: string[] = [];

  for (const sec of CANONICAL_SECTIONS) {
    const secRegex = new RegExp(`^##\\s+${sec.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'm');
    if (secRegex.test(content)) {
      foundSections.push(sec);
    } else {
      missingSections.push(sec);
      // Jika belum dicatat oleh base validator
      if (!issues.some(iss => iss.code === 'MISSING_SECTION' && iss.message.includes(sec))) {
        issues.push({
          type: 'error',
          code: 'CANONICAL_SECTION_MISSING',
          message: `Bagian kanonik ZLCE tidak ditemukan: '## ${sec}'`,
          fixable: true
        });
        errorsCount++;
      }
    }
  }

  // Helper to extract a section's text by number accurately
  const getSectionText = (num: number): string => {
    const secHeaderRegex = new RegExp(`^##\\s+${num}\\..*?$`, 'm');
    const match = content.match(secHeaderRegex);
    if (!match || match.index === undefined) return '';

    const startIdx = match.index;
    const nextSecMatch = content.slice(startIdx + match[0].length).match(/^##\s+\d+\..*?$/m);
    const endIdx = nextSecMatch && nextSecMatch.index !== undefined
      ? startIdx + match[0].length + nextSecMatch.index
      : content.length;

    return content.slice(startIdx, endIdx);
  };

  // 2. Periksa Format Header Matriks Task (Bagian 2)
  let hasMatrixHeaderValid = false;
  const sec2Text = getSectionText(2);
  if (sec2Text) {
    const headerLineMatch = sec2Text.match(/\|\s*ID\s*Task\s*\|\s*Nama\s*\|\s*Dependensi\s*\|\s*Status\s*\|\s*Bukti\s*Verifikasi\s*\|\s*Disetujui\s*\|/i);
    if (headerLineMatch) {
      hasMatrixHeaderValid = true;
    } else {
      issues.push({
        type: 'error',
        code: 'INVALID_MATRIX_HEADER',
        message: 'Header tabel matriks task pada Bagian 2 tidak sesuai format kanonik: | ID Task | Nama | Dependensi | Status | Bukti Verifikasi | Disetujui |',
        fixable: true
      });
      errorsCount++;
    }
  }

  // 3. Periksa 7 Butir Kanonik WAL (Bagian 3)
  const foundWalItems: string[] = [];
  const missingWalItems: string[] = [];
  const sec3Text = getSectionText(3);

  if (sec3Text) {
    for (const item of CANONICAL_WAL_ITEMS) {
      const itemRegex = new RegExp(`\\*\\*${item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:\\*\\*`, 'i');
      if (itemRegex.test(sec3Text)) {
        foundWalItems.push(item);
      } else {
        missingWalItems.push(item);
        issues.push({
          type: 'error',
          code: 'MISSING_WAL_ITEM',
          message: `Butir kanonik WAL pada Bagian 3 tidak ditemukan: '**${item}:**'`,
          fixable: true
        });
        errorsCount++;
      }
    }
  } else {
    missingWalItems.push(...CANONICAL_WAL_ITEMS);
  }

  const hasCanonicalHeaders = missingSections.length === 0;
  const hasCanonicalWalItems = missingWalItems.length === 0;
  const isCheckScriptCompliant = errorsCount === 0 && hasCanonicalHeaders && hasMatrixHeaderValid && hasCanonicalWalItems;

  return {
    valid: errorsCount === 0,
    errorsCount,
    warningsCount,
    tasksCount: baseResult.tasksCount,
    inProgressTasks: baseResult.inProgressTasks,
    issues,
    hasCanonicalHeaders,
    hasCanonicalWalItems,
    hasMatrixHeaderValid,
    canonicalSectionsFound: foundSections,
    canonicalSectionsMissing: missingSections,
    walItemsFound: foundWalItems,
    walItemsMissing: missingWalItems,
    isCheckScriptCompliant
  };
}

/**
 * Utilitas otomatis untuk merapikan dan memulihkan integritas kanonik SESSION_STATE.md
 */
export function repairSessionStateCanonicalStructure(content: string): string {
  let text = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Pastikan Bagian 2 memiliki header tabel kanonik jika hilang
  if (/^##\s+2\. MATRIKS TASK/m.test(text) && !/\|\s*ID Task\s*\|/i.test(text)) {
    text = text.replace(
      /^##\s+2\. MATRIKS TASK.*$/m,
      `## 2. MATRIKS TASK\n\n| ID Task | Nama | Dependensi | Status | Bukti Verifikasi | Disetujui |\n| :--- | :--- | :--- | :--- | :--- | :--- |`
    );
  }

  // Pastikan 7 butir kanonik WAL tertera lengkap di Bagian 3
  const sec3Match = text.match(/^##\s+3\..*?$/m);
  if (sec3Match && sec3Match.index !== undefined) {
    const startIdx = sec3Match.index;
    const nextMatch = text.slice(startIdx + sec3Match[0].length).match(/^##\s+\d+\..*?$/m);
    const endIdx = nextMatch && nextMatch.index !== undefined
      ? startIdx + sec3Match[0].length + nextMatch.index
      : text.length;
    const sec3 = text.slice(startIdx, endIdx);

    let updatedSec3 = sec3;
    for (const item of CANONICAL_WAL_ITEMS) {
      const itemRegex = new RegExp(`\\*\\*${item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:\\*\\*`, 'i');
      if (!itemRegex.test(updatedSec3)) {
        updatedSec3 = updatedSec3.trimEnd() + `\n* **${item}:** -`;
      }
    }
    text = text.slice(0, startIdx) + updatedSec3 + '\n\n' + text.slice(endIdx).trimStart();
  }

  return text;
}
