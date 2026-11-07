/**
 * ZLCE Structured Multi-Model Prompt Generator (TASK-015)
 * Rujukan: docs/mobile/blueprint/14_MULTI_AI_TEAM_MODEL.md, LANDING_PROMPT.md, HANDOVER_PROMPT.md
 * 
 * Mengintegrasikan Context Pack dengan instruksi peran AI yang presisi
 * (Landing Prompt, Task Execution Prompt, Review Prompt, Handover Prompt)
 * yang dioptimalkan untuk respons deterministik bebas halusinasi.
 * 
 * Aturan Utama:
 * 1. "Schema-before-Data": Format dan skema output dideklarasikan di awal sebelum konteks.
 * 2. "Anti-Placeholder Rule": Dilarang keras menghasilkan kode terpotong ('// ... existing code ...').
 * 3. "Touch Target >= 44px": Standar ergonomi antarmuka tablet/web Samsung Tab A7 Lite.
 * 4. "Cold-Start Deterministic": Prompt mandiri tanpa ketergantungan riwayat chat sebelumnya.
 */

import { ParsedSessionState, ZLCETask, ParsedBacklogTask } from '../types/zlce';
import { TeamMember } from '../types/mobile';
import { 
  TargetAIProvider, 
  TokenBudgetPreset, 
  generatePortableContextPack,
  getAIProviderLabel,
  getStopTokenDirective
} from './contextPackGenerator';
import { 
  pruneContextForBudget, 
  estimateTokens, 
  calculateTokenSafety, 
  getModelBudgetProfile,
  TokenSafetyCalculation 
} from './tokenBudgetAdapter';

export type PromptArchetype = 
  | 'task-execution' 
  | 'landing' 
  | 'review' 
  | 'handover';

export interface PromptArchetypeMeta {
  id: PromptArchetype;
  title: string;
  shortLabel: string;
  description: string;
  badge: string;
  iconName: 'Zap' | 'Compass' | 'ShieldCheck' | 'RefreshCw';
  recommendedRole: string;
}

export const PROMPT_ARCHETYPES: Record<PromptArchetype, PromptArchetypeMeta> = {
  'task-execution': {
    id: 'task-execution',
    title: 'Task Execution Prompt (Eksekusi Task Atomik)',
    shortLabel: 'Eksekusi Task',
    description: 'Mandat eksekusi untuk menyelesaikan SATU task aktif dengan kode lengkap bebas placeholder dan verifikasi ketat.',
    badge: 'Core Workflow',
    iconName: 'Zap',
    recommendedRole: 'Principal Software Engineer & Implementation Specialist'
  },
  'landing': {
    id: 'landing',
    title: 'Landing Prompt (Inisiasi / Bootstrap Proyek)',
    shortLabel: 'Inisiasi Proyek',
    description: 'Protokol pembentukan dokumen kontrol awal (BLUEPRINT, TASKS, SESSION_STATE) dan verifikasi Gerbang 1.',
    badge: 'Gate 1 Setup',
    iconName: 'Compass',
    recommendedRole: 'Principal Software Architect & Lead Systems Designer'
  },
  'review': {
    id: 'review',
    title: 'Quality Gate Review Prompt (Audit & Verifikasi)',
    shortLabel: 'Quality Review',
    description: 'Audit hasil implementasi terhadap kriteria penerimaan (Acceptance Criteria), pengujian regresi, dan bukti verifikasi sebelum status DONE.',
    badge: 'Gate Audit',
    iconName: 'ShieldCheck',
    recommendedRole: 'Lead QA Engineer & Security Auditor'
  },
  'handover': {
    id: 'handover',
    title: 'Relay Handover Prompt (Serah Terima / Pindah AI)',
    shortLabel: 'Serah Terima',
    description: 'Protokol estafet saat berpindah ke AI atau anggota lain, mencakup klasifikasi state (Normal vs Recovery Kasus A-D).',
    badge: 'Relay Transfer',
    iconName: 'RefreshCw',
    recommendedRole: 'Context Transfer Facilitator & State Continuity Lead'
  }
};

export interface PromptGeneratorOptions {
  archetype: PromptArchetype;
  task: ZLCETask;
  taskDetail?: ParsedBacklogTask;
  sessionState: ParsedSessionState;
  activeMember: TeamMember;
  targetAi?: TargetAIProvider;
  tokenBudgetPreset?: TokenBudgetPreset;
  customDirectives?: string;
  includeContextPack?: boolean;
  projectScope?: string;
  customStopToken?: string;
}

