import React from 'react';
import { 
  FileText, 
  Terminal, 
  RotateCcw, 
  GitFork, 
  CheckCircle2, 
  BookOpen, 
  ShieldCheck, 
  Clock, 
  Cpu,
  GraduationCap,
  Maximize2,
  Undo2,
  Redo2,
  LayoutDashboard,
  Users,
  Database,
  Layers,
  Sparkles,
  ClipboardCheck,
  ArrowRightLeft,
  Tablet,
  History,
  GitBranch
} from 'lucide-react';
import { TabType, ValidationResult } from '../types/zlce';
import { TokenUsageGauge } from './TokenUsageGauge';
import { DiskSyncState } from '../hooks/useSessionPersistence';
import { ActiveMemberSelector } from './mobile/ActiveMemberSelector';
import { ProjectSwitcher } from './mobile/ProjectSwitcher';
import { DeviceHandoverModal } from './mobile/DeviceHandoverModal';
import { getMemberById } from '../data/teamMembers';

interface HeaderProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  validation: ValidationResult;
  onRunLinter: () => void;
  rawMarkdown?: string;
  onUpdateMarkdown?: (newMd: string) => void;
  onToggleFullscreen?: () => void;
  persistence?: {
    canUndo: boolean;
    canRedo: boolean;
    undo: () => boolean;
    redo: () => boolean;
    restoreFromStorage: () => boolean;
    resetToDefault?: () => void;
    lastSaved: Date | null;
    isSaved: boolean;
    hasStoredSession: boolean;
    diskSync?: DiskSyncState;
    reloadFromDisk?: () => Promise<boolean>;
    saveToDiskNow?: () => Promise<boolean>;
  };
}

