import React, { useState, useMemo, useEffect } from 'react';
import { 
  Sparkles, 
  Copy, 
  Check, 
  Download, 
  FileText, 
  Cpu, 
  ShieldCheck, 
  Users, 
  Layers, 
  GitBranch, 
  Terminal, 
  Sliders, 
  CheckCircle2, 
  ArrowRight,
  ExternalLink,
  Zap,
  Info,
  RefreshCw,
  FolderGit2,
  ArrowRightLeft
} from 'lucide-react';
import { ParsedSessionState, ZLCETask, ParsedBacklogTask, TabType } from '../../types/zlce';
import { TeamMember } from '../../types/mobile';
import { TEAM_MEMBERS } from '../../data/teamMembers';
import { 
  generatePortableContextPack, 
  TargetAIProvider, 
  TokenBudgetPreset, 
  getAIProviderLabel, 
  estimateTokenCount 
} from '../../utils/contextPackGenerator';
import { TokenBudgetSelector } from './TokenBudgetSelector';
import { 
  pruneContextForBudget, 
  estimateTokens, 
  calculateTokenSafety, 
  getModelBudgetProfile 
} from '../../utils/tokenBudgetAdapter';
import { copyText } from '../../utils/clipboard';
import { generateRelayHandover } from '../../utils/relayHandoverGenerator';
import { downloadMarkdownBlob, generateAndDownloadZipBundle } from '../../utils/fileExport';
import { parseTasksMarkdown } from '../../utils/markdownParser';
import { PromptStudio } from './PromptStudio';

interface ContextPackTabProps {
  sessionState: ParsedSessionState;
  onNavigateTab?: (tab: TabType) => void;
  initialTaskId?: string;
  onSelectMember?: (memberId: string) => void;
  initialMode?: 'context-pack' | 'prompt-studio';
}

