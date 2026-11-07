/**
 * TC-P10-06 & TC-P12-06: Task Claim Exclusivity & Atomic CAS Guard Unit Test (AUD-006 & AUD2-006)
 * Memverifikasi:
 * 1. Penolakan mutlak klaim ganda jika ada task lain yang sedang berstatus IN_PROGRESS.
 * 2. verifyClaimExclusivity mendeteksi anomali jika lebih dari 1 task IN_PROGRESS.
 * 3. canClaimTask mengizinkan klaim jika tidak ada benturan dan dependensi DONE.
 * 4. takeoverTaskClaim mengalihkan klaim dengan alasan jejak audit yang valid.
 * 5. takeoverTaskClaim menolak alasan kosong/tidak memadai (< 5 karakter).
 * 6. Penomoran revisi klaim berjalan secara monotonik/atomik (revision sequence).
 * 7. Compare-and-Swap guard menolak klaim/takeover jika revision stale (AUD2-006).
 */

import {
  canClaimTask,
  claimTask,
  takeoverTaskClaim,
  verifyClaimExclusivity,
  getActiveClaimRevision,
  TASK_CLAIM_STORAGE_KEY
} from '../utils/taskClaimManager';
import { ParsedSessionState, ZLCETask } from '../types/zlce';
import { TeamMember } from '../types/mobile';

// Setup Mock Environment untuk Node.js / CLI
const mockStorage: Record<string, string> = {};
if (typeof (global as any).localStorage === 'undefined') {
  (global as any).localStorage = {
    getItem: (key: string) => mockStorage[key] || null,
    setItem: (key: string, val: string) => { mockStorage[key] = String(val); },
    removeItem: (key: string) => { delete mockStorage[key]; },
    clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
  };
}
if (typeof (global as any).window === 'undefined') {
  (global as any).window = {
    dispatchEvent: () => true
  };
}

const mockMemberA: TeamMember = {
  id: 'eko',
  name: 'Eko (Lead Arch)',
  role: 'LEAD',
  email: 'eko@dev.id',
  aiPreference: 'Claude 3.5 Sonnet',
  avatarColor: '#3b82f6'
};

const mockMemberB: TeamMember = {
  id: 'oned',
  name: 'Oned (Git/Sync)',
  role: 'MEMBER',
  email: 'oned@dev.id',
  aiPreference: 'ChatGPT-4o',
  avatarColor: '#10b981'
};

const mockTasks: ZLCETask[] = [
  { id: 'TASK-001', name: 'Task Satu', dependencies: '-', status: 'DONE', evidence: 'proof1', approved: 'ya (oleh: Eko)' },
  { id: 'TASK-002', name: 'Task Dua', dependencies: 'TASK-001', status: 'IN_PROGRESS', evidence: '-', approved: '-' },
  { id: 'TASK-003', name: 'Task Tiga', dependencies: 'TASK-001', status: 'READY', evidence: '-', approved: '-' },
  { id: 'TASK-004', name: 'Task Empat', dependencies: 'TASK-003', status: 'PENDING', evidence: '-', approved: '-' }
];

const mockSessionState: ParsedSessionState = {
  context: {
    projectName: 'Remix ZLCE Mobile Benchmark',
    stack: 'React + TypeScript + Vite',
    mode: 'FULL',
    fileWriteCapability: 'YES',
    execCapability: 'YES'
  },
  tasks: mockTasks,
  status: {
    activeTask: 'TASK-002',
    activeTaskStatus: 'IN_PROGRESS',
    gitBranch: 'task/TASK-002',
    lastDoneTask: 'TASK-001',
    nextTask: 'TASK-003',
    timestampAudit: '2026-11-06 06:30:00 WIB'
  },
  wal: {
    task: 'TASK-002',
    currentStep: 'Sedang dikerjakan oleh Eko',
    plannedFiles: 'src/file2.ts',
    completedSoFar: 'Mulai',
    nextStepExact: 'Selesaikan',
    verificationCommand: 'npm test',
    updatedTimestamp: '2026-11-06 06:30:00 WIB'
  },
  assumptions: [],
  revisions: [],
  handoverNotes: 'Catatan serah terima testing',
  auditLog: [],
  raw: ''
};

