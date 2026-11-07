/**
 * ZLCE Result Capture & Automatic Provenance Injector (TASK-016)
 * Rujukan: docs/mobile/blueprint/14_MULTI_AI_TEAM_MODEL.md (Invarian I4) & 08_SECURITY_MODEL.md
 * 
 * Invarian I4: Strict Provenance Tracking
 * "Setiap keputusan, perubahan kode, dan persetujuan Gerbang wajib mencantumkan:
 * [Aktor, AI/Model, Akun Alias, Timestamp, Task ID]."
 * 
 * Modul ini mengekstrak blok kode/solusi dari keluaran Browser AI,
 * menyematkan metadata provenance anti-tamper (tag komentar & banner header),
 * serta mengalirkan pembaruan status ke draft SESSION_STATE.md / WAL.
 */

import { TargetAIProvider } from './contextPackGenerator';
import { ParsedSessionState } from '../types/zlce';

export interface ResultProvenanceMetadata {
  taskId: string;
  taskName?: string;
  actorName: string;
  actorAlias: string;
  actorEmail: string;
  aiProvider: TargetAIProvider;
  aiModelName: string;
  accountAlias?: string;
  timestamp: string;      // ISO e.g. 2026-11-05T00:31:34+07:00
  timestampWIB: string;   // Human-readable e.g. 2026-11-05 07:31:34 WIB
  verificationStatus?: 'PENDING_VERIFICATION' | 'VERIFIED' | 'REQUEST_CHANGES';
  notes?: string;
}

export interface ExtractedCodeBlock {
  id: string;
  filePath?: string;
  language: string;
  rawCode: string;
  codeWithProvenance: string;
  lineCount: number;
  charCount: number;
  isExecutable: boolean;
}

export interface ParseResultOutput {
  provenance: ResultProvenanceMetadata;
  markdownProvenanceTag: string;
  headerBanner: string;
  codeBlocks: ExtractedCodeBlock[];
  detectedWalBlock?: {
    raw: string;
    taskRef?: string;
    currentStep?: string;
    nextStepExact?: string;
    plannedFiles?: string;
    verificationCommand?: string;
  };
  detectedSummary?: string;
  totalCodeLines: number;
  totalFiles: number;
}

/**
 * Format timestamp sekarang dalam format WIB (Waktu Indonesia Barat)
 */
export function formatCurrentWIB(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} WIB`;
}

/**
 * Menghasilkan tag komentar Markdown provenance terstruktur (Invarian I4)
 */
export function generateMarkdownProvenanceTag(metadata: ResultProvenanceMetadata): string {
  const signature = `ZLCE-PROV-I4-${metadata.taskId.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now().toString(36).toUpperCase()}`;
  return `<!-- ZLCE_PROVENANCE_START
task_id: ${metadata.taskId}
task_name: ${metadata.taskName || '-'}
actor_name: ${metadata.actorName}
actor_alias: ${metadata.actorAlias}
actor_email: ${metadata.actorEmail}
ai_provider: ${metadata.aiProvider}
ai_model: ${metadata.aiModelName}
account_alias: ${metadata.accountAlias || 'Default-Workspace'}
timestamp_iso: ${metadata.timestamp}
timestamp_wib: ${metadata.timestampWIB}
verification_status: ${metadata.verificationStatus || 'PENDING_VERIFICATION'}
provenance_signature: ${signature}
ZLCE_PROVENANCE_END -->`;
}

/**
 * Menghasilkan banner komentar kode untuk disematkan di awal berkas sumber
 */
export function generateCodeHeaderBanner(metadata: ResultProvenanceMetadata, filePath?: string): string {
  const pathLabel = filePath ? ` | File: ${filePath}` : '';
  const isXmlOrHtml = filePath && (filePath.endsWith('.html') || filePath.endsWith('.xml') || filePath.endsWith('.svg'));
  const isPythonOrShell = filePath && (filePath.endsWith('.py') || filePath.endsWith('.sh') || filePath.endsWith('.bash') || filePath.endsWith('.yml') || filePath.endsWith('.yaml'));

  if (isXmlOrHtml) {
    return `<!--
  @provenance [Aktor: ${metadata.actorName} (${metadata.actorAlias}) <${metadata.actorEmail}> | AI: ${metadata.aiModelName} (${metadata.accountAlias || '-'}) | Waktu: ${metadata.timestampWIB} | Task: ${metadata.taskId}${pathLabel}]
  Zero-Loss Context Engineering v4.0.0 (Invariant I4 - Strict Provenance Tracking)
