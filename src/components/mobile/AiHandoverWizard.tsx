import React, { useState, useMemo, useEffect } from 'react';
import { 
  ArrowRightLeft, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Copy, 
  Download, 
  ExternalLink, 
  ShieldAlert, 
  RotateCcw, 
  ChevronRight, 
  ChevronLeft,
  FileText,
  User,
  Bot,
  Zap,
  Info,
  Check,
  Sliders,
  Filter,
  Search,
  Layers,
  Flame,
  CheckCheck
} from 'lucide-react';
import { ParsedSessionState, TabType, ParsedBacklogTask } from '../../types/zlce';
import { 
  DecisionConflict, 
  AiHandoverReason, 
  ConflictResolutionStatus, 
  TeamMember 
} from '../../types/mobile';
import { TEAM_MEMBERS, getMemberById } from '../../data/teamMembers';
import { 
  detectDecisionConflicts, 
  resolveDecisionConflict, 
  generateHandoverSummaryEntry, 
  applyHandoverToSessionState, 
  generateHandoverPrompt 
} from '../../utils/conflictDetector';
import { getAiBrowserUrl, getModelStopToken } from '../../utils/promptGenerator';
import { downloadMarkdownBlob } from '../../utils/fileExport';
import { copyToClipboard } from '../../utils/clipboard';
import { 
  generateRelayHandover, 
  RelayHandoverOutput, 
  getAIWebUrl 
} from '../../utils/relayHandoverGenerator';
import { TargetAIProvider, TokenBudgetPreset, getAIProviderLabel } from '../../utils/contextPackGenerator';
import { CURRENT_PROJECT_TASKS_MD } from '../../data/templates';
import { parseTasksMarkdown } from '../../utils/markdownParser';

interface AiHandoverWizardProps {
  sessionState: ParsedSessionState;
  rawMarkdown: string;
  onUpdateMarkdown: (newMd: string) => void;
  onNavigateTab?: (tab: TabType) => void;
}

const AI_OPTIONS = [
  { id: 'claude', name: 'Anthropic Claude', models: ['Claude 3.5 Sonnet', 'Claude 3.7 Sonnet', 'Claude 3.5 Haiku'], defaultBudget: 'claude-30k', badge: 'High-Precision' },
  { id: 'gemini', name: 'Google Gemini', models: ['Gemini 2.5 Flash', 'Gemini 2.5 Pro', 'Gemini 3.8 Flash', 'Gemini 1.5 Pro'], defaultBudget: 'gemini-1m', badge: '1M Large Context' },
  { id: 'chatgpt', name: 'OpenAI ChatGPT', models: ['GPT-4o', 'o1-preview', 'o3-mini', 'GPT-4.5'], defaultBudget: 'gpt-128k', badge: 'General Reasoner' },
  { id: 'cursor', name: 'Cursor Composer / Agent', models: ['Claude 3.5 Sonnet (Cursor)', 'Cursor Fast'], defaultBudget: 'cursor-64k', badge: 'IDE Agent' },
  { id: 'copilot', name: 'GitHub Copilot', models: ['Copilot Chat', 'Claude 3.5 Sonnet (Copilot)'], defaultBudget: 'copilot-32k', badge: 'Repo Grounded' },
  { id: 'deepseek', name: 'DeepSeek R1 / V3', models: ['DeepSeek-R1 (Reasoning)', 'DeepSeek-V3'], defaultBudget: 'deepseek-64k', badge: 'Deep Reasoning' },
  { id: 'qwen', name: 'Qwen 2.5 Coder', models: ['Qwen 2.5 32B', 'Qwen 2.5 72B'], defaultBudget: 'deepseek-64k', badge: 'Fast Coding' },
];

const REASON_OPTIONS: { id: AiHandoverReason; label: string; desc: string }[] = [
  { id: 'TOKEN_LIMIT_REACHED', label: 'Rate Limit / Kuota Token Habis', desc: 'Batas kuota harian atau batas pesan per 5 jam pada browser AI sumber tercapai.' },
  { id: 'CONTEXT_EXHAUSTED', label: 'Jendela Konteks Penuh / Amnesia', desc: 'Sesi chat AI sebelumnya terlalu panjang dan mulai mengalami degradasi instruksi.' },
  { id: 'MODEL_CAPABILITY_SWITCH', label: 'Perpindahan Kapabilitas Khusus', desc: 'Beralih ke model dengan spesialisasi lebih tinggi (misal: visual/large context/deep reasoning).' },
  { id: 'SESSION_DISCONNECT', label: 'Sesi / Browser Terputus (Recovery)', desc: 'Tab browser crash, terbunuh Android LMK, atau koneksi jaringan sempat terputus.' },
  { id: 'ROUTINE_ROTATION', label: 'Rotasi Sesi Terencana Tim', desc: 'Pergantian AI sesuai giliran estafet reguler pada backlog task.' },
  { id: 'OTHER', label: 'Alasan Lainnya', desc: 'Catatan manual khusus dari pengemudi tablet.' },
];