export function runTaskClaimExclusivityTests(): { passed: boolean; message: string; checks: { name: string; pass: boolean }[] } {
  const checks: { name: string; pass: boolean }[] = [];

  // Check 1: Penolakan mutlak klaim jika ada task lain yang IN_PROGRESS
  const claimCheckConflict = canClaimTask('TASK-003', mockSessionState);
  const pass1 = Boolean(!claimCheckConflict.allowed && claimCheckConflict.conflictingTaskId === 'TASK-002');
  checks.push({ name: 'Check 1: Penolakan klaim ganda saat ada task IN_PROGRESS aktif', pass: pass1 });

  // Check 2: verifyClaimExclusivity mendeteksi pelanggaran jika ada >1 IN_PROGRESS
  const corruptTasks: ZLCETask[] = [
    ...mockTasks,
    { id: 'TASK-005', name: 'Task Lima Bentrok', dependencies: '-', status: 'IN_PROGRESS', evidence: '-', approved: '-' }
  ];
  const exclusivityViolation = verifyClaimExclusivity(corruptTasks);
  const pass2 = Boolean(!exclusivityViolation.valid && exclusivityViolation.inProgressCount === 2);
  checks.push({ name: 'Check 2: verifyClaimExclusivity mendeteksi pelanggaran multi IN_PROGRESS', pass: pass2 });

  // Check 3: canClaimTask menolak task yang dependensinya belum DONE
  const stateNoActive: ParsedSessionState = {
    ...mockSessionState,
    tasks: mockTasks.map(t => t.id === 'TASK-002' ? { ...t, status: 'READY' } : t)
  };
  const claimCheckDep = canClaimTask('TASK-004', stateNoActive);
  const pass3 = Boolean(!claimCheckDep.allowed && claimCheckDep.reason?.includes('Dependensi belum terpenuhi'));
  checks.push({ name: 'Check 3: canClaimTask menolak klaim jika dependensi belum DONE', pass: pass3 });

  // Check 4: takeoverTaskClaim berhasil mengambil alih dengan alasan valid
  const takeoverRes = takeoverTaskClaim(
    'TASK-002',
    mockMemberB,
    'Anggota A offline, tugas dialihkan ke Oned sesuai jadwal estafet',
    mockSessionState
  );
  const pass4 = Boolean(
    takeoverRes.success && 
    takeoverRes.claim?.memberId === 'oned' && 
    takeoverRes.updatedState?.status.activeTask === 'TASK-002' &&
    takeoverRes.takeoverReason?.includes('sesuai jadwal estafet')
  );
  checks.push({ name: 'Check 4: takeoverTaskClaim mengalihkan klaim dengan jejak audit valid', pass: pass4 });

  // Check 5: takeoverTaskClaim menolak alasan kosong / terlalu pendek
  const takeoverReject = takeoverTaskClaim(
    'TASK-002',
    mockMemberB,
    'tes', // 3 karakter (< 5 karakter)
    mockSessionState
  );
  const pass5 = !takeoverReject.success && (takeoverReject.error?.includes('minimal 5 karakter') || false);
  checks.push({ name: 'Check 5: takeoverTaskClaim menolak alasan tidak memadai (< 5 char)', pass: pass5 });

  // Check 6: Penomoran revisi klaim berjalan secara monotonik (AUD2-006)
  const currentRev = getActiveClaimRevision();
  const claimSeqRes = takeoverTaskClaim(
    'TASK-002',
    mockMemberA,
    'Eko mengambil kembali task setelah koordinasi',
    mockSessionState
  );
  const pass6 = Boolean(
    claimSeqRes.success && 
    claimSeqRes.claim && 
    claimSeqRes.claim.revision > currentRev
  );
  checks.push({ name: 'Check 6: Monotonic revision sequence pada klaim task (AUD2-006)', pass: pass6 });

  // Check 7: Compare-and-Swap (CAS) guard menolak stale expectedRevision (AUD2-006)
  const staleRev = 999999;
  const staleClaimRes = takeoverTaskClaim(
    'TASK-002',
    mockMemberB,
    'Mencoba takeover dengan revisi usang',
    mockSessionState,
    staleRev
  );
  const pass7 = Boolean(!staleClaimRes.success && staleClaimRes.error?.includes('STALE_REVISION'));
  checks.push({ name: 'Check 7: CAS guard menolak mutasi dengan stale revision (AUD2-006)', pass: pass7 });

  const allPassed = checks.every(c => c.pass);
  return {
    passed: allPassed,
    message: allPassed 
      ? 'TC-P10-06 & TC-P12-06 PASS (7/7 checks): Task Claim Exclusivity & CAS Atomic Guard terverifikasi sempurna'
      : 'TC-P10-06 & TC-P12-06 FAIL: Sebagian pemeriksaan klaim eksklusivitas gagal',
    checks
  };
}

// CLI Execution Support
if (typeof process !== 'undefined' && process.argv[1]?.includes('taskClaim.test')) {
  const result = runTaskClaimExclusivityTests();
  console.log(`\n=== TC-P10-06 & TC-P12-06: Task Claim Exclusivity & CAS Guard Test ===`);
  result.checks.forEach(c => {
    console.log(`[${c.pass ? 'PASS' : 'FAIL'}] ${c.name}`);
  });
  console.log(`\nResult: ${result.message}\n`);
  if (!result.passed) {
    process.exit(1);
  }
}
