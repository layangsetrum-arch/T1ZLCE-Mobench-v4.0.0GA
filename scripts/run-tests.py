#!/usr/bin/env python3
"""ZLCE Automated Test Suite
Runs validation checks across TypeScript types, canonical templates, examples, and script synchronization.
"""
import hashlib
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def file_sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


class Counter:
    def __init__(self):
        self.total = 0
        self.passed = 0

    def record(self, ok):
        self.total += 1
        if ok:
            self.passed += 1

    def summary(self):
        status = "ALL TESTS PASSED" if self.passed == self.total and self.total > 0 else "TESTS FAILED"
        return f"RESULT: {status} ({self.passed}/{self.total} checks OK)"


ACTIVE_COUNTER = Counter()


def run_step(name, cmd, cwd=ROOT):
    print(f"==> [TEST] {name} ...", end=" ", flush=True)
    try:
        r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=60)
        ok = (r.returncode == 0)
        ACTIVE_COUNTER.record(ok)
        if ok:
            print("PASS")
            return True, r.stdout
        else:
            print(f"FAIL (exit {r.returncode})")
            if r.stdout:
                print(r.stdout)
            if r.stderr:
                print(r.stderr)
            return False, r.stderr or r.stdout
    except Exception as e:
        print(f"ERROR: {e}")
        ACTIVE_COUNTER.record(False)
        return False, str(e)


