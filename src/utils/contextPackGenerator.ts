/**
 * ZLCE Portable Context Pack Generator (Schema-before-Data)
 * Rujukan: docs/mobile/blueprint/14_MULTI_AI_TEAM_MODEL.md & TASK-013
 * 
 * Menghasilkan paket konteks mandiri (self-contained) yang mematuhi
 * Invarian I1 (All in Files) dan Invarian I2 (Cold-Start Resume).
 * Setiap AI coding assistant (Gemini, Claude, GPT, DeepSeek) dapat langsung
 * melanjutkan pekerjaan tanpa memerlukan riwayat obrolan sebelumnya.
 */

import { ParsedSessionState, ZLCETask, ParsedBacklogTask } from '../types/zlce';
import { TeamMember } from '../types/mobile';
import { redactSecrets } from './redactSecrets';

export type TargetAIProvider = 
  | 'gemini' 
  | 'claude' 
  | 'chatgpt' 
  | 'deepseek' 
  | 'copilot'
  | 'cursor'
  | 'qwen' 
  | 'generic';

export type TokenBudgetPreset = 
  | 'gemini-1m'      // Comprehensive (1M+ tokens window)
  | 'claude-30k'     // High-precision compact (8K-30K budget)
  | 'gpt-128k'       // Standard full (128K window)
  | 'deepseek-64k'   // DeepSeek V3/R1 with Reasoning Buffer (64K window)
  | 'copilot-32k'    // GitHub Copilot Chat & Edits (32K window)
  | 'cursor-64k'     // Cursor AI Composer / Agent (64K window)
  | 'compact-8k'     // Ultra-lightweight for slow mobile / quick handovers
  | 'freebuff-4k';   // Free Tier Buffer Mode (Ultra-lean 4K for strict limits)

export interface ContextPackGeneratorOptions {
  task: ZLCETask;
  taskDetail?: ParsedBacklogTask;
  sessionState: ParsedSessionState;
  activeMember: TeamMember;
  targetAi?: TargetAIProvider;
  targetAiLabel?: string;
  tokenBudgetPreset?: TokenBudgetPreset;
  mode?: 'FULL' | 'LITE';
  customInstructions?: string;
  timestamp?: string;
}

export interface ContextPackOutput {
  markdown: string;
  metadata: {
    projectId: string;
    taskId: string;
    taskName: string;
    gitBranch: string;
    activeMemberName: string;
    activeMemberEmail: string;
    targetAi: string;
    tokenBudgetPreset: TokenBudgetPreset;
    mode: 'FULL' | 'LITE';
    timestamp: string;
    estimatedTokens: number;
    characterCount: number;
    invariantsComplied: string[];
  };
}

/**
 * Estimasi jumlah token dengan faktor keselamatan konservatif (~3.2 chars per token) (AUD-028).
 */
export function estimateTokenCount(text: string, charsPerToken: number = 3.2): number {
  if (!text) return 0;
  return Math.ceil(text.length / charsPerToken);
}

/**
 * Label bersahabat untuk provider AI
 */
export function getAIProviderLabel(provider: TargetAIProvider): string {
  switch (provider) {
    case 'gemini':
      return 'Google Gemini (1.5 / 2.0 / 2.5 Pro / Flash)';
    case 'claude':
      return 'Anthropic Claude (3.5 Sonnet / 5.5 Sonnet / Opus)';
    case 'chatgpt':
      return 'OpenAI ChatGPT (GPT-4o / o1 / o3-mini)';
    case 'deepseek':
      return 'DeepSeek (V3 / R1 / Coder)';
    case 'copilot':
      return 'GitHub Copilot (Chat / Edits / CLI)';
    case 'cursor':
      return 'Cursor AI (Composer / Agent / Rules)';
    case 'qwen':
      return 'Alibaba Qwen (2.5 Coder)';
    case 'generic':
    default:
      return 'AI Coding Assistant (Universal Standard)';
  }
}

/**
 * Stop token dan instruksi penutup sesuai target AI
 */