export const AiHandoverWizard: React.FC<AiHandoverWizardProps> = ({
  sessionState,
  rawMarkdown,
  onUpdateMarkdown,
  onNavigateTab
}) => {
  // Hub Mode: 'relay' (Mode 1: Mandat Estafet Cepat) vs 'conflict-wizard' (Mode 2: Serah Terima & Deteksi Konflik)
  const [hubMode, setHubMode] = useState<'relay' | 'conflict-wizard'>('relay');

  // Active Member (from localStorage or default)
  const [activeMember, setActiveMember] = useState<TeamMember>(() => {
    try {
      const savedId = localStorage.getItem('zlce_active_member_id') || 'oned';
      return getMemberById(savedId);
    } catch {
      return TEAM_MEMBERS[1]; // Oned
    }
  });

  // Synchronize active member if changed in header
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const savedId = localStorage.getItem('zlce_active_member_id');
        if (savedId) {
          setActiveMember(getMemberById(savedId));
        }
      } catch {
        // ignore
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Backlog task detail map for both modes
  const taskDetailMap = useMemo(() => {
    const parsed = parseTasksMarkdown(CURRENT_PROJECT_TASKS_MD);
    const map = new Map<string, ParsedBacklogTask>();
    parsed.tasks.forEach(t => map.set(t.id, t));
    return map;
  }, []);

  // Default target task detection
  const defaultTask = useMemo(() => {
    if (sessionState.status.activeTask && sessionState.status.activeTask !== '-') {
      return sessionState.status.activeTask;
    }
    const readyTask = sessionState.tasks.find(t => t.status === 'READY');
    if (readyTask) return readyTask.id;
    return 'TASK-017';
  }, [sessionState]);

  // -------------------------------------------------------------
  // STATE MODE 1: GENERATOR ESTAFET MANDAT TUGAS
  // -------------------------------------------------------------
  const [relayTaskId, setRelayTaskId] = useState<string>(defaultTask);
  const [relayAiProvider, setRelayAiProvider] = useState<TargetAIProvider>('claude');
  const [relayHandoverMode, setRelayHandoverMode] = useState<'direct-execution' | 'cidi-handover'>('cidi-handover');
  const [relayPhaseFilter, setRelayPhaseFilter] = useState<string>('ALL');
  const [relayTaskSearch, setRelayTaskSearch] = useState<string>('');
  const [relayCopySuccess, setRelayCopySuccess] = useState<boolean>(false);

  // Filtered task list for Mode 1
  const relayFilteredTasks = useMemo(() => {
    return sessionState.tasks.filter(t => {
      const detail = taskDetailMap.get(t.id);
      const matchesPhase = relayPhaseFilter === 'ALL' || detail?.phase === relayPhaseFilter;
      const matchesSearch = !relayTaskSearch.trim() || 
        t.id.toLowerCase().includes(relayTaskSearch.toLowerCase()) ||
        t.name.toLowerCase().includes(relayTaskSearch.toLowerCase());
      return matchesPhase && matchesSearch;
    });
  }, [sessionState.tasks, taskDetailMap, relayPhaseFilter, relayTaskSearch]);

  // Computed Relay Output for Mode 1
  const relayOutput: RelayHandoverOutput = useMemo(() => {
    return generateRelayHandover({
      taskId: relayTaskId,
      aiProvider: relayAiProvider,
      activeMember,
      sessionState,
      handoverMode: relayHandoverMode,
      taskDetailMap
    });
  }, [relayTaskId, relayAiProvider, activeMember, sessionState, relayHandoverMode, taskDetailMap]);

  const handleCopyRelayPrompt = async () => {
    const success = await copyToClipboard(relayOutput.fullPrompt);
    if (success) {
      setRelayCopySuccess(true);
      setTimeout(() => setRelayCopySuccess(false), 2500);
    }
  };

  const handleDownloadRelayMarkdown = () => {
    downloadMarkdownBlob(
      relayOutput.fullPrompt,
      { filename: relayOutput.filename }
    );
  };

  // -------------------------------------------------------------
  // STATE MODE 2: 3-STEP CONFLICT DETECTOR WIZARD
  // -------------------------------------------------------------
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Source AI state
  const [sourceAi, setSourceAi] = useState<string>('claude');
  const [sourceModelName, setSourceModelName] = useState<string>('Claude 3.5 Sonnet');
  const [handoverReason, setHandoverReason] = useState<AiHandoverReason>('TOKEN_LIMIT_REACHED');
  const [customReasonNote, setCustomReasonNote] = useState<string>('');

  // Target AI state
  const [targetAi, setTargetAi] = useState<string>('gemini');
  const [targetModelName, setTargetModelName] = useState<string>('Gemini 3.8 Flash');

  // Task selection for Mode 2
  const [selectedTaskId, setSelectedTaskId] = useState<string>(defaultTask);

  // Proposal text from target AI or clipboard to scan for conflicts
  const [targetProposalText, setTargetProposalText] = useState<string>('');

  // Conflicts list state
  const [conflicts, setConflicts] = useState<DecisionConflict[]>([]);
  const [hasScanned, setHasScanned] = useState<boolean>(false);

  // Resolution human notes per conflict
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});

  // UI state for Mode 2
  const [wizardCopyStatus, setWizardCopyStatus] = useState<boolean>(false);
  const [applySuccessMessage, setApplySuccessMessage] = useState<string | null>(null);

  // Source AI changes
  const handleSelectSourceAi = (aiId: string) => {
    setSourceAi(aiId);
    const aiOpt = AI_OPTIONS.find(a => a.id === aiId);
    if (aiOpt && aiOpt.models.length > 0) {
      setSourceModelName(aiOpt.models[0]);
    }
    if (targetAi === aiId) {
      const alt = AI_OPTIONS.find(a => a.id !== aiId);
      if (alt) {
        setTargetAi(alt.id);
        setTargetModelName(alt.models[0]);
      }
    }
  };

  const handleSelectTargetAi = (aiId: string) => {
    setTargetAi(aiId);
    const aiOpt = AI_OPTIONS.find(a => a.id === aiId);
    if (aiOpt && aiOpt.models.length > 0) {
      setTargetModelName(aiOpt.models[0]);
    }
    if (targetProposalText.trim()) {
      runConflictScan(aiId, targetProposalText);
    }
  };

  // Run conflict detection engine
  const runConflictScan = (targetAiToScan: string, proposalText: string) => {
    const activeTaskObj = sessionState.tasks.find(t => t.id === selectedTaskId);
    const detected = detectDecisionConflicts({
      sourceAi,
      targetAi: targetAiToScan,
      targetAiProposalText: proposalText,
      currentSessionState: sessionState,
      activeTask: activeTaskObj
    });
    setConflicts(detected);
    setHasScanned(true);
  };

  const handleScanClick = () => {
    runConflictScan(targetAi, targetProposalText);
  };

  // Human Resolution actions for a conflict
  const handleResolveConflict = (conflictId: string, resolution: ConflictResolutionStatus) => {
    const note = resolutionNotes[conflictId] || (
      resolution === 'REJECTED' 
        ? 'Ditolak: Model target wajib tunduk pada baseline Cetak Biru dan ADR-09 ZLCE.' 
        : resolution === 'ACCEPTED'
        ? 'Disetujui: Telah ditinjau dan dinyatakan tidak merusak invarian sistem.'
        : 'Di-override dengan ketentuan adaptif.'
    );

    setConflicts(prev => prev.map(c => {
      if (c.id === conflictId) {
        return resolveDecisionConflict(c, resolution, note, activeMember.name);
      }
      return c;
    }));
  };

  // Generated C-I-D-I Handover Prompt for Wizard
  const generatedHandoverPrompt = useMemo(() => {
    const reasonText = REASON_OPTIONS.find(r => r.id === handoverReason)?.label || handoverReason;
    
    return generateHandoverPrompt({
      sourceAi: `${sourceAi} (${sourceModelName})`,
      targetAi: `${targetAi} (${targetModelName})`,
      reason: `${reasonText}${customReasonNote ? ` - ${customReasonNote}` : ''}`,
      taskId: selectedTaskId,
      activeMember,
      sessionState,
      conflicts,
      customInstructions: customReasonNote
    });
  }, [
    sourceAi, 
    sourceModelName, 
    targetAi, 
    targetModelName, 
    handoverReason, 
    customReasonNote, 
    selectedTaskId, 
    activeMember, 
    sessionState, 
    conflicts
  ]);

  // Generated Section 6 Handover Summary Entry
  const generatedSection6Entry = useMemo(() => {
    return generateHandoverSummaryEntry({
      sourceAi: `${sourceAi} (${sourceModelName})`,
      targetAi: `${targetAi} (${targetModelName})`,
      reason: handoverReason,
      taskId: selectedTaskId,
      conflicts,
      activeMemberName: activeMember.name,
      customNote: customReasonNote
    });
  }, [
    sourceAi, 
    sourceModelName, 
    targetAi, 
    targetModelName, 
    handoverReason, 
    selectedTaskId, 
    conflicts, 
    activeMember, 
    customReasonNote
  ]);

  const handleCopyWizardPrompt = async () => {
    const success = await copyToClipboard(generatedHandoverPrompt);
    if (success) {
      setWizardCopyStatus(true);
      setTimeout(() => setWizardCopyStatus(false), 2500);
    }
  };

  const handleDownloadWizardMarkdown = () => {
    downloadMarkdownBlob(
      generatedHandoverPrompt,
      { filename: `HANDOVER_${selectedTaskId}_${sourceAi}_to_${targetAi}.md` }
    );
  };

  const handleApplyToSessionState = () => {
    const updatedMd = applyHandoverToSessionState(rawMarkdown, generatedSection6Entry);
    onUpdateMarkdown(updatedMd);
    setApplySuccessMessage('Catatan serah terima berhasil disuntikkan ke Bagian 6 SESSION_STATE.md dan tersinkronisasi!');
    setTimeout(() => setApplySuccessMessage(null), 4000);
  };

  return (
    <div className="w-full space-y-4 pb-12">
      {/* Top Banner / Title Bar with Unified Mode Switcher */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-cyan-500 flex items-center justify-center text-white shadow-md shrink-0">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Estafet &amp; Handover AI Terpadu
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  TASK-017 &amp; Invarian I1, I2, I4
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  Semua Model AI
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Pusat kendali serah terima tugas (Relay Mandate) dan penanganan pergantian AI darurat dengan audit pencegahan deviasi keputusan ADR.
              </p>
            </div>
          </div>

          {/* Quick Active Driver Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 self-start md:self-auto shrink-0">
            <User className="w-3.5 h-3.5 text-cyan-400" />
            <span>Driver: <strong className="text-white">{activeMember.name}</strong></span>
            <span className="text-slate-500">|</span>
            <span className="text-cyan-400">{hubMode === 'relay' ? relayTaskId : selectedTaskId}</span>
          </div>
        </div>

        {/* PRIMARY SUB-MODE SWITCHER (Touch Target >= 44px) */}
        <div className="mt-5 pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setHubMode('relay')}
            className={`touch-target-44 min-h-[44px] flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition ${
              hubMode === 'relay'
                ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-lg shadow-amber-950/40 border border-amber-400/50'
                : 'bg-slate-950/70 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Zap className={`w-4 h-4 ${hubMode === 'relay' ? 'text-amber-200' : 'text-slate-400'}`} />
            <span>Mode 1: Mandat Estafet C-I-D-I (Generator Cepat)</span>
          </button>

          <button
            type="button"
            onClick={() => setHubMode('conflict-wizard')}
            className={`touch-target-44 min-h-[44px] flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition relative ${
              hubMode === 'conflict-wizard'
                ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-lg shadow-indigo-950/40 border border-cyan-400/50'
                : 'bg-slate-950/70 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <ShieldAlert className={`w-4 h-4 ${hubMode === 'conflict-wizard' ? 'text-cyan-200' : 'text-slate-400'}`} />
            <span>Mode 2: Serah Terima &amp; Deteksi Konflik (Wizard)</span>
            {conflicts.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950">
                {conflicts.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: MANDAT ESTAFET C-I-D-I (GENERATOR CEPAT) */}
      {/* ========================================================================= */}
      {hubMode === 'relay' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Quick Info & Action Bar */}
          <div className="bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-900 border border-amber-500/30 rounded-xl p-4 sm:p-5 shadow-lg space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                    Generator Mandat Estafet Universal (Invarian I2)
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-950/80 border border-emerald-700/60 text-emerald-300">
                    46 Task Didukung
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-bold text-white mt-1">
                  Pindahkan Pengerjaan {relayOutput.taskId} ke {relayOutput.aiProviderLabel}
                </h2>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                  Menghasilkan prompt terstandarisasi C-I-D-I lengkap dengan aturan anti-placeholder, touch target <code className="text-amber-300 font-mono">min-h-[44px]</code>, dan stop token model.
                </p>
              </div>

              {/* Action Buttons (Touch Target >= 44px) */}
              <div className="flex flex-wrap sm:flex-nowrap gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyRelayPrompt}
                  className="touch-target-44 min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-lg active:scale-95 transition"
                >
                  {relayCopySuccess ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                  <span>{relayCopySuccess ? 'Prompt Tersalin!' : `Salin Prompt ${relayOutput.taskId}`}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadRelayMarkdown}
                  className="touch-target-44 min-h-[44px] flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-mono font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 active:scale-95 transition"
                >
                  <Download className="w-4 h-4 text-cyan-400" />
                  <span>Unduh .md</span>
                </button>

                <a
                  href={getAIWebUrl(relayAiProvider)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="touch-target-44 min-h-[44px] flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-mono font-semibold bg-indigo-950 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-300 active:scale-95 transition"
                >
                  <ExternalLink className="w-4 h-4 text-indigo-400" />
                  <span>Buka {relayOutput.aiProviderLabel}</span>
                </a>
              </div>
            </div>

            {/* Quick Status Bar */}
            <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center gap-2 text-xs font-mono">
              <span className="text-slate-400">Task Aktif:</span>
              <span className="px-2 py-0.5 rounded bg-amber-950/70 border border-amber-800/60 text-amber-300 font-bold">
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

          {/* Interactive Controls Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span>Parameter Generator Mandat Estafet</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRelayTaskId(defaultTask)}
                  className="touch-target-44 min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-mono bg-cyan-950/80 hover:bg-cyan-900/80 border border-cyan-800/60 text-cyan-300 transition"
                >
                  Gunakan Task Aktif: {defaultTask}
                </button>
              </div>
            </div>

            {/* Task Filter & Selection */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-xs font-semibold text-slate-300">
                  1. Pilih Mandat Task ({relayFilteredTasks.length} dari {sessionState.tasks.length} Task):
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {['ALL', 'FASE 0', 'FASE 1', 'FASE 2', 'FASE 3', 'FASE 4', 'FASE 5', 'FASE 6', 'FASE 7', 'FASE 8', 'FASE 9'].map(phase => (
                    <button
                      key={phase}
                      type="button"
                      onClick={() => setRelayPhaseFilter(phase)}
                      className={`px-2 py-1 rounded text-[10px] font-mono transition min-h-[32px] ${
                        relayPhaseFilter === phase
                          ? 'bg-amber-600 text-white font-bold'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {phase}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-2">
                  <select
                    value={relayTaskId}
                    onChange={(e) => setRelayTaskId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-xs text-slate-200 font-mono focus:border-amber-500 focus:outline-none min-h-[44px]"
                  >
                    {relayFilteredTasks.map(t => {
                      const detail = taskDetailMap.get(t.id);
                      return (
                        <option key={t.id} value={t.id}>
                          {t.id}: {t.name} [{t.status}] {detail?.phase ? `(${detail.phase})` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    value={relayTaskSearch}
                    onChange={(e) => setRelayTaskSearch(e.target.value)}
                    placeholder="Cari id / nama task..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:border-amber-500 focus:outline-none min-h-[44px]"
                  />
                </div>
              </div>
            </div>

            {/* AI Provider Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                2. Pilih AI Eksekutor (Target Model Estafet):
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {AI_OPTIONS.map(ai => {
                  const isSelected = relayAiProvider === ai.id;
                  return (
                    <button
                      key={ai.id}
                      type="button"
                      onClick={() => setRelayAiProvider(ai.id as TargetAIProvider)}
                      className={`touch-target-44 min-h-[44px] flex flex-col items-start p-3 rounded-lg border text-left transition ${
                        isSelected
                          ? 'bg-amber-950/60 border-amber-500 text-white shadow'
                          : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-bold text-slate-200">{ai.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                      </div>
                      <span className="text-[10px] text-slate-400 mt-0.5">{ai.badge}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mode & Driver Settings Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  3. Mode Penugasan Mandat:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRelayHandoverMode('cidi-handover')}
                    className={`touch-target-44 min-h-[44px] px-3 py-2 rounded-lg text-xs font-semibold border text-left transition flex items-center justify-between ${
                      relayHandoverMode === 'cidi-handover'
                        ? 'bg-amber-950/60 border-amber-500 text-amber-200 font-bold'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <span>C-I-D-I Handover</span>
                    {relayHandoverMode === 'cidi-handover' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setRelayHandoverMode('direct-execution')}
                    className={`touch-target-44 min-h-[44px] px-3 py-2 rounded-lg text-xs font-semibold border text-left transition flex items-center justify-between ${
                      relayHandoverMode === 'direct-execution'
                        ? 'bg-amber-950/60 border-amber-500 text-amber-200 font-bold'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <span>Direct Execution</span>
                    {relayHandoverMode === 'direct-execution' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  4. Tablet Driver Teratribusi (Invarian I4):
                </label>
                <select
                  value={activeMember.id}
                  onChange={(e) => {
                    const mem = getMemberById(e.target.value);
                    setActiveMember(mem);
                    try {
                      localStorage.setItem('zlce_active_member_id', mem.id);
                    } catch {}
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-xs text-slate-200 font-mono focus:border-amber-500 focus:outline-none min-h-[44px]"
                >
                  {TEAM_MEMBERS.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 5-Step Relay Guide Cards */}
            <div className="pt-2 border-t border-slate-800">
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                5. Alur Eksekusi Estafet di Tablet:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                {relayOutput.steps.map((st) => (
                  <div key={st.stepNumber} className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg space-y-1">
                    <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold font-mono">
                      <span className="w-4 h-4 rounded-full bg-amber-500/20 flex items-center justify-center text-[10px]">
                        {st.stepNumber}
                      </span>
                      <span className="truncate">{st.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">
                      {st.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Generated Prompt Preview */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>Prompt Mandat Terkalkulasi ({relayOutput.filename}):</span>
                </label>
                <span className="text-[11px] font-mono text-slate-400">
                  {relayOutput.charCount.toLocaleString()} karakter • Stop Token: {relayOutput.stopToken}
                </span>
              </div>
              <textarea
                value={relayOutput.fullPrompt}
                readOnly
                rows={10}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-300 font-mono focus:outline-none selection:bg-amber-500 selection:text-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: SERAH TERIMA & DETEKSI KONFLIK (WIZARD 3-LANGKAH) */}
      {/* ========================================================================= */}
      {hubMode === 'conflict-wizard' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Stepper Navigation */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 sm:p-4 grid grid-cols-3 gap-2 sm:gap-4">
            <button
              onClick={() => setCurrentStep(1)}
              className={`touch-target-44 min-h-[44px] flex items-center justify-center sm:justify-start gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                currentStep === 1
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                  : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                currentStep === 1 ? 'bg-cyan-400 text-slate-950' : 'bg-slate-800 text-slate-300'
              }`}>
                1
              </span>
              <span className="truncate">Sumber &amp; Alasan</span>
            </button>

            <button
              onClick={() => setCurrentStep(2)}
              className={`touch-target-44 min-h-[44px] flex items-center justify-center sm:justify-start gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition relative ${
                currentStep === 2
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/50 shadow-sm'
                  : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                currentStep === 2 ? 'bg-indigo-400 text-slate-950' : 'bg-slate-800 text-slate-300'
              }`}>
                2
              </span>
              <span className="truncate">Target &amp; Konflik</span>
              {conflicts.length > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950">
                  {conflicts.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setCurrentStep(3)}
              className={`touch-target-44 min-h-[44px] flex items-center justify-center sm:justify-start gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                currentStep === 3
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm'
                  : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                currentStep === 3 ? 'bg-emerald-400 text-slate-950' : 'bg-slate-800 text-slate-300'
              }`}>
                3
              </span>
              <span className="truncate">Bundle &amp; Ekspor</span>
            </button>
          </div>

          {/* STEP 1: PROFIL SUMBER & ALASAN */}
          {currentStep === 1 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold">1</span>
                  <h2 className="text-sm sm:text-base font-bold text-white">Identifikasi AI Sumber &amp; Task Aktif</h2>
                </div>
                <span className="text-xs text-slate-400">Pilih model asal yang mengalami limit/rotasi</span>
              </div>

              {/* Task Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Task yang Sedang Diestafetkan:
                </label>
                <select
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-xs text-slate-200 font-mono focus:border-cyan-500 focus:outline-none min-h-[44px]"
                >
                  {sessionState.tasks.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.id}: {t.name} ({t.status})
                    </option>
                  ))}
                </select>
              </div>

              {/* Source AI Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  AI Sumber (Model Asal yang Mengalami Limit/Rotasi):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {AI_OPTIONS.map(ai => {
                    const isSelected = sourceAi === ai.id;
                    return (
                      <button
                        key={ai.id}
                        type="button"
                        onClick={() => handleSelectSourceAi(ai.id)}
                        className={`touch-target-44 min-h-[44px] flex flex-col items-start p-3 rounded-lg border text-left transition ${
                          isSelected
                            ? 'bg-cyan-950/60 border-cyan-500 text-white shadow'
                            : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-bold text-slate-200">{ai.name}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                        </div>
                        <span className="text-[10px] text-slate-400 mt-0.5">{ai.badge}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Specific Model Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Versi Spesifik Model Sumber:
                </label>
                <div className="flex flex-wrap gap-2">
                  {AI_OPTIONS.find(a => a.id === sourceAi)?.models.map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSourceModelName(m)}
                      className={`touch-target-44 min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-mono transition border ${
                        sourceModelName === m
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Handover Reason Radio List */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Alasan Perpindahan (Handover Trigger):
                </label>
                <div className="space-y-2">
                  {REASON_OPTIONS.map(r => (
                    <label
                      key={r.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition min-h-[44px] ${
                        handoverReason === r.id
                          ? 'bg-slate-950 border-cyan-500/70 text-slate-100'
                          : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:bg-slate-950'
                      }`}
                    >
                      <input
                        type="radio"
                        name="handoverReason"
                        value={r.id}
                        checked={handoverReason === r.id}
                        onChange={() => setHandoverReason(r.id)}
                        className="mt-0.5 accent-cyan-400"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-200">{r.label}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{r.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Custom Notes input */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Catatan Khusus Sesi Sumber (Opsional):
                </label>
                <textarea
                  value={customReasonNote}
                  onChange={(e) => setCustomReasonNote(e.target.value)}
                  rows={2}
                  placeholder="Contoh: Kode sudah ditulis sampai pembuatan helper, verifikasi npm run build di terminal..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              {/* Current WAL Snapshot info box */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 text-cyan-400 font-semibold">
                  <Info className="w-3.5 h-3.5" />
                  <span>Titik Pemulihan WAL Sesi Saat Ini:</span>
                </div>
                <p className="text-slate-300 font-mono text-[11px]">
                  Langkah Terakhir: <span className="text-emerald-400">{sessionState.wal?.completedSoFar || '-'}</span>
                </p>
                <p className="text-slate-300 font-mono text-[11px]">
                  Langkah Berikutnya: <span className="text-cyan-300">{sessionState.wal?.nextStepExact || '-'}</span>
                </p>
              </div>

              {/* Next Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="touch-target-44 min-h-[44px] px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold text-xs flex items-center gap-2 shadow-md transition active:scale-95"
                >
                  <span>Lanjut ke Langkah 2: Target AI &amp; Pindai Konflik</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: TARGET AI & DETEKSI KONFLIK */}
          {currentStep === 2 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold">2</span>
                  <h2 className="text-sm sm:text-base font-bold text-white">Target AI &amp; Deteksi Konflik Keputusan</h2>
                </div>
                <span className="text-xs text-slate-400">Pindai inkonsistensi arsitektur atau deviasi ADR</span>
              </div>

              {/* Target AI Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Pilih AI Penerima Estafet (Target AI):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {AI_OPTIONS.map(ai => {
                    const isSelected = targetAi === ai.id;
                    const isSource = sourceAi === ai.id;
                    return (
                      <button
                        key={ai.id}
                        type="button"
                        disabled={isSource}
                        onClick={() => handleSelectTargetAi(ai.id)}
                        className={`touch-target-44 min-h-[44px] flex flex-col items-start p-3 rounded-lg border text-left transition ${
                          isSource
                            ? 'opacity-40 cursor-not-allowed bg-slate-950 border-slate-900'
                            : isSelected
                            ? 'bg-indigo-950/60 border-indigo-500 text-white shadow'
                            : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-bold text-slate-200">{ai.name}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                        </div>
                        <span className="text-[10px] text-slate-400 mt-0.5">{ai.badge}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Specific Target Model Version */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Versi Spesifik Model Penerima:
                </label>
                <div className="flex flex-wrap gap-2">
                  {AI_OPTIONS.find(a => a.id === targetAi)?.models.map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setTargetModelName(m)}
                      className={`touch-target-44 min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-mono transition border ${
                        targetModelName === m
                          ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50 font-bold'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Proposal Paste Area */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    Tempelkan Usulan / Respons Target AI (Opsional untuk Pindai Deviasi):
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setTargetProposalText('Saya usulkan kita pakai Obsidian plugin dan integrasikan server Express...');
                    }}
                    className="text-[11px] text-indigo-400 hover:underline font-mono"
                  >
                    [Coba Contoh Sampel Konflik ADR]
                  </button>
                </div>
                <textarea
                  value={targetProposalText}
                  onChange={(e) => setTargetProposalText(e.target.value)}
                  rows={4}
                  placeholder="Tempelkan jawaban atau rencana awal dari AI target di sini untuk menguji apakah ada divergensi arsitektur terhadap ADR ZLCE..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 font-mono focus:border-indigo-500 focus:outline-none"
                />
                <div className="flex justify-between items-center pt-1">
                  <span className="text-[11px] text-slate-500">
                    Mesin memindai: ADR-09 Obsidian, Aturan 1 Task IN_PROGRESS, Commit ke main, Larangan Placeholder, dan Stack Backend.
                  </span>
                  <button
                    type="button"
                    onClick={handleScanClick}
                    className="touch-target-44 min-h-[44px] px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Pindai Konflik Sekarang</span>
                  </button>
                </div>
              </div>

              {/* CONFLICTS LIST SECTION */}
              <div className="border-t border-slate-800 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                    <span>Hasil Deteksi Konflik Keputusan ({conflicts.length})</span>
                  </h3>
                  {conflicts.length === 0 ? (
                    <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded">
                      BEBAS KONFLIK (100% KONSISTEN)
                    </span>
                  ) : (
                    <span className="text-[11px] font-mono text-amber-400 bg-amber-950/60 border border-amber-800/80 px-2 py-0.5 rounded">
                      TERDETEKSI {conflicts.length} DIVERGENSI (PERLU KONFIRMASI MANUSIA)
                    </span>
                  )}
                </div>

                {conflicts.length === 0 ? (
                  <div className="p-4 bg-emerald-950/20 border border-emerald-900/40 rounded-xl text-center space-y-1">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
                    <p className="text-xs font-semibold text-emerald-300">
                      Tidak Ditemukan Inkonsistensi Keputusan
                    </p>
                    <p className="text-[11px] text-slate-400">
                      AI target siap menerima estafet tugas secara bersih mengikuti invarian ZLCE.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {conflicts.map(conf => {
                      const isPending = conf.resolutionStatus === 'PENDING_HUMAN';
                      const isRejected = conf.resolutionStatus === 'REJECTED';
                      const isAccepted = conf.resolutionStatus === 'ACCEPTED';
                      const isOverridden = conf.resolutionStatus === 'OVERRIDDEN';

                      return (
                        <div
                          key={conf.id}
                          className={`p-3.5 rounded-xl border space-y-2.5 transition ${
                            isPending
                              ? 'bg-amber-950/30 border-amber-700/60'
                              : isRejected
                              ? 'bg-slate-950 border-rose-800/60'
                              : isAccepted
                              ? 'bg-slate-950 border-emerald-800/60'
                              : 'bg-slate-950 border-cyan-800/60'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                conf.severity === 'HIGH'
                                  ? 'bg-rose-900/60 text-rose-300 border border-rose-700'
                                  : 'bg-amber-900/60 text-amber-300 border border-amber-700'
                              }`}>
                                {conf.code}
                              </span>
                              <h4 className="text-xs font-bold text-slate-100">{conf.title}</h4>
                            </div>

                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                              isPending
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                                : isRejected
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                : isAccepted
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            }`}>
                              {conf.resolutionStatus}
                            </span>
                          </div>

                          <p className="text-xs text-slate-300">{conf.description}</p>

                          <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80 text-[11px] space-y-1">
                            <p className="text-slate-400">
                              <strong>Baseline Cetak Biru:</strong> <span className="text-emerald-400 font-mono">{conf.anchorBaseline}</span>
                            </p>
                            <p className="text-slate-400">
                              <strong>Usulan AI Target:</strong> <span className="text-rose-300 font-mono">{conf.sourceAiProposal}</span>
                            </p>
                            {conf.humanNotes && (
                              <p className="text-slate-300 border-t border-slate-800 pt-1 mt-1">
                                <strong>Catatan Operator ({conf.resolvedBy || activeMember.name}):</strong> {conf.humanNotes}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleResolveConflict(conf.id, 'REJECTED')}
                              className={`touch-target-44 min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border ${
                                isRejected
                                  ? 'bg-rose-600 text-white border-rose-500'
                                  : 'bg-slate-900 text-rose-300 border-rose-800/80 hover:bg-rose-950/50'
                              }`}
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Tolak Usulan (Patuhi Baseline)</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleResolveConflict(conf.id, 'ACCEPTED')}
                              className={`touch-target-44 min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border ${
                                isAccepted
                                  ? 'bg-emerald-600 text-white border-emerald-500'
                                  : 'bg-slate-900 text-emerald-300 border-emerald-800/80 hover:bg-emerald-950/50'
                              }`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Setujui Modifikasi</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleResolveConflict(conf.id, 'OVERRIDDEN')}
                              className={`touch-target-44 min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border ${
                                isOverridden
                                  ? 'bg-cyan-600 text-white border-cyan-500'
                                  : 'bg-slate-900 text-cyan-300 border-cyan-800/80 hover:bg-cyan-950/50'
                              }`}
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Override Khusus</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Stepper Navigation Buttons */}
              <div className="flex justify-between items-center pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="touch-target-44 min-h-[44px] px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Kembali ke Langkah 1</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="touch-target-44 min-h-[44px] px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-xs flex items-center gap-2 shadow-md transition active:scale-95"
                >
                  <span>Lanjut ke Langkah 3: Ekspor Handover</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: HANDOVER BUNDLE & EKSPOR */}
          {currentStep === 3 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">3</span>
                  <h2 className="text-sm sm:text-base font-bold text-white">Bundel Handover C-I-D-I &amp; Sinkronisasi</h2>
                </div>
                <span className="text-xs text-slate-400">Siap disalin ke browser target AI</span>
              </div>

              {/* Summary Banner */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-slate-400">
                    Estafet: <strong className="text-cyan-400">{sourceAi}</strong> &rarr; <strong className="text-emerald-400">{targetAi}</strong>
                  </span>
                  <span className="text-slate-400">
                    Task: <strong className="text-white font-mono">{selectedTaskId}</strong>
                  </span>
                  <span className="text-slate-400">
                    Operator: <strong className="text-slate-200">{activeMember.name}</strong>
                  </span>
                </div>

                {/* Canonical Section 6 Preview */}
                <div className="pt-2 border-t border-slate-800/80">
                  <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Ringkasan Serah Terima untuk Bagian 6 SESSION_STATE.md:
                  </span>
                  <div className="p-2.5 bg-slate-900 rounded-lg text-emerald-300 font-mono text-[11px] border border-slate-800">
                    {generatedSection6Entry}
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleCopyWizardPrompt}
                  className="touch-target-44 min-h-[44px] px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-2 shadow transition active:scale-95"
                >
                  {wizardCopyStatus ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                  <span>{wizardCopyStatus ? 'Tersalin ke Clipboard!' : 'Salin Prompt C-I-D-I'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleApplyToSessionState}
                  className="touch-target-44 min-h-[44px] px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-2 shadow transition active:scale-95"
                >
                  <Zap className="w-4 h-4" />
                  <span>Perbarui Bagian 6 State</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadWizardMarkdown}
                  className="touch-target-44 min-h-[44px] px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh .md (LF Murni)</span>
                </button>

                <a
                  href={getAiBrowserUrl(targetAi)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="touch-target-44 min-h-[44px] px-4 py-2.5 bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/60 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Buka Web {targetAi}</span>
                </a>
              </div>

              {/* Notification message after update */}
              {applySuccessMessage && (
                <div className="p-3 bg-emerald-950/80 border border-emerald-600 rounded-lg text-emerald-200 text-xs flex items-center gap-2 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{applySuccessMessage}</span>
                </div>
              )}

              {/* Full Handover Prompt Markdown Area */}
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Isi Prompt Handover Mandatori (Format Kanonik C-I-D-I):</span>
                  </label>
                  <span className="text-[11px] font-mono text-slate-400">
                    {generatedHandoverPrompt.length} karakter • Stop Token: {getModelStopToken((targetAi.toLowerCase() as any) || 'gemini')}
                  </span>
                </div>
                <textarea
                  value={generatedHandoverPrompt}
                  readOnly
                  rows={12}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-300 font-mono focus:outline-none selection:bg-cyan-500 selection:text-white"
                />
              </div>

              {/* Stepper Navigation Buttons */}
              <div className="flex justify-between items-center pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="touch-target-44 min-h-[44px] px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Kembali ke Langkah 2: Target &amp; Konflik</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (onNavigateTab) {
                      onNavigateTab('session');
                    }
                  }}
                  className="touch-target-44 min-h-[44px] px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <span>Buka Tab SESSION_STATE</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
