import React, { useState, useMemo, useEffect } from 'react';
import { 
  Zap, 
  Compass, 
  ShieldCheck, 
  RefreshCw, 
  Copy, 
  Check, 
  Download, 
  ExternalLink, 
  FileText, 
  Sliders, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  Layers, 
  Terminal, 
  Cpu, 
  Users, 
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';
import { ParsedSessionState, ZLCETask, ParsedBacklogTask, TabType } from '../../types/zlce';
import { TeamMember } from '../../types/mobile';
import { TEAM_MEMBERS } from '../../data/teamMembers';
import { 
  TargetAIProvider, 
  TokenBudgetPreset, 
  getAIProviderLabel 
} from '../../utils/contextPackGenerator';
import { 
  PromptArchetype, 
  PROMPT_ARCHETYPES, 
  generateStructuredPrompt, 
  getModelStopToken,
  StructuredPromptOutput
} from '../../utils/promptGenerator';
import { MODEL_BUDGET_PROFILES, calculateTokenSafety } from '../../utils/tokenBudgetAdapter';
import { copyText } from '../../utils/clipboard';
import { downloadMarkdownBlob, generateSmartFilename } from '../../utils/fileExport';
import { parseTasksMarkdown } from '../../utils/markdownParser';

export interface PromptStudioProps {
  sessionState: ParsedSessionState;
  onNavigateTab?: (tab: TabType) => void;
  initialTaskId?: string;
  onSelectMember?: (memberId: string) => void;
}

export const PromptStudio: React.FC<PromptStudioProps> = ({
  sessionState,
  onNavigateTab,
  initialTaskId,
  onSelectMember
}) => {
  // 1. Archetype Selection
  const [selectedArchetype, setSelectedArchetype] = useState<PromptArchetype>('task-execution');

  // 2. Target AI & Token Preset
  const [targetAi, setTargetAi] = useState<TargetAIProvider>('claude');
  const [tokenBudgetPreset, setTokenBudgetPreset] = useState<TokenBudgetPreset>('claude-30k');

  // Sync token budget preset when provider changes (sensible defaults)
  const handleSelectProvider = (provider: TargetAIProvider) => {
    setTargetAi(provider);
    if (provider === 'gemini') setTokenBudgetPreset('gemini-1m');
    else if (provider === 'claude') setTokenBudgetPreset('claude-30k');
    else if (provider === 'chatgpt') setTokenBudgetPreset('gpt-128k');
    else if (provider === 'deepseek') setTokenBudgetPreset('deepseek-64k');
    else if (provider === 'copilot') setTokenBudgetPreset('copilot-32k');
    else if (provider === 'cursor') setTokenBudgetPreset('cursor-64k');
    else if (provider === 'qwen') setTokenBudgetPreset('compact-8k');
    else setTokenBudgetPreset('compact-8k');
  };

  // 3. Active Team Member (Driver)
  const [activeMemberId, setActiveMemberId] = useState<string>(() => {
    try {
      return localStorage.getItem('zlce_active_member_id') || 'member-01';
    } catch {
      return 'member-01';
    }
  });

  const activeMember: TeamMember = useMemo(() => {
    const found = TEAM_MEMBERS.find(m => m.id === activeMemberId);
    return found || TEAM_MEMBERS[0];
  }, [activeMemberId]);

  const handleMemberChange = (id: string) => {
    setActiveMemberId(id);
    try {
      localStorage.setItem('zlce_active_member_id', id);
    } catch {
      // fallback
    }
    if (onSelectMember) onSelectMember(id);
  };

  // 4. Tasks Catalog & Active Task
  const [tasksCatalog, setTasksCatalog] = useState<ParsedBacklogTask[]>([]);
  useEffect(() => {
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
      // silent
    }

    fetch('/TASKS.md')
      .then(r => r.ok ? r.text() : '')
      .then(text => {
        if (text) {
          const parsed = parseTasksMarkdown(text);
          if (parsed.tasks && parsed.tasks.length > 0) {
            setTasksCatalog(parsed.tasks);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Compute selected task ID
  const [selectedTaskId, setSelectedTaskId] = useState<string>(() => {
    if (initialTaskId) return initialTaskId;
    // Prefer current IN_PROGRESS, or next READY task
    const tasks = sessionState.tasks || [];
    const inProgress = tasks.find(t => t.status === 'IN_PROGRESS');
    if (inProgress) return inProgress.id;
    const ready = tasks.find(t => t.status === 'READY');
    if (ready) return ready.id;
    return tasks[0]?.id || 'TASK-015';
  });

  const selectedTask: ZLCETask = useMemo(() => {
    const tasks = sessionState.tasks || [];
    const found = tasks.find(t => t.id === selectedTaskId);
    if (found) return found;
    return {
      id: selectedTaskId,
      name: `Pelaksanaan ${selectedTaskId}`,
      dependencies: '-',
      status: 'READY',
      evidence: '-',
      approved: '-'
    };
  }, [sessionState.tasks, selectedTaskId]);

  const selectedTaskDetail: ParsedBacklogTask | undefined = useMemo(() => {
    return tasksCatalog.find(t => t.id === selectedTaskId);
  }, [tasksCatalog, selectedTaskId]);

  // 5. Custom directives & controls
  const [customDirectives, setCustomDirectives] = useState<string>('');
  const [includeContextPack, setIncludeContextPack] = useState<boolean>(true);
  const [showConfigDetails, setShowConfigDetails] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // 6. Generate Master Structured Prompt
  const structuredPromptOutput: StructuredPromptOutput = useMemo(() => {
    return generateStructuredPrompt({
      archetype: selectedArchetype,
      task: selectedTask,
      taskDetail: selectedTaskDetail,
      sessionState,
      activeMember,
      targetAi,
      tokenBudgetPreset,
      customDirectives,
      includeContextPack
    });
  }, [
    selectedArchetype,
    selectedTask,
    selectedTaskDetail,
    sessionState,
    activeMember,
    targetAi,
    tokenBudgetPreset,
    customDirectives,
    includeContextPack
  ]);

  // Copy handler with visual feedback
  const handleCopyPrompt = async () => {
    const success = await copyText(structuredPromptOutput.fullPrompt);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Download handler
  const handleDownloadPrompt = () => {
    const filename = `ZLCE_PROMPT_${selectedArchetype.toUpperCase()}_${selectedTask.id}.md`;
    downloadMarkdownBlob(structuredPromptOutput.fullPrompt, { filename });
  };

  // Web AI Browser links
  const aiWebLinks: Record<TargetAIProvider, { name: string; url: string; color: string }> = {
    claude: { name: 'Claude AI', url: 'https://claude.ai/new', color: 'hover:text-amber-400' },
    gemini: { name: 'Gemini', url: 'https://gemini.google.com/app', color: 'hover:text-cyan-400' },
    chatgpt: { name: 'ChatGPT', url: 'https://chatgpt.com/', color: 'hover:text-emerald-400' },
    deepseek: { name: 'DeepSeek', url: 'https://chat.deepseek.com/', color: 'hover:text-sky-400' },
    copilot: { name: 'GitHub Copilot', url: 'https://github.com/copilot', color: 'hover:text-teal-400' },
    cursor: { name: 'Cursor AI', url: 'https://cursor.com', color: 'hover:text-violet-400' },
    qwen: { name: 'Qwen Chat', url: 'https://chat.qwenlm.ai/', color: 'hover:text-violet-400' },
    generic: { name: 'Browser AI', url: 'https://claude.ai/new', color: 'hover:text-slate-300' }
  };

  const activeProfile = MODEL_BUDGET_PROFILES[tokenBudgetPreset];

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-16">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border border-indigo-500/30 rounded-2xl p-5 md:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-indigo-600/30 border border-indigo-400/40 rounded-xl text-indigo-400 shrink-0">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                  Prompt Studio Multi-Model Terstruktur
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
                  TASK-015
                </span>
                <span className="px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                  Schema-before-Data
                </span>
              </div>
              <p className="text-sm text-slate-300 mt-1">
                Sintesis prompt deterministik bebas halusinasi dengan penegakan kode utuh tanpa placeholder untuk Claude, Gemini, ChatGPT, dan DeepSeek.
              </p>
            </div>
          </div>

          {/* Quick Stats Badges */}
          <div className="flex items-center gap-2 flex-wrap self-stretch md:self-auto justify-end">
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl px-3.5 py-2 text-right">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block font-medium">Estimasi Token</span>
              <span className="text-base font-bold text-indigo-300">
                ~{structuredPromptOutput.estimatedTokens.toLocaleString()}
              </span>
            </div>
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl px-3.5 py-2 text-right">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block font-medium">Karakter</span>
              <span className="text-base font-bold text-cyan-300">
                {structuredPromptOutput.characterCount.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Archetype Selector Tabs (Touch Target >= 44px) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-2 shadow-lg">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {(Object.keys(PROMPT_ARCHETYPES) as PromptArchetype[]).map((key) => {
            const meta = PROMPT_ARCHETYPES[key];
            const isSelected = selectedArchetype === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedArchetype(key)}
                className={`min-h-[52px] p-3 rounded-xl flex items-center gap-3 transition-all text-left ${
                  isSelected 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-400/50' 
                    : 'bg-slate-950/60 text-slate-300 hover:bg-slate-800/80 border border-slate-800/80'
                }`}
              >
                <div className={`p-2 rounded-lg shrink-0 ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-800 text-indigo-400'}`}>
                  {key === 'task-execution' && <Zap className="w-4 h-4" />}
                  {key === 'landing' && <Compass className="w-4 h-4" />}
                  {key === 'review' && <ShieldCheck className="w-4 h-4" />}
                  {key === 'handover' && <RefreshCw className="w-4 h-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold text-xs md:text-sm truncate">{meta.shortLabel}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                      isSelected ? 'bg-indigo-700/60 text-indigo-100' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {meta.badge}
                    </span>
                  </div>
                  <p className={`text-[11px] truncate ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                    {meta.title.split('(')[0].trim()}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Configuration & Parameter Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column: Model & Quota Profile Selection */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col gap-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-bold text-white tracking-wide">Target AI & Kuota Token</h2>
            </div>
            <span className="text-xs text-indigo-400 font-mono">
              {activeProfile?.badgeLabel}
            </span>
          </div>

          {/* AI Providers (Touch Target >= 44px) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 block">Pilih AI Coding Assistant:</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'claude', name: 'Claude 3.5', color: 'border-amber-500/40 text-amber-300' },
                { id: 'gemini', name: 'Gemini 1.5/2.0', color: 'border-cyan-500/40 text-cyan-300' },
                { id: 'chatgpt', name: 'ChatGPT 4o', color: 'border-emerald-500/40 text-emerald-300' },
                { id: 'deepseek', name: 'DeepSeek V3/R1', color: 'border-sky-500/40 text-sky-300' },
                { id: 'copilot', name: 'Copilot', color: 'border-teal-500/40 text-teal-300' },
                { id: 'cursor', name: 'Cursor AI', color: 'border-violet-500/40 text-violet-300' },
                { id: 'qwen', name: 'Qwen 2.5', color: 'border-violet-500/40 text-violet-300' },
                { id: 'generic', name: 'Universal', color: 'border-slate-500/40 text-slate-300' }
              ].map(item => {
                const isSelected = targetAi === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectProvider(item.id as TargetAIProvider)}
                    className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all border ${
                      isSelected
                        ? 'bg-slate-800 text-white border-indigo-400 shadow-sm'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800/50'
                    }`}
                  >
                    <span>{item.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Token Preset Quick Select */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-400">Profil Anggaran Token (TASK-014):</label>
            </div>
            <select
              value={tokenBudgetPreset}
              onChange={(e) => setTokenBudgetPreset(e.target.value as TokenBudgetPreset)}
              className="w-full min-h-[44px] px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {(Object.keys(MODEL_BUDGET_PROFILES) as TokenBudgetPreset[]).map(key => {
                const prof = MODEL_BUDGET_PROFILES[key];
                return (
                  <option key={key} value={key}>
                    {prof.name} ({prof.badgeLabel}) - {prof.description.slice(0, 45)}...
                  </option>
                );
              })}
            </select>
          </div>

          {/* Stop Token Directive Display */}
          <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3 text-xs space-y-1 font-mono">
            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>Stop Token Terkonfigurasi:</span>
              <span className="text-emerald-400 font-bold">Auto-Injected</span>
            </div>
            <div className="text-indigo-300 font-mono text-[11px] truncate bg-slate-900/90 px-2 py-1 rounded border border-indigo-900/30">
              {structuredPromptOutput.stopToken}
            </div>
          </div>
        </div>

        {/* Center Column: Active Task & Member Assignment */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col gap-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-white tracking-wide">Mandat Task & Tablet Driver</h2>
            </div>
            <span className="text-xs text-cyan-400 font-mono">
              Branch: task/{selectedTask.id}
            </span>
          </div>

          {/* Active Task Selector (Touch Target >= 44px) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 block">Pilih Task Atomik:</label>
            <select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              {(sessionState.tasks || []).map((t) => (
                <option key={t.id} value={t.id}>
                  [{t.status}] {t.id} - {t.name.slice(0, 45)}
                </option>
              ))}
            </select>
          </div>

          {/* Active Tablet Driver (Team Member) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 block">Tablet Driver (8 Anggota Estafet):</label>
            <div className="flex items-center gap-2">
              <select
                value={activeMemberId}
                onChange={(e) => handleMemberChange(e.target.value)}
                className="flex-1 min-h-[44px] px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                {TEAM_MEMBERS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} - {m.role}
                  </option>
                ))}
              </select>
              <div className="p-2.5 bg-slate-800 rounded-xl border border-slate-700 shrink-0 text-cyan-300" title={activeMember.email}>
                <Users className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Invariant & Constraint Highlights */}
          <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Anti-Placeholder Rule: NO "// ... rest of code"</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-indigo-300">
              <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Ergonomi Tablet: Touch Target &gt;= 44px Mandated</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-amber-300">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Waktu Anti-Ekstrapolasi: "jam: ?" Preservation</span>
            </div>
          </div>
        </div>

        {/* Right Column: Custom Directives & Context Pack Toggle */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between gap-4 shadow-sm">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-bold text-white tracking-wide">Kustomisasi Direktif</h2>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={includeContextPack}
                  onChange={(e) => setIncludeContextPack(e.target.checked)}
                  className="rounded text-indigo-500 focus:ring-indigo-400 h-4 w-4"
                />
                <span>Sertakan Context Pack</span>
              </label>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 block">
                Instruksi Khusus / Edge Case Tambahan:
              </label>
              <textarea
                value={customDirectives}
                onChange={(e) => setCustomDirectives(e.target.value)}
                placeholder="Contoh: Fokus pada kompatibilitas touch event Android, hindari layout shift saat keyboard virtual muncul..."
                rows={3}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Direct Launch to AI in Browser */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2">
            <span className="text-[11px] text-slate-400 font-semibold block">
              Buka AI di Tab Browser Tablet:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <a
                href="https://claude.ai/new"
                target="_blank"
                rel="noreferrer"
                className="min-h-[40px] px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-800 hover:border-amber-500/50 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
              >
                <span>Claude AI</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="https://gemini.google.com/app"
                target="_blank"
                rel="noreferrer"
                className="min-h-[40px] px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-800 hover:border-cyan-500/50 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
              >
                <span>Gemini</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="https://chatgpt.com/"
                target="_blank"
                rel="noreferrer"
                className="min-h-[40px] px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-slate-800 hover:border-emerald-500/50 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
              >
                <span>ChatGPT</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="https://chat.deepseek.com/"
                target="_blank"
                rel="noreferrer"
                className="min-h-[40px] px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-sky-300 border border-slate-800 hover:border-sky-500/50 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
              >
                <span>DeepSeek</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="https://github.com/copilot"
                target="_blank"
                rel="noreferrer"
                className="min-h-[40px] px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-teal-300 border border-slate-800 hover:border-teal-500/50 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
              >
                <span>Copilot</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="https://cursor.com"
                target="_blank"
                rel="noreferrer"
                className="min-h-[40px] px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-violet-300 border border-slate-800 hover:border-violet-500/50 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
              >
                <span>Cursor AI</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Action Bar (1-Tap Copy & Download, Touch Target >= 44px) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Main Action: Salin Prompt Lengkap */}
          <button
            type="button"
            onClick={handleCopyPrompt}
            className={`min-h-[48px] px-6 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all w-full sm:w-auto shadow-md ${
              copied
                ? 'bg-emerald-600 text-white shadow-emerald-600/30 ring-2 ring-emerald-400'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-5 h-5 text-white" />
                <span>Tersalin ke Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-5 h-5 text-indigo-200" />
                <span>Salin Prompt Lengkap (1-Tap)</span>
              </>
            )}
          </button>

          {/* Secondary Action: Unduh Prompt File */}
          <button
            type="button"
            onClick={handleDownloadPrompt}
            className="min-h-[48px] px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all w-full sm:w-auto"
            title="Unduh berkas prompt Markdown untuk arsip atau transfer offline"
          >
            <Download className="w-4 h-4 text-slate-400" />
            <span>Unduh (.md)</span>
          </button>
        </div>

        {/* Quota Status Indicator */}
        <div className="flex items-center gap-2 text-xs text-slate-400 w-full sm:w-auto justify-end">
          <span className="font-mono text-slate-300">
            {structuredPromptOutput.archetypeMeta.title.split('(')[0].trim()}
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-indigo-400 font-semibold">{structuredPromptOutput.targetAiLabel.split('(')[0].trim()}</span>
          <span className="text-slate-600">•</span>
          <span className={`px-2 py-0.5 rounded text-[11px] font-mono ${
            structuredPromptOutput.safety.status === 'safe'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : structuredPromptOutput.safety.status === 'warning'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
          }`}>
            {structuredPromptOutput.safety.percentage}% Kuota
          </span>
        </div>
      </div>

      {/* 5. Live Prompt Preview Area (Monospace, Clean Contrast) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold text-slate-300 tracking-wide font-mono">
              PREVIEW MASTER PROMPT ({structuredPromptOutput.characterCount.toLocaleString()} bytes)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
              Stop Token: <span className="text-emerald-400">{structuredPromptOutput.stopToken}</span>
            </span>
            <button
              type="button"
              onClick={handleCopyPrompt}
              className="text-xs font-semibold px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-lg flex items-center gap-1 border border-slate-700"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Tersalin' : 'Salin'}</span>
            </button>
          </div>
        </div>

        {/* Monospace Prompt Content */}
        <div className="p-4 bg-slate-950/90 text-slate-200 font-mono text-xs overflow-x-auto max-h-[560px] leading-relaxed selection:bg-indigo-500 selection:text-white">
          <pre className="whitespace-pre-wrap break-words">{structuredPromptOutput.fullPrompt}</pre>
        </div>

        {/* Preview Footer */}
        <div className="bg-slate-950 px-4 py-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>Format memenuhi aturan Schema-before-Data dan larangan kode placeholder (TASK-015).</span>
          </div>
          <span className="font-mono text-slate-500">ZLCE v4.0.0</span>
        </div>
      </div>
    </div>
  );
};
