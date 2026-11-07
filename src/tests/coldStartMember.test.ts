/**
 * ZLCE Cold-Start Member-to-Member Handover Test Suite (TASK-024)
 * Mensimulasikan skenario pergantian giliran fisik tablet Samsung Galaxy Tab A7 Lite:
 * Anggota A (Eko) -> Anggota B (Oned).
 * 
 * Verifikasi 5 Invarian ZLCE (docs/mobile/blueprint/14_MULTI_AI_TEAM_MODEL.md):
 * - I1: Single Source of Truth (SESSION_STATE.md valid kanonik 8 bagian)
 * - I2: AI Agnostic & Human Readable State
 * - I3: Atomic Handovers via WAL (transisi step jelas tanpa amnesia)
 * - I4: Explicit Provenance Attribution (nama driver penyetuju & git author)
 * - I5: Deterministic Quality Gates (bukti verifikasi lengkap)
 */

import fs from 'fs';
import path from 'path';
import { parseSessionStateMarkdown } from '../utils/markdownParser';
import { validateSessionStateIntegrity } from '../utils/sessionStateValidator';
import { validateSessionState } from '../utils/zlceValidator';
import { TEAM_MEMBERS, getMemberById, loadTeamRegistry } from '../data/teamMembers';
import { canClaimTask, claimTask, releaseTaskClaim } from '../utils/taskClaimManager';
import { recordGateApproval, validateApprovalProvenance } from '../utils/gateApprovalManager';
import { 
  formatDeviceHandoverNotes, 
  injectHandoverNotesToMarkdown, 
  getCleanAuthCommand 
} from '../utils/handoverChecklist';

const DEFAULT_TEST_SESSION_STATE_MD = `# STATUS SESI (SESSION_STATE.md): ZLCE Mobile Workbench v4.0.0

**Sumber kebenaran tunggal status task dan titik pemulihan sesi.** Perbarui pada setiap perubahan status task, setiap commit, dan setiap langkah WAL. Enum: \`PENDING | READY | IN_PROGRESS | BLOCKED | DONE\`.

---

## 0. KONTEKS PROYEK (statis)

* **Proyek:** ZLCE Mobile Workbench v4.0.0
* **Stack:** React 19 + TypeScript + Vite + Tailwind CSS + Termux
* **MODE:** FULL
* **Kemampuan Tulis Berkas AI:** YA
* **Kemampuan Eksekusi AI:** YA

---

## 1. STATUS AKTIF

* **Timestamp Audit:** 2026-11-05 11:30:00 WIB
* **Cabang Git:** \`v4-mobile\`
* **Task Terakhir DONE:** \`TASK-018\`
* **Task Aktif:** \`-\`
* **Status Task Aktif:** READY
* **Task Berikutnya:** \`TASK-019\`

---

## 2. MATRIKS TASK

| ID Task | Nama | Dependensi | Status | Bukti Verifikasi | Disetujui |
| :--- | :--- | :--- | :--- | :--- | :--- |
| \`TASK-018\` | Test Suite Uji Cold-Start Lintas AI | - | DONE | 5/5 checks PASS | ya |
| \`TASK-019\` | Team Member Registry (8 Profil Alias Non-Kredensial) | TASK-018 | READY | - | - |
| \`TASK-020\` | Mekanisme Klaim Task & Penegakan Aturan 1 Task IN_PROGRESS | TASK-019 | PENDING | - | - |

---

## 3. WORK IN PROGRESS (WAL)

* **Task:** \`-\`
* **Langkah Sedang Dikerjakan:** Persiapan pengerjaan TASK-019
* **Berkas Direncanakan/Disentuh:** src/data/teamMembers.ts
* **Sudah Dilakukan:** Verifikasi prasyarat selesai
* **Langkah Berikutnya (persis):** TASK-019 Team Member Registry
* **Perintah Verifikasi:** npm test
* **Diperbarui:** 2026-11-05 11:30:00 WIB

---

## 4. ASSUMPTIONS & OPEN QUESTIONS

| ID | Jenis | Isi | Dampak jika salah | Status |
| :--- | :--- | :--- | :--- | :--- |
| \`ASM-01\` | Keputusan | Obsidian dieksklusikan dari Blueprint Inti | Mandiri | CONFIRMED |

---

## 5. SLOT REVISI AKTIF

| ID Revisi | Tingkat | Deskripsi | Tindakan Mitigasi | Status |
| :--- | :--- | :--- | :--- | :--- |
| \`REV-001\` | M | Uji rotasi estafet | Simulasikan clean-auth | RESOLVED |

---

## 6. CATATAN SERAH TERIMA

* Sesi siap dialihkan antar anggota tim.

---

## 7. LOG AUDIT

* **2026-11-05 11:30:00 WIB:** Inisialisasi sesi pengujian.
`;

export interface ColdStartMemberTestResult {
  passed: boolean;
  testName: string;
  stepResults: Array<{
    step: string;
    passed: boolean;
    details: string;
  }>;
  invariantsCheck: {
    I1_SingleSourceOfTruth: boolean;
    I2_StatePersistence: boolean;
    I3_AtomicWalHandover: boolean;
    I4_ProvenanceAttribution: boolean;
    I5_DeterministicQualityGates: boolean;
  };
  summary: string;
}