const HeaderComponent: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  validation,
  onRunLinter,
  rawMarkdown = '',
  onUpdateMarkdown,
  onToggleFullscreen,
  persistence
}) => {
  const [isHandoverModalOpen, setIsHandoverModalOpen] = React.useState(false);
  const secondaryTabs: TabType[] = React.useMemo(() => [
    'session-timeline',
    'harness',
    'tutorial',
    'prompt-engine',
    'runtime-engine',
    'recovery',
    'triage',
    'initiation',
    'templates'
  ], []);
  const [showSecondaryTabs, setShowSecondaryTabs] = React.useState<boolean>(() => {
    return secondaryTabs.includes(activeTab);
  });

  // Auto-reveal secondary tabs if activeTab is in secondary set
  React.useEffect(() => {
    if (secondaryTabs.includes(activeTab)) {
      setShowSecondaryTabs(true);
    }
  }, [activeTab, secondaryTabs]);

  const activeMemberId = typeof window !== 'undefined' 
    ? (localStorage.getItem('zlce_active_member_id') || 'eko') 
    : 'eko';
  const activeMember = getMemberById(activeMemberId);

  return (
    <header className="border-b border-slate-800/80 bg-slate-900/98 sticky top-0 z-30 shadow-md w-full">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        {/* Top Operational Bar: Strict Single Row on Any Screen Width */}
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2 w-full">
          {/* Logo & Platform Identity */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg ring-1 ring-white/10 shrink-0">
              <Cpu className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-sm sm:text-base lg:text-lg text-white tracking-tight truncate">
                  ZLCE Studio
                </span>
                <span className="text-[10px] sm:text-[11px] font-mono text-cyan-400 font-semibold shrink-0">
                  v4.0.0
                </span>
                <span className="hidden lg:inline text-xs text-slate-600">·</span>
                <span className="hidden lg:inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  SM-T225
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 hidden md:block truncate max-w-xs lg:max-w-md">
                Zero-Loss Context Engineering · Tim Estafet 8 Anggota
              </p>
            </div>
          </div>

          {/* Controls: Responsive and Prioritized to prevent wrapping */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
            {/* Project Switcher */}
            <ProjectSwitcher />

            {/* Active Tablet Driver Selector */}
            <ActiveMemberSelector />

            {/* Tombol Serah Terima Tablet Bersama (TASK-022) */}
            <button
              onClick={() => setIsHandoverModalOpen(true)}
              className="touch-target-44 min-h-[44px] flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-950/70 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-700/60 transition shrink-0 active:scale-95 shadow-sm"
              title="Wizard Serah Terima Tablet & Clean-Auth (TASK-022)"
            >
              <Tablet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-400" />
              <span className="hidden sm:inline">Oper Tablet</span>
            </button>

            {/* Live Token Usage Indicator (Desktop only) */}
            <div className="hidden lg:block">
              <TokenUsageGauge rawMarkdown={rawMarkdown} variant="compact" />
            </div>

            {/* Quick State Health Linter Badge */}
            <button
              onClick={onRunLinter}
              className={`touch-target-44 min-h-[44px] flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-mono transition-all border shrink-0 ${
                validation.valid
                  ? 'bg-emerald-950/70 text-emerald-300 border-emerald-700/60 hover:bg-emerald-900/70'
                  : 'bg-rose-950/70 text-rose-300 border-rose-700/60 hover:bg-rose-900/70'
              }`}
              title="Klik untuk re-evaluasi integritas SESSION_STATE.md"
            >
              <ShieldCheck className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${validation.valid ? 'text-emerald-400' : 'text-rose-400 animate-pulse'}`} />
              <span className="font-semibold hidden sm:inline">
                {validation.valid ? 'OK' : 'ERR'}
              </span>
              <span className="text-slate-400 text-[11px]">({validation.errorsCount})</span>
            </button>

            {/* Persistence Controls: Hidden on mobile phones to prevent overflow */}
            {persistence && (
              <div className="hidden md:flex items-center space-x-1 pl-1 border-l border-slate-800 shrink-0">
                {/* Real-time Disk Sync indicator */}
                {persistence.diskSync && (
                  <div 
                    className={`hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 min-h-[44px] rounded-lg border text-[11px] font-mono select-none ${
                      persistence.diskSync.isSaving
                        ? 'bg-amber-950/70 border-amber-600/70 text-amber-300'
                        : persistence.diskSync.isLive
                        ? 'bg-emerald-950/60 border-emerald-600/60 text-emerald-300'
                        : 'bg-slate-950/70 border-slate-800 text-slate-400'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${
                      persistence.diskSync.isSaving
                        ? 'bg-amber-400 animate-ping'
                        : persistence.diskSync.isLive
                        ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                        : 'bg-slate-500'
                    }`} />
                    <span className="font-semibold">
                      {persistence.diskSync.isLive ? 'Disk Synced' : 'Disk Offline'}
                    </span>
                  </div>
                )}

                {/* Force Sync from Disk Button */}
                {persistence.reloadFromDisk && (
                  <button
                    onClick={() => persistence.reloadFromDisk && persistence.reloadFromDisk()}
                    disabled={persistence.diskSync?.isReading}
                    className="touch-target-44 min-h-[44px] flex items-center justify-center p-2 rounded-lg text-xs font-mono bg-slate-900 border border-slate-700/80 hover:border-emerald-500/60 hover:bg-slate-800 text-slate-200 transition"
                    title="Muat ulang langsung dari disk /SESSION_STATE.md"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 text-emerald-400 ${persistence.diskSync?.isReading ? 'animate-spin' : ''}`} />
                  </button>
                )}

                {/* Undo Button */}
                <button
                  onClick={() => persistence.undo()}
                  disabled={!persistence.canUndo}
                  className={`touch-target-44 min-h-[44px] flex items-center justify-center p-2 rounded-lg text-xs font-mono transition border ${
                    persistence.canUndo
                      ? 'bg-slate-900 border-slate-700/80 hover:border-cyan-500/60 hover:bg-slate-800 text-slate-200'
                      : 'bg-slate-950/40 border-slate-850 text-slate-600 cursor-not-allowed opacity-50'
                  }`}
                  title="Undo (Ctrl+Z)"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                </button>

                {/* Redo Button */}
                <button
                  onClick={() => persistence.redo()}
                  disabled={!persistence.canRedo}
                  className={`touch-target-44 min-h-[44px] flex items-center justify-center p-2 rounded-lg text-xs font-mono transition border ${
                    persistence.canRedo
                      ? 'bg-slate-900 border-slate-700/80 hover:border-cyan-500/60 hover:bg-slate-800 text-slate-200'
                      : 'bg-slate-950/40 border-slate-850 text-slate-600 cursor-not-allowed opacity-50'
                  }`}
                  title="Redo (Ctrl+Y)"
                >
                  <Redo2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {onToggleFullscreen && (
              <button
                onClick={onToggleFullscreen}
                className="hidden sm:flex touch-target-44 min-h-[44px] items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono bg-slate-950/80 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900 text-slate-300 transition shrink-0"
                title="Buka Editor Layar Penuh"
              >
                <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden md:inline">Fullscreen</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation: Pure Horizontal Touch Scroll - NEVER Wraps or Stacks */}
        <nav className="flex items-center space-x-1 sm:space-x-1.5 overflow-x-auto pb-2 pt-1 scrollbar-none w-full flex-nowrap min-w-0 border-t border-slate-800/60">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`touch-target-44 min-h-[44px] shrink-0 whitespace-nowrap flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'dashboard'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <LayoutDashboard className={`w-4 h-4 shrink-0 ${activeTab === 'dashboard' ? 'text-cyan-400' : 'text-slate-400'}`} />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('session')}
            className={`touch-target-44 min-h-[44px] shrink-0 whitespace-nowrap flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'session'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <FileText className={`w-4 h-4 shrink-0 ${activeTab === 'session' ? 'text-cyan-400' : 'text-slate-400'}`} />
            <span>SESSION_STATE &amp; WAL</span>
          </button>

          <button
            onClick={() => setActiveTab('workspace-reader')}
            className={`touch-target-44 min-h-[44px] shrink-0 whitespace-nowrap flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'workspace-reader'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <BookOpen className={`w-4 h-4 shrink-0 ${activeTab === 'workspace-reader' ? 'text-purple-400' : 'text-slate-400'}`} />
            <span>Workspace Reader</span>
          </button>

          <button
            onClick={() => setActiveTab('context-pack')}
            className={`touch-target-44 min-h-[44px] shrink-0 whitespace-nowrap flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'context-pack' || activeTab === 'prompt-engine'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className={`w-4 h-4 shrink-0 ${activeTab === 'context-pack' || activeTab === 'prompt-engine' ? 'text-amber-400' : 'text-slate-400'}`} />
            <span>Context &amp; Prompt Hub</span>
          </button>

          <button
            onClick={() => setActiveTab('result-capture')}
            className={`touch-target-44 min-h-[44px] shrink-0 whitespace-nowrap flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'result-capture'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/50 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <ClipboardCheck className={`w-4 h-4 shrink-0 ${activeTab === 'result-capture' ? 'text-teal-400' : 'text-slate-400'}`} />
            <span>Result Capture</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-teal-900/60 text-teal-200">I4</span>
          </button>

          <button
            onClick={() => setActiveTab('ai-handover')}
            className={`touch-target-44 min-h-[44px] shrink-0 whitespace-nowrap flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'ai-handover'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/50 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <ArrowRightLeft className={`w-4 h-4 shrink-0 ${activeTab === 'ai-handover' ? 'text-indigo-400' : 'text-slate-400'}`} />
            <span>Estafet &amp; Handover AI</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-900/60 text-indigo-200">TASK-017</span>
          </button>

          <button
            onClick={() => setActiveTab('command-hub')}
            className={`touch-target-44 min-h-[44px] shrink-0 whitespace-nowrap flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'command-hub'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Terminal className={`w-4 h-4 shrink-0 ${activeTab === 'command-hub' ? 'text-cyan-400' : 'text-slate-400'}`} />
            <span>Command Hub</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-900/60 text-cyan-200">TASK-025</span>
          </button>

          <button
            onClick={() => setActiveTab('git-sync')}
            className={`touch-target-44 min-h-[44px] shrink-0 whitespace-nowrap flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'git-sync'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/50 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <GitBranch className={`w-4 h-4 shrink-0 ${activeTab === 'git-sync' ? 'text-indigo-400' : 'text-slate-400'}`} />
            <span>Git Sync</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-900/60 text-indigo-200">FASE 6</span>
          </button>

          <button
            onClick={() => setActiveTab('feedback')}
            className={`touch-target-44 min-h-[44px] shrink-0 whitespace-nowrap flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'feedback'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/50 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <ClipboardCheck className={`w-4 h-4 shrink-0 ${activeTab === 'feedback' ? 'text-indigo-400' : 'text-slate-400'}`} />
            <span>Audit &amp; Feedback</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-900/60 text-indigo-200">FASE 9</span>
          </button>

          {/* Toggle Button for Secondary / Diagnostic Tabs */}
          <button
            type="button"
            onClick={() => setShowSecondaryTabs(!showSecondaryTabs)}
            className={`touch-target-44 min-h-[44px] shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
              showSecondaryTabs
                ? 'bg-slate-800 border-slate-700 text-cyan-300 shadow-inner'
                : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
            title="Tampilkan / sembunyikan 5 alat diagnostik dan pendukung"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>{showSecondaryTabs ? 'Sembunyikan Alat (5)' : '+ Alat Lainnya (5)...'}</span>
          </button>

          {/* Collapsible Secondary Diagnostic Tabs */}
          {showSecondaryTabs && (
            <>
              <button
                onClick={() => setActiveTab('session-timeline')}
                className={`touch-target-44 min-h-[44px] shrink-0 whitespace-nowrap flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'session-timeline'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <History className={`w-4 h-4 shrink-0 ${activeTab === 'session-timeline' ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>Timeline</span>
              </button>

              <button
                onClick={() => setActiveTab('harness')}
                className={`touch-target-44 min-h-[44px] shrink-0 whitespace-nowrap flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'harness'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <CheckCircle2 className={`w-4 h-4 shrink-0 ${activeTab === 'harness' ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>Test Harness</span>
              </button>

              <button
                onClick={() => setActiveTab('tutorial')}
                className={`touch-target-44 min-h-[44px] shrink-0 whitespace-nowrap flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'tutorial'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm'
                    : 'text-emerald-400/90 hover:text-emerald-200 hover:bg-emerald-950/40'
                }`}
              >
                <GraduationCap className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>Panduan</span>
              </button>

              <button
                onClick={() => setActiveTab('triage')}
                className={`touch-target-44 min-h-[44px] shrink-0 whitespace-nowrap flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'triage'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <GitFork className={`w-4 h-4 shrink-0 ${activeTab === 'triage' ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>Triase Revisi (R7)</span>
              </button>

              <button
                onClick={() => setActiveTab('initiation')}
                className={`touch-target-44 min-h-[44px] shrink-0 whitespace-nowrap flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'initiation'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Terminal className={`w-4 h-4 shrink-0 ${activeTab === 'initiation' ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>Inisiasi 4 Gerbang</span>
              </button>
            </>
          )}
        </nav>
      </div>

      {/* Modal Serah Terima Tablet Bersama & Clean-Auth (TASK-022) */}
      <DeviceHandoverModal
        isOpen={isHandoverModalOpen}
        onClose={() => setIsHandoverModalOpen(false)}
        outgoingMember={activeMember}
        currentMarkdown={rawMarkdown}
        onHandoverComplete={(_, updatedMd) => {
          onUpdateMarkdown?.(updatedMd);
        }}
      />
    </header>
  );
};

export const Header = React.memo(HeaderComponent);
