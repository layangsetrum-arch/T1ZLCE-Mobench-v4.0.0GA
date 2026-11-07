/**
 * ZLCE Context Budget Manager & Token Quota Adapter
 * Rujukan: docs/mobile/blueprint/14_MULTI_AI_TEAM_MODEL.md & TASK-014
 * 
 * Mengatur kedalaman dan ukuran Context Pack berdasarkan profil model AI target
 * (Gemini 1M Large Context, Claude 30K Mid Context, ChatGPT 8K/128K Compact Context)
 * dengan pemangkasan cerdas lampiran historis berlebih untuk menjaga efisiensi kuota.
 */

import { TokenBudgetPreset } from './contextPackGenerator';

export interface ModelBudgetProfile {
  id: TokenBudgetPreset;
  name: string;
  provider: 'gemini' | 'claude' | 'chatgpt' | 'deepseek' | 'copilot' | 'cursor' | 'universal';
  contextCategory: 'large' | 'mid' | 'compact';
  maxTokenLimit: number;
  safeWindowTokens: number;
  description: string;
  recommendedRole: string;
  badgeLabel: string;
  badgeColor: string; // tailwind color prefix
}

export const MODEL_BUDGET_PROFILES: Record<TokenBudgetPreset, ModelBudgetProfile> = {
  'gemini-1m': {
    id: 'gemini-1m',
    name: 'Gemini (Large Context)',
    provider: 'gemini',
    contextCategory: 'large',
    maxTokenLimit: 1000000,
    safeWindowTokens: 750000,
    description: 'Mode komprehensif maksimal. Menyertakan seluruh berkas kontrol, log audit penuh, dan acuan blueprint.',
    recommendedRole: 'Analisis repository besar, audit multi-modul, pencarian web real-time',
    badgeLabel: '1M Tokens',
    badgeColor: 'cyan'
  },
  'claude-30k': {
    id: 'claude-30k',
    name: 'Claude 3.5 / 5.5 Sonnet (Mid Context)',
    provider: 'claude',
    contextCategory: 'mid',
    maxTokenLimit: 30000,
    safeWindowTokens: 24000,
    description: 'Mode presisi tinggi terfokus untuk Claude 3.5 Sonnet & Claude 5.5 Sonnet. Memprioritaskan Tier 0, task aktif, WAL, dan skema kontrak TypeScript murni.',
    recommendedRole: 'Coding deterministik, refactoring ketat, validasi kontrak antarmuka',
    badgeLabel: '30K Claude',
    badgeColor: 'amber'
  },
  'gpt-128k': {
    id: 'gpt-128k',
    name: 'ChatGPT (Balanced Context)',
    provider: 'chatgpt',
    contextCategory: 'mid',
    maxTokenLimit: 128000,
    safeWindowTokens: 96000,
    description: 'Mode seimbang standar GPT-4o. Cukup luas untuk dokumen sesi dan konteks tugas lengkap.',
    recommendedRole: 'Implementasi fitur umum, integrasi komponen, review solusi',
    badgeLabel: '128K Tokens',
    badgeColor: 'indigo'
  },
  'deepseek-64k': {
    id: 'deepseek-64k',
    name: 'DeepSeek (Reasoning & Code)',
    provider: 'deepseek',
    contextCategory: 'mid',
    maxTokenLimit: 64000,
    safeWindowTokens: 50000,
    description: 'Dioptimalkan untuk DeepSeek V3 / R1 dengan alokasi buffer penalaran (thinking / chain-of-thought) yang luas.',
    recommendedRole: 'Algoritma kompleks, debugging logika mendalam, arsitektur data',
    badgeLabel: '64K DeepSeek',
    badgeColor: 'sky'
  },
  'copilot-32k': {
    id: 'copilot-32k',
    name: 'GitHub Copilot (Mid Context)',
    provider: 'copilot',
    contextCategory: 'mid',
    maxTokenLimit: 32000,
    safeWindowTokens: 25000,
    description: 'Mode Copilot Chat & Edits. Optimal untuk instruksi tugas atomik terarah dan modifikasi per-berkas di IDE.',
    recommendedRole: 'Inline code completion, refactoring fungsi, integrasi komponen terarah',
    badgeLabel: '32K Copilot',
    badgeColor: 'teal'
  },
  'cursor-64k': {
    id: 'cursor-64k',
    name: 'Cursor AI Composer (Agent Context)',
    provider: 'cursor',
    contextCategory: 'mid',
    maxTokenLimit: 64000,
    safeWindowTokens: 52000,
    description: 'Mode Cursor Composer & Agent. Mendukung multi-file diff context, fast codebase indexing, dan kepatuhan .cursorrules.',
    recommendedRole: 'Multi-file editing, automated codebase agent, iterative diff application',
    badgeLabel: '64K Cursor',
    badgeColor: 'violet'
  },
  'compact-8k': {
    id: 'compact-8k',
    name: 'ChatGPT / Mobile (Compact Context)',
    provider: 'chatgpt',
    contextCategory: 'compact',
    maxTokenLimit: 8000,
    safeWindowTokens: 6500,
    description: 'Mode ringkas terkonsolidasi. Otomatis memotong audit log historis lama, mempertahankan 3 entri terbaru, task aktif, & WAL.',
    recommendedRole: 'Koneksi mobile lambat, free-tier chat, serah terima estafet kilat',
    badgeLabel: '8K Tokens (Compact)',
    badgeColor: 'emerald'
  },
  'freebuff-4k': {
    id: 'freebuff-4k',
    name: 'Free Tier Buffer / Freebuff',
    provider: 'universal',
    contextCategory: 'compact',
    maxTokenLimit: 4000,
    safeWindowTokens: 3200,
    description: 'Buffer proteksi kuota akun gratis (free-tier). Paling hemat token untuk mencegah kena limit TPM, daily cap, atau throttled rate.',
    recommendedRole: 'Akun gratis harian, jaringan seluler darurat, serah terima cepat tablet',
    badgeLabel: '4K FreeBuff',
    badgeColor: 'rose'
  }
};

