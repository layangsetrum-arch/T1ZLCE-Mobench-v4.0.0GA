/**
 * ZLCE Decision Conflict Detector & AI Handover Manager
 * Modul deteksi inkonsistensi keputusan antar-model AI dan pembuat catatan serah terima (Bagian 6).
 * Rujukan: HANDOVER_PROMPT.md & docs/mobile/blueprint/14_MULTI_AI_TEAM_MODEL.md
 */

import { ParsedSessionState, ZLCETask } from '../types/zlce';
import { 
  DecisionConflict, 
  ConflictCategory, 
  ConflictSeverity, 
  ConflictResolutionStatus, 
  AiHandoverReason,
  TeamMember 
} from '../types/mobile';
import { getModelStopToken, getAiBrowserUrl } from './promptGenerator';

export interface DetectConflictsParams {
  sourceAi: string;
  targetAi: string;
  targetAiProposalText: string;
  currentSessionState: ParsedSessionState;
  activeTask?: {
    id: string;
    name: string;
    dependencies?: string;
    status?: string;
    acceptanceCriteria?: string[];
  };
}

/**
 * Mendeteksi potensi perbedaan keputusan (Divergence / CONFLICT_DECISION)
 * antara model AI sumber dan target atau terhadap baseline ZLCE Core / ADR.
 */