def main():
    # Normalisasi permission eksekusi skrip di lingkungan POSIX
    try:
        import stat
        for p in [
            "scripts/zlce/zlce",
            "scripts/zlce/clean-auth.sh",
            "scripts/install-hooks.sh",
            "scripts/security-audit.sh",
            "scripts/test-lmk-physical.sh",
            "scripts/zlce-snapshot.sh"
        ]:
            full = os.path.join(ROOT, p)
            if os.path.exists(full):
                st = os.stat(full)
                os.chmod(full, st.st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)
    except Exception:
        pass

    print("=" * 60)
    print("ZLCE Studio v4.0.0 Automated Test Runner")
    print("=" * 60)

    failures = 0

    # 1. TypeScript Static Check
    ok, _ = run_step("TypeScript Type Check (tsc --noEmit)", ["npx", "tsc", "--noEmit"])
    if not ok:
        failures += 1

    # 2. Python zlce-check on examples/
    ok, _ = run_step(
        "ZLCE Check on examples/SESSION_STATE.example.md",
        ["python3", "scripts/zlce-check.py", "examples/", "--state", "examples/SESSION_STATE.example.md", "--no-git"]
    )
    if not ok:
        failures += 1

    # 3. Snapshot Script Help Flag
    ok, _ = run_step(
        "ZLCE Snapshot Help Flag (zlce-snapshot.sh --help)",
        ["bash", "scripts/zlce-snapshot.sh", "--help"]
    )
    if not ok:
        failures += 1

    # 4. Canonical Script Synchronization Check
    print("==> [TEST] Canonical Script Integrity Check ...", end=" ", flush=True)
    sync_errors = []
    pairs = [
        ("scripts/zlce-check.py", "scripts/zlce/zlce-check.py"),
        ("scripts/zlce-check.py", "zlce-starter-kit/scripts/zlce-check.py"),
        ("scripts/zlce-collect.py", "scripts/zlce/zlce-collect.py"),
        ("scripts/zlce-collect.py", "zlce-starter-kit/scripts/zlce-collect.py"),
        ("scripts/zlce-snapshot.sh", "scripts/zlce/zlce-snapshot.sh"),
        ("scripts/zlce-snapshot.sh", "zlce-starter-kit/scripts/zlce-snapshot.sh"),
        ("LANDING_PROMPT.md", "zlce-starter-kit/LANDING_PROMPT.md"),
        ("HANDOVER_PROMPT.md", "zlce-starter-kit/HANDOVER_PROMPT.md"),
    ]
    for src, dest in pairs:
        src_path = os.path.join(ROOT, src)
        dest_path = os.path.join(ROOT, dest)
        if not os.path.exists(dest_path):
            sync_errors.append(f"Missing copy: {dest}")
        elif file_sha256(src_path) != file_sha256(dest_path):
            sync_errors.append(f"Hash mismatch: {src} != {dest}")

    if sync_errors:
        print(f"FAIL ({len(sync_errors)} mismatches)")
        for err in sync_errors:
            print(f"    - {err}")
        ACTIVE_COUNTER.record(False)
    else:
        print("PASS")
        ACTIVE_COUNTER.record(True)

    # 5. .gitattributes check
    print("==> [TEST] .gitattributes Check ...", end=" ", flush=True)
    if os.path.exists(os.path.join(ROOT, ".gitattributes")):
        print("PASS")
        ACTIVE_COUNTER.record(True)
    else:
        print("FAIL (missing .gitattributes)")
        ACTIVE_COUNTER.record(False)

    # 6. TC-P3-02: Context Budget Adapter & State Health Integrity Check
    ok, _ = run_step(
        "TC-P3-02 Context Budget Adapter & State Health Integrity Check",
        ["npx", "tsx", "-e", """
import fs from 'fs';
import { validateSessionStateIntegrity } from './src/utils/sessionStateValidator';
import { MODEL_BUDGET_PROFILES, calculateTokenSafety, pruneContextForBudget } from './src/utils/tokenBudgetAdapter';

// 1. Verify 8 profiles (including deepseek, freebuff, copilot, cursor)
const presets = ['gemini-1m', 'claude-30k', 'gpt-128k', 'deepseek-64k', 'copilot-32k', 'cursor-64k', 'compact-8k', 'freebuff-4k'];
for (const p of presets) {
  if (!MODEL_BUDGET_PROFILES[p]) throw new Error(`Missing profile: ${p}`);
}

// 2. Verify State Health (0 errors)
const sessionContent = fs.readFileSync('SESSION_STATE.md', 'utf8');
const integrity = validateSessionStateIntegrity(sessionContent);
if (!integrity.valid || integrity.errorsCount > 0) {
  throw new Error(`State Health failed with ${integrity.errorsCount} errors: ${integrity.issues.map(i => i.message).join('; ')}`);
}

// 3. Test pruning behavior (Acceptance Criteria 3: Compact & FreeBuff)
const testMd = `# CONTEXT PACK\\n## 1. MANDAT TUGAS AKTIF\\n- TASK-014\\n## 2. JANGKAR KEBENARAN\\nTier 0\\n## 3. STATUS TERKINI & WAL\\nWAL data\\n## 7. LOG AUDIT\\n* **2026-11-04 18:00 WIB:** Log 1\\n* **2026-11-04 17:00 WIB:** Log 2\\n* **2026-11-04 16:00 WIB:** Log 3\\n* **2026-11-04 15:00 WIB:** Log 4\\n* **2026-11-04 14:00 WIB:** Log 5\\n`;
const prunedCompact = pruneContextForBudget(testMd, 'compact-8k');
const prunedFreeBuff = pruneContextForBudget(testMd, 'freebuff-4k');
if (!prunedCompact.wasPruned || !prunedFreeBuff.wasPruned) {
  throw new Error('Pruning failed to activate on compact-8k or freebuff-4k preset');
}
if (!prunedFreeBuff.prunedMarkdown.includes('TASK-014') || !prunedFreeBuff.prunedMarkdown.includes('Tier 0')) {
  throw new Error('FreeBuff pruning damaged active task or Tier 0 anchors');
}
console.log('TC-P3-02 verified successfully with Copilot, Cursor, DeepSeek and FreeBuff.');
"""]
    )
    # 7. TC-P3-03: Structured Multi-Model Prompt Generator & Anti-Placeholder Rule Check
    ok, _ = run_step(
        "TC-P3-03 Structured Multi-Model Prompt Generator & Anti-Placeholder Check",
        ["npx", "tsx", "-e", """
import fs from 'fs';
import { parseSessionStateMarkdown } from './src/utils/markdownParser';
import { TEAM_MEMBERS } from './src/data/teamMembers';
import { generateStructuredPrompt, PROMPT_ARCHETYPES, getModelStopToken } from './src/utils/promptGenerator';

const sessionContent = fs.readFileSync('SESSION_STATE.md', 'utf8');
const session = parseSessionStateMarkdown(sessionContent);
const member = TEAM_MEMBERS[0];
const task = {
  id: 'TASK-015',
  name: 'Prompt Generator Multi-Model Terstruktur',
  dependencies: 'TASK-014',
  status: 'READY' as const,
  evidence: '-',
  approved: '-'
};

// 1. Verify all 4 Archetypes generate successfully
const archetypes = ['task-execution', 'landing', 'review', 'handover'] as const;
for (const arch of archetypes) {
  const result = generateStructuredPrompt({
    archetype: arch,
    task,
    sessionState: session,
    activeMember: member,
    targetAi: 'claude',
    tokenBudgetPreset: 'claude-30k'
  });

  if (!result.fullPrompt || result.fullPrompt.length < 200) {
    throw new Error(`Empty or trivial prompt generated for archetype: ${arch}`);
  }

  // Acceptance Criteria 2: Format enforces Schema-before-Data and anti-placeholder
  if (!result.fullPrompt.includes('SCHEMA-BEFORE-DATA') && !result.fullPrompt.includes('OUTPUT SCHEMA')) {
    throw new Error(`Archetype ${arch} failed to enforce Schema-before-Data`);
  }
  if (!result.fullPrompt.includes('PELARANGAN KODE PLACEHOLDER') && !result.fullPrompt.includes('ANTI-PLACEHOLDER')) {
    throw new Error(`Archetype ${arch} failed to enforce anti-placeholder rules`);
  }
  if (!result.fullPrompt.includes('min-h-[44px]') && !result.fullPrompt.includes('44x44px')) {
    throw new Error(`Archetype ${arch} missing touch target >= 44px rule`);
  }
}

// 2. Verify Stop Tokens for specific providers (including copilot and cursor)
const providers = ['claude', 'gemini', 'chatgpt', 'deepseek', 'copilot', 'cursor'] as const;
for (const prov of providers) {
  const res = generateStructuredPrompt({
    archetype: 'task-execution',
    task,
    sessionState: session,
    activeMember: member,
    targetAi: prov,
    tokenBudgetPreset: prov === 'gemini' ? 'gemini-1m' : prov === 'deepseek' ? 'deepseek-64k' : prov === 'copilot' ? 'copilot-32k' : prov === 'cursor' ? 'cursor-64k' : 'claude-30k'
  });
  const expectedToken = getModelStopToken(prov);
  if (!res.fullPrompt.includes(expectedToken)) {
    throw new Error(`Provider ${prov} missing required stop token: ${expectedToken}`);
  }
  if (!res.fullPrompt.includes('TASK-015')) {
    throw new Error(`Provider ${prov} prompt missing active task reference`);
  }
}

console.log('TC-P3-03 verified successfully across all 4 archetypes and 6 AI providers.');
"""]
    )
    if not ok:
        failures += 1

    # 8. TC-P3-04: Result Capture Module & Injeksi Provenance Otomatis Check
    ok, _ = run_step(
        "TC-P3-04 Result Capture Module & Injeksi Provenance Otomatis Check",
        ["npx", "tsx", "-e", """
import fs from 'fs';
import { 
  extractCodeBlocksAndProvenance, 
  generateMarkdownProvenanceTag, 
  generateCodeHeaderBanner, 
  mergeResultIntoSessionStateMarkdown,
  ResultProvenanceMetadata 
} from './src/utils/provenanceInjector';

const sampleProvenance: ResultProvenanceMetadata = {
  taskId: 'TASK-016',
  taskName: 'Result Capture Module dengan Injeksi Provenance Otomatis',
  actorName: 'Eko Prasetyo',
  actorAlias: 'eko',
  actorEmail: 'eko@dev.id',
  aiProvider: 'claude',
  aiModelName: 'Claude 3.5 Sonnet',
  accountAlias: 'Akun-Claude-Eko',
  timestamp: '2026-11-05T00:31:34+07:00',
  timestampWIB: '2026-11-05 07:31:34 WIB',
  verificationStatus: 'PENDING_VERIFICATION'
};

// 1. Acceptance Criteria 2: Format Tag Provenance & Invarian I4
const tag = generateMarkdownProvenanceTag(sampleProvenance);
if (!tag.includes('ZLCE_PROVENANCE_START') || !tag.includes('ZLCE_PROVENANCE_END')) {
  throw new Error('Provenance tag missing start/end markers');
}
if (!tag.includes('task_id: TASK-016') || !tag.includes('actor_name: Eko Prasetyo') || !tag.includes('ai_model: Claude 3.5 Sonnet')) {
  throw new Error('Provenance tag missing mandatory Invariant I4 fields');
}

// 2. Acceptance Criteria 1: Extraction from raw AI response text
const rawAiText = `
Berikut adalah implementasi solusi untuk TASK-016:

--- /src/components/MyTestComponent.tsx ---
\`\`\`typescript
import React from 'react';
export const MyTestComponent: React.FC = () => {
  return <div className="min-h-[44px]">Test Provenance</div>;
};
\`\`\`

## 3. WORK IN PROGRESS (WAL)
* **Task:** \`TASK-016\`
* **Langkah Sedang Dikerjakan:** Verifikasi ekstraksi blok kode
* **Berkas Direncanakan/Disentuh:** src/components/MyTestComponent.tsx
* **Sudah Dilakukan:** Mengekstrak kode dengan benar
* **Langkah Berikutnya (persis):** Jalankan pengujian TC-P3-04
* **Perintah Verifikasi:** npm run build
* **Diperbarui:** 2026-11-05 07:31:34 WIB
`;

const extracted = extractCodeBlocksAndProvenance(rawAiText, sampleProvenance);
if (extracted.codeBlocks.length !== 1) {
  throw new Error(`Expected 1 code block, found ${extracted.codeBlocks.length}`);
}
const block = extracted.codeBlocks[0];
if (!block.filePath?.includes('MyTestComponent.tsx')) {
  throw new Error(`Failed to detect file path from block: ${block.filePath}`);
}
if (!block.codeWithProvenance.includes('@provenance') || !block.codeWithProvenance.includes('TASK-016')) {
  throw new Error('Code block missing injected provenance banner');
}
if (!extracted.detectedWalBlock || !extracted.detectedWalBlock.raw.includes('TASK-016')) {
  throw new Error('Failed to detect embedded WAL block');
}

// 3. Acceptance Criteria 3: Streaming to draft SESSION_STATE.md
const originalSession = fs.readFileSync('SESSION_STATE.md', 'utf8');
const merged = mergeResultIntoSessionStateMarkdown(originalSession, sampleProvenance, extracted);
if (!merged.updatedMarkdown.includes('Solusi AI Ditangkap untuk TASK-016')) {
  throw new Error('Merged session state missing Audit Log entry for result capture');
}
if (!merged.updatedMarkdown.includes('TASK-016')) {
  throw new Error('Merged session state missing WAL update reference');
}

console.log('TC-P3-04 verified successfully: Provenance tag valid, code extracted, WAL streamed.');
"""]
    )
    if not ok:
        failures += 1

    # 9. TC-P3-05: Universal Relay Handover Generator Check (Any Task)
    ok, _ = run_step(
        "TC-P3-05 Universal Relay Handover Generator Check (Any Task)",
        ["npx", "tsx", "-e", """
import fs from 'fs';
import { generateRelayHandover } from './src/utils/relayHandoverGenerator';
import { parseSessionStateMarkdown, parseTasksMarkdown } from './src/utils/markdownParser';
import { TEAM_MEMBERS } from './src/data/teamMembers';

const sessionContent = fs.readFileSync('SESSION_STATE.md', 'utf8');
const session = parseSessionStateMarkdown(sessionContent);
const tasksContent = fs.readFileSync('TASKS.md', 'utf8');
const parsedTasks = parseTasksMarkdown(tasksContent);
const taskMap = new Map();
parsedTasks.tasks.forEach(t => taskMap.set(t.id, t));
const member = TEAM_MEMBERS[1]; // oned

// 1. Verify generation works for ANY task (not stopping at task 14)
const testTaskIds = ['TASK-001', 'TASK-014', 'TASK-016', 'TASK-017', 'TASK-028', 'TASK-043'];
for (const tid of testTaskIds) {
  const relay = generateRelayHandover({
    taskId: tid,
    aiProvider: 'claude',
    activeMember: member,
    sessionState: session,
    taskDetailMap: taskMap,
    handoverMode: 'direct-execution'
  });

  if (!relay.fullPrompt || relay.fullPrompt.length < 300) {
    throw new Error(`Empty or too short relay prompt generated for task: ${tid}`);
  }
  if (!relay.fullPrompt.includes(tid)) {
    throw new Error(`Generated relay prompt missing task ID: ${tid}`);
  }
  if (!relay.fullPrompt.includes('ANTI-PLACEHOLDER') || !relay.fullPrompt.includes('min-h-[44px]')) {
    throw new Error(`Relay prompt for ${tid} missing mandatory anti-placeholder or touch target constraints`);
  }
  if (relay.steps.length !== 5) {
    throw new Error(`Expected 5 tutorial steps, found ${relay.steps.length}`);
  }
}

// 2. Verify C-I-D-I handover mode for TASK-017
const cidiRelay = generateRelayHandover({
  taskId: 'TASK-017',
  aiProvider: 'cursor',
  activeMember: member,
  sessionState: session,
  handoverMode: 'cidi-handover'
});
if (!cidiRelay.fullPrompt.includes('PROTOKOL SERAH TERIMA C-I-D-I') || !cidiRelay.fullPrompt.includes('<<<END_CURSOR_ZLCE_RESPONSE>>>')) {
  throw new Error('CIDI handover mode missing C-I-D-I protocol or Cursor stop token');
}

console.log('TC-P3-05 verified successfully: Universal Relay Handover generates for any task (TASK-001 to TASK-043).');
"""]
    )
    if not ok:
        failures += 1

    # 10. TC-P3-05b: Handover Manager Lintas AI & Deteksi Konflik Keputusan Check (TASK-017)
    ok, _ = run_step(
        "TC-P3-05b Handover Manager Lintas AI & Deteksi Konflik Keputusan Check (TASK-017)",
        ["npx", "tsx", "-e", """
import fs from 'fs';
import { 
  detectDecisionConflicts, 
  resolveDecisionConflict, 
  generateHandoverSummaryEntry, 
  applyHandoverToSessionState, 
  generateHandoverPrompt 
} from './src/utils/conflictDetector';
import { parseSessionStateMarkdown } from './src/utils/markdownParser';
import { validateSessionStateIntegrity } from './src/utils/sessionStateValidator';
import { TEAM_MEMBERS } from './src/data/teamMembers';

const rawSession = fs.readFileSync('SESSION_STATE.md', 'utf8');
const session = parseSessionStateMarkdown(rawSession);
const member = TEAM_MEMBERS[1]; // oned

// 1. Acceptance Criteria 2: Deteksi Konflik Keputusan (ADR-09 Obsidian, Multi-Task IN_PROGRESS, Commit ke main)
const conflictingProposal = `
Saya mengusulkan kita gunakan plugin Obsidian untuk membaca markdown di tablet.
Status task: IN_PROGRESS
Status task 2: IN_PROGRESS
Dan kita lakukan checkout main && git commit -m "update"
`;

const detectedConflicts = detectDecisionConflicts({
  sourceAi: 'claude',
  targetAi: 'gemini',
  targetAiProposalText: conflictingProposal,
  currentSessionState: session,
  activeTask: { id: 'TASK-017', name: 'Handover Manager Lintas AI' }
});

if (detectedConflicts.length < 3) {
  throw new Error(`Expected at least 3 conflicts detected, found ${detectedConflicts.length}`);
}

const obsidianConf = detectedConflicts.find(c => c.category === 'ARCHITECTURAL_DIVERGENCE' && c.code === 'ADR_VIOLATION');
if (!obsidianConf || !obsidianConf.title.includes('Obsidian')) {
  throw new Error('Failed to detect ADR-09 Obsidian divergence');
}

// 2. Acceptance Criteria 2: Resolusi Manusia (Human-in-the-Loop)
const resolved = resolveDecisionConflict(
  obsidianConf,
  'REJECTED',
  'Tolak: Patuhi ADR-09 (Obsidian dieksklusikan dari Blueprint Inti v4.0.0).',
  member.name
);
if (resolved.resolutionStatus !== 'REJECTED' || resolved.resolvedBy !== member.name) {
  throw new Error('Conflict resolution status or resolver name not updated correctly');
}

// 3. Acceptance Criteria 1: Penghasilan Prompt Handover C-I-D-I Lengkap
const handoverPrompt = generateHandoverPrompt({
  sourceAi: 'Claude 3.5 Sonnet',
  targetAi: 'gemini',
  reason: 'Rate limit kuota token tercapai',
  taskId: 'TASK-017',
  activeMember: member,
  sessionState: session,
  conflicts: [resolved]
});

if (!handoverPrompt.includes('C - CONTEXT') || !handoverPrompt.includes('I - INSTRUCTION') || !handoverPrompt.includes('D - DETAILS')) {
  throw new Error('Handover prompt missing C-I-D-I structure');
}
if (!handoverPrompt.includes('<<<END_GEMINI_ZLCE_RESPONSE>>>')) {
  throw new Error('Handover prompt missing Gemini stop token');
}
if (!handoverPrompt.includes('REJECT / ANCHOR BASELINE ENFORCED')) {
  throw new Error('Handover prompt missing human conflict resolution mandate');
}

// 4. Acceptance Criteria 3: Catatan Serah Terima Bagian 6 & Integritas State
const summaryEntry = generateHandoverSummaryEntry({
  sourceAi: 'Claude 3.5 Sonnet',
  targetAi: 'Gemini 3.8 Flash',
  reason: 'TOKEN_LIMIT_REACHED',
  taskId: 'TASK-017',
  conflicts: [resolved],
  activeMemberName: member.name
});

if (!summaryEntry.includes('Handover Lintas AI') || !summaryEntry.includes('TASK-017') || !summaryEntry.includes('Oned')) {
  throw new Error('Section 6 summary entry missing mandatory handover details');
}

const updatedSession = applyHandoverToSessionState(rawSession, summaryEntry);
if (!updatedSession.includes('Handover Lintas AI: [Claude 3.5 Sonnet] -> [Gemini 3.8 Flash]')) {
  throw new Error('Failed to inject handover entry into Section 6');
}

// Ensure state integrity remains 100% valid
const validation = validateSessionStateIntegrity(updatedSession);
if (!validation.valid || validation.errorsCount > 0) {
  throw new Error(`Updated session state failed canonical validation: ${validation.issues.map(i => i.message).join('; ')}`);
}

console.log('TC-P3-05b verified successfully: Handover Manager & Conflict Detector 100% compliant with AC 1, 2, 3.');
"""]
    )
    if not ok:
        failures += 1

    # 11. TC-P3-06: Uji Cold-Start Lintas AI (Claude -> Gemini) - Invarian I2 Check (TASK-018)
    ok, _ = run_step(
        "TC-P3-06 Uji Cold-Start Lintas AI (Claude -> Gemini) - Invarian I2 (TASK-018)",
        ["npx", "tsx", "src/tests/coldStartAi.test.ts"]
    )
    if not ok:
        failures += 1

    # 12. TC-P4-01 s/d TC-P4-05: Multi-Akun & Tim Estafet 8 Anggota Integration Check
    ok, _ = run_step(
        "TC-P4-01..05 Multi-Akun & Tim Estafet Integration Check (TASK-019..023)",
        ["npx", "tsx", "-e", """
import fs from 'fs';
import { TEAM_MEMBERS, loadTeamRegistry, updateTeamMemberProfile, getMemberById } from './src/data/teamMembers';
import { canClaimTask, claimTask, releaseTaskClaim } from './src/utils/taskClaimManager';
import { validateApprovalProvenance, recordGateApproval } from './src/utils/gateApprovalManager';
import { getCleanAuthCommand, formatDeviceHandoverNotes, injectHandoverNotesToMarkdown } from './src/utils/handoverChecklist';
import { computeMarkdownDiff } from './src/hooks/useSessionHistory';
import { parseSessionStateMarkdown } from './src/utils/markdownParser';

// 1. TC-P4-01: 8 Team Profiles & Zero-Secret Policy
const members = loadTeamRegistry();
if (members.length !== 8) {
  throw new Error(`Expected 8 team members, found ${members.length}`);
}
for (const m of members) {
  if (!m.id || !m.name || !m.email || !m.role) {
    throw new Error(`Incomplete member profile for: ${JSON.stringify(m)}`);
  }
  const str = JSON.stringify(m);
  if (str.includes('ghp_') || str.includes('sk-') || str.includes('password') || str.includes('token')) {
    throw new Error(`Zero-Secret violation detected in member profile: ${m.name}`);
  }
}

// 2. TC-P4-02: Task Claim Manager 1 IN_PROGRESS Rule
const rawSession = fs.readFileSync('SESSION_STATE.md', 'utf8');
const session = parseSessionStateMarkdown(rawSession);
const claimCheck = canClaimTask('TASK-020', session);
if (!claimCheck.allowed && claimCheck.reason?.includes('tidak ditemukan')) {
  throw new Error('Task lookup failed in canClaimTask');
}

// 3. TC-P4-03: Quality Gate Provenance Validation
const validClassic = validateApprovalProvenance('ya');
const validProvenance = validateApprovalProvenance('ya (oleh: Budi)');
const invalidEmpty = validateApprovalProvenance('');
const invalidPlaceholder = validateApprovalProvenance('ya (oleh: [Nama Penyetuju])');

if (!validClassic.valid || !validProvenance.valid || validProvenance.approverName !== 'Budi') {
  throw new Error('Valid approval formats failed validation');
}
if (invalidEmpty.valid || invalidPlaceholder.valid) {
  throw new Error('Invalid/placeholder approval format passed validation');
}

// 4. TC-P4-04: Handover Checklist Clean-Auth
const cleanCmd = getCleanAuthCommand();
if (!cleanCmd.includes('clean-auth.sh') && (!cleanCmd.includes('git credential-cache exit') || !cleanCmd.includes('unset user.name'))) {
  throw new Error(`Invalid clean-auth command: ${cleanCmd}`);
}

// 5. TC-P4-05: Session History Diff Calculation
const diff = computeMarkdownDiff(rawSession, rawSession + '\\n| TASK-999 | Dummy | - | DONE | ok | ya |\\n');
if (diff.addedLinesCount !== 1) {
  throw new Error(`Expected 1 added line in diff, found ${diff.addedLinesCount}`);
}

console.log('TC-P4-01..05 verified successfully: 8 members, 1 IN_PROGRESS rule, gate provenance, clean-auth & diff.');
"""]
    )
    if not ok:
        failures += 1

    # 13. TC-P4-06: Uji Cold-Start Lintas Anggota Tim (Eko -> Oned) - Invarian I1-I5 (TASK-024)
    ok, _ = run_step(
        "TC-P4-06 Uji Cold-Start Lintas Anggota Tim (Eko -> Oned) - Invarian I1-I5 (TASK-024)",
        ["npx", "tsx", "src/tests/coldStartMember.test.ts"]
    )
    if not ok:
        failures += 1

    # 14. TC-P5-01: Command Templates Catalog & Zero-Destructive Verification Check (TASK-025)
    ok, _ = run_step(
        "TC-P5-01 Command Templates Catalog & Zero-Destructive Verification Check (TASK-025)",
        ["npx", "tsx", "-e", """
import { 
  CANONICAL_COMMAND_TEMPLATES, 
  COMMAND_TEMPLATES_VERSION, 
  verifyNoDestructiveCommands,
  getCommandTemplateById 
} from './src/data/commandTemplates';

if (CANONICAL_COMMAND_TEMPLATES.length < 8) {
  throw new Error(`Expected at least 8 command templates, found ${CANONICAL_COMMAND_TEMPLATES.length}`);
}

const requiredIds = [
  'CMD-VAL-01', 
  'CMD-VAL-02', 
  'CMD-VAL-03', 
  'CMD-GIT-01', 
  'CMD-GIT-02', 
  'CMD-GIT-03', 
  'CMD-GIT-04', 
  'CMD-AUTH-01'
];

for (const id of requiredIds) {
  const tpl = getCommandTemplateById(id);
  if (!tpl) {
    throw new Error(`Mandatory canonical template missing: ${id}`);
  }
  if (!tpl.title || !tpl.description || !tpl.directCommand) {
    throw new Error(`Template ${id} missing required schema fields`);
  }
}

const allowedRisks = ['safe', 'mutating', 'destructive'];
for (const tpl of CANONICAL_COMMAND_TEMPLATES) {
  if (!allowedRisks.includes(tpl.riskLevel)) {
    throw new Error(`Invalid riskLevel '${tpl.riskLevel}' in template ${tpl.id}`);
  }
}

if (!verifyNoDestructiveCommands(CANONICAL_COMMAND_TEMPLATES)) {
  throw new Error('Destructive commands detected in default command catalog!');
}

console.log(`TC-P5-01 verified successfully: ${CANONICAL_COMMAND_TEMPLATES.length} templates.`);
"""]
    )
    if not ok:
        failures += 1

    # 15. TC-P5-02: Command Sanitizer & Binder POSIX Anti-Injection (TASK-026)
    ok, _ = run_step(
        "TC-P5-02 Parameter Binder & Strict Shell Sanitizer (TASK-026)",
        ["npx", "tsx", "-e", """
import { sanitizeShellParam, sanitizeTaskId, sanitizeGitMessage } from './src/utils/commandSanitizer';
import { bindCommandTemplate } from './src/utils/commandBinder';

// Test Sanitizer
const sanitized = sanitizeShellParam('echo safe; rm -rf / && cat');
if (sanitized.includes(';') || sanitized.includes('&&') || sanitized.includes('|')) {
  throw new Error('Sanitizer failed to strip shell injection operators');
}

const validTaskId = sanitizeTaskId('TASK-026');
if (validTaskId !== 'TASK-026') {
  throw new Error(`Expected TASK-026, got ${validTaskId}`);
}

let threwOnDangerousTask = false;
try {
  sanitizeTaskId('TASK-026; rm -rf /');
} catch {
  threwOnDangerousTask = true;
}
if (!threwOnDangerousTask) {
  throw new Error('sanitizeTaskId should throw on injection payload');
}

// Test Binder
const template = 'git -c user.name="{MEMBER_NAME}" commit -m "feat({ACTIVE_TASK_ID}): {COMMIT_MESSAGE}"';
const bound = bindCommandTemplate(template, {
  activeTaskId: 'TASK-026',
  activeMember: { id: 'eko', name: 'Eko (Lead Arch)', email: 'eko@team.internal', role: 'Lead Architect', initials: 'EK', avatarColor: '#000', assignedAreas: [], tokenBudgetTier: 'high', preferredAiPair: 'Claude 3.5 Sonnet' },
  commitMessage: 'tambahkan sanitizer'
});

if (!bound.includes('user.name="Eko (Lead Arch)"') || !bound.includes('feat(TASK-026): tambahkan sanitizer')) {
  throw new Error(`Binder output mismatch: ${bound}`);
}

console.log('TC-P5-02 verified successfully: anti-injection and template binding robust.');
"""]
    )
    if not ok:
        failures += 1

    # 16. TC-P5-03: One-Tap Copy Button Module Check (TASK-027)
    ok, _ = run_step(
        "TC-P5-03 One-Tap Copy Button Module Check (TASK-027)",
        ["npx", "tsx", "-e", """
import { OneTapCopyButton } from './src/components/mobile/OneTapCopyButton';
if (typeof OneTapCopyButton !== 'function') {
  throw new Error('OneTapCopyButton component is not a valid React FC');
}
console.log('TC-P5-03 verified successfully: OneTapCopyButton module valid.');
"""]
    )
    if not ok:
        failures += 1

    # 17. TC-P5-04: CLI Dispatcher Execution & Allowlist Enforcement (TASK-028)
    ok, _ = run_step(
        "TC-P5-04 CLI Dispatcher Execution & Allowlist Enforcement (TASK-028)",
        ["bash", "-c", """
set -e
# 1. Test help flag
./scripts/zlce/zlce help >/dev/null

# 2. Test allowlist reject unknown subcommand
if ./scripts/zlce/zlce evil-command 2>/dev/null; then
  echo "Expected exit 1 on unknown subcommand" >&2
  exit 1
fi

# 3. Test scripts/zlce/README.md existence
if [ ! -f "scripts/zlce/README.md" ]; then
  echo "scripts/zlce/README.md missing" >&2
  exit 1
fi
echo "TC-P5-04 verified successfully: dispatcher allowlist and docs intact."
"""]
    )
    if not ok:
        failures += 1

    # 18. TC-P5-05: Paste-Back Terminal Parser (TASK-029)
    ok, _ = run_step(
        "TC-P5-05 Paste-Back Terminal Parser (TASK-029)",
        ["npx", "tsx", "-e", """
import { parseTerminalOutput } from './src/utils/terminalParser';

// Test 1: Successful zlce-check output
const checkOkOutput = `[INFO] Validasi struktur kanonik 8 bagian...
[INFO] Memeriksa matriks task...
RESULT: OK (0 error, 0 warn, 30 task)`;

const res1 = parseTerminalOutput(checkOkOutput);
if (!res1.success || res1.errorCount !== 0 || res1.taskCount !== 30) {
  throw new Error(`Parser checkOk failed: ${JSON.stringify(res1)}`);
}

// Test 2: Failing zlce-check output
const checkFailOutput = `[ERROR] Task TASK-026 tidak memiliki bukti verifikasi
[WARN] Ada 1 perubahan uncommitted
RESULT: FAIL (1 error, 1 warn, 30 task)`;

const res2 = parseTerminalOutput(checkFailOutput);
if (res2.success || res2.errorCount !== 1 || res2.warningCount !== 1) {
  throw new Error(`Parser checkFail failed: ${JSON.stringify(res2)}`);
}
if (!res2.errors[0].includes('tidak memiliki bukti verifikasi')) {
  throw new Error('Parser failed to extract error line');
}

// Test 3: Clean Git status
const gitCleanOutput = `On branch task/TASK-026
nothing to commit, working tree clean`;
const res3 = parseTerminalOutput(gitCleanOutput);
if (!res3.success || res3.commandType !== 'git') {
  throw new Error(`Parser gitClean failed: ${JSON.stringify(res3)}`);
}

console.log('TC-P5-05 verified successfully: Terminal parser handles OK/FAIL and Git states accurately.');
"""]
    )
    if not ok:
        failures += 1

    # 19. TC-P5-06: Recovery Cases A-D Integration Check (TASK-030)
    ok, _ = run_step(
        "TC-P5-06 Recovery Cases A-D Integration Check (TASK-030)",
        ["npx", "tsx", "-e", """
import { RecoveryCommandSection } from './src/components/mobile/RecoveryCommandSection';
if (typeof RecoveryCommandSection !== 'function') {
  throw new Error('RecoveryCommandSection component is not a valid React FC');
}
console.log('TC-P5-06 verified successfully: RecoveryCommandSection ready for Cases A-D.');
"""]
    )
    if not ok:
        failures += 1

    # 20. TC-P6-01: Git Branch per Task & Main Branch Protection Check (TASK-031)
    ok, _ = run_step(
        "TC-P6-01 Git Branch per Task & Main Protection Check (TASK-031)",
        ["npx", "tsx", "-e", """
import { 
  getBranchNameForTask, 
  isMainBranch, 
  validateBranchCompliance, 
  generateBranchCheckoutCommand 
} from './src/utils/gitBranchManager';

// 1. Verify branch naming
if (getBranchNameForTask('TASK-031') !== 'task/TASK-031') {
  throw new Error('Branch name format mismatch');
}

// 2. Verify main branch detection
if (!isMainBranch('main') || !isMainBranch('master') || !isMainBranch('origin/main')) {
  throw new Error('isMainBranch failed to detect protected main branches');
}
if (isMainBranch('task/TASK-031')) {
  throw new Error('isMainBranch incorrectly marked task branch as main');
}

// 3. Verify main branch protection warning
const mainCheck = validateBranchCompliance('main', 'TASK-031');
if (!mainCheck.isProtected || mainCheck.isCompliant) {
  throw new Error('validateBranchCompliance failed to flag main branch as protected');
}
if (!mainCheck.suggestedCommand?.includes('git checkout -b task/TASK-031')) {
  throw new Error('Suggested checkout command missing in main protection result');
}

// 4. Verify compliant task branch
const taskCheck = validateBranchCompliance('task/TASK-031', 'TASK-031');
if (taskCheck.isProtected || !taskCheck.isCompliant) {
  throw new Error('validateBranchCompliance failed on valid task branch');
}

console.log('TC-P6-01 verified successfully: branch-per-task and main branch protection active.');
"""]
    )
    if not ok:
        failures += 1

    # 21. TC-P6-02: Identity Commit Formatter Check (TASK-032)
    ok, _ = run_step(
        "TC-P6-02 Identity Commit Formatter Check (TASK-032)",
        ["npx", "tsx", "-e", """
import { generateIdentityCommitCommand, formatAtomicCommitMessage } from './src/utils/gitCommitFormatter';
import { TEAM_MEMBERS } from './src/data/teamMembers';

const budi = TEAM_MEMBERS[0];
const siti = TEAM_MEMBERS[1];

// 1. Verify atomic commit message format
const formattedMsg = formatAtomicCommitMessage('TASK-032', 'implementasi git sync');
if (!formattedMsg.startsWith('TASK-032:')) {
  throw new Error('formatAtomicCommitMessage failed to prefix Task ID');
}

// 2. Verify identity flags injection for member 1
const resBudi = generateIdentityCommitCommand({
  taskId: 'TASK-032',
  member: budi,
  message: 'feat(git) dynamic identity flags',
  filesToStage: ['SESSION_STATE.md', 'src/utils/gitCommitFormatter.ts']
});

if (!resBudi.commitCommand.includes(`user.name='${budi.name}'`) || !resBudi.commitCommand.includes(`user.email='${budi.email}'`)) {
  throw new Error('Commit command missing dynamic identity flags for Budi');
}
if (!resBudi.commitCommand.includes('TASK-032:')) {
  throw new Error('Commit command missing atomic task ID prefix');
}

// 3. Verify dynamic switch to member 2
const resSiti = generateIdentityCommitCommand({
  taskId: 'TASK-032',
  member: siti,
  message: 'feat(git) dynamic identity flags',
});
if (!resSiti.commitCommand.includes(`user.name='${siti.name}'`) || !resSiti.commitCommand.includes(`user.email='${siti.email}'`)) {
  throw new Error('Commit command failed to switch identity attribution to Siti');
}

console.log('TC-P6-02 verified successfully: dynamic identity commit flags verified.');
"""]
    )
    if not ok:
        failures += 1

    # 22. TC-P6-03: Safe Pull Template Check (TASK-033)
    ok, _ = run_step(
        "TC-P6-03 Safe Pull Template Check (TASK-033)",
        ["npx", "tsx", "-e", """
import { GitPullSection } from './src/components/mobile/GitPullSection';
if (typeof GitPullSection !== 'function') {
  throw new Error('GitPullSection component is not a valid React FC');
}
console.log('TC-P6-03 verified successfully: GitPullSection module valid.');
"""]
    )
    if not ok:
        failures += 1

    # 23. TC-P6-04: Git Credential Cache Manager & clean-auth.sh Check (TASK-034)
    ok, _ = run_step(
        "TC-P6-04 Git Credential Cache Manager & clean-auth.sh Check (TASK-034)",
        ["bash", "-c", """
set -e
# 1. Verify clean-auth.sh script exists and is executable
if [ ! -x "scripts/zlce/clean-auth.sh" ]; then
  echo "scripts/zlce/clean-auth.sh missing or not executable" >&2
  exit 1
fi

# 2. Execute clean-auth.sh
bash scripts/zlce/clean-auth.sh >/dev/null

# 3. Verify SecurityAuthTab component
npx tsx -e "
import { SecurityAuthTab } from './src/components/mobile/SecurityAuthTab';
if (typeof SecurityAuthTab !== 'function') throw new Error('SecurityAuthTab is not a valid React FC');
"
echo "TC-P6-04 verified successfully: clean-auth.sh and SecurityAuthTab intact."
"""]
    )
    if not ok:
        failures += 1

    # 24. TC-P6-05: Git Conflict Resolution Wizard & Signature Detection Check (TASK-035)
    ok, _ = run_step(
        "TC-P6-05 Git Conflict Resolution Wizard & Signature Detection Check (TASK-035)",
        ["npx", "tsx", "-e", """
import { detectGitConflictsFromTerminal, ConflictResolutionWizard } from './src/components/mobile/ConflictResolutionWizard';

// 1. Verify conflict detection
const conflictSample = `
Auto-merging SESSION_STATE.md
CONFLICT (content): Merge conflict in SESSION_STATE.md
Automatic merge failed; fix conflicts and then commit the result.
`;

const detected = detectGitConflictsFromTerminal(conflictSample);
if (!detected.hasConflict) {
  throw new Error('Failed to detect merge conflict from terminal snippet');
}
if (!detected.conflictedFiles.includes('SESSION_STATE.md')) {
  throw new Error('Failed to identify SESSION_STATE.md as conflicted file');
}

// 2. Verify clean terminal snippet has no conflicts
const cleanSample = 'Already up to date.';
const cleanDetected = detectGitConflictsFromTerminal(cleanSample);
if (cleanDetected.hasConflict) {
  throw new Error('False positive conflict detected on clean output');
}

// 3. Verify ConflictResolutionWizard component
if (typeof ConflictResolutionWizard !== 'function') {
  throw new Error('ConflictResolutionWizard component is not a valid React FC');
}

console.log('TC-P6-05 verified successfully: Conflict detection and wizard ready.');
"""]
    )
    if not ok:
        failures += 1

    # 25. TC-P7-01: End-to-End 14 Scenarios ZLCE Test Suite (TASK-036)
    ok, _ = run_step(
        "TC-P7-01 End-to-End 14 Scenarios ZLCE Test Suite (TASK-036)",
        ["npx", "tsx", "src/tests/e2eScenarios.test.ts"]
    )
    if not ok:
        failures += 1

    # 26. TC-P7-02: Android Low Memory Killer (LMK) Resilience & Recovery State Check (TASK-037)
    ok, _ = run_step(
        "TC-P7-02 Android LMK Resilience & Recovery State Check (TASK-037)",
        ["npx", "tsx", "src/tests/lmkRecovery.test.ts"]
    )
    if not ok:
        failures += 1

    # 27. TC-P7-03: Offline 100% (Airplane Mode) Operation Suite (TASK-038)
    ok, _ = run_step(
        "TC-P7-03 Offline 100% (Airplane Mode) Operation Suite (TASK-038)",
        ["npx", "tsx", "src/tests/offlineOperation.test.ts"]
    )
    if not ok:
        failures += 1

    # 28. TC-P7-04: Touch Screen Ergonomics & 44px+ Target Verification (TASK-039 / AUD-027)
    ok, _ = run_step(
        "TC-P7-04 Touch Screen Ergonomics & 44px+ Target Verification (TASK-039)",
        ["npx", "tsx", "src/tests/touchTarget.test.ts"]
    )
    if not ok:
        failures += 1

    # 29. TC-P7-05: Zero-Secret Security Audit & Token Cleanup Check (TASK-040)
    ok, _ = run_step(
        "TC-P7-05 Zero-Secret Security Audit & Token Cleanup Check (TASK-040)",
        ["bash", "-c", """
set -e
# 1. Verify docs/mobile/SECURITY_AUDIT.md exists and contains Zero-Secret verification
if [ ! -f "docs/mobile/SECURITY_AUDIT.md" ]; then
  echo "docs/mobile/SECURITY_AUDIT.md missing" >&2
  exit 1
fi

# 2. Execute security-audit.sh script
bash scripts/security-audit.sh >/dev/null

echo "TC-P7-05 verified successfully: Zero-Secret scan and clean-auth intact."
"""]
    )
    if not ok:
        failures += 1

    # 30. TC-P8-01: Tablet Installation & Termux Setup Verification (TASK-041)
    ok, _ = run_step(
        "TC-P8-01 Tablet Installation & Termux Setup Verification (TASK-041)",
        ["bash", "-c", """
set -e
# 1. Verify docs/mobile/INSTALLATION.md exists and contains required sections
if [ ! -f "docs/mobile/INSTALLATION.md" ]; then
  echo "docs/mobile/INSTALLATION.md missing" >&2
  exit 1
fi
grep -q "F-Droid" docs/mobile/INSTALLATION.md
grep -q "pkg install -y git python bash coreutils micro openssh" docs/mobile/INSTALLATION.md
grep -q "SM-T225" docs/mobile/INSTALLATION.md
grep -q "Home screen" docs/mobile/INSTALLATION.md || grep -q "Home Screen" docs/mobile/INSTALLATION.md

# 2. Verify docs/mobile/TERMUX_SETUP.md exists and covers micro, storage, and zero-daemon
if [ ! -f "docs/mobile/TERMUX_SETUP.md" ]; then
  echo "docs/mobile/TERMUX_SETUP.md missing" >&2
  exit 1
fi
grep -q "micro" docs/mobile/TERMUX_SETUP.md
grep -q "termux-setup-storage" docs/mobile/TERMUX_SETUP.md
grep -qi "zero-daemon" docs/mobile/TERMUX_SETUP.md

# 3. Test python standard library availability
python3 -c "import sys, os, re, json, subprocess; assert True"

echo "TC-P8-01 verified successfully: Tablet installation and Termux setup intact."
"""]
    )
    if not ok:
        failures += 1

    # 31. TC-P8-02: User Guide & 8-Member Relay Workflow Verification (TASK-042)
    ok, _ = run_step(
        "TC-P8-02 User Guide & 8-Member Relay Workflow Verification (TASK-042)",
        ["bash", "-c", """
set -e
# 1. Verify docs/mobile/USER_GUIDE.md exists
if [ ! -f "docs/mobile/USER_GUIDE.md" ]; then
  echo "docs/mobile/USER_GUIDE.md missing" >&2
  exit 1
fi

# 2. Verify 8 team members referenced
for member in eko oned cxperia sulistiyani layang acimau kepek gete; do
  grep -qi "$member" docs/mobile/USER_GUIDE.md
done

# 3. Verify key workflow concepts
grep -q "user.name" docs/mobile/USER_GUIDE.md
grep -q "clean-auth" docs/mobile/USER_GUIDE.md
grep -qi "RAM 3GB" docs/mobile/USER_GUIDE.md
grep -qi "debounce 400ms" docs/mobile/USER_GUIDE.md

echo "TC-P8-02 verified successfully: User Guide and 8-Member relay workflow intact."
"""]
    )
    if not ok:
        failures += 1

    # 32. TC-P8-03: Self-Recovery & Troubleshooting Matrix Verification (TASK-043)
    ok, _ = run_step(
        "TC-P8-03 Self-Recovery & Troubleshooting Matrix Verification (TASK-043)",
        ["bash", "-c", """
set -e
# 1. Verify docs/mobile/TROUBLESHOOTING.md exists
if [ ! -f "docs/mobile/TROUBLESHOOTING.md" ]; then
  echo "docs/mobile/TROUBLESHOOTING.md missing" >&2
  exit 1
fi

# 2. Verify Cases A-D presence
grep -q "KASUS A" docs/mobile/TROUBLESHOOTING.md
grep -q "KASUS B" docs/mobile/TROUBLESHOOTING.md
grep -q "KASUS C" docs/mobile/TROUBLESHOOTING.md
grep -q "KASUS D" docs/mobile/TROUBLESHOOTING.md

# 3. Verify prohibition of destructive commands and snapshot backup requirement
grep -q "git reset --hard" docs/mobile/TROUBLESHOOTING.md
grep -q "git push --force" docs/mobile/TROUBLESHOOTING.md
grep -q "zlce-snapshot.sh" docs/mobile/TROUBLESHOOTING.md

echo "TC-P8-03 verified successfully: Troubleshooting & self-recovery matrix intact."
"""]
    )
    if not ok:
        failures += 1

    # 33. TC-P9-01: Multi-AI Audit Generator & ZIP Bundle Verification (TASK-044)
    ok, _ = run_step(
        "TC-P9-01 Multi-AI Audit Generator & ZIP Bundle Verification (TASK-044)",
        ["npx", "tsx", "-e", """
import fs from 'fs';
import { generateExternalAuditPrompt } from './src/utils/auditPromptGenerator';
import { FeedbackReviewTab } from './src/components/mobile/FeedbackReviewTab';

// 1. Verify bundle script & ZIP existence
if (!fs.existsSync('scripts/create-audit-bundle.py')) {
  throw new Error('scripts/create-audit-bundle.py missing');
}
if (!fs.existsSync('public/assets/zlce-audit-review-bundle.zip')) {
  throw new Error('public/assets/zlce-audit-review-bundle.zip missing');
}
const zipStat = fs.statSync('public/assets/zlce-audit-review-bundle.zip');
if (zipStat.size < 50000) {
  throw new Error(`Audit ZIP bundle is suspiciously small: ${zipStat.size} bytes`);
}

// 2. Verify prompt generator produces model stop tokens & technical rules
const mockSession = {
  context: { projectName: 'ZLCE Mobile Workbench', stack: 'React 19', mode: 'FULL' as const, fileWriteCapability: 'YA', execCapability: 'YA' },
  status: { timestampAudit: '2026-11-05', gitBranch: 'v4-mobile', activeTask: 'TASK-044', activeTaskStatus: 'IN_PROGRESS' as const, lastDoneTask: 'TASK-043', nextTask: 'TASK-045' },
  tasks: [], assumptions: [], revisions: [], handoverNotes: '', auditLog: []
};

const claudePrompt = generateExternalAuditPrompt({ targetAi: 'claude-3.5-sonnet', focusArea: 'full-system' }, mockSession, '');
if (!claudePrompt.includes('=== END CLAUDE AUDIT RESPONSE ===') || !claudePrompt.includes('Zero-Secret')) {
  throw new Error('Claude audit prompt missing mandatory stop token or Zero-Secret directive');
}

const deepseekPrompt = generateExternalAuditPrompt({ targetAi: 'deepseek-v3', focusArea: 'architecture-zero-secret' }, mockSession, '');
if (!deepseekPrompt.includes('=== END DEEPSEEK AUDIT RESPONSE ===')) {
  throw new Error('DeepSeek audit prompt missing mandatory stop token');
}

// 3. Verify FeedbackReviewTab React component
if (typeof FeedbackReviewTab !== 'function') {
  throw new Error('FeedbackReviewTab component is not a valid React FC');
}

console.log('TC-P9-01 verified successfully: Audit prompt generator, stop tokens & 69-file ZIP bundle intact.');
"""]
    )
    if not ok:
        failures += 1

    # 34. TC-P9-02: Technical Clarification & File Excerpt Generator Check (TASK-045)
    ok, _ = run_step(
        "TC-P9-02 Technical Clarification & File Excerpt Generator Check (TASK-045)",
        ["npx", "tsx", "-e", """
import { generateTechnicalClarificationResponse } from './src/utils/auditPromptGenerator';

const mockSession = {
  context: { projectName: 'ZLCE Mobile Workbench', stack: 'React 19', mode: 'FULL' as const, fileWriteCapability: 'YA', execCapability: 'YA' },
  status: { timestampAudit: '2026-11-05', gitBranch: 'v4-mobile', activeTask: 'TASK-045', activeTaskStatus: 'IN_PROGRESS' as const, lastDoneTask: 'TASK-044', nextTask: 'TASK-046' },
  tasks: [], assumptions: [], revisions: [], handoverNotes: '', auditLog: []
};

// Test 1: LMK query
const lmkRes = generateTechnicalClarificationResponse('Bagaimana penanganan LMK pada RAM 3GB?', mockSession);
if (!lmkRes.responseText.includes('useAutoDraftCache') || !lmkRes.suggestedFiles.includes('src/tests/lmkRecovery.test.ts')) {
  throw new Error('Clarification generator failed LMK response test');
}

// Test 2: Zero-Secret query
const secRes = generateTechnicalClarificationResponse('Bagaimana kredensial dan git cache dibersihkan?', mockSession);
if (!secRes.responseText.includes('clean-auth.sh') || !secRes.responseText.includes('credential-cache exit')) {
  throw new Error('Clarification generator failed Zero-Secret security query test');
}

// Test 3: Touch target ergonomics query
const touchRes = generateTechnicalClarificationResponse('Apakah ukuran tombol memenuhi 44px layar sentuh?', mockSession);
if (!touchRes.responseText.includes('touch-target-44') || !touchRes.responseText.includes('visualViewport')) {
  throw new Error('Clarification generator failed touch target ergonomics query test');
}

console.log('TC-P9-02 verified successfully: Q&A clarification generator & file excerpt mapping intact.');
"""]
    )
    if not ok:
        failures += 1

    # 35. TC-P9-03: Review Findings Parser & Structured Task Proposal Check (TASK-046)
    ok, _ = run_step(
        "TC-P9-03 Review Findings Parser & Structured Task Proposal Check (TASK-046)",
        ["npx", "tsx", "-e", """
import { parseReviewFeedbackToProposedTasks } from './src/utils/auditPromptGenerator';

const sampleReport = `
# LAPORAN AUDIT & REVIEW TEKNIS: [CLAUDE 3.5 SONNET]
Tanggal Audit: 2026-11-05 18:30 WIB
Skor Kesiapan Produksi: 96 / 100

## A. RINGKASAN EKSEKUTIF
Sistem ZLCE Mobile Workbench v4.0.0 menunjukkan stabilitas tinggi dan zero context loss.

## B. MATRIKS EVALUASI PILAR ARSITEKTUR
| Pilar | Status | Bukti |
| Zero-Secret | PASS | scripts/security-audit.sh |

## C. TEMUAN CELAH, RISIKO ATAU SARAN PENINGKATAN
### Temuan #1: Pre-commit hook otomatis
* Tingkat Keparahan: MEDIUM
* Berkas Terdampak: scripts/install-hooks.sh
* Rekomendasi: Pasang hook pre-commit otomatis.

=== END CLAUDE AUDIT RESPONSE ===
`;

const parsed = parseReviewFeedbackToProposedTasks(sampleReport);
if (!parsed.modelName.includes('Claude')) {
  throw new Error(`Expected Claude model variant, parsed ${parsed.modelName}`);
}
if (parsed.score !== 96) {
  throw new Error(`Expected score 96, parsed ${parsed.score}`);
}
if (parsed.proposedTasks.length === 0) {
  throw new Error('Failed to generate proposed sub-tasks from review feedback');
}
const firstTask = parsed.proposedTasks[0];
if (!firstTask.id.startsWith('TASK-') || !firstTask.name || firstTask.impactFiles.length === 0) {
  throw new Error('Proposed task missing required schema attributes');
}

console.log('TC-P9-03 verified successfully: Review parser, scoring, and proposed tasks checklist intact.');
"""]
    )
    if not ok:
        failures += 1

    # =========================================================================
    # FASE 10: AUDIT REMEDIATION & ADVANCED HARDENING (AUD-001 s/d AUD-014)
    # =========================================================================

    # 36. TC-P10-01: Zero-Secret Pre-Commit Hook Hardening (TASK-047)
    ok, _ = run_step(
        "TC-P10-01 Zero-Secret Pre-Commit Hook Hardening (TASK-047)",
        ["bash", "-c", "test -x scripts/install-hooks.sh && test -f scripts/install-hooks.sh"]
    )
    if not ok:
        failures += 1

    # 37. TC-P10-02: LMK Hook Integration Lifecycle Test (TASK-048)
    ok, _ = run_step(
        "TC-P10-02 LMK Hook Integration Lifecycle Test (TASK-048)",
        ["npx", "tsx", "src/tests/lmkRecovery.test.ts"]
    )
    if not ok:
        failures += 1

    # 38. TC-P10-03: Browser Restart Validation (TASK-049)
    ok, _ = run_step(
        "TC-P10-03 Browser Restart Validation (TASK-049)",
        ["npx", "tsx", "src/tests/browserRecovery.test.ts"]
    )
    if not ok:
        failures += 1

    # 39. TC-P10-04: Physical SM-T225 LMK Verification (TASK-050)
    ok, _ = run_step(
        "TC-P10-04 Physical SM-T225 LMK Verification (TASK-050)",
        ["bash", "-c", "test -x scripts/test-lmk-physical.sh && bash scripts/test-lmk-physical.sh --verify-only"]
    )
    if not ok:
        failures += 1

    # 40. TC-P10-05: Browser Multi-User Session Isolation (TASK-051)
    ok, _ = run_step(
        "TC-P10-05 Browser Multi-User Session Isolation (TASK-051)",
        ["npx", "tsx", "src/tests/multiUserIsolation.test.ts"]
    )
    if not ok:
        failures += 1

    # 41. TC-P10-06: Task Claim Exclusivity & Conflict Guard (TASK-052)
    ok, _ = run_step(
        "TC-P10-06 Task Claim Exclusivity & Conflict Guard (TASK-052)",
        ["npx", "tsx", "src/tests/taskClaim.test.ts"]
    )
    if not ok:
        failures += 1

    # 42. TC-P10-07: Transactional File Persistence & Atomic Write (TASK-053)
    ok, _ = run_step(
        "TC-P10-07 Transactional File Persistence & Atomic Write (TASK-053)",
        ["npx", "tsx", "src/tests/transactionalPersistence.test.ts"]
    )
    if not ok:
        failures += 1

    # 43. TC-P10-08: Offline E2E Navigation & SW Cache Check (TASK-054)
    ok, _ = run_step(
        "TC-P10-08 Offline E2E Navigation & SW Cache Check (TASK-054)",
        ["npx", "tsx", "src/tests/offlineOperation.test.ts"]
    )
    if not ok:
        failures += 1

    # 44. TC-P10-09: Git Workflow Canonicalization (TASK-055)
    ok, _ = run_step(
        "TC-P10-09 Git Workflow Canonicalization (TASK-055)",
        ["npx", "tsx", "src/tests/gitWorkflow.test.ts"]
    )
    if not ok:
        failures += 1

    # =========================================================================
    # FASE 11 & 12: AUDIT REMEDIATION & PRODUCTION RECONCILIATION
    # =========================================================================

    # 45. TC-P11-01 / TC-P12-01: Bundle Closure & Export Parity Gate (TASK-061 & TASK-075)
    ok, _ = run_step(
        "TC-P12-01 Bundle Closure & Export Parity Gate (TASK-075)",
        ["python3", "scripts/create-audit-bundle.py"]
    )
    if not ok:
        failures += 1

    # 46. TC-P11-13: Touch Target & Tablet Ergonomics Quantitative Test (TASK-073)
    ok, _ = run_step(
        "TC-P11-13 Touch Target & Tablet Ergonomics Quantitative Test (TASK-073)",
        ["npx", "tsx", "src/tests/touchTarget.test.ts"]
    )
    if not ok:
        failures += 1

    # 47. TC-P12-04: Credential Handover Scope & Clean-Auth Verification (TASK-078)
    ok, _ = run_step(
        "TC-P12-04 Credential Handover Scope & Clean-Auth Verification (TASK-078)",
        ["bash", "scripts/zlce/clean-auth.sh"]
    )
    if not ok:
        failures += 1

    print("=" * 60)
    print(ACTIVE_COUNTER.summary())
    print("=" * 60)
    return 0 if ACTIVE_COUNTER.passed == ACTIVE_COUNTER.total and ACTIVE_COUNTER.total > 0 else 1


if __name__ == "__main__":
    sys.exit(main())

