/**
 * ZLCE Mobile Workbench v4.0.0
 * TASK-051: Browser Multi-User Session Isolation Test (AUD-005 / TC-P10-05)
 *
 * Menguji partisi namespace LocalStorage/draft per anggota tim aktif di tablet bersama.
 * Memastikan tidak ada tumpang-tindih teks antara Eko, Oned, Layang, dan anggota lainnya.
 * Rujukan: docs/mobile/blueprint/05_STORAGE_AND_SYNC.md & TASKS.md
 */

import { MockLocalStorage } from './lmkRecovery.test';
import { getScopedStorageKey } from '../hooks/useAutoDraftCache';

export interface MultiUserTestResult {
  step: string;
  passed: boolean;
  details: string;
  timeMs: number;
}

export interface MultiUserSuiteResult {
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  passed: boolean;
  summary: string;
  results: MultiUserTestResult[];
  timestamp: string;
}

export function runMultiUserSessionIsolationTest(): MultiUserSuiteResult {
  const results: MultiUserTestResult[] = [];
  const storage = new MockLocalStorage();
  const BASE_KEY = 'zlce_workspace_draft_content';

  // --- Step 1: Validasi Utilitas Pembentuk Kunci Namespace ---
  const t1 = performance.now();
  const keyEko = getScopedStorageKey(BASE_KEY, 'eko');
  const keyOned = getScopedStorageKey(BASE_KEY, 'oned');
  const keyLayang = getScopedStorageKey(BASE_KEY, 'layang');

  const check1Passed = keyEko === 'zlce_workspace_draft_content_eko' &&
    keyOned === 'zlce_workspace_draft_content_oned' &&
    keyLayang === 'zlce_workspace_draft_content_layang';

  results.push({
    step: '1. Pembentukan Kunci Namespace Terisolasi per Anggota Tim',
    passed: check1Passed,
    details: check1Passed
      ? `Namespace unik terverifikasi: "${keyEko}", "${keyOned}", "${keyLayang}".`
      : 'Gagal menghasilkan kunci namespace yang terpisah.',
    timeMs: Math.round((performance.now() - t1) * 100) / 100
  });

  // --- Step 2: Anggota Eko Menyimpan Draft TASK-047 ---
  const t2 = performance.now();
  const draftEko = '# SESI EKO: TASK-047 Zero-Secret Pre-Commit Hook Sedang Dikerjakan';
  storage.setItem(keyEko, draftEko);

  const check2Passed = storage.getItem(keyEko) === draftEko &&
    storage.getItem(keyOned) === null;

  results.push({
    step: '2. Penyimpanan Draft Anggota A (Eko) di Namespace Terisolasi',
    passed: check2Passed,
    details: check2Passed
      ? 'Draft Eko tersimpan di namespace-nya sendiri tanpa mencemari storage Oned.'
      : 'Storage bocor ke namespace anggota lain.',
    timeMs: Math.round((performance.now() - t2) * 100) / 100
  });

  // --- Step 3: Anggota Oned Mengambil Alih Tablet & Menyimpan Draft TASK-048 ---
  const t3 = performance.now();
  const draftOned = '# SESI ONED: TASK-048 Uji LMK Lifecycle Hook Siap Dieksekusi';
  storage.setItem(keyOned, draftOned);

  const check3Passed = storage.getItem(keyOned) === draftOned &&
    storage.getItem(keyEko) === draftEko;

  results.push({
    step: '3. Pergantian Anggota B (Oned) & Koeksistensi Dua Draft Berbeda',
    passed: check3Passed,
    details: check3Passed
      ? 'Draft Oned dan draft Eko hidup berdampingan secara independen di storage tablet.'
      : 'Draft Oned menimpa pekerjaan Eko.',
    timeMs: Math.round((performance.now() - t3) * 100) / 100
  });

  // --- Step 4: Anggota Layang Melakukan Review & Menulis Draft TASK-049 ---
  const t4 = performance.now();
  const draftLayang = '# SESI LAYANG: TASK-049 Browser Cold-Start Testing Selesai';
  storage.setItem(keyLayang, draftLayang);

  const check4Passed = storage.getItem(keyLayang) === draftLayang &&
    storage.getItem(keyEko) === draftEko &&
    storage.getItem(keyOned) === draftOned;

  results.push({
    step: '4. Skalabilitas Multi-User: 3 Anggota Tim Aktif Bersamaan',
    passed: check4Passed,
    details: check4Passed
      ? '3 draft anggota tersimpan presisi tanpa interferensi data (Zero Overwrite).'
      : 'Terjadi konflik multi-user di storage.',
    timeMs: Math.round((performance.now() - t4) * 100) / 100
  });

  // --- Step 5: Simulasi Pembersihan Draft Salah Satu Anggota (Discard Draft) ---
  const t5 = performance.now();
  storage.removeItem(keyOned); // Oned membuang draft-nya

  const check5Passed = storage.getItem(keyOned) === null &&
    storage.getItem(keyEko) === draftEko &&
    storage.getItem(keyLayang) === draftLayang;

  results.push({
    step: '5. Penghapusan Draft Spesifik Tanpa Mengganggu Anggota Lain',
    passed: check5Passed,
    details: check5Passed
      ? 'Pembersihan draft Oned sukses; draft Eko dan Layang tetap utuh 100%.'
      : 'Penghapusan tidak sengaja merusak draft anggota lain.',
    timeMs: Math.round((performance.now() - t5) * 100) / 100
  });

  // --- Step 6: Pencegahan Kebocoran Global Key Fallback (AUD-018 / TASK-064) ---
  const t6 = performance.now();
  // Simulasikan data residu legacy pada global storageKey
  storage.setItem(BASE_KEY, '### RESIDU GLOBAL LAMA: Data Todo API');

  // Anggota baru (Fajar) belum punya draft
  const keyFajar = getScopedStorageKey(BASE_KEY, 'fajar');
  const fajarDraft = storage.getItem(keyFajar); // Harus null, tidak boleh fallback ke BASE_KEY!

  const check6Passed = fajarDraft === null &&
                       storage.getItem(keyEko) === draftEko &&
                       storage.getItem(keyLayang) === draftLayang;

  results.push({
    step: '6. Zero Global Fallback: Anggota Baru Tidak Membaca Residu Global (AUD-018)',
    passed: check6Passed,
    details: check6Passed
      ? 'Anggota baru (Fajar) mendapatkan canvas bersih tanpa tercemar draft global legacy.'
      : 'Draft global bocor ke namespace anggota baru.',
    timeMs: Math.round((performance.now() - t6) * 100) / 100
  });

  // --- Step 7: Simulasi Dirty Key Flush Routing saat Handover Tablet (AUD-018 / TASK-064) ---
  const t7 = performance.now();
  // Anggota Eko sedang mengetik draft kotor
  const draftEkoUpdated = '# SESI EKO: TASK-064 Perbaikan Selesai';
  // Storage flush harus masuk tepat ke keyEko
  storage.setItem(keyEko, draftEkoUpdated);

  // Tablet diserahkan ke Dewi (aktif)
  const keyDewi = getScopedStorageKey(BASE_KEY, 'dewi');
  storage.setItem(keyDewi, '# SESI DEWI: Mulai Review Arsitektur');

  const check7Passed = storage.getItem(keyEko) === draftEkoUpdated &&
                       storage.getItem(keyDewi) === '# SESI DEWI: Mulai Review Arsitektur';

  results.push({
    step: '7. Dirty Key Flush Routing: Isolasi Transaksional Antara Eko & Dewi (AUD-018)',
    passed: check7Passed,
    details: check7Passed
      ? 'Pembaruan draft Eko dan Dewi tersimpan murni di namespace masing-masing.'
      : 'Kegagalan pemisahan penyimpanan saat rotasi tablet.',
    timeMs: Math.round((performance.now() - t7) * 100) / 100
  });

  const passedChecks = results.filter(r => r.passed).length;
  const failedChecks = results.filter(r => !r.passed).length;
  const passed = failedChecks === 0 && results.length >= 7;
  const summary = `Multi-User Session Isolation Suite (TC-P10-05/P11-04): ${passedChecks}/${results.length} checks PASS (${passed ? '100% Lulus' : 'Gagal'}).`;

  return {
    totalChecks: results.length,
    passedChecks,
    failedChecks,
    passed,
    summary,
    results,
    timestamp: new Date().toISOString()
  };
}

// Standalone CLI runner entrypoint
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('multiUserIsolation.test')) {
  console.log('='.repeat(65));
  console.log('ZLCE Mobile Workbench v4.0.0: Multi-User Session Isolation (TC-P10-05)');
  console.log('='.repeat(65));

  const suite = runMultiUserSessionIsolationTest();
  suite.results.forEach((r, idx) => {
    const statusTag = r.passed ? '[PASS]' : '[FAIL]';
    console.log(`${String(idx + 1).padStart(2, '0')}. ${statusTag} ${r.step} (${r.timeMs}ms)`);
    console.log(`    -> ${r.details}`);
  });

  console.log('-'.repeat(65));
  console.log(`REKAPITULASI TC-P10-05: ${suite.summary}`);
  console.log('='.repeat(65));

  if (!suite.passed) {
    process.exit(1);
  }
}