/**
 * Mengambil profil model berdasarkan preset (mendukung alias claude-5.5, claude-3.5, deepseek, freebuff, copilot, cursor)
 */
export function getModelBudgetProfile(preset: TokenBudgetPreset | string): ModelBudgetProfile {
  if (preset === 'copilot') return MODEL_BUDGET_PROFILES['copilot-32k'];
  if (preset === 'cursor') return MODEL_BUDGET_PROFILES['cursor-64k'];
  if (preset === 'deepseek') return MODEL_BUDGET_PROFILES['deepseek-64k'];
  if (preset === 'freebuff') return MODEL_BUDGET_PROFILES['freebuff-4k'];
  if (typeof preset === 'string') {
    if (preset.includes('claude')) return MODEL_BUDGET_PROFILES['claude-30k'];
    if (preset.includes('gemini')) return MODEL_BUDGET_PROFILES['gemini-1m'];
    if (preset.includes('gpt') || preset.includes('chatgpt')) return MODEL_BUDGET_PROFILES['gpt-128k'];
  }
  return MODEL_BUDGET_PROFILES[preset as TokenBudgetPreset] || MODEL_BUDGET_PROFILES['gemini-1m'];
}

/**
 * Daftar seluruh profil budget yang tersedia
 */
export function getAllBudgetProfiles(): ModelBudgetProfile[] {
  return Object.values(MODEL_BUDGET_PROFILES);
}

/**
 * Estimasi jumlah token dengan faktor keselamatan konservatif (AUD-028):
 * 1 token ≈ 3.2 karakter untuk teks campuran ID/EN, kode terformat, dan markdown.
 */
export function estimateTokens(text: string, charsPerToken: number = 3.2): number {
  if (!text) return 0;
  return Math.ceil(text.length / charsPerToken);
}

export type TokenSafetyStatus = 'safe' | 'warning' | 'danger';

export interface TokenSafetyCalculation {
  status: TokenSafetyStatus;
  percentage: number;
  estimatedTokens: number;
  maxLimit: number;
  safeWindow: number;
  remainingTokens: number;
  statusLabel: string;
}

/**
 * Menghitung tingkat keamanan token terhadap jendela batas aman model
 */
export function calculateTokenSafety(
  tokenCount: number,
  preset: TokenBudgetPreset
): TokenSafetyCalculation {
  const profile = getModelBudgetProfile(preset);
  const percentage = Math.min(100, Math.round((tokenCount / profile.safeWindowTokens) * 100));
  const remainingTokens = Math.max(0, profile.safeWindowTokens - tokenCount);

  let status: TokenSafetyStatus = 'safe';
  let statusLabel = 'Aman (Dalam Batas Kuota)';

  if (tokenCount > profile.safeWindowTokens) {
    status = 'danger';
    statusLabel = 'Melebihi Batas Aman! Disarankan Pemangkasan';
  } else if (tokenCount > profile.safeWindowTokens * 0.75) {
    status = 'warning';
    statusLabel = 'Mendekati Batas Aman';
  }

  return {
    status,
    percentage,
    estimatedTokens: tokenCount,
    maxLimit: profile.maxTokenLimit,
    safeWindow: profile.safeWindowTokens,
    remainingTokens,
    statusLabel
  };
}

