import React, { useState } from 'react';
import { GitPullRequest, ArrowDownCircle, AlertCircle, ShieldCheck, RefreshCw, Terminal, CheckCircle2 } from 'lucide-react';
import { OneTapCopyButton } from './OneTapCopyButton';

interface GitPullSectionProps {
  currentBranch?: string;
  activeTaskId?: string;
}

export const GitPullSection: React.FC<GitPullSectionProps> = ({
  currentBranch = 'v4-mobile',
  activeTaskId = 'TASK-031'
}) => {
  const [targetRemoteBranch, setTargetRemoteBranch] = useState<string>('main');
  const [activeStrategy, setActiveStrategy] = useState<'ff-only' | 'fetch-first' | 'rebase'>('ff-only');

  const fetchCommand = `git fetch origin`;
  const safePullCommand = `git pull --ff-only origin ${targetRemoteBranch}`;
  const combinedSyncCommand = `git fetch origin && git pull --ff-only origin ${targetRemoteBranch}`;
  const rebaseRecoveryCommand = `git fetch origin && git rebase origin/${targetRemoteBranch}`;

  return (
    <section className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-lg space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-cyan-950/80 border border-cyan-700/50 flex items-center justify-center shrink-0">
            <ArrowDownCircle className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              Safe Git Pull &amp; Remote Sync
              <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-700/40">
                --ff-only
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Protokol penarikan aman dari remote bersama tanpa membuat merge commit liar di tablet
            </p>
          </div>
        </div>

        {/* Remote Branch Selector */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <span className="text-xs text-slate-400 font-mono">Remote:</span>
          <select
            value={targetRemoteBranch}
            onChange={(e) => setTargetRemoteBranch(e.target.value)}
            className="touch-target-44 min-h-[44px] bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="main">origin/main (Default Protected)</option>
            <option value="v4-mobile">origin/v4-mobile (Staging Mobile)</option>
            {activeTaskId && <option value={`task/${activeTaskId}`}>origin/task/{activeTaskId}</option>}
          </select>
        </div>
      </div>

      {/* Primary Safe Command Card */}
      <div className="bg-slate-950/90 border border-cyan-800/40 rounded-xl p-3.5 sm:p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold text-slate-200">
              Perintah Safe Pull Utama (Fast-Forward Only)
            </span>
          </div>
          <span className="text-[10px] font-mono text-cyan-400 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/40">
            Kanonik ADR-03
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 font-mono text-xs text-cyan-300 break-all select-all flex items-center justify-between gap-3">
          <code>{combinedSyncCommand}</code>
          <OneTapCopyButton
            textToCopy={combinedSyncCommand}
            label="Salin Safe Pull"
            successLabel="Tersalin!"
            variant="cyan"
          />
        </div>

        <p className="text-[11px] text-slate-400 leading-relaxed">
          Aturan <code className="text-cyan-300 font-mono">--ff-only</code> memastikan Git menolak penarikan bila terjadi divergensi lokal yang belum disetujui, mencegah konflik diam-diam (*silent collision*).
        </p>
      </div>

      {/* Step-by-Step Instructions before Starting Task */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div className="bg-slate-950/70 border border-slate-800/90 rounded-lg p-3 space-y-2">
          <h4 className="font-semibold text-slate-200 flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
            Langkah 1: Fetch &amp; Cek Status Remote
          </h4>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Sebelum memulai task baru, pastikan pohon kerja lokal sinkron dengan upstream GitHub.
          </p>
          <div className="bg-slate-900 rounded p-2 font-mono text-[11px] text-slate-300 flex items-center justify-between">
            <span>{fetchCommand}</span>
            <OneTapCopyButton textToCopy={fetchCommand} variant="ghost" />
          </div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/90 rounded-lg p-3 space-y-2">
          <h4 className="font-semibold text-slate-200 flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            Bila Fast-Forward Ditolak (Divergent Branch)
          </h4>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Gunakan safe rebase atau periksa commit yang mendahului. Jangan pernah gunakan <code className="text-rose-400">git pull -f</code>!
          </p>
          <div className="bg-slate-900 rounded p-2 font-mono text-[11px] text-amber-300 flex items-center justify-between">
            <span>{rebaseRecoveryCommand}</span>
            <OneTapCopyButton textToCopy={rebaseRecoveryCommand} variant="amber" />
          </div>
        </div>
      </div>
    </section>
  );
};