export interface StructuredPromptOutput {
  fullPrompt: string;
  archetype: PromptArchetype;
  archetypeMeta: PromptArchetypeMeta;
  targetAi: TargetAIProvider;
  targetAiLabel: string;
  tokenBudgetPreset: TokenBudgetPreset;
  estimatedTokens: number;
  characterCount: number;
  stopToken: string;
  safety: TokenSafetyCalculation;
  hasAntiPlaceholderRule: boolean;
  hasSchemaBeforeData: boolean;
  hasTouchTargetRule: boolean;
  metadata: {
    taskId: string;
    taskName: string;
    gitBranch: string;
    driverAlias: string;
    driverEmail: string;
    timestamp: string;
  };
}

/**
 * Stop token spesifik per provider AI
 */
export function getModelStopToken(provider: TargetAIProvider): string {
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
    case 'qwen':
      return '<<<END_QWEN_ZLCE_RESPONSE>>>';
    case 'generic':
    default:
      return '<<<END_ZERO_LOSS_RESPONSE>>>';
  }
}

/**
 * URL Web Browser resmi untuk setiap penyedia AI
 */
export function getAiBrowserUrl(provider: string): string {
  switch (provider.toLowerCase()) {
    case 'claude':
      return 'https://claude.ai/new';
    case 'gemini':
      return 'https://gemini.google.com/app';
    case 'chatgpt':
      return 'https://chatgpt.com';
    case 'cursor':
      return 'https://cursor.com';
    case 'copilot':
      return 'https://github.com/copilot';
    case 'deepseek':
      return 'https://chat.deepseek.com';
    default:
      return 'https://gemini.google.com/app';
  }
}

/**
 * Aturan khusus per provider model AI untuk memaksimalkan kepatuhan deterministik
 */
function getProviderSpecificRules(provider: TargetAIProvider): string {
  switch (provider) {
    case 'claude':
      return `### SPESIFIKASI ENGINE: ANTHROPIC CLAUDE (High-Precision Mode)
- Manfaatkan kemampuan penalaran tipe ketat TypeScript dan pemisahan arsitektur bersih.
- Jangan menambahkan basa-basi pembuka atau penutup ("Certainly!", "Here is your plan:").
- Langsung keluarkan artefak kode lengkap dalam blok fenced markdown yang terdefinisi.`;
    case 'gemini':
      return `### SPESIFIKASI ENGINE: GOOGLE GEMINI (Large Context Mode)
- Verifikasi silang menyeluruh seluruh dokumen kontrol ZLCE dan referensi modul repositori.
- Pertahankan konsistensi penamaan variabel dan kontrak antarmuka di seluruh file.
- Format blok kode dengan path file absolut/relatif yang persis di baris pertama blok.`;
    case 'chatgpt':
      return `### SPESIFIKASI ENGINE: OPENAI CHATGPT (Deterministic Mode)
- Hindari peringkasan berlebih atau spekulasi sintaks modern yang tidak kompatibel.
- Seluruh fungsi, hook, dan tipe harus diekspor dan didefinisikan secara eksplisit.
- Ikuti urutan langkah eksekusi secara berurutan tanpa melewati tahap verifikasi.`;
    case 'deepseek':
      return `### SPESIFIKASI ENGINE: DEEPSEEK V3/R1 (Reasoning Buffer Mode)
- Manfaatkan buffer penalaran (*Chain-of-Thought*) untuk menganalisis edge case sebelum menyusun kode.
- Pastikan kode kompatibel penuh dengan standar POSIX/Linux, Termux Android, dan Node.js v22.
- Jangan gunakan modul biner native yang memerlukan kompilasi C++ berat di perangkat mobile.`;
    case 'copilot':
      return `### SPESIFIKASI ENGINE: GITHUB COPILOT (Chat & Edits Mode)
- Format respons langsung berupa blok kode per-berkas yang rapi tanpa elipsis.
- Patuhi standar TypeScript modern, tanpa tipe 'any' implisit, dan dokumentasikan perubahan esensial.
- Pastikan target sentuh minimal 44x44px untuk seluruh komponen interaktif.`;
    case 'cursor':
      return `### SPESIFIKASI ENGINE: CURSOR AI (Composer & Agent Mode)
- Dukung kemampuan multi-file diffing dengan menandai setiap berkas secara eksplisit ('--- /path/to/file ---').
- Jangan buat snippet parsial; hasilkan keseluruhan berkas agar Composer dapat mengaplikasikan diff secara deterministik.
- Selaras dengan direktif .cursorrules dan arsitektur Zero-Loss ZLCE.`;
    case 'qwen':
      return `### SPESIFIKASI ENGINE: QWEN 2.5 CODER (Clean Implementation Mode)
- Fokus pada implementasi kode murni yang efisien, hemat memori RAM, dan zero-leak.
- Gunakan idiom React 19 dan TypeScript 5+ modern.`;
    case 'generic':
    default:
      return `### SPESIFIKASI ENGINE: UNIVERSAL AI ASSISTANT
- Deterministic execution engine. Tidak ada basa-basi, tidak ada halusinasi konteks.
- Kode lengkap, mandiri, dan langsung dapat diuji.`;
  }
}

