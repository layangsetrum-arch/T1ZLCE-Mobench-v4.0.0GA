import React from 'react';
import { 
  Cpu, 
  Zap, 
  Sliders, 
  ShieldCheck, 
  Check, 
  Scissors, 
  Activity, 
  Sparkles, 
  AlertTriangle,
  Info
} from 'lucide-react';
import { TokenBudgetPreset } from '../../utils/contextPackGenerator';
import { 
  MODEL_BUDGET_PROFILES, 
  getAllBudgetProfiles, 
  calculateTokenSafety, 
  ModelBudgetProfile 
} from '../../utils/tokenBudgetAdapter';

interface TokenBudgetSelectorProps {
  selectedPreset: TokenBudgetPreset;
  onSelectPreset: (preset: TokenBudgetPreset) => void;
  tokenCount: number;
  tokensSaved?: number;
  isPruned?: boolean;
  enableAutoPruning?: boolean;
  onToggleAutoPruning?: (enabled: boolean) => void;
  pruningNotes?: string[];
}

export const TokenBudgetSelector: React.FC<TokenBudgetSelectorProps> = ({
  selectedPreset,
  onSelectPreset,
  tokenCount,
  tokensSaved = 0,
  isPruned = false,
  enableAutoPruning = true,
  onToggleAutoPruning,
  pruningNotes = []
}) => {
  const profiles = getAllBudgetProfiles();
  const currentProfile = MODEL_BUDGET_PROFILES[selectedPreset];
  const safety = calculateTokenSafety(tokenCount, selectedPreset);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-cyan-500/10 rounded-lg text-cyan-400 border border-cyan-500/20">
              <Cpu className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Adapter Kuota Token &amp; Budget AI</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                TASK-014
              </span>
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            Pilih profil target model untuk mengadaptasi ukuran Context Pack dan mencegah kuota terlampaui.
          </p>
        </div>

        {/* Safety Status Badge */}
        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 border ${
              safety.status === 'safe'
                ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300'
                : safety.status === 'warning'
                ? 'bg-amber-950/60 border-amber-800/80 text-amber-300'
                : 'bg-rose-950/60 border-rose-800/80 text-rose-300'
            }`}
          >
            {safety.status === 'safe' ? (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            ) : safety.status === 'warning' ? (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Activity className="w-3.5 h-3.5 text-rose-400" />
            )}
            <span>{safety.statusLabel}</span>
          </span>
        </div>
      </div>

      {/* Profile Selector Cards Grid (Acceptance Criteria 1) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
        {profiles.map((prof: ModelBudgetProfile) => {
          const isSelected = selectedPreset === prof.id;
          return (
            <button
              key={prof.id}
              onClick={() => onSelectPreset(prof.id)}
              className={`touch-target-44 min-h-[44px] p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                isSelected
                  ? 'bg-gradient-to-b from-slate-800 to-slate-900 border-cyan-500 shadow-md ring-1 ring-cyan-500/40 text-white'
                  : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:bg-slate-800/40'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                    prof.id === 'deepseek-64k'
                      ? 'bg-sky-950 text-sky-300 border-sky-800/60'
                      : prof.id === 'freebuff-4k'
                      ? 'bg-rose-950 text-rose-300 border-rose-800/60'
                      : prof.contextCategory === 'large'
                      ? 'bg-cyan-950 text-cyan-300 border-cyan-800/60'
                      : prof.contextCategory === 'mid'
                      ? 'bg-amber-950 text-amber-300 border-amber-800/60'
                      : 'bg-emerald-950 text-emerald-300 border-emerald-800/60'
                  }`}>
                    {prof.badgeLabel}
                  </span>
                  {isSelected && (
                    <span className="p-0.5 bg-cyan-500 rounded-full text-slate-950">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>

                <div className="font-bold text-xs text-slate-100 pt-1">
                  {prof.name}
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                  {prof.description}
                </p>
              </div>

              <div className="pt-2 mt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>Safe Window:</span>
                <span className="text-slate-200 font-semibold">{prof.safeWindowTokens.toLocaleString()} tkn</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Visual Token Usage Gauge (Acceptance Criteria 2) */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/90 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-300">Estimasi Token Context Pack:</span>
            <span className="text-base font-bold text-white tracking-tight">
              ~{tokenCount.toLocaleString()} <span className="text-xs font-normal text-slate-400">tokens</span>
            </span>
            {tokensSaved > 0 && (
              <span className="px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-800/60 text-emerald-300 text-[11px] font-bold flex items-center gap-1">
                <Scissors className="w-3 h-3" />
                <span>Hemat ~{tokensSaved.toLocaleString()} tkn</span>
              </span>
            )}
          </div>

          <div className="text-slate-400 text-xs">
            Batas Aman Model: <strong className="text-slate-200">{currentProfile.safeWindowTokens.toLocaleString()}</strong> ({safety.percentage}% terpakai)
          </div>
        </div>

        {/* Progress Bar with Dynamic Color */}
        <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800 p-0.5">
          <div
            style={{ width: `${Math.min(100, Math.max(3, safety.percentage))}%` }}
            className={`h-full rounded-full transition-all duration-300 ${
              safety.status === 'safe'
                ? 'bg-gradient-to-r from-cyan-500 to-emerald-400'
                : safety.status === 'warning'
                ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                : 'bg-gradient-to-r from-rose-500 to-red-600'
            }`}
          />
        </div>

        {/* Footnote Details */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400 pt-0.5">
          <span>Rekomendasi Peran: <span className="text-slate-300">{currentProfile.recommendedRole}</span></span>
          <span>Sisa Kuota Aman: <strong className="text-emerald-400">~{safety.remainingTokens.toLocaleString()} tokens</strong></span>
        </div>
      </div>

      {/* Smart Context Pruning Control (Acceptance Criteria 3) */}
      <div className="bg-gradient-to-r from-slate-950 to-indigo-950/20 p-3 sm:p-3.5 rounded-xl border border-indigo-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-2.5">
          <Scissors className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-white block">
              Pemangkasan Cerdas (Smart Context Pruning) — Invarian I1 &amp; I2
            </span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Otomatis meringkas log audit historis lama dan hanya menyertakan 3 entri terkini pada profil kompak, menjaga utuh Mandat Task Aktif, Status Sesi, dan WAL.
            </p>
            {isPruned && pruningNotes.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {pruningNotes.map((note, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800/50 text-[10px] text-emerald-300 font-mono">
                    ✓ {note}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {onToggleAutoPruning && (
          <button
            onClick={() => onToggleAutoPruning(!enableAutoPruning)}
            className={`touch-target-44 min-h-[44px] px-3.5 py-1.5 rounded-lg font-mono text-xs font-semibold shrink-0 transition border ${
              enableAutoPruning
                ? 'bg-emerald-950/70 border-emerald-700/80 text-emerald-300 hover:bg-emerald-900/70'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            {enableAutoPruning ? 'Auto-Prune: Aktif' : 'Auto-Prune: Nonaktif'}
          </button>
        )}
      </div>
    </div>
  );
};