export function detectDecisionConflicts(params: DetectConflictsParams): DecisionConflict[] {
  const { targetAiProposalText, currentSessionState, activeTask, targetAi } = params;
  const conflicts: DecisionConflict[] = [];
  const text = targetAiProposalText || '';
  const now = new Date().toISOString();

  if (!text.trim()) {
    return conflicts;
  }

  // 1. Deteksi Pelanggaran ADR-09: Obsidian Re-introduction
  if (/\bobsidian\b/i.test(text)) {
    conflicts.push({
      id: `CONF-${Date.now()}-1`,
      code: 'ADR_VIOLATION',
      category: 'ARCHITECTURAL_DIVERGENCE',
      severity: 'HIGH',
      title: 'Divergensi ADR-09: Usulan Penggunaan Obsidian',
      description: 'Model target menyarankan integrasi atau plugin Obsidian, yang secara tegas telah dieksklusikan dari Blueprint Inti v4.0.0 pada ADR-09 demi keandalan memori RAM 3GB.',
      sourceAiProposal: 'AI target menyebut atau merekomendasikan penggunaan Obsidian dalam solusi.',
      anchorBaseline: 'ADR-09: Obsidian dieksklusikan dari Blueprint Inti v4.0.0; sistem murni self-contained PWA.',
      detectedAt: now,
      resolutionStatus: 'PENDING_HUMAN'
    });
  }

  // 2. Deteksi Pelanggaran Aturan 1 Task IN_PROGRESS di Tablet
  const matchesInProgress = text.match(/\bIN_PROGRESS\b/gi);
  if (matchesInProgress && matchesInProgress.length > 1) {
    conflicts.push({
      id: `CONF-${Date.now()}-2`,
      code: 'CONFLICT_DECISION',
      category: 'STATUS_DISCREPANCY',
      severity: 'HIGH',
      title: 'Pelanggaran Aturan: Multi-Task IN_PROGRESS',
      description: 'Model mengusulkan lebih dari satu task berstatus IN_PROGRESS secara bersamaan, melanggar aturan tablet bersama.',
      sourceAiProposal: `Ditemukan ${matchesInProgress.length} referensi IN_PROGRESS dalam teks target.`,
      anchorBaseline: 'Aturan P2-CP6: Maksimum tepat 1 task berstatus IN_PROGRESS pada tablet bersama.',
      detectedAt: now,
      resolutionStatus: 'PENDING_HUMAN'
    });
  }

  // 3. Deteksi Usulan Branching Langsung ke main (Pelanggaran ADR-03 / ADR-05)
  if (/git\s+(commit|push)\s+.*origin\s+main\b/i.test(text) || /checkout\s+main\s*&&\s*git\s+commit/i.test(text)) {
    conflicts.push({
      id: `CONF-${Date.now()}-3`,
      code: 'ADR_VIOLATION',
      category: 'ARCHITECTURAL_DIVERGENCE',
      severity: 'HIGH',
      title: 'Divergensi Model Git: Commit/Push Langsung ke main',
      description: 'Model menyarankan commit atau push langsung ke branch main, melanggar model Branch per Task (task/TASK-xxx).',
      sourceAiProposal: 'Menyarankan eksekusi git push langsung ke cabang main.',
      anchorBaseline: 'ADR-03: Branch per Task (task/TASK-xxx) wajib digunakan untuk seluruh pekerjaan atomik.',
      detectedAt: now,
      resolutionStatus: 'PENDING_HUMAN'
    });
  }

  // 4. Deteksi Pelanggaran Larangan Kode Placeholder (Anti-Placeholder Rule)
  if (/\/\/\s*\.\.\.\s*existing\s*code\b/i.test(text) || /\/\*\s*\.\.\.\s*rest\s*of\s*code/i.test(text) || /TODO:\s*implement/i.test(text)) {
    conflicts.push({
      id: `CONF-${Date.now()}-4`,
      code: 'CONFLICT_DECISION',
      category: 'ARCHITECTURAL_DIVERGENCE',
      severity: 'HIGH',
      title: 'Pelanggaran Kode Placeholder (Anti-Placeholder Rule)',
      description: 'Model target memproduksi komentar elipsis atau placeholder seperti "// ... existing code ...", dilarang keras oleh ZLCE.',
      sourceAiProposal: 'Ditemukan sintaks placeholder elipsis yang merusak kontinuitas kode.',
      anchorBaseline: 'Invarian I1: Kode harus ditulis utuh tanpa placeholder atau elipsis.',
      detectedAt: now,
      resolutionStatus: 'PENDING_HUMAN'
    });
  }

  // 5. Deteksi Kontradiksi Asumsi Terkonfirmasi (ASM Check)
  if (currentSessionState.assumptions && currentSessionState.assumptions.length > 0) {
    for (const asm of currentSessionState.assumptions) {
      if (asm.status === 'CONFIRMED') {
        if (asm.id === 'ASM-01' && /\bobsidian\b/i.test(text)) {
          // Sudah tercakup di atas
        } else if (asm.id === 'ASM-02' && /(hanya\s+lead|lead\s+only|admin\s+only)\s+menyetujui/i.test(text)) {
          conflicts.push({
            id: `CONF-${Date.now()}-5`,
            code: 'CONFLICT_DECISION',
            category: 'ASSUMPTION_CONTRADICTION',
            severity: 'MEDIUM',
            title: `Kontradiksi Asumsi ${asm.id}: Hak Persetujuan Gerbang`,
            description: `Model target mengasumsikan hanya Lead yang berhak menyetujui, bertentangan dengan ${asm.id}.`,
            sourceAiProposal: 'Membatasi hak persetujuan pada peran tertentu.',
            anchorBaseline: `${asm.id}: Seluruh 8 anggota berhak menyetujui gerbang dengan provenance eksplisit (ADR-07).`,
            detectedAt: now,
            resolutionStatus: 'PENDING_HUMAN'
          });
        }
      }
    }
  }

  // 6. Deteksi Usulan Penambahan Library Backend Berat di PWA Client
  if (/\b(express|fastify|nestjs|mongoose|sequelize)\b/i.test(text) && !text.includes('vite.middlewares')) {
    conflicts.push({
      id: `CONF-${Date.now()}-6`,
      code: 'CONFLICT_DECISION',
      category: 'DEPENDENCY_CHANGE',
      severity: 'MEDIUM',
      title: 'Inkonsistensi Stack: Usulan Framework Server Berat',
      description: 'Model target mengusulkan framework server Node.js berat pada aplikasi PWA tablet murni.',
      sourceAiProposal: 'Mengusulkan dependensi server backend di luar batas arsitektur tablet.',
      anchorBaseline: 'Stack ZLCE Mobile Workbench: Client-side React 19 + Vite + Tailwind + PWA standalone.',
      detectedAt: now,
      resolutionStatus: 'PENDING_HUMAN'
    });
  }

  // 7. Deteksi Pengubahan Ruang Lingkup File di Luar WAL
  if (currentSessionState.wal && currentSessionState.wal.plannedFiles) {
    const planned = currentSessionState.wal.plannedFiles.toLowerCase();
    const fileMentions = text.match(/[\w/-]+\.(tsx|ts|py|sh|json|md)/g) || [];
    const unexpectedFiles = fileMentions.filter(f => {
      const fn = f.toLowerCase();
      return !planned.includes(fn) && !fn.includes('session_state') && !fn.includes('tasks.md') && !fn.includes('blueprint.md');
    });

    if (unexpectedFiles.length >= 3) {
      conflicts.push({
        id: `CONF-${Date.now()}-7`,
        code: 'SCOPE_DRIFT',
        category: 'FILE_SCOPE_DRIFT',
        severity: 'LOW',
        title: 'Potensi Scope Drift: Perubahan Berkas di Luar Rencana WAL',
        description: `Model target mereferensikan berkas (${unexpectedFiles.slice(0, 3).join(', ')}) yang tidak terdaftar pada rencana awal WAL.`,
        sourceAiProposal: `Menyentuh berkas tak terencana: ${unexpectedFiles.slice(0, 3).join(', ')}.`,
        anchorBaseline: `Rencana Berkas WAL: ${currentSessionState.wal.plannedFiles}`,
        detectedAt: now,
        resolutionStatus: 'PENDING_HUMAN'
      });
    }
  }

  return conflicts;
}