export function getStopTokenDirective(provider: TargetAIProvider): string {
  switch (provider) {
    case 'claude':
      return '<<<END_CLAUDE_ZLCE_RESPONSE>>>';
    case 'gemini':
      return '<<<END_GEMINI_ZLCE_RESPONSE>>>';
    case 'chatgpt':
      return '<<<END_GPT_ZLCE_RESPONSE>>>';
    case 'deepseek':
      return '<<<END_DEEPSEEK_ZLCE_RESPONSE>>>';
    case 'copilot':
      return '<<<END_COPILOT_ZLCE_RESPONSE>>>';
    case 'cursor':
      return '<<<END_CURSOR_ZLCE_RESPONSE>>>';
    default:
      return '<<<END_ZERO_LOSS_EXECUTION>>>';
  }
}

/**
 * Menghasilkan Portable Context Pack terstruktur sesuai Blueprint 14 & ZLCE Core.
 */
export function generatePortableContextPack(options: ContextPackGeneratorOptions): ContextPackOutput {
  const {
    task,
    taskDetail,
    sessionState,
    activeMember,
    targetAi = 'gemini',
    targetAiLabel,
    tokenBudgetPreset = 'gemini-1m',
    mode = sessionState.context.mode || 'FULL',
    customInstructions,
    timestamp = new Date().toISOString()
  } = options;

  const effectiveAiLabel = targetAiLabel || getAIProviderLabel(targetAi);
  const stopToken = getStopTokenDirective(targetAi);
  const gitBranch = `task/${task.id}`;
  const projectName = sessionState.context.projectName || 'ZLCE Mobile Workbench v4.0.0';

  // 1. Acceptance criteria strings
  const acceptanceList = taskDetail?.acceptanceCriteria && taskDetail.acceptanceCriteria.length > 0
    ? taskDetail.acceptanceCriteria.map((ac, idx) => `${idx + 1}. ${ac}`).join('\n')
    : `1. Implementasi ${task.id} (${task.name}) secara utuh dan fungsional tanpa placeholder kode.\n2. Lulus uji verifikasi lokal dengan kode keluar 0.\n3. Perbarui status SESSION_STATE.md dan WAL tanpa melanggar format kanonik.`;

  // 2. Verification command
  const verificationCmd = sessionState.wal.verificationCommand || 'npm run build && python3 scripts/zlce-check.py .';

  // 3. Planned files
  const plannedFiles = taskDetail?.files?.join(', ') || sessionState.wal.plannedFiles || '-';

  // 4. Compact vs Comprehensive Tier 0 Architecture Summary
  const isCompact = tokenBudgetPreset === 'compact-8k' || tokenBudgetPreset === 'claude-30k';

  const tier0Architecture = isCompact ? `### 2. JANGKAR KEBENARAN ARSITEKTUR (TIER 0 - RINGKAS)
* **Perangkat Bersama:** Samsung Galaxy Tab A7 Lite 8.7" (SM-T225 · 3GB RAM · Termux POSIX).
* **Model Tim:** 8 Anggota Estafet, 1 Repositori Bersama, Cabang Git per Task (\`${gitBranch}\`), proteksi branch \`main\` (ADR-03).
* **Aturan IN_PROGRESS:** Tepat 1 task IN_PROGRESS di tablet pada satu waktu (ADR-07).
* **Kebijakan Keamanan:** Zero-Secret Policy (dilarang memasukkan token, password, atau secret ke kode atau prompt).
* **ADR-09:** Obsidian dieksklusikan dari Cetak Biru v4.0.0 demi keandalan RAM 3GB.`
: `### 2. JANGKAR KEBENARAN ARSITEKTUR (TIER 0 - KOMPREHENSIF)
* **Perangkat Sasaran:** Samsung Galaxy Tab A7 Lite 8.7" (SM-T225 · 3GB RAM · Android 13 · WXGA+ 1340x800).
* **Lingkungan Runtime:** Termux (Node.js LTS, Python 3.11, Git, Bash) + Chromium PWA.
* **Model Tim Estafet:** 8 Anggota resmi memegang 1 tablet fisik secara bergantian (eko, oned, cxperia, sulistiyani, layang, acimau, kepek, gete).
* **Git & Cabang:** 1 Repositori Bersama di GitHub. Setiap task dikerjakan pada branch terisolasi \`${gitBranch}\` (ADR-03). Branch \`main\` dilindungi.
* **Aturan IN_PROGRESS Tablet:** Tepat 1 task \`IN_PROGRESS\` aktif di tablet bersama untuk menjaga integritas validasi ZLCE Core.
* **Persetujuan Gerbang:** Seluruh 8 anggota berhak menyetujui Gerbang 1–4 dengan pencatatan provenance eksplisit: \`Disetujui: ya (oleh: ${activeMember.name})\` (ADR-07).
* **ADR-09 (Keputusan Bersama):** Obsidian dieksklusikan dari Cetak Biru v4.0.0 demi efisiensi RAM 3GB; sistem murni self-contained via PWA & Termux.
* **Zero-Secret Policy:** Tidak ada token API eksternal, kunci pribadi, atau kredensial yang disimpan di PWA atau di-commit ke Git.
* **Standar Ergonomi UI:** Target sentuh minimal 44px+ (\`touch-target-44\`), persistensi draft LocalStorage debounce 400ms.`;

  // 5. Active WAL & Session State Summary
  const lastDoneInfo = sessionState.status.lastDoneTask || 'TASK-012';
  const handoverNote = sessionState.handoverNotes && sessionState.handoverNotes.trim().length > 0
    ? sessionState.handoverNotes.trim()
    : 'FASE 2 tuntas 100%. Memulai eksekusi FASE 3 (Multi-AI & Portable Context Pack).';

  const assumptionsText = sessionState.assumptions && sessionState.assumptions.length > 0
    ? sessionState.assumptions.map(a => `* [${a.id}] ${a.type}: ${a.content} (Status: ${a.status})`).join('\n')
    : '* [ASM-01] Obsidian dieksklusikan dari Blueprint Inti v4.0.0 (ADR-09).\n* [ASM-02] Seluruh 8 anggota berhak menyetujui gerbang (ADR-07).\n* [ASM-03] 1 Repositori Bersama + Branch per Task (ADR-03).';

  // 6. Assembled Markdown string (Strict Schema-before-Data)
  const markdown = `# ZLCE PORTABLE CONTEXT PACK (ESTAFET TIM MULTI-AI)
<!--
  METADATA BLOK WAJIB (MANDATORY INVARIANTS BLOCK)
  Invarian Terpenuhi:
  - I1: All In Files (Single Source of Truth)
  - I2: Cold-Start Resume (Mandiri Tanpa Riwayat Chat)
  - I3: ZLCE Core Invariance (4 Gerbang & Format WAL Kanonik)
  - I4: Strict Provenance Tracking
  - I5: Zero Lost Updates (Branch ${gitBranch})
-->
* **Proyek:** ${projectName}
* **Task ID:** ${task.id} (${taskDetail?.title || task.name})
* **Cabang Git:** \`${gitBranch}\` (Basis: \`${sessionState.status.gitBranch || 'v4-mobile'}\`)
* **Aktor (Driver Tablet):** ${activeMember.name} (\`${activeMember.role}\` · \`${activeMember.email}\`)
* **AI Target:** ${effectiveAiLabel}
* **Mode Konteks:** ${mode} | Token Budget Preset: ${tokenBudgetPreset.toUpperCase()}
* **Waktu Dibuat:** ${timestamp}

---

## 1. MANDAT TUGAS AKTIF (ACTIVE TASK DIRECTIVE)

* **ID Task:** \`${task.id}\`
* **Nama / Judul:** ${taskDetail?.title || task.name}
* **Fase Eksekusi:** ${taskDetail?.phase || 'Fase Eksekusi ZLCE'}
* **Dependensi Wajib:** \`${task.dependencies || '-'}\`
* **Status Sesi Saat Ini:** \`${task.status}\`
* **Berkas Direncanakan (Scope):** \`${plannedFiles}\`
${taskDetail?.testCase ? `* **ID Kasus Uji (Test Case):** \`${taskDetail.testCase}\`` : ''}

