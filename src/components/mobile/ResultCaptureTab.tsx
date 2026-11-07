import React, { useState, useMemo, useEffect } from 'react';
import { 
  ClipboardCheck, 
  Copy, 
  Check, 
  Download, 
  FileCode, 
  Layers, 
  Users, 
  Cpu, 
  ShieldCheck, 
  Sparkles, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  FileText, 
  Terminal,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RotateCcw
} from 'lucide-react';
import { ParsedSessionState, ZLCETask, TabType } from '../../types/zlce';
import { TeamMember } from '../../types/mobile';
import { TEAM_MEMBERS } from '../../data/teamMembers';
import { TargetAIProvider, getAIProviderLabel } from '../../utils/contextPackGenerator';
import { 
  ResultProvenanceMetadata, 
  extractCodeBlocksAndProvenance, 
  mergeResultIntoSessionStateMarkdown, 
  formatCurrentWIB, 
  ParseResultOutput,
  ExtractedCodeBlock 
} from '../../utils/provenanceInjector';
import { copyText } from '../../utils/clipboard';
import { downloadMarkdownBlob } from '../../utils/fileExport';

export interface ResultCaptureTabProps {
  sessionState: ParsedSessionState;
  rawMarkdown?: string;
  onUpdateMarkdown?: (newMarkdown: string) => void;
  onNavigateTab?: (tab: TabType) => void;
  onSelectMember?: (memberId: string) => void;
}

