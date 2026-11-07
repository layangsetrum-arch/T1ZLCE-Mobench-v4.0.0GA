/**
 * ZLCE Automated Test Suite: TC-P3-06 Uji Cold-Start Lintas AI (Claude -> Gemini)
 * Memverifikasi Invarian I2 (Cold-Start Resume): Sesi kerja dapat dilanjutkan
 * oleh model AI baru secara murni dari berkas repositori dan Context Pack tanpa riwayat chat.
 * Rujukan: docs/mobile/blueprint/10_TEST_STRATEGY.md & 14_MULTI_AI_TEAM_MODEL.md
 */

import fs from 'fs';
import path from 'path';
import { parseSessionStateMarkdown } from '../utils/markdownParser';
import { generatePortableContextPack } from '../utils/contextPackGenerator';
import { 
  generateHandoverPrompt, 
  detectDecisionConflicts, 
  resolveDecisionConflict, 
  generateHandoverSummaryEntry 
} from '../utils/conflictDetector';
import { generateRelayHandover } from '../utils/relayHandoverGenerator';
import { getModelBudgetProfile, calculateTokenSafety, pruneContextForBudget } from '../utils/tokenBudgetAdapter';
import { getModelStopToken } from '../utils/promptGenerator';
import { TEAM_MEMBERS } from '../data/teamMembers';
import { ParsedSessionState, ZLCETask } from '../types/zlce';

export interface ColdStartCheckResult {
  id: string;
  name: string;
  passed: boolean;
  details: string;
}

export interface ColdStartSuiteResult {
  success: boolean;
  checks: ColdStartCheckResult[];
  passedCount: number;
  totalCount: number;
  summary: string;
  sourceAi: string;
  targetAi: string;
  taskId: string;
  generatedPromptPreview: string;
}

/**
 * Eksekutor Pengujian Cold-Start Lintas AI (Claude -> Gemini)
 * Dapat dipanggil baik via CLI (Node.js/tsx) maupun di UI TestHarnessTab.
 */