/**
 * Menyelesaikan satu konflik keputusan dengan justifikasi keputusan manusia (Human-in-the-Loop).
 */
export function resolveDecisionConflict(
  conflict: DecisionConflict,
  resolution: ConflictResolutionStatus,
  humanNotes: string,
  memberName: string
): DecisionConflict {
  return {
    ...conflict,
    resolutionStatus: resolution,
    humanNotes: humanNotes.trim(),
    resolvedBy: memberName,
    resolvedAt: new Date().toISOString()
  };
}

/**
 * Menghasilkan entri catatan serah terima kanonik untuk Bagian 6 SESSION_STATE.md (maks. ~10 baris).
 */
export function generateHandoverSummaryEntry(params: {
  sourceAi: string;
  targetAi: string;
  reason: AiHandoverReason | string;
  taskId: string;
  conflicts: DecisionConflict[];
  activeMemberName: string;
  customNote?: string;
  timestampWIB?: string;
}): string {
  const { sourceAi, targetAi, reason, taskId, conflicts, activeMemberName, customNote } = params;
  
  // Format waktu WIB
  let timeStr = params.timestampWIB;
  if (!timeStr) {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    timeStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())} WIB`;
  }

  const reasonLabelMap: Record<string, string> = {
    TOKEN_LIMIT_REACHED: 'Batas kuota/token per-sesi tercapai (Rate Limit)',
    CONTEXT_EXHAUSTED: 'Jendela konteks penuh atau degradasi memori',
    MODEL_CAPABILITY_SWITCH: 'Kebutuhan kapabilitas spesifik model target',
    SESSION_DISCONNECT: 'Sesi peramban terputus/crash (Recovery)',
    ROUTINE_ROTATION: 'Rotasi rutin model estafet tim',
    OTHER: customNote || 'Perpindahan manual oleh pengemudi tablet'
  };

  const reasonText = reasonLabelMap[reason] || reason;

  // Analisis resolusi konflik
  const pendingCount = conflicts.filter(c => c.resolutionStatus === 'PENDING_HUMAN').length;
  const acceptedCount = conflicts.filter(c => c.resolutionStatus === 'ACCEPTED').length;
  const rejectedCount = conflicts.filter(c => c.resolutionStatus === 'REJECTED' || c.resolutionStatus === 'OVERRIDDEN').length;

  let conflictSummary = 'Bebas konflik keputusan (Konsisten 100%)';
  if (conflicts.length > 0) {
    conflictSummary = `Konflik Keputusan: ${conflicts.length} terdeteksi (${acceptedCount} disetujui, ${rejectedCount} ditolak/override${pendingCount > 0 ? `, ${pendingCount} tertunda` : ''})`;
  }

  const lines = [
    `* ${timeStr}: Handover Lintas AI: [${sourceAi}] -> [${targetAi}] pada task ${taskId}. Alasan: ${reasonText}. ${conflictSummary}. Diverifikasi oleh: ${activeMemberName}.`
  ];

  if (customNote && reason !== 'OTHER') {
    lines.push(`  Catatan Tambahan: ${customNote}`);
  }

  return lines.join('\n');
}

/**
 * Menyuntikkan entri catatan serah terima baru ke Bagian 6 (## 6. CATATAN SERAH TERIMA)
 * di teks Markdown SESSION_STATE.md dengan tetap menjaga batas ringkas (~10 baris).
 */
export function applyHandoverToSessionState(
  rawSessionStateMd: string,
  newHandoverEntry: string
): string {
  if (!rawSessionStateMd || !rawSessionStateMd.includes('## 6. CATATAN SERAH TERIMA')) {
    return rawSessionStateMd;
  }

  const section6HeaderRegex = /(## 6\. CATATAN SERAH TERIMA[^\n]*\n+)/i;
  const nextSectionRegex = /(---+\s*\n+## 7\. LOG AUDIT)/i;

  const matchHeader = rawSessionStateMd.match(section6HeaderRegex);
  const matchNext = rawSessionStateMd.match(nextSectionRegex);

  if (!matchHeader || !matchNext || matchHeader.index === undefined || matchNext.index === undefined) {
    return rawSessionStateMd;
  }

  const headerEnd = matchHeader.index + matchHeader[0].length;
  const sectionContent = rawSessionStateMd.slice(headerEnd, matchNext.index).trim();

  // Pisahkan baris-baris serah terima lama
  const existingLines = sectionContent
    ? sectionContent.split('\n').filter(l => l.trim().length > 0)
    : [];

  // Gabungkan entri baru di posisi paling atas
  const combinedLines = [newHandoverEntry.trim(), ...existingLines];

  // Batasi agar tidak lebih dari 9 baris untuk menjaga batas kanonik maks ~10 baris
  const prunedLines = combinedLines.slice(0, 9);
  const formattedSection = prunedLines.join('\n') + '\n\n';

  return (
    rawSessionStateMd.slice(0, headerEnd) +
    formattedSection +
    rawSessionStateMd.slice(matchNext.index)
  );
}

export interface GenerateHandoverPromptParams {
  sourceAi: string;
  targetAi: string;
  reason: string;
  taskId: string;
  activeMember: TeamMember;
  sessionState: ParsedSessionState;
  conflicts: DecisionConflict[];
  targetBudgetPreset?: string;
  customInstructions?: string;
}

/**
 * Menghasilkan Handover Prompt berstandar C-I-D-I kanonik (HANDOVER_PROMPT.md)
 * yang dioptimalkan untuk model AI penerima, dilengkapi stop token, status WAL, dan resolusi konflik.
 */
export function generateHandoverPrompt(params: GenerateHandoverPromptParams): string {
  const {
    sourceAi,
    targetAi,
    reason,
    taskId,
    activeMember,
    sessionState,
    conflicts,
    customInstructions
  } = params;

  const stopToken = getModelStopToken((targetAi.toLowerCase() as any) || 'gemini');
  const targetWebUrl = getAiBrowserUrl(targetAi);

  // Cari detail task aktif
  const currentTask = sessionState.tasks.find(t => t.id === taskId);
  const taskName = currentTask ? currentTask.name : sessionState.wal?.task || taskId;

  // Format resolusi konflik
  let conflictSectionText = 'Nihil konflik terdeteksi. Proyek dalam kondisi 100% konsisten.';
  if (conflicts && conflicts.length > 0) {
    conflictSectionText = conflicts.map(c => {
      const statusLabel = 
        c.resolutionStatus === 'ACCEPTED' ? 'DISETUJUI MANUSIA (ACCEPT)' :
        c.resolutionStatus === 'REJECTED' ? 'DITOLAK MANUSIA (REJECT / ANCHOR BASELINE ENFORCED)' :
        c.resolutionStatus === 'OVERRIDDEN' ? 'DI-OVERRIDE DENGAN SYARAT KHUSUS' :
        'MENUNGGU KONFIRMASI (PENDING_HUMAN)';
      return `- [${c.code}] ${c.title} (${statusLabel})\n  * Baseline: ${c.anchorBaseline}\n  * Solusi Diterima: ${c.humanNotes || c.anchorBaseline}`;
    }).join('\n\n');
  }

  const promptText = `### C - CONTEXT (HANDOVER LINTAS AI)