export interface ContextPruningResult {
  prunedMarkdown: string;
  originalTokens: number;
  prunedTokens: number;
  tokensSaved: number;
  wasPruned: boolean;
  pruningNotes: string[];
}

/**
 * Pemangkasan Cerdas Context Pack (Acceptance Criteria 3):
 * Memotong lampiran historis berlebih (Bagian 7 Log Audit & catatan lawas)
 * saat memilih profil kompak atau bila token mendekati batas aman,
 * sambil tetap MENJAGA 100% Bagian 1 (Mandat Task), Bagian 2 (Jangkar Tier 0), dan Bagian 3 (WAL).
 */
export function pruneContextForBudget(
  markdown: string,
  preset: TokenBudgetPreset,
  forcePrune: boolean = false
): ContextPruningResult {
  const profile = getModelBudgetProfile(preset);
  const originalTokens = estimateTokens(markdown);
  const pruningNotes: string[] = [];

  // Jika preset adalah freebuff-4k atau compact-8k ATAU token melebihi threshold, lakukan pemangkasan
  const shouldPrune = forcePrune || 
    preset === 'freebuff-4k' ||
    preset === 'compact-8k' || 
    (preset === 'claude-30k' && originalTokens > 15000) ||
    (preset === 'deepseek-64k' && originalTokens > 35000) ||
    (originalTokens > profile.safeWindowTokens);

  if (!shouldPrune) {
    return {
      prunedMarkdown: markdown,
      originalTokens,
      prunedTokens: originalTokens,
      tokensSaved: 0,
      wasPruned: false,
      pruningNotes: ['Konteks berada dalam batas aman; seluruh dokumen disertakan utuh.']
    };
  }

  let text = markdown;
  let didModify = false;

  // 1. Pangkas Bagian Log Audit Historis (pertahankan 2 entri untuk freebuff, atau 3 entri untuk lainnya)
  const auditSectionMatch = text.match(/(##\s*(?:7\.\s*LOG AUDIT|LOG AUDIT TERKINI)[\s\S]*?)(?=\n##|$)/i);
  if (auditSectionMatch) {
    const fullAuditSec = auditSectionMatch[1];
    const auditLines = fullAuditSec.split(/\r?\n/);
    const headerLine = auditLines[0];
    const entryLines = auditLines.filter(line => /^\s*[\*\-]\s+\*\*\d{4}-\d{2}-\d{2}/.test(line));
    const keepCount = preset === 'freebuff-4k' ? 2 : 3;

    if (entryLines.length > keepCount) {
      const retainedEntries = entryLines.slice(0, keepCount);
      const omittedCount = entryLines.length - keepCount;
      const compactedAudit = `${headerLine}\n\n${retainedEntries.join('\n\n')}\n\n> *(... ${omittedCount} entri log audit terdahulu dipangkas otomatis oleh Token Budget Manager mode ${profile.name} ...)*\n`;
      text = text.replace(fullAuditSec, compactedAudit);
      pruningNotes.push(`Log audit historis dipangkas: menyimpan ${keepCount} entri terbaru (${omittedCount} entri lama dihilangkan).`);
      didModify = true;
    }
  }

  // 2. Jika dalam mode compact-8k atau freebuff-4k, pangkas ringkasan template referensi berlebih
  if (preset === 'compact-8k' || preset === 'freebuff-4k') {
    // Pangkas baris komentar markdown panjang atau catatan serah terima berlebih jika ada
    const handoverMatch = text.match(/(##\s*6\.\s*CATATAN SERAH TERIMA[\s\S]*?)(?=\n##|$)/i);
    if (handoverMatch) {
      const fullHandover = handoverMatch[1];
      const lines = fullHandover.split(/\r?\n/).filter(l => l.trim().startsWith('*'));
      const keepLines = preset === 'freebuff-4k' ? 2 : 4;
      if (lines.length > keepLines) {
        const retained = lines.slice(-keepLines);
        const compacted = `## 6. CATATAN SERAH TERIMA (ringkas)\n\n${retained.join('\n')}\n`;
        text = text.replace(fullHandover, compacted);
        pruningNotes.push(`Catatan serah terima dikonsolidasi menjadi ${keepLines} poin terkini.`);
        didModify = true;
      }
    }
  }

  const prunedTokens = estimateTokens(text);
  const tokensSaved = Math.max(0, originalTokens - prunedTokens);

  return {
    prunedMarkdown: text,
    originalTokens,
    prunedTokens,
    tokensSaved,
    wasPruned: didModify || tokensSaved > 0,
    pruningNotes: pruningNotes.length > 0 ? pruningNotes : ['Konteks dioptimalkan untuk profil ' + profile.name]
  };
}