export const ResultCaptureTab: React.FC<ResultCaptureTabProps> = ({
  sessionState,
  rawMarkdown = '',
  onUpdateMarkdown,
  onNavigateTab,
  onSelectMember
}) => {
  // 1. Provenance Form State
  const [activeMemberId, setActiveMemberId] = useState<string>(() => {
    try {
      return localStorage.getItem('zlce_active_member_id') || 'member-01';
    } catch {
      return 'member-01';
    }
  });

  const activeMember: TeamMember = useMemo(() => {
    return TEAM_MEMBERS.find(m => m.id === activeMemberId) || TEAM_MEMBERS[0];
  }, [activeMemberId]);

  const handleMemberChange = (id: string) => {
    setActiveMemberId(id);
    try {
      localStorage.setItem('zlce_active_member_id', id);
    } catch {}
    if (onSelectMember) onSelectMember(id);
  };

  // Selected Task
  const [selectedTaskId, setSelectedTaskId] = useState<string>(() => {
    const tasks = sessionState.tasks || [];
    const inProgress = tasks.find(t => t.status === 'IN_PROGRESS');
    if (inProgress) return inProgress.id;
    const ready = tasks.find(t => t.status === 'READY');
    if (ready) return ready.id;
    return tasks[0]?.id || 'TASK-016';
  });

  const selectedTask: ZLCETask = useMemo(() => {
    const tasks = sessionState.tasks || [];
    const found = tasks.find(t => t.id === selectedTaskId);
    return found || {
      id: selectedTaskId,
      name: `Pelaksanaan ${selectedTaskId}`,
      dependencies: '-',
      status: 'READY',
      evidence: '-',
      approved: '-'
    };
  }, [sessionState.tasks, selectedTaskId]);

  // AI Model & Provider
  const [aiProvider, setAiProvider] = useState<TargetAIProvider>('claude');
  const [aiModelName, setAiModelName] = useState<string>('Claude 3.5 Sonnet');
  const [accountAlias, setAccountAlias] = useState<string>('Akun-Claude-Eko');
  const [verificationStatus, setVerificationStatus] = useState<'PENDING_VERIFICATION' | 'VERIFIED'>('PENDING_VERIFICATION');

  // Sync default model name when provider changes
  const handleSelectProvider = (prov: TargetAIProvider) => {
    setAiProvider(prov);
    if (prov === 'claude') {
      setAiModelName('Claude 3.5 Sonnet');
      setAccountAlias('Akun-Claude-1');
    } else if (prov === 'gemini') {
      setAiModelName('Gemini 2.0 Flash');
      setAccountAlias('Akun-Gemini-Work');
    } else if (prov === 'chatgpt') {
      setAiModelName('GPT-4o (OpenAI)');
      setAccountAlias('Akun-ChatGPT-Plus');
    } else if (prov === 'deepseek') {
      setAiModelName('DeepSeek V3 (Reasoning)');
      setAccountAlias('Akun-DeepSeek-Dev');
    } else if (prov === 'copilot') {
      setAiModelName('GitHub Copilot Chat');
      setAccountAlias('Akun-Copilot-IDE');
    } else if (prov === 'cursor') {
      setAiModelName('Cursor AI Composer');
      setAccountAlias('Akun-Cursor-Free');
    } else {
      setAiModelName('Universal AI Assistant');
      setAccountAlias('Akun-AI-Workspace');
    }
  };

  // 2. Raw Text Area State (Acceptance Criteria 1)
  const [rawAiResponse, setRawAiResponse] = useState<string>(`Berikut adalah implementasi solusi untuk TASK-016:

--- /src/components/mobile/ResultCaptureTab.tsx ---
\`\`\`typescript
import React from 'react';
export const ResultCaptureTab = () => {
  return <div>Result Capture Active</div>;
};
\`\`\`

## 3. WORK IN PROGRESS (WAL)
* **Task:** \`TASK-016\`
* **Langkah Sedang Dikerjakan:** Verifikasi solusi ekstrasi dan injeksi provenance
* **Berkas Direncanakan/Disentuh:** src/components/mobile/ResultCaptureTab.tsx, src/utils/provenanceInjector.ts
* **Sudah Dilakukan:** Berhasil mengekstrak blok kode dan menyematkan tag provenance otomatis
* **Langkah Berikutnya (persis):** Jalankan pengujian TC-P3-04 di tablet
* **Perintah Verifikasi:** npm run build && python3 scripts/run-tests.py
* **Diperbarui:** 2026-11-05 08:00:00 WIB
`);

  // Copy feedback
  const [copiedTag, setCopiedTag] = useState<boolean>(false);
  const [copiedFull, setCopiedFull] = useState<boolean>(false);
  const [copiedBlockId, setCopiedBlockId] = useState<string | null>(null);
  const [streamSuccess, setStreamSuccess] = useState<boolean>(false);

  // 3. Assemble Provenance Metadata
  const provenance: ResultProvenanceMetadata = useMemo(() => {
    return {
      taskId: selectedTask.id,
      taskName: selectedTask.name,
      actorName: activeMember.name,
      actorAlias: activeMember.name.toLowerCase().replace(/\s+/g, '-'),
      actorEmail: activeMember.email,
      aiProvider,
      aiModelName,
      accountAlias,
      timestamp: new Date().toISOString(),
      timestampWIB: formatCurrentWIB(),
      verificationStatus
    };
  }, [
    selectedTask,
    activeMember,
    aiProvider,
    aiModelName,
    accountAlias,
    verificationStatus
  ]);

  // 4. Extract Code Blocks & Injected Provenance
  const parseResult: ParseResultOutput = useMemo(() => {
    return extractCodeBlocksAndProvenance(rawAiResponse, provenance);
  }, [rawAiResponse, provenance]);

  // Handle Paste from Clipboard
  const handlePasteFromClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setRawAiResponse(text);
          return;
        }
      }
    } catch {
      // fallback
    }
  };

  // Handle Copy Provenance Tag
  const handleCopyProvenanceTag = async () => {
    const success = await copyText(parseResult.markdownProvenanceTag);
    if (success) {
      setCopiedTag(true);
      setTimeout(() => setCopiedTag(false), 2000);
    }
  };

  // Handle Copy Full Solution with Provenance
  const handleCopyFullSolution = async () => {
    const payload = `${parseResult.markdownProvenanceTag}\n\n${rawAiResponse}`;
    const success = await copyText(payload);
    if (success) {
      setCopiedFull(true);
      setTimeout(() => setCopiedFull(false), 2000);
    }
  };

  // Handle Copy Specific Block
  const handleCopyBlock = async (block: ExtractedCodeBlock) => {
    const success = await copyText(block.codeWithProvenance);
    if (success) {
      setCopiedBlockId(block.id);
      setTimeout(() => setCopiedBlockId(null), 2000);
    }
  };

  // Handle Download Specific Block
  const handleDownloadBlock = (block: ExtractedCodeBlock) => {
    const fallbackName = `solution_${selectedTask.id}_${block.id}.${block.language === 'typescript' ? 'tsx' : block.language}`;
    const filename = block.filePath ? block.filePath.split('/').pop() || fallbackName : fallbackName;
    downloadMarkdownBlob(block.codeWithProvenance, { filename });
  };

  // Handle Stream to Draft WAL & Session State (Acceptance Criteria 3)
  const handleStreamToSessionState = () => {
    if (!onUpdateMarkdown) return;
    const currentMd = rawMarkdown || sessionState.raw || '';
    if (!currentMd) return;

    const merged = mergeResultIntoSessionStateMarkdown(currentMd, provenance, parseResult);
    onUpdateMarkdown(merged.updatedMarkdown);
    setStreamSuccess(true);
    setTimeout(() => setStreamSuccess(false), 3000);
  };

  // Sample Presets for Quick Testing
  const handleLoadSample = (sampleType: 'complete' | 'refactor') => {
    if (sampleType === 'complete') {
      setRawAiResponse(`Berikut implementasi tuntas modul untuk ${selectedTask.id}:

--- /src/components/mobile/ResultCaptureTab.tsx ---
\`\`\`typescript
import React, { useState } from 'react';

// Modul tangkap hasil AI dengan verifikasi
export const ResultCaptureTab: React.FC = () => {
  const [data, setData] = useState<string>('');
  return (
    <div className="p-4 bg-slate-900 rounded-xl">
      <h2 className="text-sm font-bold text-white">Capture Active</h2>
    </div>
  );
};
\`\`\`

## 3. WORK IN PROGRESS (WAL)
* **Task:** \`${selectedTask.id}\`
* **Langkah Sedang Dikerjakan:** Verifikasi kode modul tangkap hasil
* **Berkas Direncanakan/Disentuh:** src/components/mobile/ResultCaptureTab.tsx
* **Sudah Dilakukan:** Seluruh kode terekstraksi bersih tanpa error sintaks
* **Langkah Berikutnya (persis):** Jalankan pengujian verifikasi TC-P3-04
* **Perintah Verifikasi:** npm run build && python3 scripts/run-tests.py
* **Diperbarui:** ${formatCurrentWIB()}
`);
    } else {
      setRawAiResponse(`Perbaikan modul fungsi utilitas:

\`\`\`typescript
export function sanitizeInput(val: string): string {
  return val.replace(/[^a-zA-Z0-9_-]/g, '');
}
\`\`\`
`);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-16">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950/70 to-slate-900 border border-teal-500/30 rounded-2xl p-5 md:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-teal-600/30 border border-teal-400/40 rounded-xl text-teal-400 shrink-0">
              <ClipboardCheck className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                  Result Capture Module &amp; Injeksi Provenance Otomatis
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-full">
                  TASK-016
                </span>
                <span className="px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                  Invarian I4 (Strict Provenance)
                </span>
              </div>
              <p className="text-sm text-slate-300 mt-1">
                Tempelkan solusi mentah dari Browser AI, ekstrak blok kode otomatis, dan sematkan metadata kepemilikan anti-tamper langsung ke berkas dan WAL.
              </p>
            </div>
          </div>

          {/* Extraction Quick Stats */}
          <div className="flex items-center gap-2 flex-wrap self-stretch md:self-auto justify-end">
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl px-3.5 py-2 text-right">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block font-medium">Berkas Kode</span>
              <span className="text-base font-bold text-teal-300">
                {parseResult.totalFiles} berkas
              </span>
            </div>
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl px-3.5 py-2 text-right">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block font-medium">Total Baris</span>
              <span className="text-base font-bold text-cyan-300">
                {parseResult.totalCodeLines.toLocaleString()} baris
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Provenance Configuration Row */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            <h2 className="text-sm font-bold text-white tracking-wide">
              Metadata Provenance &amp; Identitas Sesi (Invarian I4)
            </h2>
          </div>
          <span className="text-xs text-teal-400 font-mono">
            {provenance.timestampWIB}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Target Task */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 block">Task yang Dikerjakan:</label>
            <select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {(sessionState.tasks || []).map((t) => (
                <option key={t.id} value={t.id}>
                  [{t.status}] {t.id} - {t.name.slice(0, 35)}
                </option>
              ))}
            </select>
          </div>

          {/* Active Tablet Driver */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 block">Tablet Driver (Aktor Eksekusi):</label>
            <select
              value={activeMemberId}
              onChange={(e) => handleMemberChange(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {TEAM_MEMBERS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} - {m.role}
                </option>
              ))}
            </select>
          </div>

          {/* AI Model & Provider */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 block">Engine AI &amp; Provider:</label>
            <select
              value={aiProvider}
              onChange={(e) => handleSelectProvider(e.target.value as TargetAIProvider)}
              className="w-full min-h-[44px] px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="claude">Anthropic Claude (3.5 Sonnet / Haiku)</option>
              <option value="gemini">Google Gemini (1.5 Pro / Flash / 2.0)</option>
              <option value="chatgpt">OpenAI ChatGPT (GPT-4o / o1)</option>
              <option value="deepseek">DeepSeek (V3 / R1 Reasoning)</option>
              <option value="copilot">GitHub Copilot (Chat / Edits)</option>
              <option value="cursor">Cursor AI (Composer / Agent)</option>
              <option value="qwen">Alibaba Qwen (2.5 Coder)</option>
              <option value="generic">Universal AI Assistant</option>
            </select>
          </div>

          {/* Specific Account Alias */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 block">Alias Akun AI / Profil:</label>
            <input
              type="text"
              value={accountAlias}
              onChange={(e) => setAccountAlias(e.target.value)}
              placeholder="e.g. Akun-Claude-Eko, Akun-Free-Cursor"
              className="w-full min-h-[44px] px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>
      </div>

      {/* 3. Main Workspace: Large Paste Area (Acceptance Criteria 1) & Live Extraction */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left Column: Big Paste Textarea */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Area Tempel Jawaban AI (Large Paste Box)
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePasteFromClipboard}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-300 rounded-lg text-xs font-medium border border-slate-700 flex items-center gap-1.5"
                title="Tempelkan langsung teks dari clipboard sistem"
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
                <span>Tempel</span>
              </button>
              <button
                type="button"
                onClick={() => setRawAiResponse('')}
                className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                title="Kosongkan area tempel"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Big Textarea */}
          <div className="relative flex-1">
            <textarea
              value={rawAiResponse}
              onChange={(e) => setRawAiResponse(e.target.value)}
              placeholder="Tempelkan seluruh teks jawaban atau blok kode dari Browser AI (Claude, Gemini, ChatGPT, DeepSeek, dsb.) di sini..."
              rows={16}
              className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-y leading-relaxed"
            />
          </div>

          {/* Quick Presets & Text Stats */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[11px] text-slate-400">Contoh Cepat:</span>
              <button
                type="button"
                onClick={() => handleLoadSample('complete')}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px]"
              >
                Solusi + WAL
              </button>
              <button
                type="button"
                onClick={() => handleLoadSample('refactor')}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px]"
              >
                Snippet Kode
              </button>
            </div>

            <div className="font-mono text-[11px] text-slate-400">
              {rawAiResponse.length.toLocaleString()} karakter • {rawAiResponse.split('\n').length} baris
            </div>
          </div>
        </div>

        {/* Right Column: Injected Provenance Tag & Detected Blocks (Acceptance Criteria 2) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Tag Provenance Anti-Tamper Terinjeksi
              </h3>
            </div>

            <button
              type="button"
              onClick={handleCopyProvenanceTag}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded-lg text-xs font-semibold border border-slate-700 flex items-center gap-1.5"
            >
              {copiedTag ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedTag ? 'Tersalin!' : 'Salin Tag'}</span>
            </button>
          </div>

          {/* Formatted Provenance Tag Preview */}
          <div className="p-3 bg-slate-950 border border-slate-800/90 rounded-xl font-mono text-xs text-emerald-300 overflow-x-auto selection:bg-emerald-500 selection:text-white">
            <pre className="whitespace-pre-wrap">{parseResult.markdownProvenanceTag}</pre>
          </div>

          {/* Extracted Code Blocks Summary */}
          <div className="space-y-3 flex-1 flex flex-col">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                <span>Blok Kode Terekstraksi ({parseResult.codeBlocks.length})</span>
              </h4>
              <span className="text-[11px] text-slate-500 font-mono">
                Banner tersemat otomatis
              </span>
            </div>

            {parseResult.codeBlocks.length === 0 ? (
              <div className="p-6 bg-slate-950/60 border border-dashed border-slate-800 rounded-xl text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2 flex-1">
                <FileCode className="w-8 h-8 text-slate-700" />
                <span>Belum ada blok kode (```lang) yang terdeteksi. Tempelkan keluaran AI di sebelah kiri.</span>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                {parseResult.codeBlocks.map((block) => (
                  <div
                    key={block.id}
                    className="p-3 bg-slate-950 border border-slate-800/90 rounded-xl space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950/70 border border-cyan-800/60 text-cyan-300">
                          {block.language.toUpperCase()}
                        </span>
                        <span className="text-xs font-mono font-semibold text-slate-200 truncate">
                          {block.filePath || `${block.id} (Inline)`}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-mono text-slate-500 mr-1">
                          {block.lineCount} baris
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyBlock(block)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                          title="Salin kode ini beserta banner provenance"
                        >
                          {copiedBlockId === block.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadBlock(block)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                          title="Unduh berkas kode ini"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Code Snippet Preview */}
                    <div className="p-2 bg-slate-900/90 rounded-lg font-mono text-[11px] text-slate-300 max-h-24 overflow-hidden text-ellipsis border border-slate-800">
                      <pre className="line-clamp-3">{block.rawCode}</pre>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Action & Stream Bar (Acceptance Criteria 3: Direct Stream to SESSION_STATE.md / WAL) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-teal-400" />
            <h3 className="text-sm font-bold text-white">
              Alirkan Hasil ke Dokumen Kontrol (Acceptance Criteria 3)
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            Perbarui Bagian 3 (WAL) dan tambahkan entri Log Audit secara atomik dengan identitas Aktor &amp; Engine AI.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          {/* Main Action: Stream to SESSION_STATE.md */}
          <button
            type="button"
            onClick={handleStreamToSessionState}
            className={`min-h-[48px] px-6 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all shadow-md ${
              streamSuccess
                ? 'bg-emerald-600 text-white shadow-emerald-600/30 ring-2 ring-emerald-400'
                : 'bg-teal-600 hover:bg-teal-500 text-white shadow-teal-600/30'
            }`}
          >
            {streamSuccess ? (
              <>
                <Check className="w-5 h-5 text-white" />
                <span>Tersimpan di SESSION_STATE.md &amp; WAL!</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-teal-200" />
                <span>Alirkan ke Draft WAL &amp; Audit Log</span>
              </>
            )}
          </button>

          {/* Secondary Action: Salin Solusi Lengkap */}
          <button
            type="button"
            onClick={handleCopyFullSolution}
            className="min-h-[48px] px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all"
            title="Salin seluruh teks masukan beserta tag provenance di baris pertama"
          >
            {copiedFull ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
            <span>{copiedFull ? 'Tersalin!' : 'Salin Solusi + Tag'}</span>
          </button>

          {/* Navigate to Session State Tab */}
          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab('session')}
              className="min-h-[48px] px-4 py-3 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
            >
              <span>Buka SESSION_STATE</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