/**
 * Menghasilkan Master Structured Prompt menggabungkan Context Pack dan instruksi tugas
 */
export function generateStructuredPrompt(options: PromptGeneratorOptions): StructuredPromptOutput {
  const {
    archetype,
    task,
    taskDetail,
    sessionState,
    activeMember,
    targetAi = 'generic',
    tokenBudgetPreset = 'compact-8k',
    customDirectives = '',
    includeContextPack = true,
    customStopToken
  } = options;

  const archetypeMeta = PROMPT_ARCHETYPES[archetype] || PROMPT_ARCHETYPES['task-execution'];
  const stopToken = customStopToken || getModelStopToken(targetAi);
  const targetAiLabel = getAIProviderLabel(targetAi);
  const timestamp = new Date().toISOString();

  // 1. Generate underlying Portable Context Pack
  let contextPackMarkdown = '';
  if (includeContextPack) {
    const rawContextPack = generatePortableContextPack({
      task,
      taskDetail,
      sessionState,
      activeMember,
      targetAi,
      tokenBudgetPreset,
      mode: sessionState.context?.mode === 'FULL' ? 'FULL' : 'LITE'
    });

    // Prune for target token budget (TASK-014 adapter)
    const pruned = pruneContextForBudget(rawContextPack.markdown, tokenBudgetPreset);
    contextPackMarkdown = pruned.prunedMarkdown;
  }

  // 2. Synthesize Archetype Body adhering strictly to "Schema-before-Data"
  let promptBody = '';

  if (archetype === 'task-execution') {
    promptBody = `# MASTER EXECUTION DIRECTIVE: ATOMIC TASK IMPLEMENTATION (ZLCE v4.0.0)
Role: ${archetypeMeta.recommendedRole}
Target Model: ${targetAiLabel}
Driver Tablet: ${activeMember.name} (${activeMember.role}) <${activeMember.email}>
Active Task ID: ${task.id} - ${task.name}
Git Branch: task/${task.id}

---

## 1. MANDATORY CONSTRAINTS & ANTI-HALLUCINATION PROTOCOL (SCHEMA-BEFORE-DATA)

### ATURAN A1: SKEMA FORMAT OUTPUT WAJIB (OUTPUT SCHEMA FIRST)
Output Anda WAJIB mengikuti struktur 4-bagian berikut tanpa teks pembuka percakapan (no chat pleasantries):
1. [RINGKASAN TEKNIS & ANALISIS IMPLIKASI] (Maksimal 4 butir ringkas)
2. [BLOK KODE LENGKAP PER FILE] (Format: \`--- /path/ke/berkas.ext ---\` diikuti kode lengkap)
3. [LANGKAH VERIFIKASI POSIX / TERMUX] (Perintah CLI persis untuk validasi di tablet)
4. [CHECKPOINT STATE LENGKAP] (Format blok \`SESSION_STATE.md\` atau baris WAL untuk memperbarui dokumen kontrol)

### ATURAN A2: PELARANGAN KODE PLACEHOLDER (STRICT ANTI-PLACEHOLDER RULE)
- DILARANG KERAS menghasilkan kode ber-placeholder, komentar elipsis, '// ... existing code ...', '// ... rest of code', atau blok kode terpotong!
- Seluruh berkas kode yang disentuh/dibuat WAJIB ditulis secara LENGKAP, UTUH, dan langsung dapat dieksekusi (fully runnable drop-in replacement).
- Jika mengedit berkas yang sudah ada, tuliskan seluruh isi berkas dari baris pertama hingga baris terakhir dengan semua import dan tipe lengkap.

### ATURAN A3: ERGONOMI TABLET SAMSUNG TAB A7 LITE (TOUCH TARGET >= 44PX)
- Untuk semua komponen UI baru/modifikasi, seluruh elemen interaktif (tombol, tab, form kontrol) WAJIB memiliki target sentuh minimal 44x44px (menggunakan class Tailwind: \`min-h-[44px]\`, \`min-w-[44px]\`, atau \`p-3\`).
- UI harus responsif pada resolusi 1340x800 px (landscape/portrait), mendukung dark mode slate-950, dan tidak menyebabkan overscroll horizontal.

### ATURAN A4: PRESERVASI JAM SUMBER & ANTI-EKSTRAPOLASI WAKTU
- Jam audit dan checkpoint HANYA boleh menggunakan string waktu persis yang disediakan pengguna atau tercatat di repositori.
- Dilarang mengarang jam baru sintetis (+5 atau +10 menit). Jika tidak ada sumber jam baru, gunakan jam fixture terakhir atau tulis "jam: ?".

### ATURAN A5: BATASAN CAKUPAN TUNGGAL (SINGLE TASK SCOPE)
- Anda HANYA diizinkan mengerjakan ${task.id}: "${task.name}".
- Jangan memulai atau mengubah scope task lain yang masih PENDING atau BLOCKED.

${getProviderSpecificRules(targetAi)}

---

## 2. DETAIL TUGAS & ACCEPTANCE CRITERIA

* **Task ID:** ${task.id}
* **Nama Task:** ${task.name}
* **Dependensi:** ${task.dependencies || 'None'}
* **Status Awal:** ${task.status}
* **Docs Terkait:** ${taskDetail?.docsRelated || 'docs/mobile/blueprint/14_MULTI_AI_TEAM_MODEL.md'}
* **Docs Impact:** ${taskDetail?.docsImpact || 'SESSION_STATE.md, TASKS.md'}

### KRITERIA PENERIMAAN (ACCEPTANCE CRITERIA):
${taskDetail?.acceptanceCriteria && taskDetail.acceptanceCriteria.length > 0 
  ? taskDetail.acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')
  : `1. Implementasi kode tervalidasi bersih saat build dan lint (0 error, 0 warning).
2. Mematuhi Acceptance Criteria yang didefinisikan pada TASKS.md untuk ${task.id}.
3. Menghasilkan bukti verifikasi konkret (test pass, screenshot output, atau log eksekusi).`
}

${customDirectives ? `### INSTRUKSI TAMBAHAN PENGGUNA:\n${customDirectives}\n` : ''}

---

## 3. PAKET KONTEKS MANDIRI (PORTABLE CONTEXT PACK)
Berikut adalah status terkini repositori, arsitektur, dan jangkar kebenaran Tier 0:

${contextPackMarkdown}

---

## 4. STOP TOKEN & PENUTUP RESPON
Di akhir respon Anda, Anda WAJIB mencetak stop token persis di bawah ini:
${stopToken}
`;
  } else if (archetype === 'landing') {
    promptBody = `# MASTER SYSTEM DIRECTIVE: PROJECT INITIATION PROTOCOL (ZLCE v4.0.0)
Role: ${archetypeMeta.recommendedRole}
Target Model: ${targetAiLabel}
Driver Tablet: ${activeMember.name} (${activeMember.role})

---

## 1. MANDATORY CONSTRAINTS & OUTPUT SCHEMA (SCHEMA-BEFORE-DATA)

### ATURAN A1: FORMAT KELUARAN BERTINGKAT DENGAN GERBANG KUALITAS
Output Anda harus menyajikan berkas kontrol secara bertahap melalui Gerbang Persetujuan eksplisit.
Setelah membuat satu berkas gerbang, BERHENTI dan minta persetujuan eksplisit pengguna sebelum lanjut.
- **Gerbang 1:** BLUEPRINT.md (Spesifikasi arsitektur & modul inti)
- **Gerbang 2:** TASKS.md (Daftar task atomik berstatus PENDING/READY)
- **Gerbang 3:** ARCHITECTURE.md & DATA_MODEL.md (Opsional pada mode LITE)
- **Gerbang 4:** SESSION_STATE.md (Matriks status awal dan inisialisasi WAL)

### ATURAN A2: PELARANGAN KODE PLACEHOLDER (STRICT ANTI-PLACEHOLDER RULE)
- Dilarang keras menggunakan placeholder atau teks ringkasan elipsis ('// ... rest of code').
- Setiap dokumen dan berkas kode wajib lengkap dari judul hingga baris penutup.

### ATURAN A3: ZERO-SECRET POLICY & ERGONOMI TABLET
- Tidak boleh ada hardcoded secret, token API, atau kredensial pribadi di dalam dokumen kontrol atau repositori.
- Komponen web wajib mematuhi target sentuh tablet minimal 44x44px.

${getProviderSpecificRules(targetAi)}

---

## 2. PARAMETER PROYEK AKTIF
- **Nama Proyek:** ${sessionState.context?.projectName || 'ZLCE Mobile Workbench'}
- **Mode Kontrol:** ${sessionState.context?.mode || 'FULL'} (LITE: 4 berkas kontrol; FULL: berkas kontrol bertahap)
- **Stack Inti:** ${sessionState.context?.stack || 'React 19 + TypeScript + Vite + Tailwind CSS + Termux'}
- **Kemampuan Tulis AI:** YA
- **Kemampuan Eksekusi:** YA, Pengguna mengeksekusi via Termux Android

${customDirectives ? `### KEBUTUHAN KHUSUS PROYEK:\n${customDirectives}\n` : ''}

---

## 3. JANGKAR STATE REPOSITORI (CONTEXT PACK)
${contextPackMarkdown}

---

## 4. STOP TOKEN & PENUTUP RESPON
Cetak stop token persis di baris terakhir respon:
${stopToken}
`;
  } else if (archetype === 'review') {
    promptBody = `# MASTER AUDIT DIRECTIVE: QUALITY GATE REVIEW & ACCEPTANCE VERIFICATION
Role: ${archetypeMeta.recommendedRole}
Target Model: ${targetAiLabel}
Auditor Alias: ${activeMember.name} (${activeMember.role})
Task Under Audit: ${task.id} - ${task.name}

---

## 1. MANDATORY REVIEW SCHEMA & CONSTRAINTS (SCHEMA-BEFORE-DATA)

### FORMAT LAPORAN AUDIT WAJIB:
Sajikan hasil review dalam 5 seksi ketat:
1. [VERIFIKASI ACCEPTANCE CRITERIA] (Tabel checklist: Kriteria | Status: PASS/FAIL | Bukti)
2. [AUDIT KODE BEBAS PLACEHOLDER] (Konfirmasi tidak ada comment elipsis atau kode terpotong)
3. [AUDIT ERGONOMI TABLET & TOUCH TARGET] (Konfirmasi elemen interaktif memiliki min-h-[44px])
4. [DETEKSI REGRESI & KEAMANAN] (Pemeriksaan tipe data, Zero-Secret, dan tidak merusak aturan ZLCE)
5. [REKOMENDASI STATUS GERBANG] (PILIH: APPROVE_TO_DONE atau REQUEST_CHANGES dengan patch persis)

### ATURAN A2: PELARANGAN KODE PLACEHOLDER (STRICT ANTI-PLACEHOLDER RULE)
- DILARANG KERAS menerima, menyetujui, atau menghasilkan kode ber-placeholder, komentar elipsis, '// ... existing code ...', atau '// ... rest of code'.
- Jika ditemukan placeholder sekecil apa pun, WAJIB tolak dengan rekomendasi REQUEST_CHANGES dan instruksikan penulisan kode lengkap.

### ATURAN ANTI-HALUSINASI AUDIT:
- Dilarang memberikan status PASS jika bukti verifikasi (output perintah / unit test) belum disertakan.
- Wajib memastikan kepatuhan ergonomi tablet min-h-[44px] pada seluruh komponen visual.

${getProviderSpecificRules(targetAi)}

---

## 2. TUGAS YANG DITINJAU & AC SPESIFIK
* **Task ID:** ${task.id}
* **Nama Task:** ${task.name}
* **Dependensi:** ${task.dependencies || 'None'}
* **Acceptance Criteria Rujukan:**
${taskDetail?.acceptanceCriteria && taskDetail.acceptanceCriteria.length > 0 
  ? taskDetail.acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')
  : `1. Memenuhi spesifikasi fungsi pada TASKS.md.
2. Build dan lint bersih tanpa kompromi.
3. Ergonomi tablet min 44px terjaga.`
}

${customDirectives ? `### FOKUS AUDIT TAMBAHAN:\n${customDirectives}\n` : ''}

---

## 3. KONTEKS STATUS AKTIF & WAL
${contextPackMarkdown}

---

## 4. STOP TOKEN & PENUTUP RESPON
${stopToken}
`;
  } else if (archetype === 'handover') {
    promptBody = `# MASTER RELAY DIRECTIVE: CROSS-AI & CROSS-MEMBER HANDOVER (ZLCE v4.0.0)
Role: ${archetypeMeta.recommendedRole}
Target Model: ${targetAiLabel}
Incoming Driver: ${activeMember.name} (${activeMember.role}) <${activeMember.email}>
Active Task Mandate: ${task.id} - ${task.name}

---

## 1. PROTOKOL SERAH TERIMA C-I-D-I (SCHEMA-BEFORE-DATA)

### C - CONTEXT (KONTEKS MANDIRI TANPA SESI LAMA)
Anda melanjutkan proyek ZLCE di perangkat tablet bersama. Anda BUKAN agen pertama dan tidak memiliki memori obrolan sebelumnya.
Seluruh status ada di berkas kontrol. Sumber kebenaran status: \`SESSION_STATE.md\`.

### I - INSTRUCTION (LANGKAH EKSEKUSI BERURUTAN)
1. **Langkah 0 (Deteksi Mode):**
   - Mode RECOVERY bila Bagian 3 (WAL) berisi task aktif, ATAU pengguna menyatakan sesi putus, ATAU snapshot git terlampir. Selain itu mode NORMAL.
2. **Langkah 1 (Mode Normal):**
   - Konfirmasi ringkas (maksimal 5 baris): Proyek, task terakhir DONE, task aktif, nama driver saat ini.
   - Lanjutkan pengerjaan task aktif ${task.id}.
3. **Langkah 2 (Mode Recovery):**
   - Periksa WAL dan klasifikasikan (Kasus A: working tree bersih; Kasus B: uncommitted changes; Kasus C: unrecorded commits; Kasus D: out-of-scope changes).
   - Jangan pernah melakukan \`git reset --hard\` tanpa izin eksplisit.

### D - DETAILS & ANTI-PLACEHOLDER ENFORCEMENT
- DILARANG KERAS menghasilkan kode ber-placeholder ('// ... existing code ...').
- Seluruh kode yang dihasilkan wajib lengkap, utuh, dan valid TypeScript.
- Pertahankan target sentuh tablet minimal 44x44px (\`min-h-[44px]\`).
- Waktu audit: dilarang mengarang jam real-time sintetis, gunakan "jam: ?".

${getProviderSpecificRules(targetAi)}

---

## 2. STATUS SESI & JANGKAR KEBENARAN
${contextPackMarkdown}

${customDirectives ? `--- \n## 3. CATATAN KHUSUS DRIVER SEBELUMNYA:\n${customDirectives}\n` : ''}

---

## 4. STOP TOKEN & PENUTUP RESPON
${stopToken}
`;
  }

  const estimatedTokens = estimateTokens(promptBody);
  const characterCount = promptBody.length;
  const safety = calculateTokenSafety(estimatedTokens, tokenBudgetPreset);

  return {
    fullPrompt: promptBody,
    archetype,
    archetypeMeta,
    targetAi,
    targetAiLabel,
    tokenBudgetPreset,
    estimatedTokens,
    characterCount,
    stopToken,
    safety,
    hasAntiPlaceholderRule: true,
    hasSchemaBeforeData: true,
    hasTouchTargetRule: true,
    metadata: {
      taskId: task.id,
      taskName: task.name,
      gitBranch: `task/${task.id}`,
      driverAlias: activeMember.name,
      driverEmail: activeMember.email,
      timestamp
    }
  };
}
