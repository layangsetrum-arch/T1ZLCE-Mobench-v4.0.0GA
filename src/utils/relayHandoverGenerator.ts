/**
 * ZLCE Universal Relay Handover Generator
 * Memfasilitasi serah terima dan eksekusi task berapapun (TASK-001 s/d TASK-043+)
 * ke berbagai model AI (Claude, ChatGPT, Cursor, Copilot, Gemini, DeepSeek).
 * 
 * Rujukan: docs/mobile/blueprint/14_MULTI_AI_TEAM_MODEL.md (Invarian I1, I2, I4)
 */

import { ParsedSessionState, ZLCETask, ParsedBacklogTask } from '../types/zlce';
import { TeamMember } from '../types/mobile';
import { TEAM_MEMBERS } from '../data/teamMembers';
import { TargetAIProvider, TokenBudgetPreset, getAIProviderLabel, getStopTokenDirective } from './contextPackGenerator';
import { getModelStopToken } from './promptGenerator';
import { calculateTokenSafety, TokenSafetyCalculation } from './tokenBudgetAdapter';

export interface RelayHandoverOptions {
  taskId: string;
  aiProvider: TargetAIProvider;
  tokenBudgetPreset?: TokenBudgetPreset;
  activeMember?: TeamMember;
  sessionState?: ParsedSessionState;
  taskDetail?: ParsedBacklogTask;
  taskDetailMap?: Map<string, ParsedBacklogTask>;
  customDirectives?: string;
  handoverMode?: 'direct-execution' | 'cidi-handover';
}

export interface RelayStepInfo {
  stepNumber: number;
  title: string;
  description: string;
  actionType: 'download' | 'open-ai' | 'attach' | 'copy-prompt' | 'verify';
  targetUrl?: string;
}

export interface RelayHandoverOutput {
  taskId: string;
  taskName: string;
  task: ZLCETask;
  taskDetail?: ParsedBacklogTask;
  aiProvider: TargetAIProvider;
  aiProviderLabel: string;
  aiWebUrl: string;
  driver: TeamMember;
  fullPrompt: string;
  estimatedTokens: number;
  charCount: number;
  stopToken: string;
  safety: TokenSafetyCalculation;
  steps: RelayStepInfo[];
  filename: string;
}

/**
 * Kembalikan URL web resmi untuk AI provider
 */
export function getAIWebUrl(provider: TargetAIProvider): string {
  switch (provider) {
    case 'claude':
      return 'https://claude.ai';
    case 'chatgpt':
      return 'https://chatgpt.com';
    case 'cursor':
      return 'https://cursor.com';
    case 'copilot':
      return 'https://github.com/copilot';
    case 'gemini':
      return 'https://aistudio.google.com';
    case 'deepseek':
      return 'https://chat.deepseek.com';
    case 'qwen':
      return 'https://chat.qwenlm.ai';
    default:
      return 'https://claude.ai';
  }
}

/**
 * Generate Relay Handover Prompt untuk TASK BERAPAPUN
 */