export const ContextPackTab: React.FC<ContextPackTabProps> = ({
  sessionState,
  onNavigateTab,
  initialTaskId,
  onSelectMember,
  initialMode = 'context-pack'
}) => {
  const [hubSubMode, setHubSubMode] = useState<'context-pack' | 'prompt-studio'>(initialMode);
  // Load tasks from TASKS.md if available in localStorage or raw session
  const [tasksCatalog, setTasksCatalog] = useState<ParsedBacklogTask[]>([]);
  
  useEffect(() => {
    // Try to load cached TASKS.md from localStorage
    try {
      const savedTasks = localStorage.getItem('zlce_workspace_tasks_md');
      if (savedTasks) {
        const parsed = parseTasksMarkdown(savedTasks);
        if (parsed.tasks && parsed.tasks.length > 0) {
          setTasksCatalog(parsed.tasks);
          return;
        }
      }
    } catch {
      // fallback
    }

    // Otherwise fetch or fallback
    fetch('/TASKS.md')
      .then(r => r.ok ? r.text() : '')
      .then(text => {
        if (text) {
          const parsed = parseTasksMarkdown(text);
          if (parsed.tasks && parsed.tasks.length > 0) {
            setTasksCatalog(parsed.tasks);
            localStorage.setItem('zlce_workspace_tasks_md', text);
          }
        }
      })
      .catch(() => {
        // silent fallback
      });
  }, []);

  // Map of task details by ID
  const taskDetailMap = useMemo(() => {
    const map = new Map<string, ParsedBacklogTask>();
    tasksCatalog.forEach(t => map.set(t.id, t));
    return map;
  }, [tasksCatalog]);

  // Determine active task ID
  const [selectedTaskId, setSelectedTaskId] = useState<string>(() => {
    if (initialTaskId) return initialTaskId;
    // Prefer IN_PROGRESS task, then READY task, then default
    const inProgress = sessionState.tasks.find(t => t.status === 'IN_PROGRESS');
    if (inProgress) return inProgress.id;
    const ready = sessionState.tasks.find(t => t.status === 'READY');
    if (ready) return ready.id;
    return 'TASK-014';
  });

  // Active Team Member State
  const [activeMemberId, setActiveMemberId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('zlce_active_member_id');
      if (saved && TEAM_MEMBERS.some(m => m.id === saved)) {
        return saved;
      }
    } catch {
      // fallback
    }
    return 'eko';
  });

  const activeMember: TeamMember = useMemo(() => {
    return TEAM_MEMBERS.find(m => m.id === activeMemberId) || TEAM_MEMBERS[0];
  }, [activeMemberId]);

  const handleMemberChange = (id: string) => {
    setActiveMemberId(id);
    try {
      localStorage.setItem('zlce_active_member_id', id);
    } catch {
      // ignore
    }
    if (onSelectMember) {
      onSelectMember(id);
    }
  };

  // Target AI Provider
  const [targetAi, setTargetAi] = useState<TargetAIProvider>('gemini');

  // Token Budget Preset (TASK-014)
  const [tokenBudgetPreset, setTokenBudgetPreset] = useState<TokenBudgetPreset>('gemini-1m');

  // Smart Pruning toggle (TASK-014)
  const [enableAutoPruning, setEnableAutoPruning] = useState<boolean>(true);

  // Mode
  const [mode, setMode] = useState<'FULL' | 'LITE'>('FULL');

  // Custom instruction
  const [customInstructions, setCustomInstructions] = useState<string>('');

  // Copy feedback state
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isGeneratingClaudeZip, setIsGeneratingClaudeZip] = useState<boolean>(false);
  const [activeTabMode, setActiveTabMode] = useState<'preview' | 'raw'>('preview');

  const handleGenerateClaudeZip = async () => {
    setIsGeneratingClaudeZip(true);
    try {
      await generateAndDownloadZipBundle({
        type: 'claude',
        filename: 'zlce-claude-chatgpt-bundle.zip'
      });
    } catch (err) {
      console.error('Gagal generate Claude bundle:', err);
    } finally {
      setIsGeneratingClaudeZip(false);
    }
  };

  // Find currently selected ZLCETask object
  const currentTask: ZLCETask = useMemo(() => {
    const found = sessionState.tasks.find(t => t.id === selectedTaskId);
    if (found) return found;

    // Fallback constructed task
    const catalogItem = taskDetailMap.get(selectedTaskId);
    return {
      id: selectedTaskId,
      name: catalogItem?.title || `Implementasi ${selectedTaskId}`,
      dependencies: catalogItem?.dependencies || 'TASK-013',
      status: 'READY',
      evidence: '-',
      approved: '-'
    };
  }, [selectedTaskId, sessionState.tasks, taskDetailMap]);

  // Generate the raw Context Pack
  const rawContextPackOutput = useMemo(() => {
    const detail = taskDetailMap.get(selectedTaskId);
    return generatePortableContextPack({
      task: currentTask,
      taskDetail: detail,
      sessionState,
      activeMember,
      targetAi,
      tokenBudgetPreset,
      mode,
      customInstructions: customInstructions.trim() || undefined
    });
  }, [currentTask, selectedTaskId, taskDetailMap, sessionState, activeMember, targetAi, tokenBudgetPreset, mode, customInstructions]);

  // Apply Context Budget Adapter & Smart Pruning (TASK-014: Acceptance Criteria 3)
  const pruningResult = useMemo(() => {
    if (!enableAutoPruning) {
      const origTokens = estimateTokens(rawContextPackOutput.markdown);
      return {
        prunedMarkdown: rawContextPackOutput.markdown,
        originalTokens: origTokens,
        prunedTokens: origTokens,
        tokensSaved: 0,
        wasPruned: false,
        pruningNotes: ['Auto-pruning dinonaktifkan; konteks disertakan tanpa pemangkasan.']
      };
    }
    return pruneContextForBudget(rawContextPackOutput.markdown, tokenBudgetPreset);
  }, [rawContextPackOutput.markdown, tokenBudgetPreset, enableAutoPruning]);

  const finalMarkdown = pruningResult.prunedMarkdown;
  const finalTokenCount = pruningResult.prunedTokens;

  // Copy Context Pack Handler
  const handleCopy = async () => {
    const success = await copyText(finalMarkdown);
    if (success) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // Download Context Pack Handler
  const handleDownload = () => {
    const filename = `CONTEXT_PACK_${selectedTaskId}_${tokenBudgetPreset}_${activeMember.id}.md`;
    downloadMarkdownBlob(finalMarkdown, { filename });
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-12 animate-in fade-in">
      {/* Top Level Sub-Mode Selector for Context & Prompt Hub */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 sm:p-4 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
              Context &amp; Prompt Hub (Terpadu)
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950/80 border border-cyan-700/60 text-cyan-300">
              Invarian I1 &amp; I2
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setHubSubMode('context-pack')}
              className={`touch-target-44 min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition ${
                hubSubMode === 'context-pack'
                  ? 'bg-amber-600 text-white shadow'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Paket Konteks &amp; Budget</span>
            </button>

            <button
              type="button"
              onClick={() => setHubSubMode('prompt-studio')}
              className={`touch-target-44 min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition ${
                hubSubMode === 'prompt-studio'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Studio Prompt Multi-Model</span>
            </button>
          </div>
        </div>
      </div>

      {hubSubMode === 'prompt-studio' ? (
        <PromptStudio
          sessionState={sessionState}
          onNavigateTab={onNavigateTab}
          initialTaskId={selectedTaskId}
          onSelectMember={handleMemberChange}
        />
      ) : (
        <>
          {/* 1. Header Banner */}
          <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/80 border border-slate-800 shadow-xl p-4 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 sm:space-y-2">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-mono text-slate-400">
              <span className="text-cyan-400 font-bold tracking-wider">FASE 3</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-emerald-400">TASK-013</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-indigo-300">BLUEPRINT 14: MULTI-AI TEAM</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-amber-300">SCHEMA-BEFORE-DATA</span>
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              <Sparkles className="w-6 h-6 text-amber-400 shrink-0" />
              <span>Portable Context Pack Generator</span>
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-3xl leading-relaxed">
              Membangkitkan paket konteks mandiri (self-contained) yang mematuhi <span className="text-cyan-300 font-semibold">Invarian I1 (All in Files)</span> dan <span className="text-emerald-300 font-semibold">Invarian I2 (Cold-Start Resume)</span>. Salin ke sesi AI baru mana pun (Gemini, Claude, GPT) tanpa perlu riwayat obrolan sebelumnya!
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0 w-full sm:w-auto">
            <button
              onClick={handleCopy}
              className="touch-target-44 min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-cyan-600 hover:bg-cyan-500 text-white shadow-md active:scale-95 transition"
            >
              {isCopied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              <span>{isCopied ? 'Context Pack Tersalin!' : 'Salin Context Pack (1-Ketukan)'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="touch-target-44 min-h-[44px] flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-semibold text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 active:scale-95 transition"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Unduh Berkas (.md)</span>
            </button>
          </div>
        </div>

        {/* 5 Invariants Badges */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-[10px] sm:text-[11px] font-mono">
          <span className="text-slate-400 font-semibold">Invarian Terpenuhi:</span>
          <span className="px-2 py-0.5 rounded bg-cyan-950/70 text-cyan-300 border border-cyan-800/60">
            I1: All in Files
          </span>
          <span className="px-2 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-800/60">
            I2: Cold-Start Resume
          </span>
          <span className="px-2 py-0.5 rounded bg-indigo-950/70 text-indigo-300 border border-indigo-800/60">
            I3: ZLCE Core 4-Gerbang
          </span>
          <span className="px-2 py-0.5 rounded bg-purple-950/70 text-purple-300 border border-purple-800/60">
            I4: Strict Provenance
          </span>
          <span className="px-2 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-800/60">
            I5: Branch task/{selectedTaskId}
          </span>
        </div>
      </div>

      {/* Generator Estafet Multi-AI Quick Bar */}
      <div className="bg-gradient-to-r from-amber-950/40 via-purple-950/30 to-indigo-950/40 border border-amber-500/30 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Generator Estafet AI</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-purple-900/60 border border-purple-700/60 text-purple-200">Semua Task Didukung</span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                Siap Melanjutkan <strong className="text-amber-300 font-mono">{selectedTaskId}</strong> di Claude, ChatGPT, Cursor, atau Copilot?
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Gunakan paket bundel ZIP berisi 20 berkas status ZLCE, atau salin prompt estafet siap pakai untuk <strong className="text-amber-300 font-mono">{selectedTaskId}: {taskDetailMap.get(selectedTaskId)?.title || currentTask.name}</strong>.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
            <button
              onClick={async () => {
                const relay = generateRelayHandover({
                  taskId: selectedTaskId,
                  aiProvider: targetAi,
                  activeMember,
                  sessionState,
                  taskDetail: taskDetailMap.get(selectedTaskId)
                });
                const success = await copyText(relay.fullPrompt);
                if (success) {
                  setIsCopied(true);
                  setTimeout(() => setIsCopied(false), 2000);
                }
              }}
              className="touch-target-44 min-h-[44px] flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-md active:scale-95 transition"
              title={`Salin prompt estafet siap pakai untuk ${selectedTaskId}`}
            >
              {isCopied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              <span>{isCopied ? 'Tersalin!' : `Prompt ${selectedTaskId}`}</span>
            </button>

            <button
              type="button"
              onClick={handleGenerateClaudeZip}
              disabled={isGeneratingClaudeZip}
              className={`touch-target-44 min-h-[44px] flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 shadow-md active:scale-95 transition ${
                isGeneratingClaudeZip ? 'opacity-80 cursor-wait' : ''
              }`}
              title="Generate dan unduh 20 berkas lengkap dalam format ZIP untuk diunggah ke Claude atau ChatGPT secara real-time"
            >
              {isGeneratingClaudeZip ? (
                <>
                  <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
                  <span>Mengemas ZIP...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Generate ZIP (20 Berkas)</span>
                </>
              )}
            </button>

            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('tutorial')}
                className="touch-target-44 min-h-[44px] flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono bg-indigo-950/80 hover:bg-indigo-900/80 border border-indigo-700/60 text-indigo-300 transition"
              >
                <span>Buka Generator</span>
                <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Configuration & Parameter Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left Column (2 Cols): Task & AI Engine Controls */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2.5">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>Konfigurasi Paket Konteks Portabel</span>
            </h3>

            {/* Task Selector Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-slate-300 flex items-center justify-between">
                <span>1. Pilih Mandat Task Aktif:</span>
                <span className="text-[11px] text-cyan-400">Total {sessionState.tasks.length || 43} Task Terdaftar</span>
              </label>
              <select
                value={selectedTaskId}
                onChange={e => setSelectedTaskId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-100 font-mono focus:outline-none focus:border-cyan-500 touch-target-44"
              >
                {sessionState.tasks.map(t => {
                  const detail = taskDetailMap.get(t.id);
                  return (
                    <option key={t.id} value={t.id}>
                      {t.id}: {detail?.title || t.name} [{t.status}]
                    </option>
                  );
                })}
              </select>
            </div>

            {/* AI Provider & Token Budget Presets Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Target AI Engine */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-slate-300">
                  2. Model AI Target (Engine):
                </label>
                <select
                  value={targetAi}
                  onChange={e => {
                    const val = e.target.value as TargetAIProvider;
                    setTargetAi(val);
                    // auto adapt preset
                    if (val === 'gemini') setTokenBudgetPreset('gemini-1m');
                    else if (val === 'claude') setTokenBudgetPreset('claude-30k');
                    else if (val === 'chatgpt') setTokenBudgetPreset('gpt-128k');
                    else if (val === 'deepseek') setTokenBudgetPreset('deepseek-64k');
                    else if (val === 'copilot') setTokenBudgetPreset('copilot-32k');
                    else if (val === 'cursor') setTokenBudgetPreset('cursor-64k');
                    else setTokenBudgetPreset('compact-8k');
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-100 font-mono focus:outline-none focus:border-cyan-500 touch-target-44"
                >
                  <option value="gemini">Google Gemini (1.5 Pro / Flash / 2.0 / 3.8)</option>
                  <option value="claude">Anthropic Claude (3.5 Sonnet / Haiku)</option>
                  <option value="chatgpt">OpenAI ChatGPT (GPT-4o / o1)</option>
                  <option value="deepseek">DeepSeek (V3 / R1 / Coder)</option>
                  <option value="copilot">GitHub Copilot (Chat / Edits / CLI)</option>
                  <option value="cursor">Cursor AI (Composer / Agent / Rules)</option>
                  <option value="qwen">Alibaba Qwen (2.5 Coder)</option>
                  <option value="generic">Universal Standard (Semua Model AI)</option>
                </select>
                <p className="text-[10px] text-slate-400 font-mono">
                  {getAIProviderLabel(targetAi)}
                </p>
              </div>

              {/* Token Budget Preset */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-slate-300">
                  3. Token Budget Preset:
                </label>
                <select
                  value={tokenBudgetPreset}
                  onChange={e => setTokenBudgetPreset(e.target.value as TokenBudgetPreset)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-100 font-mono focus:outline-none focus:border-cyan-500 touch-target-44"
                >
                  <option value="gemini-1m">Gemini 1M+ (Komprehensif Lengkap)</option>
                  <option value="claude-30k">Claude 30K (Presisi Tinggi Terfokus)</option>
                  <option value="gpt-128k">GPT 128K (Standar Lengkap)</option>
                  <option value="deepseek-64k">DeepSeek 64K (Penalaran &amp; Reasoning Buffer)</option>
                  <option value="copilot-32k">Copilot 32K (Inline &amp; Task Focused)</option>
                  <option value="cursor-64k">Cursor 64K (Multi-file Composer &amp; Rules)</option>
                  <option value="compact-8k">Compact 8K (Cepat &amp; Hemat RAM Mobile)</option>
                  <option value="freebuff-4k">FreeBuff 4K (Ultra-Lean Buffer Proteksi Kuota Free)</option>
                </select>
                <p className="text-[10px] text-slate-400 font-mono">
                  {tokenBudgetPreset === 'gemini-1m' ? 'Jendela 1M: Menampilkan detail arsitektur penuh.' :
                   tokenBudgetPreset === 'claude-30k' ? 'Jendela 30K: Pangkas ke Tier 0 ringkas + task aktif.' :
                   tokenBudgetPreset === 'gpt-128k' ? 'Jendela 128K: Standar penuh seimbang.' :
                   tokenBudgetPreset === 'deepseek-64k' ? 'Jendela 64K: Alokasi ruang penalaran (thinking buffer) DeepSeek R1/V3.' :
                   tokenBudgetPreset === 'copilot-32k' ? 'Jendela 32K: Mode optimal instruksi GitHub Copilot Chat/Edits.' :
                   tokenBudgetPreset === 'cursor-64k' ? 'Jendela 64K: Mode multi-file diffing & Composer Cursor AI.' :
                   tokenBudgetPreset === 'freebuff-4k' ? 'Jendela 4K: Buffer proteksi kuota ketat akun gratis agar terhindar dari rate limit.' :
                   'Jendela 8K: Super ringkas untuk handoff cepat di tablet.'}
                </p>
              </div>
            </div>

            {/* Mode & Custom Instructions */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-semibold text-slate-300">
                  4. Instruksi Tambahan (Opsional):
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-slate-400">Mode:</span>
                  <button
                    onClick={() => setMode(m => m === 'FULL' ? 'LITE' : 'FULL')}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition ${
                      mode === 'FULL' 
                        ? 'bg-indigo-950 text-indigo-300 border-indigo-700' 
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {mode}
                  </button>
                </div>
              </div>
              <textarea
                value={customInstructions}
                onChange={e => setCustomInstructions(e.target.value)}
                placeholder="Misal: 'Prioritaskan kode tanpa dependensi eksternal', 'Gunakan Tailwind 4', dsb."
                rows={2}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Active Driver & Token Gauge */}
        <div className="space-y-4">
          {/* Active Driver Profile */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                Aktor Tablet Aktif (Driver)
              </span>
              <span className="text-[10px] font-mono text-emerald-400">Provenance Valid</span>
            </h3>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full bg-gradient-to-tr ${activeMember.avatarColor} flex items-center justify-center font-bold text-white shadow-md ring-2 ring-white/10 shrink-0 text-sm`}>
                {activeMember.name.slice(0, 2)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-bold text-white truncate">{activeMember.name}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-indigo-500/20 text-indigo-300 shrink-0">
                    Driver
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 truncate">{activeMember.role}</div>
                <div className="text-[10px] text-cyan-300 font-mono truncate">{activeMember.email}</div>
              </div>
            </div>

            {/* Quick Switcher of 8 Relay Members */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-slate-400 block">Ganti Driver Estafet (1-Ketukan):</span>
              <div className="grid grid-cols-4 gap-1.5">
                {TEAM_MEMBERS.map(m => (
                  <button
                    key={m.id}
                    onClick={() => handleMemberChange(m.id)}
                    className={`touch-target-44 p-1.5 rounded-lg border text-center transition flex flex-col items-center justify-center ${
                      activeMemberId === m.id
                        ? 'bg-cyan-950/70 border-cyan-500 text-white ring-1 ring-cyan-500/40'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                    title={`${m.name} (${m.role})`}
                  >
                    <span className="text-[11px] font-bold">{m.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Context Pack Metrics Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3 font-mono text-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-amber-400" />
                Metrik Paket Konteks
              </span>
              <span className="text-emerald-400 font-bold">100% Deterministic</span>
            </h3>

            <div className="space-y-2 text-slate-300">
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Estimasi Token:</span>
                <span className="text-cyan-300 font-bold">~{finalTokenCount.toLocaleString()} token</span>
              </div>
              {pruningResult.tokensSaved > 0 && (
                <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                  <span className="text-emerald-400">Efisiensi Pemangkasan:</span>
                  <span className="text-emerald-300 font-bold">-~{pruningResult.tokensSaved.toLocaleString()} token</span>
                </div>
              )}
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Karakter Teks:</span>
                <span className="text-slate-200">{finalMarkdown.length.toLocaleString()} chars</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Cabang Git Terikat:</span>
                <span className="text-emerald-400 font-bold truncate max-w-[150px]">{rawContextPackOutput.metadata.gitBranch}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400">Target Sentuh Tablet:</span>
                <span className="text-slate-200">min 44px+ OK</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2b. TASK-014 Context Budget Manager & Token Quota Adapter */}
      <TokenBudgetSelector
        selectedPreset={tokenBudgetPreset}
        onSelectPreset={setTokenBudgetPreset}
        tokenCount={finalTokenCount}
        tokensSaved={pruningResult.tokensSaved}
        isPruned={pruningResult.wasPruned}
        enableAutoPruning={enableAutoPruning}
        onToggleAutoPruning={setEnableAutoPruning}
        pruningNotes={pruningResult.pruningNotes}
      />

      {/* 3. Live Context Pack Preview Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3 sm:pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Pratinjau Output Context Pack</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                  {selectedTaskId}
                </span>
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400">
                Format Markdown deterministik siap ditempel ke AI Assistant
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* View Mode Switcher */}
            <div className="bg-slate-950 p-1 rounded-lg border border-slate-800 flex items-center gap-1 text-xs font-mono">
              <button
                onClick={() => setActiveTabMode('preview')}
                className={`px-2.5 py-1 rounded transition ${
                  activeTabMode === 'preview' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Tampilan Rapi
              </button>
              <button
                onClick={() => setActiveTabMode('raw')}
                className={`px-2.5 py-1 rounded transition ${
                  activeTabMode === 'raw' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Raw MD
              </button>
            </div>

            <button
              onClick={handleCopy}
              className="touch-target-44 min-h-[44px] flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono bg-cyan-600 hover:bg-cyan-500 text-white transition active:scale-95 shadow"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isCopied ? 'Tersalin' : 'Salin'}</span>
            </button>
          </div>
        </div>

        {/* Text Container */}
        {activeTabMode === 'raw' ? (
          <textarea
            readOnly
            value={finalMarkdown}
            rows={18}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 font-mono text-xs text-cyan-300/90 leading-relaxed focus:outline-none select-all"
          />
        ) : (
          <div className="bg-slate-950 p-4 sm:p-5 rounded-xl border border-slate-800 max-h-[500px] overflow-y-auto space-y-4 text-xs font-mono text-slate-300 leading-relaxed scrollbar-thin">
            <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-200">
              {finalMarkdown}
            </pre>
          </div>
        )}

        {/* Bottom Relay Instructions Card */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-950 to-indigo-950/40 p-3.5 sm:p-4 rounded-xl border border-indigo-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white block">Alur Kerja Estafet Tablet (Blueprint 14):</span>
              <p className="text-slate-400 text-[11px] mt-0.5">
                1. Salin Context Pack → 2. Tempel di peramban AI (Claude/Gemini) → 3. Eksekusi kode di Termux → 4. Verifikasi (<code className="text-cyan-300">npm run build</code>) → 5. Commit &amp; serahkan tablet ke anggota berikutnya.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 self-end sm:self-center">
            {onNavigateTab && (
              <>
                <button
                  onClick={() => onNavigateTab('ai-handover')}
                  className="touch-target-44 min-h-[44px] px-3 py-1.5 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-200 text-xs font-mono flex items-center gap-1.5 transition active:scale-95"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Estafet &amp; Handover AI</span>
                </button>
                <button
                  onClick={() => setHubSubMode('prompt-studio')}
                  className="touch-target-44 min-h-[44px] px-3 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 text-xs font-mono flex items-center gap-1.5 transition active:scale-95"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Buka Studio Prompt</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
};
