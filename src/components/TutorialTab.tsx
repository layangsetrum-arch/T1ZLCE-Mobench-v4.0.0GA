import React, { useState, useMemo } from 'react';
import { 
  GraduationCap, 
  BookOpen, 
  FolderGit2, 
  FileCode2, 
  CheckCircle2, 
  Copy, 
  Check, 
  GitBranch, 
  ArrowRight, 
  ArrowRightLeft, 
  AlertTriangle, 
  Terminal, 
  Layers, 
  RefreshCw, 
  Play, 
  Sparkles, 
  ShieldCheck, 
  FileText, 
  GitCommit,
  Workflow,
  Search,
  ExternalLink,
  ChevronRight,
  Lightbulb,
  Cpu,
  Code2,
  Download,
  Flame,
  Shield,
  HelpCircle,
  Clock,
  Zap,
  Sliders,
  Server,
  Smartphone,
  CheckSquare,
  Square
} from 'lucide-react';
import { copyText } from '../utils/clipboard';
import { CANONICAL_USAGE_GUIDE_MD, CURRENT_PROJECT_TASKS_MD } from '../data/templates';
import { parseTasksMarkdown } from '../utils/markdownParser';

import { ParsedSessionState, TabType, ZLCETask, ParsedBacklogTask } from '../types/zlce';
import { TargetAIProvider } from '../utils/contextPackGenerator';
import { TEAM_MEMBERS } from '../data/teamMembers';
import { generateRelayHandover } from '../utils/relayHandoverGenerator';
import { downloadMarkdownBlob, generateAndDownloadZipBundle } from '../utils/fileExport';
import { parseSessionStateMarkdown } from '../utils/markdownParser';
import { INITIAL_SESSION_STATE_MD } from '../data/templates';

type ViewMode = 'canonical-usage' | 'production-operations' | 'interactive-scenarios' | 'prompt-catalog' | 'ai-handover-claude-gpt';
type ScenarioType = 'new-project' | 'existing-project' | 'in-progress';

export interface TutorialTabProps {
  sessionState?: ParsedSessionState;
  onNavigateTab?: (tab: TabType) => void;
  initialTaskId?: string;
}

