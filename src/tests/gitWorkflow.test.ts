/**
 * TC-P10-09: Git Workflow Canonicalization & Zero-Destructive Guard Unit Test (AUD-009)
 * Memverifikasi:
 * 1. Ketersediaan template kanonik CMD-GIT-01 s/d CMD-GIT-07 lengkap.
 * 2. Seluruh perintah pull menggunakan opsi kanonik --ff-only.
 * 3. verifyNoDestructiveCommands menolak perintah dengan --force atau push -f atau branch -D.
 * 4. Template CMD-GIT-07 menggunakan penghapusan aman -d (bukan -D).
 * 5. Sanitizer menolak injeksi flag berbahaya pada git push.
 */

import {
  CANONICAL_COMMAND_TEMPLATES,
  getCommandTemplateById,
  verifyNoDestructiveCommands
} from '../data/commandTemplates';
import { CommandTemplate } from '../types/mobile';
import { generateIdentityCommitCommand } from '../utils/gitCommitFormatter';
import { shellQuote, assertSafeRepoPath, sanitizeTaskId } from '../utils/commandSanitizer';

export function runGitWorkflowCanonicalizationTests(): {
  passed: boolean;
  message: string;
  checks: { name: string; pass: boolean; details: string }[];
} {
  const checks: { name: string; pass: boolean; details: string }[] = [];

  // Check 1: Ketersediaan 7 template Git kanonik
  const gitTemplates = CANONICAL_COMMAND_TEMPLATES.filter(c => c.category === 'git');
  const requiredIds = ['CMD-GIT-01', 'CMD-GIT-02', 'CMD-GIT-03', 'CMD-GIT-04', 'CMD-GIT-05', 'CMD-GIT-06', 'CMD-GIT-07'];
  const hasAllIds = requiredIds.every(id => gitTemplates.some(t => t.id === id));
  checks.push({
    name: 'Check 1: Ketersediaan 7 template Git kanonik (CMD-GIT-01 s/d CMD-GIT-07)',
    pass: hasAllIds && gitTemplates.length >= 7,
    details: `Tersedia ${gitTemplates.length} template git kanonik di repositori.`
  });

  // Check 2: Proteksi pull wajib --ff-only
  const pullTemplates = gitTemplates.filter(t => t.directCommand.includes('pull'));
  const allPullFfOnly = pullTemplates.length > 0 && pullTemplates.every(t => t.directCommand.includes('--ff-only'));
  checks.push({
    name: 'Check 2: Seluruh template git pull menerapkan proteksi --ff-only wajib',
    pass: allPullFfOnly,
    details: `Semua (${pullTemplates.length}) perintah git pull diverifikasi menggunakan flag --ff-only.`
  });

  // Check 3: CMD-GIT-07 menggunakan branch -d aman
  const cleanTemplate = getCommandTemplateById('CMD-GIT-07');
  const isSafeDelete = cleanTemplate !== undefined && 
                       cleanTemplate.directCommand.includes('branch -d') && 
                       !cleanTemplate.directCommand.includes('branch -D');
  checks.push({
    name: 'Check 3: Template pembersihan cabang CMD-GIT-07 menggunakan branch -d aman (bukan -D)',
    pass: isSafeDelete,
    details: isSafeDelete 
      ? 'CMD-GIT-07 menggunakan branch -d yang mencegah penghapusan cabang unmerged tak sengaja.'
      : 'CMD-GIT-07 tidak mematuhi aturan penghapusan cabang aman.'
  });

  // Check 4: verifyNoDestructiveCommands mendeteksi dan menolak katalog berbahaya
  const corruptKatalog: CommandTemplate[] = [
    {
      id: 'CMD-MAL-01',
      category: 'git',
      title: 'Force Push Berbahaya',
      description: 'Menimpa riwayat git',
      riskLevel: 'mutating',
      directCommand: 'git push origin main --force',
      requiredParams: []
    }
  ];
  const rejectForce = !verifyNoDestructiveCommands(corruptKatalog);
  checks.push({
    name: 'Check 4: verifyNoDestructiveCommands memblokir template dengan flag --force',
    pass: rejectForce,
    details: rejectForce ? 'Flag --force terdeteksi dan diblokir secara mutlak.' : 'Gagal mendeteksi --force.'
  });

  // Check 5: Seluruh katalog default lolos verifikasi non-destruktif
  const defaultCatalogClean = verifyNoDestructiveCommands(CANONICAL_COMMAND_TEMPLATES);
  checks.push({
    name: 'Check 5: Seluruh katalog template bawaan 100% bebas dari perintah destruktif',
    pass: defaultCatalogClean,
    details: defaultCatalogClean
      ? 'Katalog bawaan 100% bersih dari perintah reset --hard, push -f, branch -D, dan rm -rf.'
      : 'Ditemukan perintah destruktif dalam katalog bawaan.'
  });

  // Check 6: TC-P11-03 POSIX Single-Quoting & Shell Injection Hardening (AUD-017)
  let check6Pass = false;
  let check6Details = '';
  try {
    // Test safe quote
    const quoted = shellQuote("Eko's Tablet");
    const isQuotedSafe = quoted === `'Eko'\\''s Tablet'`;

    // Test commit generation with POSIX quotes & '--'
    const cmd = generateIdentityCommitCommand({
      taskId: 'TASK-063',
      member: { id: 'eko', name: 'Eko Driver', email: 'eko@team.internal', role: 'driver', avatarColor: '#3b82f6' },
      message: 'feat: hardening shell injection',
      filesToStage: ['SESSION_STATE.md']
    });

    const hasSafeFlags = cmd.commitCommand.includes(`user.name='Eko Driver'`) &&
                         cmd.commitCommand.includes(`user.email='eko@team.internal'`) &&
                         cmd.stageCommand.startsWith(`git add -- 'SESSION_STATE.md'`);

    // Test rejection of malicious member name injection
    let rejectedName = false;
    try {
      generateIdentityCommitCommand({
        taskId: 'TASK-063',
        member: { id: 'bad', name: 'Eko" -c core.hooksPath=/tmp/x -c user.x="', email: 'a@b.co', role: 'driver', avatarColor: '#ef4444' },
        message: 'malicious test'
      });
    } catch {
      rejectedName = true;
    }

    check6Pass = isQuotedSafe && hasSafeFlags && rejectedName;
    check6Details = check6Pass
      ? 'POSIX single-quote escaping dan penolakan injeksi konfigurasi git tervalidasi 100%.'
      : 'Kegagalan format POSIX single-quote atau penolakan injeksi nama anggota.';
  } catch (e: any) {
    check6Details = `Error: ${e.message}`;
  }

  checks.push({
    name: 'Check 6: TC-P11-03 POSIX Single-Quoting & Git Configuration Anti-Injection (AUD-017)',
    pass: check6Pass,
    details: check6Details
  });

  // Check 7: TC-P11-03 Path Traversal, Sensitive Files & Invalid TaskId Rejection (AUD-017)
  let check7Pass = false;
  let check7Details = '';
  try {
    let rejectedForce = false;
    try { assertSafeRepoPath('--force'); } catch { rejectedForce = true; }

    let rejectedWildcard = false;
    try { assertSafeRepoPath('*'); } catch { rejectedWildcard = true; }

    let rejectedDotEnv = false;
    try { assertSafeRepoPath('.env'); } catch { rejectedDotEnv = true; }

    let rejectedTraversal = false;
    try { assertSafeRepoPath('../etc/passwd'); } catch { rejectedTraversal = true; }

    let rejectedBadTask = false;
    try { sanitizeTaskId('garbage_id'); } catch { rejectedBadTask = true; }

    check7Pass = rejectedForce && rejectedWildcard && rejectedDotEnv && rejectedTraversal && rejectedBadTask;
    check7Details = check7Pass
      ? 'assertSafeRepoPath dan sanitizeTaskId berhasil menolak --force, *, .env, ../, dan id sampah.'
      : 'Sebagian proteksi penolakan path/taskId berbahaya lolos.';
  } catch (e: any) {
    check7Details = `Error: ${e.message}`;
  }

  checks.push({
    name: 'Check 7: TC-P11-03 Penolakan Eksplisit Path Traversal, Berkas Rahasia, dan TaskId Cacat (AUD-017)',
    pass: check7Pass,
    details: check7Details
  });

  const allPassed = checks.every(c => c.pass);
  return {
    passed: allPassed,
    message: allPassed
      ? `TC-P10-09/P11-03 PASS (${checks.length}/${checks.length} checks): Git Workflow & Anti-Injection terverifikasi`
      : 'TC-P10-09/P11-03 FAIL: Sebagian pengujian alur kerja git kanonik / anti-injection gagal',
    checks
  };
}

// CLI Execution Support
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('gitWorkflow.test')) {
  const result = runGitWorkflowCanonicalizationTests();
  console.log(`\n=== TC-P10-09: Git Workflow Canonicalization Test ===`);
  result.checks.forEach(c => {
    console.log(`[${c.pass ? 'PASS' : 'FAIL'}] ${c.name}`);
    console.log(`    -> ${c.details}`);
  });
  console.log(`\nResult: ${result.message}\n`);
  if (!result.passed) {
    process.exit(1);
  }
}