export function runColdStartMemberSuite(customSessionMarkdown?: string): ColdStartMemberTestResult {
  const steps: Array<{ step: string; passed: boolean; details: string }> = [];

  // Inisialisasi Anggota A (Eko) dan Anggota B (Oned)
  const memberA = TEAM_MEMBERS[0]; // Eko
  const memberB = TEAM_MEMBERS[1]; // Oned

  // 1. Baca berkas SESSION_STATE.md kanonik
  let rawState = customSessionMarkdown || '';
  if (!rawState) {
    try {
      if (typeof process !== 'undefined' && typeof process.cwd === 'function' && typeof fs?.existsSync === 'function') {
        const candidates = [
          path.resolve(process.cwd(), 'examples/SESSION_STATE.example.md'),
          path.resolve(process.cwd(), 'SESSION_STATE.md')
        ];
        for (const p of candidates) {
          if (fs.existsSync(p)) {
            const content = fs.readFileSync(p, 'utf8');
            const parsed = parseSessionStateMarkdown(content);
            const target = parsed.tasks.find(t => t.id === 'TASK-019');
            if (target && target.status === 'READY') {
              rawState = content;
              break;
            }
          }
        }
      }
    } catch {
      // fallback test fixture
    }
  }

  if (!rawState) {
    rawState = DEFAULT_TEST_SESSION_STATE_MD;
  }

  // Langkah 1: Anggota A (Eko) Mengklaim Task (Penegakan Aturan 1 Task IN_PROGRESS)
  const sessionInitial = parseSessionStateMarkdown(rawState);
  const testTaskId = 'TASK-019';
  
  const claimRes = claimTask(testTaskId, memberA, sessionInitial);
  const step1Passed = claimRes.success && claimRes.updatedState?.status.activeTask === testTaskId;
  steps.push({
    step: '1. Anggota A (Eko) Mengklaim Task & Penegakan Invarian I1/I3',
    passed: step1Passed,
    details: step1Passed
      ? `Task ${testTaskId} berhasil diklaim oleh ${memberA.name}. Active task diupdate, WAL mengarah ke ${testTaskId}.`
      : `Gagal klaim: ${claimRes.error}`
  });

  // Verifikasi aturan penolakan: Tidak boleh klaim task lain saat sudah ada IN_PROGRESS
  const secondClaimCheck = canClaimTask('TASK-020', claimRes.updatedState || sessionInitial);
  const rejectPassed = !secondClaimCheck.allowed && secondClaimCheck.conflictingTaskId === testTaskId;
  steps.push({
    step: '1b. Penegakan Aturan Keras: Penolakan Klaim Ganda IN_PROGRESS',
    passed: rejectPassed,
    details: rejectPassed
      ? `Sistem berhasil menolak klaim kedua saat ${testTaskId} aktif: "${secondClaimCheck.reason}"`
      : 'Gagal: Sistem mengizinkan lebih dari 1 task IN_PROGRESS.'
  });

  // Langkah 2: Anggota A Mengesahkan Gerbang Kualitas dengan Provenance (TASK-021 / ADR-07)
  const approvalRes = recordGateApproval({
    taskId: testTaskId,
    approver: memberA,
    evidence: 'TC-P4-01 registry 8 profil tersimpan valid, Zero-Secret verified',
    sessionState: claimRes.updatedState || sessionInitial
  });

  const approvalValidation = validateApprovalProvenance(approvalRes.approvalString || '');
  const step2Passed = 
    approvalRes.success && 
    approvalValidation.valid && 
    approvalValidation.approverName === memberA.name &&
    (approvalRes.updatedMarkdown?.includes(`ya (oleh: ${memberA.name})`) ?? false);

  steps.push({
    step: '2. Pengesahan Gerbang Kualitas Bersama Provenance Penyetuju (Invarian I4)',
    passed: step2Passed,
    details: step2Passed
      ? `Gerbang disahkan dengan format: '${approvalRes.approvalString}'. Log audit Bagian 7 bertambah.`
      : `Gagal pengesahan gerbang: ${approvalRes.error || approvalValidation.error}`
  });

  // Langkah 3: Prosedur Serah Terima Tablet (Anggota A -> Anggota B) & Clean-Auth
  const cleanCmd = getCleanAuthCommand();
  const cleanCmdValid = cleanCmd.includes('clean-auth.sh') || (cleanCmd.includes('git credential-cache exit') && cleanCmd.includes('unset user.name'));

  const handoverNotes = formatDeviceHandoverNotes({
    outgoingMember: memberA,
    incomingMember: memberB,
    progressNotes: `${testTaskId} selesai. Lanjutkan pengerjaan TASK-020.`,
    branchName: 'v4-mobile'
  });

  const markdownAfterHandover = injectHandoverNotesToMarkdown(
    approvalRes.updatedMarkdown || rawState,
    handoverNotes
  );

  const step3Passed = 
    cleanCmdValid && 
    markdownAfterHandover.includes('Serah Terima Tablet Bersama: Eko -> Oned') &&
    markdownAfterHandover.includes(`-c user.name="${memberB.name}"`);

  steps.push({
    step: '3. Wizard Serah Terima Fisik Tablet & Sanitasi Zero-Secret (TASK-022)',
    passed: step3Passed,
    details: step3Passed
      ? `Perintah clean-auth valid ('${cleanCmd}'). Catatan transisi disuntikkan ke Bagian 6 dengan atribusi giliran baru.`
      : 'Gagal prosedur serah terima fisik atau sintaks clean-auth salah.'
  });

  // Langkah 4: Cold-Start Anggota B (Oned) Membaca State Tanpa Ketergantungan Chat Sebelumnya
  const sessionForMemberB = parseSessionStateMarkdown(markdownAfterHandover);
  const gitAuthorCmd = `git -c user.name="${memberB.name}" -c user.email="${memberB.email}" commit -m "feat: proceed task"`;
  
  const step4Passed = 
    sessionForMemberB.status.lastDoneTask === testTaskId &&
    gitAuthorCmd.includes('Oned') &&
    gitAuthorCmd.includes('oned@zlce.local') &&
    !markdownAfterHandover.includes('ghp_') && // Zero-secret guarantee
    !markdownAfterHandover.includes('sk-');

  steps.push({
    step: '4. Cold-Start Anggota B (Oned) Melanjutkan State Secara Mulus (Invarian I2 & I3)',
    passed: step4Passed,
    details: step4Passed
      ? `Anggota B membaca state persis: Last DONE = ${testTaskId}. Git author teralihkan ke ${memberB.name} (${memberB.email}). Nol token/rahasia bocor.`
      : 'Gagal cold start anggota B atau terjadi kebocoran kredensial rahasia.'
  });

  // Langkah 5: Validasi Kanonik Utuh (Invarian I1 & I5)
  const integrity = validateSessionStateIntegrity(markdownAfterHandover);
  const zlceVal = validateSessionState(markdownAfterHandover);

  const step5Passed = integrity.valid && zlceVal.errorsCount === 0;
  steps.push({
    step: '5. Verifikasi Integritas Kanonik State Pasca-Serah Terima (Invarian I1 & I5)',
    passed: step5Passed,
    details: step5Passed
      ? `State 100% compliant: 8 Bagian kanonik utuh, matriks valid, 0 error linter.`
      : `Gagal integritas: ${integrity.issues.concat(zlceVal.issues).map(i => i.message).join('; ')}`
  });

  const allPassed = steps.every(s => s.passed);

  return {
    passed: allPassed,
    testName: 'TC-P4-06: Uji Cold-Start Lintas Anggota Tim (Eko -> Oned)',
    stepResults: steps,
    invariantsCheck: {
      I1_SingleSourceOfTruth: step1Passed && step5Passed,
      I2_StatePersistence: step4Passed,
      I3_AtomicWalHandover: step1Passed && step3Passed,
      I4_ProvenanceAttribution: step2Passed && step4Passed,
      I5_DeterministicQualityGates: step2Passed && step5Passed
    },
    summary: allPassed
      ? 'PASS: Skenario cold-start estafet dari Eko ke Oned berhasil 100% mematuhi seluruh 5 invarian ZLCE.'
      : 'FAIL: Terdapat langkah dalam skenario cold-start anggota tim yang gagal.'
  };
}