export function generateRelayHandover(options: RelayHandoverOptions): RelayHandoverOutput {
  const {
    taskId,
    aiProvider,
    tokenBudgetPreset = aiProvider === 'gemini' ? 'gemini-1m' : aiProvider === 'cursor' ? 'cursor-64k' : aiProvider === 'copilot' ? 'copilot-32k' : aiProvider === 'deepseek' ? 'deepseek-64k' : aiProvider === 'chatgpt' ? 'gpt-128k' : 'claude-30k',
    activeMember = TEAM_MEMBERS[0],
    sessionState,
    taskDetail: explicitDetail,
    taskDetailMap,
    customDirectives = '',
    handoverMode = 'direct-execution'
  } = options;

  const taskDetail = explicitDetail || (taskDetailMap ? taskDetailMap.get(taskId) : undefined);

  // Ambil data task dari sessionState jika ada, atau buat dari taskDetail
  const foundInSession = sessionState?.tasks?.find(t => t.id === taskId);
  const task: ZLCETask = foundInSession || {
    id: taskId,
    name: taskDetail?.title || `Task ${taskId}`,
    dependencies: taskDetail?.dependencies || '-',
    status: (taskDetail?.phase === 'FASE 0' ? 'DONE' : 'READY') as any,
    evidence: '-',
    approved: '-'
  };

  const aiProviderLabel = getAIProviderLabel(aiProvider);
  const aiWebUrl = getAIWebUrl(aiProvider);
  const stopToken = getModelStopToken(aiProvider);

  // Format Acceptance Criteria
  const acceptanceCriteriaText = taskDetail?.acceptanceCriteria && taskDetail.acceptanceCriteria.length > 0
    ? taskDetail.acceptanceCriteria.map((ac, idx) => `${idx + 1}. ${ac}`).join('\n')
    : `1. Implementasi kode lengkap tanpa placeholder dan tervalidasi bersih saat build (${task.id}).\n2. Lulus uji verifikasi di Termux/POSIX.\n3. Pertahankan target sentuh ergonomis tablet min-h-[44px].`;

  // Format Berkas Target
  const targetFilesText = taskDetail?.files && taskDetail.files.length > 0
    ? taskDetail.files.map((f, idx) => `${idx + 1}. \`${f}\``).join('\n')
    : `1. Berkas implementasi terkait ${task.id}`;

  // Format WAL & Context Pack Ringkas
  const projectName = sessionState?.context?.projectName || 'ZLCE Mobile Workbench v4.0.0';
  const stack = sessionState?.context?.stack || 'React 19 + TypeScript + Vite + Tailwind CSS (v4)';
  const lastDone = sessionState?.status?.lastDoneTask || 'TASK-077';
  const gitBranch = task.id.startsWith('TASK-') ? `task/${task.id}` : (sessionState?.status?.gitBranch || 'v4-mobile');

  let promptBody = '';

  if (handoverMode === 'cidi-handover') {
    // Mode C-I-D-I Handover
    promptBody = `Kamu adalah Senior Frontend & TypeScript Engineer yang bertindak sebagai AI Coding Engine untuk proyek ZLCE Mobile Workbench v4.0.0 (Zero-Loss Context Engineering Studio).
Kamu menerima serah terima estafet (Relay Handover) untuk melanjutkan proyek secara mandiri tanpa asumsi riwayat obrolan masa lalu (Invarian I2 - Cold-Start Resume).

### 1. PROTOKOL SERAH TERIMA C-I-D-I (SCHEMA-BEFORE-DATA):
* **C - CONTEXT:**
  - Proyek: ${projectName}
  - Stack: ${stack}
  - Driver Tablet Saat Ini: ${activeMember.name} (${activeMember.role}) <${activeMember.email}>
  - Model AI Penerima: ${aiProviderLabel}
  - Task Terakhir Selesai: ${lastDone}
  - Mandat Task Estafet: ${task.id} (${task.name})
  - Git Branch: ${gitBranch}

* **I - INSTRUCTION (LANGKAH EKSEKUSI WAJIB):**
  1. Pelajari spesifikasi tugas ${task.id} di bawah.
  2. Tuliskan implementasi kode LENGKAP untuk seluruh berkas terdampak tanpa placeholder.
  3. Berikan perintah verifikasi POSIX/Termux yang harus dijalankan pengguna.
  4. Berikan pembaruan blok WAL dan Log Audit berformat SESSION_STATE.md.

* **D - DETAILS & ATURAN MUTLAK KODE:**
  1. PELARANGAN KERAS KODE PLACEHOLDER (STRICT ANTI-PLACEHOLDER):
     - Dilarang keras menggunakan komentar elipsis ("// ... rest of code", "// ... existing code ...").
     - Tuliskan seluruh isi berkas dari baris pertama hingga baris terakhir dengan semua import dan tipe lengkap.
  2. ERGONOMI TABLET SAMSUNG TAB A7 LITE (8.7", 1340x800):
     - Semua elemen interaktif (tombol, dropdown, kartu) WAJIB memiliki target sentuh minimal 44x44px (\`min-h-[44px]\`).
  3. PRESERVASI WAKTU SUMBER:
     - Dilarang mengarang jam real-time sintetis. Gunakan jam fixture atau tulis "jam: ?".

### 2. MANDAT TUGAS AKTIF: ${task.id}
* **Nama Task:** ${task.name}
* **Fase:** ${taskDetail?.phase || 'FASE AKTIF'}
* **Dependensi:** ${task.dependencies}
* **Status Saat Ini:** ${task.status}
* **Docs Terkait:** ${taskDetail?.docsRelated || 'docs/mobile/blueprint/14_MULTI_AI_TEAM_MODEL.md'}
* **Docs Impact:** ${taskDetail?.docsImpact || 'SESSION_STATE.md, TASKS.md'}

### BERKAS TARGET:
${targetFilesText}

### KRITERIA PENERIMAAN (ACCEPTANCE CRITERIA):
${acceptanceCriteriaText}

${customDirectives ? `### INSTRUKSI KHUSUS:\n${customDirectives}\n` : ''}
### 3. OUTPUT SCHEMA WAJIB:
Sajikan respon Anda dalam 4 blok terstruktur:
1. [RINGKASAN TEKNIS & ANALISIS PERUBAHAN] (Maksimal 4 butir)
2. [KODE SUMBER LENGKAP PER FILE] (Gunakan header: \`--- /path/ke/berkas.ext ---\` diikuti blok kode lengkap)
3. [PERINTAH VERIFIKASI POSIX / TERMUX] (\`npm run build && python3 scripts/zlce-check.py .\`)
4. [BLOK CHECKPOINT & WAL UNTUK SESSION_STATE.MD]

### 4. STOP TOKEN WAJIB:
Di akhir respon Anda, Anda WAJIB mencetak stop token persis di bawah ini:
${stopToken}
`;
  } else {
    // Mode Direct Execution Mandate
    promptBody = `Kamu adalah Senior Frontend & TypeScript Engineer yang bertindak sebagai AI Coding Engine untuk proyek ZLCE Mobile Workbench v4.0.0 (Zero-Loss Context Engineering Studio).

### KONTEKS PROYEK & ATURAN METODOLOGI:
1. Stack: ${stack}.
2. Metodologi: Zero-Loss Context Engineering (ZLCE).
   - Invarian I1 (All in Files): Sumber kebenaran tunggal adalah file Markdown dan kode repositori.
   - Invarian I2 (Cold-Start Resume): Eksekusi mandiri tanpa asumsi ingatan chat sebelumnya.
   - Invarian I4 (Strict Provenance Tracking): Menghasilkan kode teratribusi [Aktor: ${activeMember.name}, Model: ${aiProviderLabel}, Task: ${task.id}].
   - Schema-before-Data: Tipe TypeScript murni dan antarmuka harus didefinisikan sebelum implementasi logika.
3. ATURAN KODE MUTLAK (STRICT ANTI-PLACEHOLDER RULE):
   - Tulis kode LENGKAP tanpa placeholder, tanpa tanda elipsis ("// ... rest of code"), tanpa fungsi mockup kosong.
   - Seluruh berkas yang disentuh ditulis utuh dan siap pakai (fully runnable drop-in replacement).
   - Sesuai dengan batasan layar tablet Android 8.7" (Samsung Tab A7 Lite): target sentuh minimal 44px (\`min-h-[44px]\`).
   - Dilarang mengarang waktu audit sintetis (gunakan format sumber atau "jam: ?").

### MANDAT TUGAS: IMPLEMENTASI ${task.id}
* **Nama Task:** ${task.name}
* **Fase:** ${taskDetail?.phase || 'FASE AKTIF'}
* **Dependensi:** ${task.dependencies}
* **Status:** ${task.status}
* **Driver Tablet:** ${activeMember.name} (${activeMember.role}) <${activeMember.email}>
* **Git Branch:** \`${gitBranch}\`

### TARGET BERKAS YANG DIBANGUN / DIMODIFIKASI:
${targetFilesText}

### SPESIFIKASI & KRITERIA PENERIMAAN (ACCEPTANCE CRITERIA):
${acceptanceCriteriaText}

${customDirectives ? `### INSTRUKSI TAMBAHAN:\n${customDirectives}\n` : ''}
### VERIFIKASI AKHIR:
\`\`\`bash
npm run build && python3 scripts/zlce-check.py . && python3 scripts/run-tests.py
\`\`\`

${getStopTokenDirective(aiProvider)}
Outputkan kode lengkap untuk seluruh berkas tersebut sekarang.`;
  }

  const charCount = promptBody.length;
  const estimatedTokens = Math.ceil(charCount / 4);
  const safety = calculateTokenSafety(estimatedTokens, tokenBudgetPreset);
  const filename = `ESTAFET_${task.id}_${aiProvider.toUpperCase()}.md`;

  // Generate 5 Tailored Tutorial Steps
  const steps: RelayStepInfo[] = [
    {
      stepNumber: 1,
      title: 'Unduh Bundle ZLCE (.zip)',
      description: `Unduh berkas bundel status & kontrol ZLCE (zlce-claude-chatgpt-bundle.zip) yang berisi SESSION_STATE.md, TASKS.md, dan dokumen kontrol repositori.`,
      actionType: 'download'
    },
    {
      stepNumber: 2,
      title: `Buka ${aiProviderLabel}`,
      description: `Buka peramban di tablet: ${aiWebUrl}. Buat obrolan baru untuk memastikan cold-start bersih tanpa polusi konteks lama.`,
      actionType: 'open-ai',
      targetUrl: aiWebUrl
    },
    {
      stepNumber: 3,
      title: 'Lampirkan / Unggah Berkas Konteks',
      description: `Unggah berkas ZIP atau lampirkan SESSION_STATE.md dan TASKS.md ke jendela chat ${aiProviderLabel}.`,
      actionType: 'attach'
    },
    {
      stepNumber: 4,
      title: `Salin & Tempel Prompt ${task.id}`,
      description: `Salin prompt siap pakai untuk ${task.id} (${task.name}) yang telah dikonfigurasi anti-placeholder dan target sentuh >= 44px.`,
      actionType: 'copy-prompt'
    },
    {
      stepNumber: 5,
      title: 'Verifikasi di Termux & Capture Hasil',
      description: `Masukkan kode hasil keluaran AI, lalu gunakan menu Result Capture di ZLCE Studio untuk mengalirkan update WAL dan log audit otomatis.`,
      actionType: 'verify'
    }
  ];

  return {
    taskId: task.id,
    taskName: task.name,
    task,
    taskDetail,
    aiProvider,
    aiProviderLabel,
    aiWebUrl,
    driver: activeMember,
    fullPrompt: promptBody.trim(),
    estimatedTokens,
    charCount,
    stopToken,
    safety,
    steps,
    filename
  };
}