### Kriteria Penerimaan (Acceptance Criteria):
${acceptanceList}

### Perintah Verifikasi di Termux / Shell:
\`\`\`bash
${verificationCmd}
\`\`\`

### Template Commit Git Resmi (Atribusi: ${activeMember.name}):
\`\`\`bash
git -c user.name="${activeMember.name}" -c user.email="${activeMember.email}" commit -m "${task.id}: ${(taskDetail?.title || task.name).toLowerCase()}"
\`\`\`

---

## 2. JANGKAR KEBENARAN ARSITEKTUR & KEPUTUSAN KUNCI
${tier0Architecture}

---

## 3. STATUS SESI TERKINI & JEJAK WAL (SESSION STATE & WAL)

* **Task Terakhir Selesai (DONE):** \`${lastDoneInfo}\`
* **Langkah WAL Sedang Dikerjakan:** ${sessionState.wal.currentStep || 'Implementasi komponen sesuai kriteria penerimaan.'}
* **Berkas Disentuh WAL:** \`${sessionState.wal.plannedFiles || plannedFiles}\`
* **Langkah Berikutnya (Persis):** ${sessionState.wal.nextStepExact || `Selesaikan implementasi ${task.id} dan verifikasi.`}

### Catatan Serah Terima Tim (Handover Notes):
${handoverNote.startsWith('*') ? handoverNote : `* ${handoverNote}`}

### Asumsi & Keputusan Aktif:
${assumptionsText}

---

## 4. ATURAN EKSEKUSI KERJA & STOP TOKEN (SCHEMA-BEFORE-DATA)

1. **Prinsip Cold-Start (Invarian I2):** Kerjakan tugas ini secara murni dari instruksi, arsitektur, dan kriteria penerimaan di atas. Jangan mengasumsikan adanya memori chat sebelumnya.
2. **Kualitas Kode Produksi:** Hasilkan kode lengkap, modular, dan bersih tanpa placeholder (\`// TODO\`, \`// sisa kode...\`, \`/* implement later */\`).
3. **Penyimpanan Berkas (POSIX LF):** Gunakan karakter baris baru Unix (\`LF\`), bukan \`CRLF\`.
4. **Zero-Secret Policy:** Dilarang keras menambahkan secret, token, atau API key ke dalam source code.
5. **Format Blok Checkpoint:** Akhiri keluaran Anda dengan blok pembaruan matriks status dan WAL untuk berkas \`SESSION_STATE.md\` agar anggota tim berikutnya dapat langsung melanjutkan tanpa kehilangan konteks.

### Stop Cue Token:
\`\`\`text
${stopToken}
\`\`\`
${customInstructions ? `\n---\n\n## 5. INSTRUKSI TAMBAHAN PENGGUNA\n${customInstructions}\n` : ''}`;

  // AUD-023: Redaksi defensif rahasia sebelum diekspor ke Context Pack
  const safeMarkdown = redactSecrets(markdown).redactedText;
  const characterCount = safeMarkdown.length;
  const estimatedTokens = estimateTokenCount(safeMarkdown);

  return {
    markdown: safeMarkdown,
    metadata: {
      projectId: projectName,
      taskId: task.id,
      taskName: taskDetail?.title || task.name,
      gitBranch,
      activeMemberName: activeMember.name,
      activeMemberEmail: activeMember.email,
      targetAi: effectiveAiLabel,
      tokenBudgetPreset,
      mode,
      timestamp,
      estimatedTokens,
      characterCount,
      invariantsComplied: ['I1 (All in Files)', 'I2 (Cold-Start)', 'I3 (ZLCE Core)', 'I4 (Strict Provenance)', 'I5 (Zero Lost Updates)']
    }
  };
}