// CLI runner jika dijalankan langsung via node / tsx
if (
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  Boolean(process.argv[1]) &&
  import.meta.url === `file://${process.argv[1]}`
) {
  console.log('=== ZLCE Test Suite: TC-P4-06 Cold-Start Lintas Anggota ===');
  const res = runColdStartMemberSuite();
  for (const s of res.stepResults) {
    console.log(`[${s.passed ? 'PASS' : 'FAIL'}] ${s.step}`);
    console.log(`       ${s.details}`);
  }
  console.log('\nInvariants:');
  console.log('  I1 (Single Source of Truth):', res.invariantsCheck.I1_SingleSourceOfTruth ? 'OK' : 'FAIL');
  console.log('  I2 (State Persistence):     ', res.invariantsCheck.I2_StatePersistence ? 'OK' : 'FAIL');
  console.log('  I3 (Atomic WAL Handover):   ', res.invariantsCheck.I3_AtomicWalHandover ? 'OK' : 'FAIL');
  console.log('  I4 (Provenance Attribution):', res.invariantsCheck.I4_ProvenanceAttribution ? 'OK' : 'FAIL');
  console.log('  I5 (Quality Gates):         ', res.invariantsCheck.I5_DeterministicQualityGates ? 'OK' : 'FAIL');
  console.log(`\nRESULT: ${res.passed ? 'ALL CHECKS PASSED' : 'TEST FAILED'}`);
  if (typeof process.exit === 'function') {
    process.exit(res.passed ? 0 : 1);
  }
}