-->\n`;
  }

  if (isPythonOrShell) {
    return `# @provenance [Aktor: ${metadata.actorName} (${metadata.actorAlias}) <${metadata.actorEmail}> | AI: ${metadata.aiModelName} (${metadata.accountAlias || '-'}) | Waktu: ${metadata.timestampWIB} | Task: ${metadata.taskId}${pathLabel}]
# Zero-Loss Context Engineering v4.0.0 (Invariant I4 - Strict Provenance Tracking)\n`;
  }

  // Default: C-style / TypeScript / JavaScript / CSS block comment
  return `/**
 * @provenance [Aktor: ${metadata.actorName} (${metadata.actorAlias}) <${metadata.actorEmail}> | AI: ${metadata.aiModelName} (${metadata.accountAlias || '-'}) | Waktu: ${metadata.timestampWIB} | Task: ${metadata.taskId}${pathLabel}]
 * Zero-Loss Context Engineering v4.0.0 (Invariant I4 - Strict Provenance Tracking)
 */\n`;
}

/**
 * Mengekstrak path berkas dari baris pengantar atau komentar pertama di blok kode
 */
function detectFilePathFromBlock(language: string, code: string, precedingText: string): string | undefined {
  // 1. Cek baris pengantar terdekat sebelum blok kode (3-4 baris terakhir sebelum ```)
  const lines = precedingText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const candidateLines = lines.slice(-4);
  
  for (let i = candidateLines.length - 1; i >= 0; i--) {
    const line = candidateLines[i];
    // Pola standard ZLCE: "--- /src/components/MyComponent.tsx ---" atau "--- src/utils/foo.ts ---"
    const tripleDashMatch = line.match(/^---\s*[`"']?([a-zA-Z0-9_\-\.\/]+\.[a-zA-Z0-9]+)[`"']?\s*---$/);
    if (tripleDashMatch) {
      return tripleDashMatch[1].trim();
    }

    // Pola terlabel: "File: src/App.tsx", "**File:** `path`", "Source: path", "TargetFile: path"
    const labeledMatch = line.match(/(?:---|###|\*\*|^)\s*(?:File|Path|Berkas|Source|TargetFile)(?:\s*:|\*\*|\*|-|\s+)+[`"']?([a-zA-Z0-9_\-\.\/]+\.[a-zA-Z0-9]+)[`"']?/i);
    if (labeledMatch) {
      return labeledMatch[1].trim();
    }

    // Pola header markdown: "### `src/components/Foo.tsx`" atau "**src/components/Foo.tsx**"
    const headerMatch = line.match(/^(?:###|##|#|\*\*)\s*[`"']?([a-zA-Z0-9_\-\.\/]+\.[a-zA-Z0-9]{1,6})[`"']?\*?:?$/);
    if (headerMatch && (headerMatch[1].includes('/') || headerMatch[1].includes('.'))) {
      return headerMatch[1].trim();
    }
  }

  // 2. Cek baris pertama atau kedua di dalam code: "// src/components/Header.tsx" atau "# scripts/zlce.py"
  const firstLines = code.split(/\r?\n/).slice(0, 3);
  for (const line of firstLines) {
    const codeCommentMatch = line.match(/^\s*(?:\/\/|#|\/\*)\s*(?:file:|path:|---)?\s*([a-zA-Z0-9_\-\.\/]+\.[a-zA-Z0-9]+)/i);
    if (codeCommentMatch) {
      return codeCommentMatch[1].trim();
    }
  }

  return undefined;
}

/**
 * Mengekstrak seluruh blok kode dan solusi dari teks mentah AI, menyematkan provenance otomatis
 */
export function extractCodeBlocksAndProvenance(
  rawAiText: string,
  provenance: ResultProvenanceMetadata
): ParseResultOutput {
  const markdownProvenanceTag = generateMarkdownProvenanceTag(provenance);
  const headerBanner = generateCodeHeaderBanner(provenance);

  if (!rawAiText || !rawAiText.trim()) {
    return {
      provenance,
      markdownProvenanceTag,
      headerBanner,
      codeBlocks: [],
      totalCodeLines: 0,
      totalFiles: 0
    };
  }

  // Regex untuk menangkap fenced code block: ```lang ... ```
  const codeBlockRegex = /```([a-zA-Z0-9_\-\.\+]*)\r?\n([\s\S]*?)```/g;
  const blocks: ExtractedCodeBlock[] = [];
  let match: RegExpExecArray | null;
  let blockIndex = 1;
  let lastIndex = 0;

  while ((match = codeBlockRegex.exec(rawAiText)) !== null) {
    const language = (match[1] || 'text').trim().toLowerCase();
    const rawCode = match[2];
    const precedingText = rawAiText.substring(Math.max(0, lastIndex), match.index).trim();
    lastIndex = match.index + match[0].length;

    // Abaikan jika hanya stop token atau blok pendek sebaris
    if (rawCode.trim().startsWith('<<<END_') && rawCode.trim().length < 50) {
      continue;
    }

    const detectedPath = detectFilePathFromBlock(language, rawCode, precedingText);
    const specificBanner = generateCodeHeaderBanner(provenance, detectedPath);
    
    // Injeksi provenance banner ke dalam kode
    const codeWithProvenance = `${specificBanner}\n${rawCode.trim()}\n`;
    const lines = rawCode.split(/\r?\n/).length;

    blocks.push({
      id: `block-${blockIndex++}`,
      filePath: detectedPath,
      language: language || 'typescript',
      rawCode: rawCode.trim(),
      codeWithProvenance,
      lineCount: lines,
      charCount: rawCode.length,
      isExecutable: ['ts', 'tsx', 'js', 'jsx', 'py', 'sh', 'bash', 'sql', 'html', 'css', 'json'].includes(language)
    });
  }

  // Deteksi blok checkpoint WAL jika ada di dalam respons AI
  let detectedWalBlock: ParseResultOutput['detectedWalBlock'] | undefined;
  const walRegex = /##\s*3\.\s*WORK IN PROGRESS[\s\S]*?(?=\n##|$)/i;
  const walMatch = rawAiText.match(walRegex);
  if (walMatch) {
    const rawWal = walMatch[0];
    const taskMatch = rawWal.match(/\*\s*\*\*Task:\*\*\s*(.*)/i);
    const stepMatch = rawWal.match(/\*\s*\*\*Langkah Sedang Dikerjakan:\*\*\s*(.*)/i);
    const nextMatch = rawWal.match(/\*\s*\*\*Langkah Berikutnya(?:\s*\(persis\))?:\*\*\s*(.*)/i);
    const filesMatch = rawWal.match(/\*\s*\*\*Berkas Direncanakan\/Disentuh:\*\*\s*(.*)/i);
    const cmdMatch = rawWal.match(/\*\s*\*\*Perintah Verifikasi:\*\*\s*(.*)/i);

    detectedWalBlock = {
      raw: rawWal,
      taskRef: taskMatch ? taskMatch[1].trim() : undefined,
      currentStep: stepMatch ? stepMatch[1].trim() : undefined,
      nextStepExact: nextMatch ? nextMatch[1].trim() : undefined,
      plannedFiles: filesMatch ? filesMatch[1].trim() : undefined,
      verificationCommand: cmdMatch ? cmdMatch[1].trim() : undefined
    };
  }

  // Deteksi ringkasan eksekutif solusi
  let detectedSummary: string | undefined;
  const summaryMatch = rawAiText.match(/(?:^|\n)(?:###?\s*(?:Ringkasan|Summary|Analisis|1\.\s*RINGKASAN)[\s\S]*?)(?=\n###|\n##|\n```|$)/i);
  if (summaryMatch) {
    detectedSummary = summaryMatch[0].trim();
  }

  const totalCodeLines = blocks.reduce((acc, b) => acc + b.lineCount, 0);
  const totalFiles = blocks.filter(b => !!b.filePath).length || blocks.length;

  return {
    provenance,
    markdownProvenanceTag,
    headerBanner,
    codeBlocks: blocks,
    detectedWalBlock,
    detectedSummary,
    totalCodeLines,
    totalFiles
  };
}

/**
 * Mengalirkan hasil ekstraksi solusi ke dalam teks dokumen SESSION_STATE.md
 * dengan memperbarui WAL (Section 3) dan menambahkan entri Log Audit (Section 7)
 */
export function mergeResultIntoSessionStateMarkdown(
  currentSessionMarkdown: string,
  provenance: ResultProvenanceMetadata,
  extracted: ParseResultOutput
): {
  updatedMarkdown: string;
  auditEntryAdded: string;
  walSummary: string;
} {
  let md = currentSessionMarkdown;

  const fileCountStr = extracted.totalFiles > 0 
    ? `${extracted.totalFiles} berkas kode diekstrak (${extracted.totalCodeLines} baris)` 
    : 'Solusi teknis diterima';

  // 1. Susun baris entri Log Audit baru dengan provenance lengkap (Invarian I4)
  const auditEntry = `* **${provenance.timestampWIB}:** Solusi AI Ditangkap untuk ${provenance.taskId}: [AI: ${provenance.aiModelName} (${provenance.accountAlias || 'Default'}), Aktor: ${provenance.actorName} (${provenance.actorAlias})]. ${fileCountStr}. Status: Menunggu eksekusi verifikasi di tablet.`;

  // 2. Perbarui Bagian 7 (Log Audit) - sisipkan di baris pertama entri audit
  const auditSecRegex = /(##\s*7\.\s*LOG AUDIT[\s\S]*?\n\n)/i;
  if (auditSecRegex.test(md)) {
    md = md.replace(auditSecRegex, `$1${auditEntry}\n`);
  } else {
    // Fallback jika heading berbeda
    md += `\n\n## 7. LOG AUDIT\n\n${auditEntry}\n`;
  }

  // 3. Perbarui Bagian 3 (WAL) untuk mencatat langkah terkini
  const walCompletedNote = `Solusi AI ${provenance.aiModelName} diterima oleh ${provenance.actorAlias} (${fileCountStr}). Metadata provenance disematkan.`;
  const walNextStep = extracted.detectedWalBlock?.nextStepExact || `Eksekusi verifikasi ${provenance.taskId} di Termux & jalankan test suite`;
  const walFiles = extracted.codeBlocks.map(b => b.filePath).filter(Boolean).join(', ') || `Berkas solusi ${provenance.taskId}`;

  // Perbarui item-item WAL
  md = md.replace(/(\*\s*\*\*Task:\*\*\s*).*$/m, `$1\`${provenance.taskId}\``);
  md = md.replace(/(\*\s*\*\*Langkah Sedang Dikerjakan:\*\*\s*).*$/m, `$1Verifikasi solusi AI untuk ${provenance.taskId}`);
  md = md.replace(/(\*\s*\*\*Berkas Direncanakan\/Disentuh:\*\*\s*).*$/m, `$1${walFiles}`);
  md = md.replace(/(\*\s*\*\*Sudah Dilakukan:\*\*\s*).*$/m, `$1${walCompletedNote}`);
  md = md.replace(/(\*\s*\*\*Langkah Berikutnya(?:\s*\(persis\))?:\*\*\s*).*$/m, `$1${walNextStep}`);
  md = md.replace(/(\*\s*\*\*Diperbarui:\*\*\s*).*$/m, `$1${provenance.timestampWIB}`);

  return {
    updatedMarkdown: md,
    auditEntryAdded: auditEntry,
    walSummary: walCompletedNote
  };
}