Anda melanjutkan proyek yang dikelola dengan metodologi ZLCE (Zero-Loss Context Engineering) v4.0.0.
Sesi ini dialihkan dari AI Sumber: [${sourceAi}] ke AI Target: [${targetAi}] pada perangkat tablet bersama (Samsung Galaxy Tab A7 Lite).
Pengemudi tablet aktif: ${activeMember.name} (@${activeMember.id} - ${activeMember.email}).
Alasan Serah Terima: ${reason}.

SUMBER KEBENARAN STATUS PROYEK:
- Dokumen Kontrol Tunggal: \`SESSION_STATE.md\` (Bagian 0 s.d. 7)
- Backlog Task Rinci: \`TASKS.md\`
- Cetak Biru Arsitektur: \`docs/mobile/blueprint/01_SYSTEM_OVERVIEW.md\` s/d \`14_MULTI_AI_TEAM_MODEL.md\`
Aturan Invarian ZLCE: I1 (All in Files), I2 (Cold-Start Resume), I3 (ZLCE Core Invariance), I4 (Strict Provenance Tracking), I5 (Zero Lost Updates).

---
### I - INSTRUCTION (ESTAFET TUGAS MANDATORI)
Anda mengemban tugas melanjutkan Task Aktif: **${taskId} - ${taskName}**.

Jalankan urutan berikut tanpa melompat:
1. LANGKAH 0: BACA KONTROL DOKUMEN & WAL SEBELUMNYA
   - Konfirmasi Task: ${taskId}
   - Langkah Sedang Dikerjakan: ${sessionState.wal?.currentStep || '-'}
   - Berkas Rencana: ${sessionState.wal?.plannedFiles || '-'}
   - Langkah Terakhir yang Selesai: ${sessionState.wal?.completedSoFar || '-'}
   - Langkah Berikutnya (Persis): ${sessionState.wal?.nextStepExact || '-'}
   - Perintah Verifikasi: \`${sessionState.wal?.verificationCommand || 'npm run build'}\`

2. LANGKAH 1: PENEGAKAN RESOLUSI KONFLIK KEPUTUSAN
${conflictSectionText}

3. LANGKAH 2: EKSEKUSI SOLUSI BERSIH TANPA PLACEHOLDER
   - Terapkan aturan SCHEMA-BEFORE-DATA: Tampilkan struktur antarmuka/tipe sebelum logika.
   - LARANGAN KERAS KODE PLACEHOLDER: Dilarang keras memakai '// ... existing code ...', 'TODO', atau elipsis.
   - Sediakan berkas lengkap dengan deklarasi path di atasnya (contoh: --- /src/components/... ---).
   - Pastikan seluruh tombol aksi memiliki target sentuh minimal 44x44px (min-h-[44px]) ramah layar sentuh tablet.

4. LANGKAH 3: PEMBARUAN SESSION_STATE.md & WAL
   - Perbarui Bagian 3 (WAL) secara presisi mencerminkan kemajuan langkah Anda.
   - Jangan menyentuh status task lain; hanya kerjakan tepat satu task ${taskId}.
${customInstructions ? `\n5. INSTRUKSI SPESIFIK ANGGOTA:\n${customInstructions}` : ''}

---
### D - DETAILS (ATURAN TEKNIS & INJEKSI PROVENANCE)
- Provenance Header Wajib: Sertakan tag komentar [Aktor: ${activeMember.name}, AI: ${targetAi}, Task: ${taskId}] pada berkas yang Anda ubah.
- Baris Baru Unix LF murni tanpa carriage return Windows (CRLF).
- Tidak menyimpan token atau kredensial rahasia (Zero-Secret Policy).

---
### I - INPUT / OUTPUT SCHEMA
Bila Anda siap mengeksekusi, berikan output dengan format:
1. Konfirmasi Handover & Verifikasi Baseline (Maks 5 baris).
2. Blok Kode Lengkap untuk setiap berkas terdampak (Pristine, 0 placeholder).
3. Blok Pembaruan WAL untuk disalin ke SESSION_STATE.md Bagian 3.
4. Perintah Verifikasi yang siap dijalankan di Termux / CLI.

${stopToken}
`;

  return promptText.trim();
}