export function runColdStartTestSuite(customSessionState?: ParsedSessionState): ColdStartSuiteResult {
  const checks: ColdStartCheckResult[] = [];

  // 1. Dapatkan Session State (dari parameter atau membaca berkas lokal)
  let session: ParsedSessionState;
  if (customSessionState) {
    session = customSessionState;
  } else {
    try {
      if (typeof process !== 'undefined' && typeof process.cwd === 'function' && typeof fs?.readFileSync === 'function') {
        const sessionPath = path.resolve(process.cwd(), 'SESSION_STATE.md');
        const content = fs.readFileSync(sessionPath, 'utf8');
        session = parseSessionStateMarkdown(content);
      } else {
        throw new Error('Not running in Node fs environment');
      }
    } catch {
      // Fallback state jika berjalan di peramban tanpa fs
      session = {
        context: {
          projectName: 'ZLCE Mobile Workbench v4.0.0',
          stack: 'React 19 + TypeScript + Vite + Tailwind CSS + Termux',
          mode: 'FULL',
          fileWriteCapability: 'YA',
          execCapability: 'YA'
        },
        status: {
          timestampAudit: '2026-11-05 10:15:00 WIB',
          gitBranch: 'v4-mobile',
          lastDoneTask: 'TASK-017',
          activeTask: 'TASK-018',
          activeTaskStatus: 'READY',
          nextTask: 'TASK-019'
        },
        tasks: [
          { id: 'TASK-017', name: 'Handover Manager Lintas AI', dependencies: 'TASK-016', status: 'DONE', evidence: 'TC-P3-05b pass', approved: 'ya' },
          { id: 'TASK-018', name: 'Test Suite Uji Cold-Start Lintas AI', dependencies: 'TASK-017', status: 'READY', evidence: '-', approved: '-' }
        ],
        wal: {
          task: 'TASK-018',
          currentStep: 'Menyiapkan test suite coldStartAi.test.ts',
          plannedFiles: 'src/tests/coldStartAi.test.ts, src/components/TestHarnessTab.tsx',
          completedSoFar: 'Menyusun spesifikasi Acceptance Criteria 1, 2, 3',
          nextStepExact: 'Eksekusi suite uji TC-P3-06 di Test Harness',
          verificationCommand: 'npm test',
          updatedTimestamp: '2026-11-05 10:15:00 WIB'
        },
        assumptions: [
          { id: 'ASM-01', type: 'Asumsi', content: 'Obsidian dieksklusikan dari Blueprint Inti v4.0.0 (ADR-09)', impactIfWrong: 'Sistem mandiri', status: 'CONFIRMED' }
        ],
        revisions: [],
        handoverNotes: 'Sesi Claude dialihkan ke Gemini karena rotasi token.',
        auditLog: []
      };
    }
  }

  const activeMember = TEAM_MEMBERS[1]; // Oned
  const taskToTest: ZLCETask = {
    id: 'TASK-018',
    name: 'Test Suite Uji Cold-Start Lintas AI (Claude -> Gemini)',
    dependencies: 'TASK-017',
    status: 'READY',
    evidence: '-',
    approved: '-'
  };

  // CHECK 1: Acceptance Criteria 1 - Context Pack memuat 100% parameter pemulihan state
  const contextPackOutput = generatePortableContextPack({
    task: taskToTest,
    sessionState: session,
    activeMember,
    targetAi: 'gemini',
    tokenBudgetPreset: 'gemini-1m'
  });
  const contextPack = contextPackOutput.markdown;

  const hasMandate = contextPack.includes('MANDAT TUGAS AKTIF') && contextPack.includes('TASK-018');
  const hasAnchor = contextPack.includes('JANGKAR KEBENARAN') || contextPack.includes('TIER 0');
  const hasWal = contextPack.includes('STATUS TERKINI & WAL') || contextPack.includes('STATUS SESI');
  const hasRules = contextPack.includes('ATURAN KERJA') || contextPack.includes('STOP TOKEN');
  const hasProvenance = contextPack.includes(activeMember.name) && contextPack.includes('task/TASK-018');

  const check1Passed = Boolean(hasMandate && hasAnchor && hasWal && hasRules && hasProvenance);
  checks.push({
    id: 'CHK-01-STATE-RECOVERY',
    name: 'Kelengkapan Parameter Pemulihan State (Invarian I1 & I2)',
    passed: check1Passed,
    details: check1Passed 
      ? 'Context Pack memuat 100% komponen wajib (Mandat Task, Jangkar Tier 0, WAL Aktif, Aturan Stop Token, Provenance Aktor).'
      : 'Gagal: Context Pack kehilangan sebagian parameter wajib pemulihan state.'
  });

  // CHECK 2: Acceptance Criteria 2 - Skenario Pergantian Claude -> Gemini Menghasilkan Instruksi Valid
  const handoverPrompt = generateHandoverPrompt({
    sourceAi: 'Anthropic Claude (Claude 3.5 Sonnet)',
    targetAi: 'gemini',
    reason: 'Rate limit kuota harian Claude tercapai pada sesi tablet',
    taskId: 'TASK-018',
    activeMember,
    sessionState: session,
    conflicts: []
  });

  const hasCidiContext = handoverPrompt.includes('### C - CONTEXT');
  const hasCidiInstruction = handoverPrompt.includes('### I - INSTRUCTION');
  const hasCidiDetails = handoverPrompt.includes('### D - DETAILS');
  const hasCidiSchema = handoverPrompt.includes('### I - INPUT / OUTPUT SCHEMA');
  const hasGeminiStopToken = handoverPrompt.includes(getModelStopToken('gemini'));
  const hasNextStepExact = handoverPrompt.includes(session.wal.nextStepExact || 'Eksekusi suite uji');

  const check2Passed = Boolean(
    hasCidiContext && 
    hasCidiInstruction && 
    hasCidiDetails && 
    hasCidiSchema && 
    hasGeminiStopToken && 
    hasNextStepExact
  );

  checks.push({
    id: 'CHK-02-CLAUDE-TO-GEMINI-HANDOVER',
    name: 'Validitas Instruksi Serah Terima Claude -> Gemini (Format C-I-D-I)',
    passed: check2Passed,
    details: check2Passed
      ? 'Prompt handover C-I-D-I berhasil disusun untuk Gemini, mewarisi persis langkah WAL berikutnya dan menyematkan stop token Gemini.'
      : 'Gagal: Format C-I-D-I atau pewarisan langkah WAL berikutnya tidak konsisten.'
  });

  // CHECK 3: Deteksi Konflik & Penolakan Divergensi pada Sesi Baru (Invarian I3)
  const simulatedGeminiDivergence = `
Saya Gemini, saya usulkan kita ubah arsitektur dan pasang server backend Express dan integrasi plugin Obsidian.
Status task: IN_PROGRESS
`;
  const conflictsDetected = detectDecisionConflicts({
    sourceAi: 'claude',
    targetAi: 'gemini',
    targetAiProposalText: simulatedGeminiDivergence,
    currentSessionState: session,
    activeTask: taskToTest
  });

  const detectedObsidian = conflictsDetected.some(c => c.title.includes('Obsidian'));
  const detectedBackend = conflictsDetected.some(c => c.title.includes('Framework Server') || c.category === 'DEPENDENCY_CHANGE');
  const check3Passed = Boolean(detectedObsidian && detectedBackend);

  checks.push({
    id: 'CHK-03-DIVERGENCE-RESISTANCE',
    name: 'Ketahanan Terhadap Halusinasi & Deviasi Arsitektur Model Baru',
    passed: check3Passed,
    details: check3Passed
      ? 'Sistem berhasil mendeteksi dan menolak 2 divergensi kritis pada calon respons Gemini (Pelanggaran ADR-09 Obsidian & Framework Server Backend).'
      : 'Gagal: Mesin deteksi konflik gagal memblokir deviasi arsitektur.'
  });

  // CHECK 4: Adaptasi Profil Anggaran Token Gemini (1M Context vs 30K Claude)
  const profileGemini = getModelBudgetProfile('gemini-1m');
  const profileClaude = getModelBudgetProfile('claude-30k');
  const check4Passed = Boolean(
    profileGemini && 
    profileClaude && 
    profileGemini.maxTokenLimit > profileClaude.maxTokenLimit
  );

  checks.push({
    id: 'CHK-04-TOKEN-BUDGET-ADAPTATION',
    name: 'Adaptasi Anggaran Token Dinamis (Gemini 1M vs Claude 30K)',
    passed: check4Passed,
    details: check4Passed
      ? `Profil anggaran token valid: Gemini dialokasikan ${profileGemini.maxTokenLimit.toLocaleString()} token (Large Buffer) vs Claude ${profileClaude.maxTokenLimit.toLocaleString()} token.`
      : 'Gagal: Konfigurasi kuota token tidak sesuai profil model.'
  });

  // CHECK 5: Preservasi Invarian I4 (Strict Provenance Tracking) pada Catatan Serah Terima
  const handoverSummary = generateHandoverSummaryEntry({
    sourceAi: 'Claude 3.5 Sonnet',
    targetAi: 'Gemini 3.8 Flash',
    reason: 'TOKEN_LIMIT_REACHED',
    taskId: 'TASK-018',
    conflicts: [],
    activeMemberName: activeMember.name
  });

  const check5Passed = Boolean(
    handoverSummary.includes('Claude 3.5 Sonnet') &&
    handoverSummary.includes('Gemini 3.8 Flash') &&
    handoverSummary.includes('TASK-018') &&
    handoverSummary.includes(activeMember.name)
  );

  checks.push({
    id: 'CHK-05-PROVENANCE-PRESERVATION',
    name: 'Preservasi Pelacakan Provenance (Invarian I4)',
    passed: check5Passed,
    details: check5Passed
      ? `Catatan serah terima Bagian 6 memuat seluruh atribut pelacakan: Model Asal, Model Tujuan, Task ID, dan Operator (@${activeMember.id}).`
      : 'Gagal: Metadata provenance serah terima tidak lengkap.'
  });

  // Rekapitulasi Hasil Suite
  const passedCount = checks.filter(c => c.passed).length;
  const totalCount = checks.length;
  const allSuccess = passedCount === totalCount;

  return {
    success: allSuccess,
    checks,
    passedCount,
    totalCount,
    summary: allSuccess 
      ? `LULUS 100% (${passedCount}/${totalCount} Checks PASS) - Invarian I2 Cold-Start Lintas AI Terkonfirmasi Memenuhi Syarat.`
      : `GAGAL (${passedCount}/${totalCount} Checks PASS) - Terdapat deviasi pada skenario serah terima.`,
    sourceAi: 'Anthropic Claude 3.5 Sonnet',
    targetAi: 'Google Gemini 3.8 Flash',
    taskId: 'TASK-018',
    generatedPromptPreview: handoverPrompt
  };
}

// Eksekusi jika dijalankan secara langsung via CLI (tsx src/tests/coldStartAi.test.ts)
if (
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  Boolean(process.argv[1]?.includes('coldStartAi.test.ts'))
) {
  console.log('='.repeat(65));
  console.log('TC-P3-06: Uji Cold-Start Lintas AI (Claude -> Gemini) - Invarian I2');
  console.log('='.repeat(65));

  const result = runColdStartTestSuite();
  result.checks.forEach((chk, idx) => {
    console.log(`[${idx + 1}/${result.totalCount}] ${chk.name}: ${chk.passed ? 'PASS' : 'FAIL'}`);
    console.log(`    ${chk.details}`);
  });

  console.log('='.repeat(65));
  console.log(`HASIL AKHIR: ${result.summary}`);
  console.log('='.repeat(65));

  if (!result.success && typeof process.exit === 'function') {
    process.exit(1);
  }
}

