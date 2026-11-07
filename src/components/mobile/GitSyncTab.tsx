import React, { useState, useMemo } from 'react';
import { 
  GitBranch, 
  GitCommit, 
  GitPullRequest, 
  ShieldCheck, 
  AlertTriangle, 
  Terminal, 
  User, 
  Layers, 
  CheckCircle2, 
  RotateCcw,
  Shield,
  KeyRound,
  ArrowRight
} from 'lucide-react';
import { ParsedSessionState, TabType } from '../../types/zlce';
import { getMemberById, loadTeamRegistry } from '../../data/teamMembers';
import { getBranchNameForTask, isMainBranch, validateBranchCompliance, generateBranchCheckoutCommand } from '../../utils/gitBranchManager';
import { generateIdentityCommitCommand } from '../../utils/gitCommitFormatter';
import { OneTapCopyButton } from './OneTapCopyButton';
import { GitPullSection } from './GitPullSection';
import { SecurityAuthTab } from './SecurityAuthTab';
import { ConflictResolutionWizard } from './ConflictResolutionWizard';

interface GitSyncTabProps {
  sessionState: ParsedSessionState;
  rawMarkdown?: string;
  onNavigateTab?: (tab: TabType) => void;
  onUpdateMarkdown?: (newMd: string) => void;
}