export const TutorialTab: React.FC<TutorialTabProps> = ({
  sessionState: propSessionState,
  onNavigateTab,
  initialTaskId
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('production-operations');
  const [activeScenario, setActiveScenario] = useState<ScenarioType>('new-project');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fallback to parsed initial session state if not passed
  const sessionState = useMemo<ParsedSessionState>(() => {
    if (propSessionState) return propSessionState;
    return parseSessionStateMarkdown(INITIAL_SESSION_STATE_MD);
  }, [propSessionState]);

  // Relay Generator Interactive State (TASK BERAPAPUN)
  const defaultTask = useMemo(() => {
    if (initialTaskId) return initialTaskId;
    if (sessionState.status.nextTask && sessionState.status.nextTask.startsWith('TASK-')) {
      return sessionState.status.nextTask;
    }
    const readyTask = sessionState.tasks.find(t => t.status === 'READY');
    if (readyTask) return readyTask.id;
    return 'TASK-017';
  }, [initialTaskId, sessionState]);

  const [selectedTaskId, setSelectedTaskId] = useState<string>(defaultTask);
  const [selectedAiProvider, setSelectedAiProvider] = useState<TargetAIProvider>('claude');
  const [selectedDriverId, setSelectedDriverId] = useState<string>(() => {
    try {
      return localStorage.getItem('zlce_active_member_id') || 'member-01';
    } catch {
      return 'member-01';
    }
  });
  const [handoverMode, setHandoverMode] = useState<'direct-execution' | 'cidi-handover'>('direct-execution');
  const [phaseFilter, setPhaseFilter] = useState<string>('ALL');
  const [taskSearch, setTaskSearch] = useState<string>('');

  // Active driver member object
  const activeDriver = useMemo(() => {
    return TEAM_MEMBERS.find(m => m.id === selectedDriverId) || TEAM_MEMBERS[0];
  }, [selectedDriverId]);

  // Backlog task detail map
  const taskDetailMap = useMemo(() => {
    const parsed = parseTasksMarkdown(CURRENT_PROJECT_TASKS_MD);
    const map = new Map<string, ParsedBacklogTask>();
    parsed.tasks.forEach(t => map.set(t.id, t));
    return map;
  }, []);

  // Compute live relay handover prompt for the selected task
  const relayOutput = useMemo(() => {
    return generateRelayHandover({
      taskId: selectedTaskId,
      aiProvider: selectedAiProvider,
      activeMember: activeDriver,
      sessionState,
      handoverMode,
      taskDetailMap
    });
  }, [selectedTaskId, selectedAiProvider, activeDriver, sessionState, handoverMode, taskDetailMap]);

  // Filtered task list for the task selector
  const filteredTasks = useMemo(() => {
    return sessionState.tasks.filter(t => {
      const detail = taskDetailMap.get(t.id);
      const matchesPhase = phaseFilter === 'ALL' || detail?.phase === phaseFilter;
      const matchesSearch = !taskSearch.trim() || 
        t.id.toLowerCase().includes(taskSearch.toLowerCase()) || 
        t.name.toLowerCase().includes(taskSearch.toLowerCase()) ||
        (detail?.title && detail.title.toLowerCase().includes(taskSearch.toLowerCase()));
      return matchesPhase && matchesSearch;
    });
  }, [sessionState.tasks, taskDetailMap, phaseFilter, taskSearch]);

  const copyToClipboard = async (text: string, id: string) => {
    const success = await copyText(text);
    if (success) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  const handleDownloadUsageMd = () => {
    const element = document.createElement('a');
    const file = new Blob([CANONICAL_USAGE_GUIDE_MD], { type: 'text/markdown;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = 'USAGE.md';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(element.href);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-emerald-400">
                <BookOpen className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Dokumentasi &amp; Panduan Pemakaian Lengkap ZLCE
              </h2>
            </div>
            <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
              Panduan kanonik metodologi <strong>Zero-Loss Context Engineering (ZLCE v3.2.2)</strong>: matriks situasi, 3 jalur alur kerja, protokol pemulihan darurat Kasus A–D, triase revisi R1–R7, dan aturan commit atomik.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => copyToClipboard(CANONICAL_USAGE_GUIDE_MD, 'full-usage-md')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-800/60 text-cyan-300 transition"
              title="Salin berkas USAGE.md kanonik ke clipboard"
            >
              {copiedId === 'full-usage-md' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedId === 'full-usage-md' ? 'Tersalin' : 'Salin USAGE.md'}</span>
            </button>

            <button
              onClick={handleDownloadUsageMd}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition"
              title="Unduh berkas USAGE.md"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Unduh .md</span>
            </button>
          </div>
        </div>

        {/* Top-Level Mode Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-6 pt-6 border-t border-slate-700/60">
          <button
            onClick={() => setViewMode('production-operations')}
            className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all min-h-[44px] ${
              viewMode === 'production-operations'
                ? 'bg-emerald-950/60 border-emerald-500/90 text-white shadow-lg shadow-emerald-900/30 ring-1 ring-emerald-500/40'
                : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <div className={`p-2 rounded-lg ${viewMode === 'production-operations' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
              <Server className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Produksi Nyata</span>
                <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-[9px] font-bold text-emerald-300 border border-emerald-500/30">GA LIVE</span>
              </div>
              <div className="text-sm font-bold text-slate-100">Operasi Tablet</div>
              <div className="text-xs text-slate-400">Termux &bull; SOP 8 Langkah</div>
            </div>
          </button>

          <button
            onClick={() => setViewMode('canonical-usage')}
            className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all min-h-[44px] ${
              viewMode === 'canonical-usage'
                ? 'bg-cyan-950/50 border-cyan-500/80 text-white shadow-lg shadow-cyan-900/20 ring-1 ring-cyan-500/30'
                : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <div className={`p-2 rounded-lg ${viewMode === 'canonical-usage' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-400'}`}>
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Panduan Lengkap</div>
              <div className="text-sm font-bold text-slate-100">USAGE.md Kanonik</div>
              <div className="text-xs text-slate-400">6 Bagian Utama ZLCE</div>
            </div>
          </button>

          <button
            onClick={() => setViewMode('interactive-scenarios')}
            className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all min-h-[44px] ${
              viewMode === 'interactive-scenarios'
                ? 'bg-blue-950/50 border-blue-500/80 text-white shadow-lg shadow-blue-900/20 ring-1 ring-blue-500/30'
                : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <div className={`p-2 rounded-lg ${viewMode === 'interactive-scenarios' ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-800 text-slate-400'}`}>
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-blue-400">Tutorial Interaktif</div>
              <div className="text-sm font-bold text-slate-100">3 Skenario Siklus</div>
              <div className="text-xs text-slate-400">Mulai Baru &bull; Takeover</div>
            </div>
          </button>

          <button
            onClick={() => setViewMode('prompt-catalog')}
            className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all min-h-[44px] ${
              viewMode === 'prompt-catalog'
                ? 'bg-indigo-950/50 border-indigo-500/80 text-white shadow-lg shadow-indigo-900/20 ring-1 ring-indigo-500/30'
                : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <div className={`p-2 rounded-lg ${viewMode === 'prompt-catalog' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-800 text-slate-400'}`}>
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Katalog Prompt</div>
              <div className="text-sm font-bold text-slate-100">Prompt Siap Salin</div>
              <div className="text-xs text-slate-400">Landing, Handover, CLI</div>
            </div>
          </button>

          <button
            onClick={() => setViewMode('ai-handover-claude-gpt')}
            className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all min-h-[44px] ${
              viewMode === 'ai-handover-claude-gpt'
                ? 'bg-amber-950/50 border-amber-500/80 text-white shadow-lg shadow-amber-900/20 ring-1 ring-amber-500/30'
                : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <div className={`p-2 rounded-lg ${viewMode === 'ai-handover-claude-gpt' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400'}`}>
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">Estafet Multi-AI</span>
                <span className="px-1.5 py-0.2 rounded bg-amber-900/60 text-[9px] font-mono text-amber-200">Universal</span>
              </div>
              <div className="text-sm font-bold text-slate-100">Generator Mandat</div>
              <div className="text-xs text-slate-400">Claude, GPT, Gemini</div>
            </div>
          </button>
        </div>
      </div>

      {/* VIEW 0: PRODUCTION OPERATIONS (PWA + TERMUX + SOP 8 LANGKAH) */}
      {viewMode === 'production-operations' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Quickstart 1-Tap Banner */}
          <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border border-emerald-500/40 rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-emerald-400" /> PRODUKSI GA AKTIF
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                    Samsung Galaxy Tab A7 Lite (SM-T225)
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-800">
                    RAM 3GB &bull; 8 Anggota &bull; 82 Task DONE
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  Operasional Produksi Nyata di Tablet Bersama
                </h3>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  Menjalankan ZLCE Mobile Workbench v4.0.0 GA dalam mode mandiri (*offline-ready*) di Termux dan peramban tablet Chrome/Samsung Internet dengan kepatuhan 5 invarian Zero-Loss Context Engineering.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <a
                  href="https://github.com/layangsetrum-arch/T1ZLCE-Mobench-v4.0.0GA"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition-all min-h-[44px]"
                  title="Buka repositori resmi di GitHub"
                >
                  <FolderGit2 className="w-4 h-4 text-cyan-400" />
                  <span>GitHub Repo</span>
                </a>
                <a
                  href="/assets/zlce-audit-review-bundle.zip"
                  download="zlce-audit-review-bundle.zip"
                  className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 transition-all min-h-[44px]"
                  title="Unduh seluruh bundel rilis deterministik (162 berkas)"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh Bundel Rilis ZIP</span>
                </a>
                <button
                  onClick={() => onNavigateTab && onNavigateTab('session')}
                  className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all min-h-[44px]"
                >
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span>Matriks 82 Task</span>
                </button>
              </div>
            </div>

            {/* GitHub Clone Box */}
            <div className="mt-5 p-4 rounded-xl bg-slate-950/90 border border-cyan-500/30 font-mono text-xs">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                  <GitBranch className="w-4 h-4 text-cyan-400" />
                  Clone Repositori GitHub Resmi di Termux / Linux:
                </span>
                <button
                  onClick={() => copyToClipboard('git clone https://github.com/layangsetrum-arch/T1ZLCE-Mobench-v4.0.0GA.git && cd T1ZLCE-Mobench-v4.0.0GA', 'clone-repo-cmd')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[11px] transition-all min-h-[44px]"
                >
                  {copiedId === 'clone-repo-cmd' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId === 'clone-repo-cmd' ? 'Tersalin!' : 'Salin Perintah Clone'}</span>
                </button>
              </div>
              <div className="p-3 rounded-lg bg-black/60 text-cyan-300 overflow-x-auto select-all">
                git clone https://github.com/layangsetrum-arch/T1ZLCE-Mobench-v4.0.0GA.git &amp;&amp; cd T1ZLCE-Mobench-v4.0.0GA
              </div>
              <div className="flex items-center justify-between mt-2 text-[11px] text-slate-400">
                <span>Repositori: <strong className="text-white">layangsetrum-arch/T1ZLCE-Mobench-v4.0.0GA</strong></span>
                <a 
                  href="https://github.com/layangsetrum-arch/T1ZLCE-Mobench-v4.0.0GA" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:underline flex items-center gap-1"
                >
                  <span>Buka di GitHub</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Single Command Starter Box */}
            <div className="mt-3 p-4 rounded-xl bg-slate-950/90 border border-emerald-500/30 font-mono text-xs">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  Perintah Peluncuran Produksi Satu-Ketukan di Termux:
                </span>
                <button
                  onClick={() => copyToClipboard('cd ~/projects/T1ZLCE-Mobench-v4.0.0GA && bash scripts/zlce-prod-start.sh', 'prod-start-cmd')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] transition-all min-h-[44px]"
                >
                  {copiedId === 'prod-start-cmd' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId === 'prod-start-cmd' ? 'Tersalin!' : 'Salin Perintah'}</span>
                </button>
              </div>
              <div className="p-3 rounded-lg bg-black/60 text-emerald-300 overflow-x-auto select-all">
                cd ~/projects/T1ZLCE-Mobench-v4.0.0GA &amp;&amp; bash scripts/zlce-prod-start.sh
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Otomatis: normalisasi izin berkas POSIX, validasi 82 task `zlce-check`, kompilasi build `dist/`, dan peluncuran web server lokal di <code className="text-cyan-300">http://localhost:3000</code>.
              </p>
            </div>
          </div>

          {/* Grid Panduan Praktis Produksi */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Kartu 1: Panduan Instalasi PWA Standalone di Tablet */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Instalasi PWA Standalone di Tablet</h4>
                  <p className="text-xs text-slate-400">Pengalaman layar penuh tanpa bilah URL peramban</p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0 text-xs">1</span>
                  <div>
                    <strong className="text-slate-200 block">Jalankan Server di Termux</strong>
                    <span className="text-slate-400">Jalankan <code className="text-cyan-300 font-mono">bash scripts/zlce-prod-start.sh</code> di jendela Termux.</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0 text-xs">2</span>
                  <div>
                    <strong className="text-slate-200 block">Buka Google Chrome di Tablet</strong>
                    <span className="text-slate-400">Akses alamat <code className="text-cyan-300 font-mono">http://localhost:3000</code>. Tunggu badge offline hijau muncul.</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0 text-xs">3</span>
                  <div>
                    <strong className="text-slate-200 block">Pilih "Tambahkan ke Layar Utama" (Install)</strong>
                    <span className="text-slate-400">Ketuk menu tiga titik (⋮) di pojok kanan atas Chrome &rarr; pilih <strong>"Instal aplikasi"</strong> atau <strong>"Add to Home screen"</strong>.</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0 text-xs">4</span>
                  <div>
                    <strong className="text-slate-200 block">Gunakan Sebagai Aplikasi Native</strong>
                    <span className="text-slate-400">Buka ikon <strong>ZLCE Studio</strong> dari layar utama. Aplikasi akan berjalan di viewport layar penuh 8.7" ergonomis.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Kartu 2: SOP 8 Langkah Estafet Pengemudi Tablet */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Workflow className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">SOP 8 Langkah Estafet Harian</h4>
                  <p className="text-xs text-slate-400">Siklus wajib bagi 8 anggota pemegang tablet</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-amber-400 font-bold block mb-0.5">Langkah 1: Terima Tablet</span>
                  <span className="text-slate-400 text-[11px]">Buka ZLCE Studio &amp; periksa integritas status header.</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-amber-400 font-bold block mb-0.5">Langkah 2: Pilih Driver</span>
                  <span className="text-slate-400 text-[11px]">Alihkan profil pengemudi aktif di Header UI.</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-amber-400 font-bold block mb-0.5">Langkah 3: Klaim 1 Task</span>
                  <span className="text-slate-400 text-[11px]">Ubah status task READY &rarr; IN_PROGRESS (Atomic Guard).</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-amber-400 font-bold block mb-0.5">Langkah 4: Context Pack</span>
                  <span className="text-slate-400 text-[11px]">Salin prompt terstruktur multi-model C-I-D-I.</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-amber-400 font-bold block mb-0.5">Langkah 5: Eksekusi Kode</span>
                  <span className="text-slate-400 text-[11px]">Kerjakan di cabang `task/TASK-xxx` dengan `-c user.name`.</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-amber-400 font-bold block mb-0.5">Langkah 6: Sahkan Gerbang</span>
                  <span className="text-slate-400 text-[11px]">Verifikasi bukti nyata &amp; catat `ya (oleh: Nama)`.</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-amber-400 font-bold block mb-0.5">Langkah 7: Clean-Auth</span>
                  <span className="text-slate-400 text-[11px]">Jalankan `clean-auth.sh` &amp; tutup sesi AI peramban.</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-amber-400 font-bold block mb-0.5">Langkah 8: Serah Terima</span>
                  <span className="text-slate-400 text-[11px]">Catat di Bagian 6 SESSION_STATE &amp; serahkan tablet.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Perintah Operasional Termux Cepat (Quick Copy Hub) */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-cyan-400" />
                <h4 className="text-sm font-bold text-white">Contekan Perintah Termux Operasional Lapangan</h4>
              </div>
              <span className="text-xs text-slate-400 font-mono">1-Ketukan Salin</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
                <div className="truncate">
                  <span className="text-slate-400 block text-[11px]">Validasi Integritas State:</span>
                  <code className="text-cyan-300">python3 scripts/zlce-check.py .</code>
                </div>
                <button
                  onClick={() => copyToClipboard('python3 scripts/zlce-check.py .', 'cmd-check')}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  title="Salin perintah"
                >
                  {copiedId === 'cmd-check' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
                <div className="truncate">
                  <span className="text-slate-400 block text-[11px]">Sanitasi Kredensial RAM (Clean-Auth):</span>
                  <code className="text-amber-300">bash scripts/zlce/clean-auth.sh</code>
                </div>
                <button
                  onClick={() => copyToClipboard('bash scripts/zlce/clean-auth.sh', 'cmd-clean')}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  title="Salin perintah"
                >
                  {copiedId === 'cmd-clean' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
                <div className="truncate">
                  <span className="text-slate-400 block text-[11px]">Snapshot Cadangan Sebelum Serah Terima:</span>
                  <code className="text-indigo-300">bash scripts/zlce-snapshot.sh . --diff</code>
                </div>
                <button
                  onClick={() => copyToClipboard('bash scripts/zlce-snapshot.sh . --diff', 'cmd-snap')}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  title="Salin perintah"
                >
                  {copiedId === 'cmd-snap' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
                <div className="truncate">
                  <span className="text-slate-400 block text-[11px]">Eksekusi Rangkaian Uji Lengkap (47 Checks):</span>
                  <code className="text-emerald-300">python3 scripts/run-tests.py</code>
                </div>
                <button
                  onClick={() => copyToClipboard('python3 scripts/run-tests.py', 'cmd-tests')}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  title="Salin perintah"
                >
                  {copiedId === 'cmd-tests' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Matriks 8 Driver Tablet & Identitas Commit Zero-Secret */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h4 className="text-sm font-bold text-white">Identitas Driver Tablet Resmi (Zero-Secret Per-Commit Flags)</h4>
              </div>
              <span className="text-xs text-slate-400">8 Profil Terdaftar</span>
            </div>

            <p className="text-xs text-slate-400">
              Setiap kali melakukan commit di Termux, gunakan identitas pengemudi aktif tanpa menyimpan akun global atau token GitHub di disk:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {TEAM_MEMBERS.map(member => (
                <div key={member.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">{member.name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">@{member.id}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">{member.email}</div>
                  <button
                    onClick={() => copyToClipboard(`git -c user.name="${member.name}" -c user.email="${member.email}" commit -m "wip: update"`, `git-id-${member.id}`)}
                    className="w-full py-2 px-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-cyan-300 font-mono text-[10px] flex items-center justify-center gap-1.5 transition min-h-[44px]"
                  >
                    {copiedId === `git-id-${member.id}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedId === `git-id-${member.id}` ? 'Tersalin!' : 'Salin Flag Commit'}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 1: CANONICAL USAGE GUIDE (USAGE.MD) */}
      {viewMode === 'canonical-usage' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Quick Table of Contents Strip */}
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              Daftar Isi Dokumen Panduan USAGE.md:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs font-medium">
              <a href="#sec-matriks" className="p-2 rounded bg-slate-950/60 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 flex items-center justify-between border border-slate-800/60 transition">
                <span>1. Matriks Situasi Kerja</span>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </a>
              <a href="#sec-jalur" className="p-2 rounded bg-slate-950/60 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 flex items-center justify-between border border-slate-800/60 transition">
                <span>2. Tiga Jalur Alur Kerja</span>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </a>
              <a href="#sec-recovery" className="p-2 rounded bg-slate-950/60 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 flex items-center justify-between border border-slate-800/60 transition">
                <span>3. Protokol Pemulihan Kasus A–D</span>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </a>
              <a href="#sec-triase" className="p-2 rounded bg-slate-950/60 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 flex items-center justify-between border border-slate-800/60 transition">
                <span>4. Aturan Triase Revisi (R1–R7)</span>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </a>
              <a href="#sec-checkpoint" className="p-2 rounded bg-slate-950/60 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 flex items-center justify-between border border-slate-800/60 transition">
                <span>5. Format Checkpoint &amp; Aturan X1</span>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </a>
              <a href="#sec-keamanan" className="p-2 rounded bg-slate-950/60 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 flex items-center justify-between border border-slate-800/60 transition">
                <span>6. Host Dev 0.0.0.0 vs 127.0.0.1</span>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </a>
            </div>
          </div>

          {/* Section 1: Matriks Situasi Kerja */}
          <div id="sec-matriks" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 scroll-mt-20">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center font-mono">
                  1
                </span>
                <h3 className="text-base font-bold text-white">Matriks Situasi Kerja &amp; Tindakan ZLCE</h3>
              </div>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                Tindakan Cepat
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Tentukan situasi proyek Anda saat ini untuk mengetahui tindakan dan berkas yang harus dilampirkan:
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse font-sans">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/80">
                    <th className="py-2.5 px-3 font-semibold">Situasi Kerja</th>
                    <th className="py-2.5 px-3 font-semibold">Tindakan &amp; Berkas yang Digunakan</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  <tr className="hover:bg-slate-800/30">
                    <td className="py-3 px-3 font-bold text-cyan-300">
                      Memulai Proyek Baru (Greenfield)
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      Gunakan <code className="text-cyan-400 font-mono">LANDING_PROMPT.md</code> (Aksi: <code className="text-amber-400 font-mono">BARU</code>). Lampirkan template kontrol atau <code className="text-cyan-400 font-mono">ZLCE_KIT_SINGLE.md</code>.
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => copyToClipboard(NEW_PROJECT_LANDING_PROMPT, 'mat-1')}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-[11px] transition"
                      >
                        {copiedId === 'mat-1' ? 'Tersalin' : 'Salin Prompt'}
                      </button>
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-800/30">
                    <td className="py-3 px-3 font-bold text-emerald-300">
                      Melanjutkan Sesi / Pindah AI / Selesai Normal
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      Gunakan <code className="text-cyan-400 font-mono">HANDOVER_PROMPT.md</code> + lampirkan trio wajib: <code className="text-slate-200 font-mono">SESSION_STATE.md</code>, <code className="text-slate-200 font-mono">TASKS.md</code>, <code className="text-slate-200 font-mono">AI_WORKFLOW.md</code>.
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => copyToClipboard(TAKEOVER_PROMPT, 'mat-2')}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-[11px] transition"
                      >
                        {copiedId === 'mat-2' ? 'Tersalin' : 'Salin Prompt'}
                      </button>
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-800/30">
                    <td className="py-3 px-3 font-bold text-amber-300">
                      Merapikan Proyek Lama (Existing Codebase)
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      Gunakan <code className="text-cyan-400 font-mono">LANDING_PROMPT.md</code> (Aksi: <code className="text-amber-400 font-mono">RESTRUKTURISASI</code>). AI <strong>dilarang mengubah kode</strong> sebelum audit selesai dan matriks task disetujui.
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => copyToClipboard(EXISTING_PROJECT_AUDIT_PROMPT, 'mat-3')}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-[11px] transition"
                      >
                        {copiedId === 'mat-3' ? 'Tersalin' : 'Salin Prompt'}
                      </button>
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-800/30">
                    <td className="py-3 px-3 font-bold text-purple-300">
                      Validasi Integritas Format State
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      Jalankan <code className="text-cyan-400 font-mono">python3 scripts/zlce/zlce-check.py .</code> di terminal Termux, atau gunakan tab <strong>SESSION_STATE</strong> di ZLCE Studio.
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => copyToClipboard('python3 scripts/zlce/zlce-check.py .', 'mat-4')}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-[11px] transition"
                      >
                        {copiedId === 'mat-4' ? 'Tersalin' : 'Salin CLI'}
                      </button>
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-800/30">
                    <td className="py-3 px-3 font-bold text-rose-300">
                      Sesi Terputus Tiba-Tiba (Crash / Token Limit)
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      Jalankan <code className="text-cyan-400 font-mono">bash scripts/zlce/zlce-snapshot.sh --diff</code> atau buka tab <strong>Pemulihan Sesi (Kasus A-D)</strong> di ZLCE Studio.
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => copyToClipboard('bash scripts/zlce/zlce-snapshot.sh --diff', 'mat-5')}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-[11px] transition"
                      >
                        {copiedId === 'mat-5' ? 'Tersalin' : 'Salin CLI'}
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Tiga Jalur Alur Kerja */}
          <div id="sec-jalur" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5 scroll-mt-20">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 font-bold text-xs flex items-center justify-center font-mono">
                  2
                </span>
                <h3 className="text-base font-bold text-white">Tiga Jalur Alur Kerja Operasional ZLCE</h3>
              </div>
              <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                Core Workflows
              </span>
            </div>

            {/* Jalur 1: Proyek Baru */}
            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-cyan-400">
                <Sparkles className="w-4 h-4" />
                <span>Jalur 1: Proyek Baru (Mulai dari Nol / Greenfield)</span>
              </div>
              <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
                <div>
                  <strong className="text-white">1. Inisiasi via Landing Prompt:</strong>
                  <ul className="list-disc pl-5 mt-1 space-y-1 text-slate-400">
                    <li>Tentukan mode: <code className="text-slate-200">LITE</code> (4 berkas kontrol: BLUEPRINT, TASKS, SESSION_STATE, HANDOVER) atau <code className="text-slate-200">FULL</code> (10 dokumen lengkap).</li>
                    <li>Isi parameter di <code className="text-slate-200">LANDING_PROMPT.md</code> (Nama Proyek, Aksi BARU, Tech Stack, Kebutuhan Inti).</li>
                    <li>Lampirkan <code className="text-slate-200">templates/</code> (atau <code className="text-slate-200">ZLCE_KIT_SINGLE.md</code>), lalu kirim prompt.</li>
                  </ul>
                </div>

                <div>
                  <strong className="text-white">2. Gerbang Kualitas Bertahap (Quality Gates):</strong>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 mt-1 font-mono text-[11px]">
                    <div className="bg-slate-900 p-2 rounded border border-slate-800">
                      <span className="text-cyan-400 font-bold block">Gerbang 1:</span>
                      <span className="text-slate-300">BLUEPRINT.md disusun, AI BERHENTI meminta persetujuan.</span>
                    </div>
                    <div className="bg-slate-900 p-2 rounded border border-slate-800">
                      <span className="text-cyan-400 font-bold block">Gerbang 2 (Mode FULL):</span>
                      <span className="text-slate-300">ARCHITECTURE.md &amp; DATA_MODEL.md disusun, AI BERHENTI.</span>
                    </div>
                    <div className="bg-slate-900 p-2 rounded border border-slate-800">
                      <span className="text-cyan-400 font-bold block">Gerbang 3:</span>
                      <span className="text-slate-300">TASKS.md (tugas atomik) &amp; TESTING.md disusun.</span>
                    </div>
                    <div className="bg-slate-900 p-2 rounded border border-slate-800">
                      <span className="text-emerald-400 font-bold block">Gerbang 4:</span>
                      <span className="text-slate-300">SESSION_STATE.md diinisiasi; eksekusi task 1 per 1 dimulai.</span>
                    </div>
                  </div>
                </div>

                <div>
                  <strong className="text-white">3. Eksekusi Atomik &amp; Transaksional:</strong>
                  <p className="text-slate-400 mt-0.5">
                    Tepat <strong>1 task</strong> berstatus <code className="text-cyan-300">IN_PROGRESS</code> pada satu waktu. Status dicatat di tabel matriks task dan blok WAL sebelum modifikasi kode dilakukan. Status <code className="text-emerald-300">DONE</code> hanya sah bila disertai bukti verifikasi riil.
                  </p>
                </div>
              </div>
            </div>

            {/* Jalur 2: Lanjut Sesi */}
            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-400">
                <Play className="w-4 h-4" />
                <span>Jalur 2: Lanjut Sesi / Pindah AI / Sesi Terputus</span>
              </div>
              <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
                <div>
                  <strong className="text-white">1. Siapkan Dokumen Serah Terima:</strong>
                  <p className="text-slate-400 mt-0.5">
                    Siapkan trio berkas kontrol wajib: <code className="text-slate-200">SESSION_STATE.md</code>, <code className="text-slate-200">TASKS.md</code>, dan <code className="text-slate-200">AI_WORKFLOW.md</code>. Jika sesi terputus di tengah jalan, jalankan <code className="text-cyan-300 font-mono">bash scripts/zlce/zlce-snapshot.sh --diff</code>.
                  </p>
                </div>
                <div>
                  <strong className="text-white">2. Panggil AI Baru dengan Handover:</strong>
                  <p className="text-slate-400 mt-0.5">
                    Tempelkan isi <code className="text-slate-200 font-mono">HANDOVER_PROMPT.md</code> dan lampirkan dokumen state. AI akan otomatis mengenali kondisi recovery (Kasus A, B, C, atau D) dan melanjutkan pekerjaan tanpa kehilangan konteks.
                  </p>
                </div>
              </div>
            </div>

            {/* Jalur 3: Proyek Existing */}
            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-amber-400">
                <RefreshCw className="w-4 h-4" />
                <span>Jalur 3: Proyek Existing yang Direstrukturisasi (Read-Only Audit)</span>
              </div>
              <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
                <div>
                  <strong className="text-white">1. Gunakan Mode Restrukturisasi:</strong>
                  <p className="text-slate-400 mt-0.5">
                    Set parameter di <code className="text-slate-200">LANDING_PROMPT.md</code>: <code className="text-amber-400">Aksi: RESTRUKTURISASI</code>. Lampirkan direktori kunci (<code className="text-slate-200">package.json</code>, routes, skema).
                  </p>
                </div>
                <div>
                  <strong className="text-white">2. Audit Baca-Saja (Read-Only Audit):</strong>
                  <p className="text-slate-400 mt-0.5">
                    AI <strong>dilarang keras memodifikasi kode</strong> sebelum peta audit selesai disusun dalam <code className="text-slate-200">BLUEPRINT.md</code> dan <code className="text-slate-200">TASKS.md</code>. Setelah tugas disetujui, refactoring dilakukan per task terisolasi dengan verifikasi berbukti.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Recovery Kasus A-D */}
          <div id="sec-recovery" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 scroll-mt-20">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 font-bold text-xs flex items-center justify-center font-mono">
                  3
                </span>
                <h3 className="text-base font-bold text-white">Protokol Pemulihan Darurat (Recovery Kasus A–D)</h3>
              </div>
              <span className="text-xs font-mono text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/40">
                Crash Resilient
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Ketika sesi AI terputus tiba-tiba atau token habis di tengah pekerjaan, bandingkan isi <code className="text-cyan-300 font-mono">git status / git diff</code> dengan blok WAL di <code className="text-cyan-300 font-mono">SESSION_STATE.md</code>:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-950 p-4 rounded-xl border border-cyan-900/40 space-y-2">
                <div className="font-bold text-cyan-400 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-[10px]">A</span>
                  Kasus A: Working Tree Bersih
                </div>
                <p className="text-slate-300">
                  <strong className="text-slate-200">Kondisi:</strong> Tidak ada diff uncommitted di terminal. Commit terakhir sudah tercatat di state.
                </p>
                <div className="bg-slate-900 p-2.5 rounded border border-slate-800 text-[11px] text-cyan-300">
                  <strong>Prosedur:</strong> Lanjutkan langkah pertama task aktif yang tercatat di WAL atau task berikutnya. <em>Dilarang keras melakukan git reset.</em>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-amber-900/40 space-y-2">
                <div className="font-bold text-amber-400 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px]">B</span>
                  Kasus B: In-Flight Diff Cocok dengan WAL
                </div>
                <p className="text-slate-300">
                  <strong className="text-slate-200">Kondisi:</strong> Ada berkas termodifikasi dan semuanya tercantum di field <code className="text-slate-200">plannedFiles</code> WAL.
                </p>
                <div className="bg-slate-900 p-2.5 rounded border border-slate-800 text-[11px] text-amber-300">
                  <strong>Prosedur:</strong> Pertahankan diff, verifikasi apakah langkah telah tuntas. Jika tuntas, jalankan verifikasi, commit, dan perbarui state.
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-rose-900/40 space-y-2">
                <div className="font-bold text-rose-400 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-300 flex items-center justify-center text-[10px]">C</span>
                  Kasus C: Commit Desync di Git Log
                </div>
                <p className="text-slate-300">
                  <strong className="text-slate-200">Kondisi:</strong> Ada commit di <code className="text-slate-200">git log</code> yang belum tercatat statusnya di <code className="text-slate-200">SESSION_STATE.md</code>.
                </p>
                <div className="bg-slate-900 p-2.5 rounded border border-slate-800 text-[11px] text-rose-300">
                  <strong>Prosedur:</strong> Selaraskan <code className="text-slate-200 font-mono">SESSION_STATE.md</code> agar mencatat commit tersebut, update task matriks ke status yang sesuai.
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-purple-900/40 space-y-2">
                <div className="font-bold text-purple-400 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center text-[10px]">D</span>
                  Kasus D: Wildcard Diff (Di Luar WAL)
                </div>
                <p className="text-slate-300">
                  <strong className="text-slate-200">Kondisi:</strong> Ada perubahan file yang tidak tercantum dalam blok WAL.
                </p>
                <div className="bg-slate-900 p-2.5 rounded border border-slate-800 text-[11px] text-purple-300">
                  <strong>Prosedur:</strong> Tahan perubahan. AI menandai task sebagai <code className="text-slate-200 font-mono">BLOCKED</code> sementara dan meminta konfirmasi manusia sebelum revert/lanjut.
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Aturan Triase Revisi R1-R7 */}
          <div id="sec-triase" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 scroll-mt-20">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center font-mono">
                  4
                </span>
                <h3 className="text-base font-bold text-white">Aturan Triase Revisi (R1–R7)</h3>
              </div>
              <span className="text-xs font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                Zero-Regression
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Jika di tengah eksekusi pengguna meminta perubahan atau revisi, terapkan klasifikasi ukuran perubahan:
            </p>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-start gap-3">
                <span className="px-2 py-1 rounded bg-cyan-500/20 text-cyan-300 font-bold font-mono shrink-0">Level S</span>
                <div>
                  <div className="font-semibold text-white">Revisi Minor / Typo / &lt;= 1 berkas, &lt;= 20 baris, tanpa ubah skema/kontrak/AC</div>
                  <p className="text-slate-400 mt-1">
                    Dikerjakan langsung di dalam task aktif yang sedang berjalan tanpa membuat task baru. Dicatat di slot revisi atau baris log WAL.
                  </p>
                </div>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-start gap-3">
                <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 font-bold font-mono shrink-0">Level M Dependen</span>
                <div>
                  <div className="font-semibold text-white">Revisi Menengah Terkait Task Berjalan</div>
                  <p className="text-slate-400 mt-1">
                    Perbarui kriteria verifikasi dan daftar berkas terdampak pada task aktif. Tidak merusak urutan matriks task lain.
                  </p>
                </div>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-start gap-3">
                <span className="px-2 py-1 rounded bg-rose-500/20 text-rose-300 font-bold font-mono shrink-0">Level M Independen / L</span>
                <div>
                  <div className="font-semibold text-white">Fitur Baru atau Perubahan Skema Besar</div>
                  <p className="text-slate-400 mt-1">
                    <strong>Dilarang menyisipkan perubahan secara liar pada task aktif.</strong> Dijadwalkan sebagai task baru (<code className="text-cyan-300 font-mono">TASK-REV-NN</code> berstatus <code className="text-slate-300 font-mono">PENDING</code>) di antrean berikutnya setelah task aktif selesai.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Format Checkpoint & Aturan Jam X1 */}
          <div id="sec-checkpoint" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 scroll-mt-20">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center font-mono">
                  5
                </span>
                <h3 className="text-base font-bold text-white">Format Blok Checkpoint &amp; Aturan Jam X1</h3>
              </div>
              <span className="text-xs font-mono text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40">
                Rule X1 Active
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Setiap interaksi kritis atau pembaruan status wajib mencantumkan blok checkpoint terstruktur berikut:
            </p>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-mono">Format Checkpoint Kanonik:</span>
                <button
                  onClick={() => copyToClipboard(CHECKPOINT_TEMPLATE, 'chk-tmpl')}
                  className="text-cyan-400 hover:text-cyan-300 font-mono text-[11px] flex items-center gap-1"
                >
                  {copiedId === 'chk-tmpl' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId === 'chk-tmpl' ? 'Tersalin' : 'Salin Format'}</span>
                </button>
              </div>
              <pre className="text-xs font-mono text-cyan-300 bg-slate-900 p-3 rounded-lg border border-slate-800 overflow-x-auto leading-relaxed">
{CHECKPOINT_TEMPLATE}
              </pre>
            </div>

            <div className="bg-amber-950/30 p-3.5 rounded-xl border border-amber-800/40 text-xs text-amber-200/90 flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Aturan Jam (Rule X1):</strong> Jika lingkungan AI tidak memiliki akses jam sistem tepercaya, AI wajib menulis <code className="text-amber-300 font-mono">"jam: ?"</code> dan <strong>dilarang keras mengarang atau mengekstrapolasi waktu secara halusinasi</strong>.
              </div>
            </div>
          </div>

          {/* Section 6: Panduan Keamanan & Jaringan */}
          <div id="sec-keamanan" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 scroll-mt-20">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-400 font-bold text-xs flex items-center justify-center font-mono">
                  6
                </span>
                <h3 className="text-base font-bold text-white">Panduan Keamanan &amp; Konfigurasi Server Pengembangan</h3>
              </div>
              <span className="text-xs font-mono text-teal-400 bg-teal-950/60 px-2 py-0.5 rounded border border-teal-800/40">
                Security &amp; Dev Server
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="font-bold text-white flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  Bind Host Jaringan (0.0.0.0 vs 127.0.0.1)
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Secara default pada lingkungan cloud AI Studio, dev server berjalan pada <code className="text-cyan-300 font-mono">0.0.0.0:3000</code> agar reverse proxy berfungsi.
                </p>
                <div className="text-slate-400 text-[11px] bg-slate-900 p-2.5 rounded border border-slate-800 space-y-1">
                  <span className="text-amber-300 font-semibold block">Penggunaan di Tablet Android / Wi-Fi Privat:</span>
                  <p>Bila menjalankan server di tablet dan ingin membatasi akses hanya ke loopback lokal:</p>
                  <code className="text-cyan-300 font-mono block mt-1">npm run dev -- --host 127.0.0.1</code>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Kerahasiaan Kredensial (Zero-Secret Policy)
                </div>
                <p className="text-slate-300 leading-relaxed">
                  ZLCE Studio berjalan murni di sisi klien (<em className="text-slate-200">client-side</em>). Jangan pernah menempelkan API key, Personal Access Token GitHub, atau kredensial produksi ke dalam <code className="text-slate-200 font-mono">SESSION_STATE.md</code>.
                </p>
                <div className="text-slate-400 text-[11px] bg-slate-900 p-2.5 rounded border border-slate-800 space-y-1">
                  <span className="text-emerald-400 font-semibold block">Credential Cache Termux (ADR-04):</span>
                  <p>Gunakan cache RAM berbatas waktu 15 menit: <code className="text-slate-200 font-mono">cache --timeout=900</code>, dan hapus seketika saat pergantian pemegang tablet via <code className="text-cyan-300 font-mono">git credential-cache exit</code>.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: 3 INTERACTIVE SCENARIOS */}
      {viewMode === 'interactive-scenarios' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Sub Switcher */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setActiveScenario('new-project')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border ${
                activeScenario === 'new-project'
                  ? 'bg-cyan-950/60 text-cyan-300 border-cyan-500/80 shadow'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Skenario 1: Proyek Baru (Greenfield)</span>
            </button>

            <button
              onClick={() => setActiveScenario('existing-project')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border ${
                activeScenario === 'existing-project'
                  ? 'bg-amber-950/60 text-amber-300 border-amber-500/80 shadow'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              <span>Skenario 2: Proyek Selesai (Audit / Update)</span>
            </button>

            <button
              onClick={() => setActiveScenario('in-progress')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border ${
                activeScenario === 'in-progress'
                  ? 'bg-indigo-950/60 text-indigo-300 border-indigo-500/80 shadow'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Skenario 3: Takeover di Tengah Jalan</span>
            </button>
          </div>

          {/* Scenario 1: New Project */}
          {activeScenario === 'new-project' && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h3 className="text-base font-bold text-cyan-400 flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5" />
                  Skenario 1: Membangun Proyek Baru dari Nol (Greenfield Project)
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Pada proyek baru, AI Agent dilarang keras menulis kode sebelum menyepakati 4 Gerbang ZLCE: Blueprint, Arsitektur &amp; Data Model, Tasks &amp; Testing, serta Session State.
                </p>
              </div>

              {/* Recommended File Tree */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span className="flex items-center gap-1.5 font-bold text-white"><FolderGit2 className="w-4 h-4 text-cyan-400" /> Struktur Berkas Kontrol GitHub:</span>
                  <button
                    onClick={() => copyToClipboard(FILE_TREE_NEW_PROJECT, 'tree-new-sc')}
                    className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-mono"
                  >
                    {copiedId === 'tree-new-sc' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedId === 'tree-new-sc' ? 'Tersalin' : 'Salin Tree'}</span>
                  </button>
                </div>
                <pre className="text-emerald-400 font-mono text-xs overflow-x-auto bg-slate-950 p-4 rounded-lg border border-slate-800 leading-relaxed">
{FILE_TREE_NEW_PROJECT}
                </pre>
              </div>

              {/* Prompt Box */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-cyan-400" />
                    Prompt Landing Proyek Baru (Siap Pakai):
                  </span>
                  <button
                    onClick={() => copyToClipboard(NEW_PROJECT_LANDING_PROMPT, 'prompt-new-sc')}
                    className="flex items-center gap-1 text-xs bg-cyan-600 hover:bg-cyan-500 text-white font-medium px-3 py-1.5 rounded-lg transition"
                  >
                    {copiedId === 'prompt-new-sc' ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedId === 'prompt-new-sc' ? 'Tersalin!' : 'Salin Prompt'}</span>
                  </button>
                </div>
                <pre className="text-slate-300 font-mono text-xs overflow-x-auto bg-slate-950 p-3.5 rounded-lg border border-slate-800 max-h-72 leading-relaxed">
{NEW_PROJECT_LANDING_PROMPT}
                </pre>
              </div>
            </div>
          )}

          {/* Scenario 2: Existing Project */}
          {activeScenario === 'existing-project' && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h3 className="text-base font-bold text-amber-400 flex items-center gap-2 mb-2">
                  <RefreshCw className="w-5 h-5" />
                  Skenario 2: Proyek Selesai (Review, Update, atau Penambahan Fitur)
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Pada codebase yang sudah berjalan, terapkan fase <strong>Read-Only Audit</strong> terlebih dahulu. AI dilarang menyentuh file kode sebelum menyusun BLUEPRINT dan matriks task eksisting.
                </p>
              </div>

              {/* Prompt Box */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Search className="w-4 h-4 text-amber-400" />
                    Prompt Audit Codebase Existing:
                  </span>
                  <button
                    onClick={() => copyToClipboard(EXISTING_PROJECT_AUDIT_PROMPT, 'prompt-audit-sc')}
                    className="flex items-center gap-1 text-xs bg-amber-600 hover:bg-amber-500 text-white font-medium px-3 py-1.5 rounded-lg transition"
                  >
                    {copiedId === 'prompt-audit-sc' ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedId === 'prompt-audit-sc' ? 'Tersalin!' : 'Salin Prompt Audit'}</span>
                  </button>
                </div>
                <pre className="text-slate-300 font-mono text-xs overflow-x-auto bg-slate-950 p-3.5 rounded-lg border border-slate-800 max-h-72 leading-relaxed">
{EXISTING_PROJECT_AUDIT_PROMPT}
                </pre>
              </div>
            </div>
          )}

          {/* Scenario 3: In Progress / Takeover */}
          {activeScenario === 'in-progress' && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h3 className="text-base font-bold text-indigo-400 flex items-center gap-2 mb-2">
                  <Layers className="w-5 h-5" />
                  Skenario 3: Melanjutkan Proyek di Tengah Jalan (Takeover / Sesi Terputus)
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Jika AI terputus atau token limit habis, lakukan forensik terminal git lalu serahkan dokumen kontrol wajib dengan prompt handover.
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono flex items-center gap-1.5 text-white font-bold"><Terminal className="w-3.5 h-3.5 text-cyan-400" /> Perintah Forensik Terminal:</span>
                  <button
                    onClick={() => copyToClipboard(FORENSIC_COMMANDS, 'forensic-sc')}
                    className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-mono"
                  >
                    {copiedId === 'forensic-sc' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedId === 'forensic-sc' ? 'Tersalin' : 'Salin Perintah'}</span>
                  </button>
                </div>
                <pre className="text-cyan-300 font-mono text-xs overflow-x-auto bg-slate-950 p-3 rounded-lg border border-slate-800">
{FORENSIC_COMMANDS}
                </pre>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Play className="w-4 h-4 text-indigo-400" />
                    Prompt Handover / Takeover AI Baru:
                  </span>
                  <button
                    onClick={() => copyToClipboard(TAKEOVER_PROMPT, 'prompt-takeover-sc')}
                    className="flex items-center gap-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-3 py-1.5 rounded-lg transition"
                  >
                    {copiedId === 'prompt-takeover-sc' ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedId === 'prompt-takeover-sc' ? 'Tersalin!' : 'Salin Prompt Takeover'}</span>
                  </button>
                </div>
                <pre className="text-slate-300 font-mono text-xs overflow-x-auto bg-slate-950 p-3.5 rounded-lg border border-slate-800 max-h-72 leading-relaxed">
{TAKEOVER_PROMPT}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: PROMPT CATALOG */}
      {viewMode === 'prompt-catalog' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="grid grid-cols-1 gap-4">
            {/* Landing Prompt */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold uppercase text-cyan-400 font-mono">1. Landing Prompt</div>
                  <h4 className="text-sm font-bold text-white">Inisiasi Proyek Baru (Mulai dari Nol)</h4>
                </div>
                <button
                  onClick={() => copyToClipboard(NEW_PROJECT_LANDING_PROMPT, 'cat-1')}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition flex items-center gap-1"
                >
                  {copiedId === 'cat-1' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId === 'cat-1' ? 'Tersalin' : 'Salin'}</span>
                </button>
              </div>
              <pre className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto max-h-56">
{NEW_PROJECT_LANDING_PROMPT}
              </pre>
            </div>

            {/* Handover Prompt */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold uppercase text-emerald-400 font-mono">2. Handover Prompt</div>
                  <h4 className="text-sm font-bold text-white">Serah Terima Antar AI / Pemulihan Sesi</h4>
                </div>
                <button
                  onClick={() => copyToClipboard(TAKEOVER_PROMPT, 'cat-2')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition flex items-center gap-1"
                >
                  {copiedId === 'cat-2' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId === 'cat-2' ? 'Tersalin' : 'Salin'}</span>
                </button>
              </div>
              <pre className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto max-h-56">
{TAKEOVER_PROMPT}
              </pre>
            </div>

            {/* Feature Request Prompt */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold uppercase text-amber-400 font-mono">3. Feature Request Prompt</div>
                  <h4 className="text-sm font-bold text-white">Permintaan Fitur Baru dengan Triase R7</h4>
                </div>
                <button
                  onClick={() => copyToClipboard(FEATURE_REQUEST_PROMPT, 'cat-3')}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium transition flex items-center gap-1"
                >
                  {copiedId === 'cat-3' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId === 'cat-3' ? 'Tersalin' : 'Salin'}</span>
                </button>
              </div>
              <pre className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto max-h-56">
{FEATURE_REQUEST_PROMPT}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: GENERATOR ESTAFET MULTI-AI (UNIVERSAL ANY-TASK) */}
      {viewMode === 'ai-handover-claude-gpt' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Hero Banner */}
          <div className="bg-gradient-to-r from-amber-950/40 via-purple-950/30 to-indigo-950/50 border border-amber-500/40 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-500/20 text-amber-300 rounded-lg border border-amber-500/30">
                    <Zap className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                    Blueprint 14: Universal Multi-AI Relay Generator
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-950/80 border border-emerald-700/60 text-emerald-300">
                    Semua Task Didukung
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  Generator Estafet AI: Pindahkan Pengerjaan Task ke AI Luar
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
                  Beralih pengerjaan <strong className="text-amber-300">task berapapun</strong> (TASK-001 s/d TASK-043) ke <strong className="text-cyan-300">{relayOutput.aiProviderLabel}</strong> tanpa kehilangan satu bit konteks pun. Prompt digenerate secara dinamis mematuhi aturan anti-placeholder, touch target <code className="text-amber-300 font-mono">min-h-[44px]</code>, dan verifikasi ketat.
                </p>
              </div>

              <div className="flex flex-wrap sm:flex-nowrap lg:flex-col gap-2 shrink-0">
                <button
                  type="button"
                  onClick={async () => {
                    await generateAndDownloadZipBundle({
                      type: 'claude',
                      filename: 'zlce-claude-chatgpt-bundle.zip'
                    });
                  }}
                  className="touch-target-44 min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-mono font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-900/30 active:scale-95 transition"
                  title="Generate dan unduh bundel ZIP mutakhir untuk Claude / ChatGPT"
                >
                  <Sparkles className="w-4 h-4 text-amber-200" />
                  <span>Generate &amp; Unduh ZIP (20 Berkas)</span>
                </button>

                <button
                  onClick={() => copyToClipboard(relayOutput.fullPrompt, `prompt-${selectedTaskId}`)}
                  className="touch-target-44 min-h-[44px] flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 active:scale-95 transition"
                >
                  {copiedId === `prompt-${selectedTaskId}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
                  <span>{copiedId === `prompt-${selectedTaskId}` ? 'Prompt Tersalin!' : `Salin Prompt ${selectedTaskId}`}</span>
                </button>

                {onNavigateTab && (
                  <button
                    onClick={() => onNavigateTab('ai-handover')}
                    className="touch-target-44 min-h-[44px] flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-semibold bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-300 active:scale-95 transition"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Buka Hub Estafet &amp; Handover AI Penuh</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick Status Bar */}
            <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center gap-2 text-xs font-mono">
              <span className="text-slate-400">Target Task:</span>
              <span className="px-2.5 py-0.5 rounded bg-amber-950/70 border border-amber-800/60 text-amber-300 font-bold">
                {relayOutput.taskId}: {relayOutput.taskName}
              </span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-400">AI Target:</span>
              <span className="px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-800/60 text-cyan-300 font-semibold">
                {relayOutput.aiProviderLabel}
              </span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-400">Driver:</span>
              <span className="text-indigo-300 font-semibold">{relayOutput.driver.name}</span>
              <span className="text-slate-500">|</span>
              <span className={relayOutput.safety.status === 'safe' ? 'text-emerald-400' : relayOutput.safety.status === 'warning' ? 'text-amber-400' : 'text-rose-400'}>
                ~{relayOutput.estimatedTokens.toLocaleString()} tokens ({relayOutput.safety.statusLabel})
              </span>
            </div>
          </div>

          {/* Interactive Generator Controls */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span>Konfigurasi Generator Estafet (Task Mana Pun)</span>
              </h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedTaskId(defaultTask)}
                  className="touch-target-44 min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-mono bg-cyan-950/80 hover:bg-cyan-900/80 border border-cyan-800/60 text-cyan-300 transition"
                  title="Pilih task berikutnya yang siap dikerjakan"
                >
                  Task Siap/Aktif: {defaultTask}
                </button>
              </div>
            </div>

            {/* Control Grid: Task Selector + Phase Filter */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-xs font-mono font-semibold text-slate-300">
                  1. Pilih Mandat Task Aktif ({filteredTasks.length} dari {sessionState.tasks.length || 43} Task):
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {['ALL', 'FASE 3', 'FASE 4', 'FASE 5', 'FASE 6'].map(phase => (
                    <button
                      key={phase}
                      onClick={() => setPhaseFilter(phase)}
                      className={`px-2 py-1 rounded text-[10px] font-mono transition ${
                        phaseFilter === phase
                          ? 'bg-amber-600 text-white font-bold'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {phase}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="md:col-span-2">
                  <select
                    value={selectedTaskId}
                    onChange={e => setSelectedTaskId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-100 font-mono focus:outline-none focus:border-cyan-500 touch-target-44 min-h-[44px]"
                  >
                    {filteredTasks.map(t => {
                      const detail = taskDetailMap.get(t.id);
                      return (
                        <option key={t.id} value={t.id}>
                          {t.id}: {detail?.title || t.name} [{t.status}]
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <input
                    type="text"
                    value={taskSearch}
                    onChange={e => setTaskSearch(e.target.value)}
                    placeholder="Cari task ID / nama..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-200 font-mono focus:outline-none focus:border-cyan-500 touch-target-44 min-h-[44px]"
                  />
                </div>
              </div>
            </div>

            {/* Target AI Selection Buttons */}
            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-mono font-semibold text-slate-300 block">
                2. Pilih Target Model AI Penerima Estafet:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {[
                  { id: 'claude', name: 'Claude 3.5 Sonnet', limit: '30K Mid', color: 'border-amber-500/60 bg-amber-950/30 text-amber-300' },
                  { id: 'chatgpt', name: 'ChatGPT GPT-4o', limit: '128K Wide', color: 'border-indigo-500/60 bg-indigo-950/30 text-indigo-300' },
                  { id: 'cursor', name: 'Cursor AI', limit: '64K Coding', color: 'border-cyan-500/60 bg-cyan-950/30 text-cyan-300' },
                  { id: 'copilot', name: 'GitHub Copilot', limit: '32K Flow', color: 'border-blue-500/60 bg-blue-950/30 text-blue-300' },
                  { id: 'gemini', name: 'Gemini Flash', limit: '1M Mega', color: 'border-emerald-500/60 bg-emerald-950/30 text-emerald-300' },
                  { id: 'deepseek', name: 'DeepSeek Reasoner', limit: '64K Deep', color: 'border-purple-500/60 bg-purple-950/30 text-purple-300' },
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedAiProvider(item.id as TargetAIProvider)}
                    className={`touch-target-44 min-h-[44px] p-2 rounded-xl border text-left transition flex flex-col justify-between ${
                      selectedAiProvider === item.id
                        ? `${item.color} ring-1 ring-amber-400 font-bold shadow-md`
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs truncate">{item.name}</div>
                    <div className="text-[10px] font-mono opacity-80">{item.limit}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Tablet Driver Selection */}
            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-mono font-semibold text-slate-300 block">
                3. Tablet Driver (8 Anggota Estafet Resmi):
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5">
                {TEAM_MEMBERS.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedDriverId(m.id)}
                    className={`touch-target-44 min-h-[44px] p-1.5 rounded-lg border text-center transition ${
                      selectedDriverId === m.id
                        ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 font-bold shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-xs truncate">{m.name}</div>
                    <div className="text-[9px] text-slate-500 truncate">{m.role.split('/')[0]}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Handover Mode Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
              <span className="text-xs font-mono text-slate-400">Mode Format Prompt:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setHandoverMode('direct-execution')}
                  className={`touch-target-44 min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-mono transition ${
                    handoverMode === 'direct-execution'
                      ? 'bg-amber-600 text-white font-bold'
                      : 'bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Eksekusi Mandiri (Direct Mandate)
                </button>
                <button
                  onClick={() => setHandoverMode('cidi-handover')}
                  className={`touch-target-44 min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-mono transition ${
                    handoverMode === 'cidi-handover'
                      ? 'bg-purple-600 text-white font-bold'
                      : 'bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Protokol C-I-D-I (Cold-Start Handover)
                </button>
              </div>
            </div>
          </div>

          {/* 5-Step Tutorial Cards tailored to the selected task & AI */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-cyan-400" />
              5 Langkah Singkat Eksekusi {relayOutput.taskId} di {relayOutput.aiProviderLabel}:
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {relayOutput.steps.map(step => (
                <div key={step.stepNumber} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                      Langkah {step.stepNumber}
                    </span>
                    {step.stepNumber === 1 && <Download className="w-4 h-4 text-slate-500" />}
                    {step.stepNumber === 2 && <ExternalLink className="w-4 h-4 text-slate-500" />}
                    {step.stepNumber === 3 && <FileCode2 className="w-4 h-4 text-slate-500" />}
                    {step.stepNumber === 4 && <Copy className="w-4 h-4 text-slate-500" />}
                    {step.stepNumber === 5 && <Terminal className="w-4 h-4 text-slate-500" />}
                  </div>
                  <h5 className="text-sm font-bold text-white">{step.title}</h5>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {step.description}
                  </p>
                  {step.targetUrl && (
                    <div className="pt-1">
                      <a
                        href={step.targetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-mono text-cyan-400 hover:text-cyan-300 underline"
                      >
                        Buka {relayOutput.aiProviderLabel} <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              ))}

              {/* Invariant Note Card */}
              <div className="bg-gradient-to-br from-slate-900 to-emerald-950/30 border border-emerald-800/40 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Garansi Zero-Loss Invariance</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Karena AI membaca state murni dari berkas Markdown (Invarian I1) dan mengeksekusi mandat mandiri (Invarian I2), Anda dapat berpindah antar AI dan antar anggota kapan saja tanpa amnesia konteks.
                </p>
              </div>
            </div>
          </div>

          {/* Prompt Ready-To-Copy Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-mono font-bold text-amber-400 uppercase">Prompt Mandat Siap Pakai (Universal)</span>
                <h4 className="text-sm sm:text-base font-bold text-white">
                  Prompt Eksekusi {relayOutput.taskId} ({relayOutput.taskName}) untuk {relayOutput.aiProviderLabel}
                </h4>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => copyToClipboard(relayOutput.fullPrompt, `prompt-${relayOutput.taskId}-full`)}
                  className="touch-target-44 min-h-[44px] flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-bold bg-amber-600 hover:bg-amber-500 text-white shadow active:scale-95 transition"
                >
                  {copiedId === `prompt-${relayOutput.taskId}-full` ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedId === `prompt-${relayOutput.taskId}-full` ? 'Prompt Tersalin!' : 'Salin Seluruh Prompt'}</span>
                </button>

                <button
                  onClick={() => downloadMarkdownBlob(relayOutput.fullPrompt, { filename: relayOutput.filename })}
                  className="touch-target-44 min-h-[44px] flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition"
                  title="Unduh prompt dalam berkas .md"
                >
                  <Download className="w-4 h-4 text-cyan-400" />
                  <span>Unduh .md</span>
                </button>

                <a
                  href={relayOutput.aiWebUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="touch-target-44 min-h-[44px] flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono bg-cyan-950/80 hover:bg-cyan-900/80 border border-cyan-800/60 text-cyan-300 transition"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Buka {relayOutput.aiProviderLabel}</span>
                </a>

                {onNavigateTab && (
                  <button
                    onClick={() => onNavigateTab('result-capture')}
                    className="touch-target-44 min-h-[44px] flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono bg-emerald-950/80 hover:bg-emerald-900/80 border border-emerald-800/60 text-emerald-300 transition"
                    title="Buka Result Capture untuk mengekstrak solusi AI"
                  >
                    <span>Lanjut Capture Hasil</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-slate-200 overflow-x-auto max-h-80 leading-relaxed whitespace-pre-wrap select-all">
{relayOutput.fullPrompt}
            </pre>
          </div>

          {/* Table of Included Files in Bundle */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Rincian 20 Berkas dalam Paket Bundle ZIP (80 KB)</span>
              </h4>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded border border-emerald-800/40">
                Lengkap &amp; Siap Upload
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1.5">
                <div className="font-bold text-amber-400 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Handover &amp; Prompt
                </div>
                <ul className="text-slate-300 space-y-1 text-[11px]">
                  <li>• CLAUDE_CHATGPT_HANDOVER.md</li>
                  <li>• HANDOVER_PROMPT.md</li>
                  <li>• LANDING_PROMPT.md</li>
                  <li>• ZLCE_KIT_SINGLE.md</li>
                </ul>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1.5">
                <div className="font-bold text-cyan-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> Status &amp; Tasks
                </div>
                <ul className="text-slate-300 space-y-1 text-[11px]">
                  <li>• SESSION_STATE.md (State of truth)</li>
                  <li>• TASKS.md (43 Backlog Tasks)</li>
                  <li>• docs/USAGE.md (Kanonik)</li>
                </ul>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1.5">
                <div className="font-bold text-indigo-400 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5" /> Blueprint Arsitektur
                </div>
                <ul className="text-slate-300 space-y-1 text-[11px]">
                  <li>• MOBILE_BLUEPRINT.md</li>
                  <li>• 14_MULTI_AI_TEAM_MODEL.md</li>
                  <li>• 02_COMPONENT_ARCHITECTURE.md</li>
                  <li>• 07_WORKFLOW_DESIGN.md</li>
                </ul>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1.5">
                <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <FileCode2 className="w-3.5 h-3.5" /> Kode &amp; Linter
                </div>
                <ul className="text-slate-300 space-y-1 text-[11px]">
                  <li>• src/utils/contextPackGenerator.ts</li>
                  <li>• src/types/zlce.ts &amp; mobile.ts</li>
                  <li>• scripts/zlce-check.py</li>
                  <li>• package.json &amp; tsconfig.json</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Tool Recommendation Matrix (Always visible at bottom) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            Saran Bijak Memilih AI: Setiap Alat Dipakai Sesuai Kebutuhan Kerja
          </h3>
          <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 px-2.5 py-0.5 rounded border border-cyan-800/40">
            ZLCE Compatibility Anchor
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5" /> Coding Cepat
            </span>
            <div className="text-xs font-semibold text-white">GitHub Copilot / Cursor</div>
            <p className="text-[11px] text-slate-400">Autocompletion instan di editor saat mengetik baris kode.</p>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
            <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Penalaran Arsitektur
            </span>
            <div className="text-xs font-semibold text-white">Claude 3.7 Sonnet / Opus</div>
            <p className="text-[11px] text-slate-400">Audit kepatuhan, refactoring aman, dan validasi kontrak tanpa asumsi liar.</p>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Large Context &amp; Search
            </span>
            <div className="text-xs font-semibold text-white">Gemini 2.5 Flash / Pro</div>
            <p className="text-[11px] text-slate-400">Analisis repo besar 1M token &amp; pencarian dokumentasi terbaru.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Canonical Templates & Constants
const CLAUDE_CHATGPT_TASK014_PROMPT = `Kamu adalah Senior Frontend & TypeScript Engineer yang bertindak sebagai AI Coding Engine untuk proyek ZLCE Mobile Workbench v4.0.0 (Zero-Loss Context Engineering Studio).

### KONTEKS PROYEK & ATURAN METODOLOGI:
1. Stack: React 19 + TypeScript + Vite + Tailwind CSS (v4).
2. Metodologi: Zero-Loss Context Engineering (ZLCE).
   - Invarian I1 (All in Files): Sumber kebenaran tunggal adalah file Markdown dan kode repositori.
   - Invarian I2 (Cold-Start Resume): Eksekusi mandiri tanpa asumsi ingatan chat sebelumnya.
   - Schema-before-Data: Tipe TypeScript murni dan antarmuka harus didefinisikan sebelum implementasi logika.
3. ATURAN KODE MUTLAK:
   - Tulis kode LENGKAP tanpa placeholder, tanpa tanda elipsis ("// ... rest of code"), tanpa fungsi mockup kosong.
   - Gunakan TypeScript murni yang kompatibel dengan React 19 dan Lucide-React.
   - Sesuai dengan batasan layar tablet Android 8.7" (Samsung Tab A7 Lite): target sentuh minimal 44px (min-h-[44px]).

### MANDAT TUGAS: IMPLEMENTASI TASK-014
Nama: Context Budget Manager & Adapter Kuota Token per Model AI
Target File:
1. \`src/utils/tokenBudgetAdapter.ts\`
2. \`src/components/mobile/TokenBudgetSelector.tsx\`
3. Update integrasi pada \`src/components/mobile/ContextPackTab.tsx\` dan \`src/components/TokenUsageGauge.tsx\`.

### SPESIFIKASI DETAIL:
1. \`src/utils/tokenBudgetAdapter.ts\`:
   - Definisikan tipe profil model:
     * \`gemini-1m\` (Limit: 1,000,000 token, Safe Window: 750,000)
     * \`claude-30k\` (Limit: 30,000 token, Safe Window: 24,000)
     * \`gpt-128k\` (Limit: 128,000 token, Safe Window: 96,000)
     * \`compact-8k\` (Limit: 8,000 token, Safe Window: 6,500)
   - Fungsi \`pruneContextForBudget(markdown: string, budgetPreset: string)\`:
     * Menghitung estimasi token (~4 karakter per token untuk teks teknis campuran Indonesia/Inggris).
     * Jika teks melebihi Safe Window, lakukan pemangkasan cerdas: pangkas Bagian 7 (Log Audit Historis lama) menjadi ringkasan 3 entri terakhir, pertahankan utuh Bagian 1 (Mandat Task Aktif), Bagian 2 (Jangkar Kebenaran Tier 0), dan Bagian 3 (WAL).
   - Fungsi \`calculateTokenSafety(tokenCount: number, budgetPreset: string)\` mengembalikan status: 'safe' (hijau) | 'warning' (kuning) | 'danger' (merah).

2. \`src/components/mobile/TokenBudgetSelector.tsx\`:
   - Menyediakan pemilih profil model interaktif berbentuk kartu responsif atau segmented control (Gemini 1M, Claude 30K/Sonnet, GPT Compact 8K/128K).
   - Menampilkan batas kuota, persentase utilisasi terhadap safe window, dan badge status visual.
   - Target sentuh ergonomis ramah jempol (min 44px).

3. Outputkan kode lengkap untuk berkas-berkas tersebut sekarang.`;

const CHECKPOINT_TEMPLATE = `<!-- ZLCE:CHECKPOINT:START -->
Task: TASK-001
Status: IN_PROGRESS
Langkah Terakhir: Memverifikasi test baseline dan eksekusi linter
Langkah Berikutnya: Mengonfirmasi 0 error pada build produksi
Berkas Terdampak: package.json, tsconfig.json
Bukti Verifikasi: npm test && npm run lint && npm run build
Timestamp: 2026-11-04T12:00:00Z (atau "jam: ?")
<!-- ZLCE:CHECKPOINT:END -->`;

const FILE_TREE_NEW_PROJECT = `.
├── .gitignore
├── README.md                   <-- Panduan utama & 3 langkah mulai cepat
├── package.json
│
├── LANDING_PROMPT.md           <-- Prompt spesifikasi proyek awal
├── HANDOVER_PROMPT.md          <-- Protokol serah terima & recovery
├── BLUEPRINT.md                <-- Hasil Gerbang 1 (Lingkup, User Story, Batasan)
├── ARCHITECTURE.md             <-- Hasil Gerbang 2 (Arsitektur modul & tech stack)
├── DATA_MODEL.md               <-- Hasil Gerbang 2 (Skema DB & relasi entitas)
├── TASKS.md                    <-- Hasil Gerbang 3 (Daftar antrean tugas atomik)
├── TESTING.md                  <-- Hasil Gerbang 3 (Rencana pengujian & acceptance)
├── SESSION_STATE.md            <-- Hasil Gerbang 4 (Single source of truth, WAL & evidence)
├── AI_WORKFLOW.md              <-- Hasil Gerbang 4 (Aturan eksekusi & checkpoint)
│
├── templates/
│   └── profiles/
│       └── DOMAIN_BOOKING.profile.md  <-- Profil domain (misal: Rental Motor)
│
└── src/                        <-- Kode aplikasi (Dibuat HANYA saat eksekusi task Gerbang 4)`;

const NEW_PROJECT_LANDING_PROMPT = `Halo! Kita akan memulai proyek baru menggunakan metodologi **Zero-Loss Context Engineering (ZLCE v3.2.2)**.

Aturan Utama Eksekusi:
1. Anda HARUS mengikuti protokol 4 Gerbang:
   - Gerbang 1: Buat HANYA \`BLUEPRINT.md\`. Lalu BERHENTI dan tunggu persetujuan saya.
   - Gerbang 2: Buat HANYA \`ARCHITECTURE.md\` dan \`DATA_MODEL.md\`. Lalu BERHENTI dan tunggu persetujuan saya.
   - Gerbang 3: Buat HANYA \`TASKS.md\` dan \`TESTING.md\`. Lalu BERHENTI.
   - Gerbang 4: Buat dokumen kontrol pendukung (\`SESSION_STATE.md\`, \`AI_WORKFLOW.md\`, \`CHECKLISTS.md\`), lalu eksekusi task satu per satu (Rule R4: hanya 1 task berstatus IN_PROGRESS pada satu waktu).
2. DILARANG keras menulis kode produksi di src/ sebelum Gerbang 1 s/d 3 selesai disetujui.
3. Selalu perbarui Write-Ahead Log (WAL) sebelum dan sesudah menyentuh file.

Spesifikasi Proyek:
- Nama Proyek: Web Rental Motor
- Domain: Rental Kendaraan / Sewa Motor (Gunakan profil domain 'booking')
- Stack: React 19, Vite, Tailwind CSS, TypeScript, SQLite / Cloud SQL
- Modus: LITE (Rekomendasi Default)
- Kemampuan: Tulis File & Jalankan Perintah Terminal

Mulai sekarang dengan menghasilkan HANYA file \`BLUEPRINT.md\` (Gerbang 1). Jangan menulis file lain sebelum saya setujui.`;

const EXISTING_PROJECT_AUDIT_PROMPT = `Halo! Kita akan melakukan review, audit, dan penambahan fitur pada proyek yang sudah ada ini menggunakan metodologi **Zero-Loss Context Engineering (ZLCE)**.

ATURAN KETAT:
1. JANGAN mengubah atau menghapus satu baris kode produksi pun saat ini! Ini adalah fase READ-ONLY AUDIT.
2. Tugas Anda saat ini adalah menginspeksi codebase dan menghasilkan berkas kontrol ZLCE:
   - \`BLUEPRINT.md\`: Visi produk, batasan teknis (non-goals), skema modul, dan batasan domain (Gerbang 1).
   - \`TASKS.md\`: Matriks tugas atomik terstruktur (dengan task stabil ditandai DONE dan bukti verifikasinya).
   - \`SESSION_STATE.md\`: Dokumen state ZLCE awal dengan matriks task, timestamp audit, dan WAL kosong.
3. Setelah dokumen tersebut Anda susun, BERHENTI dan berikan ringkasan temuan audit kepada saya untuk ditinjau.

Mulai inspeksi codebase sekarang dan laporkan struktur awal.`;

const FEATURE_REQUEST_PROMPT = `Kita akan menambahkan fitur baru ke dalam proyek existing ini:
Permintaan Fitur: [Tuliskan fitur yang diminta, misal: "Integrasi Payment Gateway Midtrans & Sistem Kupon Diskon Sewa Motor"]

Instruksi Eksekusi ZLCE (Aturan Triase R7):
1. Lakukan Triase Perubahan:
   - Klasifikasikan ukuran perubahan: [Level S] <= 1 berkas, <= 20 baris, tanpa ubah skema/AC / [Level M/L] Perubahan lebih besar (wajib cek ketergantungan).
   - Bila dependen pada task berjalan: ubah Acceptance Criteria task aktif. Bila independen: jadwalkan task baru.
2. Daftarkan tugas baru ke \`TASKS.md\` dan \`SESSION_STATE.md\` sebagai TASK baru dengan status PENDING.
3. Perbarui Write-Ahead Log (WAL) untuk task pertama yang akan dikerjakan.
4. Tunjukkan rencana perubahan kepada saya dan tunggu konfirmasi sebelum mengubah berkas kode.`;

const FORENSIC_COMMANDS = `# 1. Periksa file apa saja yang belum di-commit atau termodifikasi
git status

# 2. Periksa riwayat 5 commit terakhir untuk melacak task terakhir yang selesai
git log -n 5 --oneline

# 3. Jalankan linter atau test untuk memastikan kondisi build saat ini
npm run build || npm test`;

const TAKEOVER_PROMPT = `Halo! Saya melanjutkan pengerjaan proyek ini dengan Anda sebagai AI Agent baru menggunakan metodologi **Zero-Loss Context Engineering (ZLCE v3.2.2)**.

Lampiran Kontrol Wajib (Trio Serah Terima):
1. \`SESSION_STATE.md\` (Sumber kebenaran status sesi aktif)
2. \`TASKS.md\` (Matriks tugas atomik & kriteria verifikasi)
3. \`AI_WORKFLOW.md\` (Aturan kerja otoritatif ZLCE)
(Serta output snapshot git / diff bila pemulihan sesi terputus)

Langkah Transisi yang Wajib Anda Lakukan:
1. Baca Tier 0: \`SESSION_STATE.md\` penuh dan task aktif di \`TASKS.md\`. Bila tidak terlampir: MINTA dan berhenti. Jangan menebak status!
2. Deteksi Mode: Mode RECOVERY bila bagian 3 (WAL) berisi task atau ada snapshot git; selain itu Mode NORMAL.
3. Bila Mode RECOVERY: Klasifikasikan kasus (A: working tree bersih, B: in-flight diff sesuai WAL, C: commit desync di git log, D: wildcard diff). Dilarang keras melakukan git reset!
4. Konfirmasi ringkas status proyek (maksimal 6 baris) sebelum menyentuh atau menulis kode apa pun!`;