export const GitSyncTab: React.FC<GitSyncTabProps> = ({
  sessionState,
  rawMarkdown = '',
  onNavigateTab,
  onUpdateMarkdown
}) => {
  const [subView, setSubView] = useState<'branch-commit' | 'pull-sync' | 'security' | 'conflicts'>('branch-commit');
  const [customCommitMessage, setCustomCommitMessage] = useState<string>('');
  const [commitScope, setCommitScope] = useState<string>('feat');

  // Active Member resolution
  const activeMemberId = typeof window !== 'undefined'
    ? (localStorage.getItem('zlce_active_member_id') || 'eko')
    : 'eko';
  const activeMember = getMemberById(activeMemberId);

  // Active Task resolution
  const activeTaskId = sessionState.status.activeTask && sessionState.status.activeTask !== '-'
    ? sessionState.status.activeTask
    : (sessionState.status.nextTask || 'TASK-031');

  const currentBranch = sessionState.status.gitBranch || 'v4-mobile';
  const compliance = useMemo(() => {
    return validateBranchCompliance(currentBranch, activeTaskId);
  }, [currentBranch, activeTaskId]);

  const targetBranchName = getBranchNameForTask(activeTaskId);
  const checkoutCommand = generateBranchCheckoutCommand(activeTaskId);

  // Files touched from WAL or default
  const touchedFiles = useMemo(() => {
    const rawPlanned = sessionState.wal.plannedFiles;
    if (!rawPlanned || rawPlanned === '-') {
      return ['SESSION_STATE.md'];
    }
    const parts = rawPlanned.split(/[,;\s]+/).map(p => p.trim()).filter(Boolean);
    if (!parts.includes('SESSION_STATE.md')) {
      parts.unshift('SESSION_STATE.md');
    }
    return parts;
  }, [sessionState.wal.plannedFiles]);

  // Formatted identity commit
  const commitResult = useMemo(() => {
    return generateIdentityCommitCommand({
      taskId: activeTaskId,
      member: activeMember,
      message: customCommitMessage || sessionState.wal.currentStep || 'implementasi task selesai',
      filesToStage: touchedFiles,
      scope: commitScope,
    });
  }, [activeTaskId, activeMember, customCommitMessage, sessionState.wal.currentStep, touchedFiles, commitScope]);

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-indigo-800/40 rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center shrink-0">
              <GitBranch className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  Git Sync &amp; Kolaborasi Cabang Tim
                </h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/50">
                  FASE 6
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Alur kerja 1 repositori bersama, branch per task (`task/TASK-xxx`), dan commit beridentitas anggota tablet.
              </p>
            </div>
          </div>

          {/* Active Member Attribution Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 self-start md:self-center shrink-0">
            <User className="w-4 h-4 text-cyan-400" />
            <div className="text-xs">
              <span className="text-slate-400">Atribusi Commit: </span>
              <strong className="text-white font-mono">{activeMember.name}</strong>
              <span className="text-slate-500 text-[11px]"> ({activeMember.email})</span>
            </div>
          </div>
        </div>

        {/* Warning if on protected main branch */}
        {compliance.isProtected && (
          <div className="mt-4 bg-rose-950/70 border border-rose-600/80 rounded-xl p-3.5 flex items-start gap-3 text-xs text-rose-200">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1.5 flex-1">
              <p className="font-semibold">{compliance.warningMessage}</p>
              {compliance.suggestedCommand && (
                <div className="bg-slate-950/90 rounded p-2 font-mono text-[11px] text-cyan-300 flex items-center justify-between gap-2">
                  <span>{compliance.suggestedCommand}</span>
                  <OneTapCopyButton textToCopy={compliance.suggestedCommand} variant="rose" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sub Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setSubView('branch-commit')}
          className={`touch-target-44 min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition shrink-0 ${
            subView === 'branch-commit'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <GitCommit className="w-4 h-4" />
          <span>Branch &amp; Commit Atomik</span>
        </button>

        <button
          onClick={() => setSubView('pull-sync')}
          className={`touch-target-44 min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition shrink-0 ${
            subView === 'pull-sync'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <GitPullRequest className="w-4 h-4" />
          <span>Safe Pull (--ff-only)</span>
        </button>

        <button
          onClick={() => setSubView('security')}
          className={`touch-target-44 min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition shrink-0 ${
            subView === 'security'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>Credential Cache &amp; Clean-Auth</span>
        </button>

        <button
          onClick={() => setSubView('conflicts')}
          className={`touch-target-44 min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition shrink-0 ${
            subView === 'conflicts'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Resolusi Konflik Cabang</span>
        </button>
      </div>

      {/* SubView 1: Branch & Commit */}
      {subView === 'branch-commit' && (
        <div className="space-y-5">
          {/* Section 1: Branch per Task */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-700/50 flex items-center justify-center">
                  <GitBranch className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Cabang Task Terisolasi (`task/{activeTaskId}`)</h3>
                  <p className="text-xs text-slate-400">Aturan ADR-03: 1 branch per task, dilarang commit di main</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Cabang Aktif:</span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-950 border border-slate-700 text-cyan-300">
                  {currentBranch}
                </span>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Perintah Checkout Cabang Task:</span>
                <span className="font-mono text-cyan-400 text-[11px]">{targetBranchName}</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 font-mono text-xs text-cyan-300 flex items-center justify-between gap-3 break-all">
                <code>{checkoutCommand}</code>
                <OneTapCopyButton textToCopy={checkoutCommand} variant="cyan" />
              </div>
            </div>
          </div>

          {/* Section 2: Injeksi Flag Identitas Commit Otomatis */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-950/80 border border-indigo-700/50 flex items-center justify-center">
                  <GitCommit className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Commit Atomik dengan Flag Identitas Eksplisit</h3>
                  <p className="text-xs text-slate-400">Injeksi -c user.name="{activeMember.name}" tanpa merusak config global</p>
                </div>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-700/40">
                TASK-032
              </span>
            </div>

            {/* Commit Message Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-mono">Scope:</label>
                <select
                  value={commitScope}
                  onChange={(e) => setCommitScope(e.target.value)}
                  className="touch-target-44 min-h-[44px] w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 font-mono text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="feat">feat</option>
                  <option value="fix">fix</option>
                  <option value="docs">docs</option>
                  <option value="test">test</option>
                  <option value="refactor">refactor</option>
                  <option value="chore">chore</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-slate-400 mb-1">Deskripsi Pesan Commit:</label>
                <input
                  type="text"
                  value={customCommitMessage}
                  onChange={(e) => setCustomCommitMessage(e.target.value)}
                  placeholder={`Pesan commit (default: ${sessionState.wal.currentStep || 'selesaikan task'})`}
                  className="touch-target-44 min-h-[44px] w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Generated Command Cards */}
            <div className="space-y-3">
              {/* Full Staged + Identity Commit Command */}
              <div className="bg-slate-950 border border-indigo-900/50 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">
                    Perintah Commit Lengkap (Stage + Identitas Dinamis):
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400">1-Ketukan Salin</span>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 font-mono text-xs text-emerald-300 flex items-center justify-between gap-3 break-all">
                  <code>{commitResult.fullCommand}</code>
                  <OneTapCopyButton textToCopy={commitResult.fullCommand} variant="emerald" />
                </div>
              </div>

              {/* Push Branch Command */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">Perintah Push ke Cabang Bersama:</span>
                  <span className="text-[10px] font-mono text-cyan-400">origin/task/{activeTaskId}</span>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 font-mono text-xs text-cyan-300 flex items-center justify-between gap-3 break-all">
                  <code>{commitResult.pushCommand}</code>
                  <OneTapCopyButton textToCopy={commitResult.pushCommand} variant="cyan" />
                </div>
              </div>

              {/* Combined Atomic All-in-One Command */}
              <div className="bg-slate-950/70 border border-cyan-800/30 rounded-xl p-3 flex items-center justify-between gap-2 text-xs">
                <div>
                  <span className="font-semibold text-cyan-300">Paket Lengkap: </span>
                  <span className="text-slate-400 text-[11px]">Add + Commit + Push dalam 1 eksekusi</span>
                </div>
                <OneTapCopyButton
                  textToCopy={commitResult.combinedCommand}
                  label="Salin Add + Commit + Push"
                  variant="cyan"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SubView 2: Safe Pull */}
      {subView === 'pull-sync' && (
        <GitPullSection currentBranch={currentBranch} activeTaskId={activeTaskId} />
      )}

      {/* SubView 3: Security & Clean-Auth */}
      {subView === 'security' && (
        <SecurityAuthTab />
      )}

      {/* SubView 4: Conflicts */}
      {subView === 'conflicts' && (
        <ConflictResolutionWizard />
      )}
    </div>
  );
};
