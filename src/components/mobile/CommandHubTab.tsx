/**
 * ZLCE Command Hub Component (TASK-025 s/d TASK-030)
 * Katalog Template Perintah Berversi untuk Lingkungan Termux & Git Tablet
 * Rujukan: docs/mobile/blueprint/13_COMMAND_TEMPLATES.md & 04_TERMUX_INTEGRATION.md
 * 
 * Fitur:
 * 1. 8+ template kanonik dari Blueprint 13 terdaftar dengan skema berversi.
 * 2. Label risiko visual (Safe, Mutating, High-Risk).
 * 3. Parameter binder otomatis dengan sanitasi ketat injeksi POSIX shell.
 * 4. One-Tap Copy Button dengan umpan balik visual 2 detik.
 * 5. Paste-Back Parser untuk keluaran terminal Termux (zlce check & git status).
 * 6. Integrasi Protokol Recovery Kasus A–D.
 */

import React, { useState, useMemo } from 'react';
import { 
  Terminal, 
  ShieldCheck, 
  AlertTriangle, 
  Search, 
  GitBranch, 
  RefreshCw, 
  Cpu, 
  KeyRound,
  Info,
  CheckCircle2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { 
  CANONICAL_COMMAND_TEMPLATES, 
  COMMAND_TEMPLATES_VERSION, 
  RISK_LEVEL_META, 
  verifyNoDestructiveCommands 
} from '../../data/commandTemplates';
import { CommandRiskLevel } from '../../types/mobile';
import { ParsedSessionState } from '../../types/zlce';
import { getMemberById } from '../../data/teamMembers';
import { OneTapCopyButton } from './OneTapCopyButton';
import { bindCommandTemplate } from '../../utils/commandBinder';
import { PasteBackModal } from './PasteBackModal';
import { RecoveryCommandSection } from './RecoveryCommandSection';

interface CommandHubTabProps {
  stateData: ParsedSessionState;
  rawMarkdown: string;
  onNavigateTab?: (tab: string) => void;
  onUpdateVerification?: (evidence: string) => void;
  initialCategory?: 'all' | 'git' | 'validator' | 'recovery' | 'handover';
}

export const CommandHubTab: React.FC<CommandHubTabProps> = ({
  stateData,
  onNavigateTab: _onNavigateTab,
  onUpdateVerification,
  initialCategory = 'all'
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'git' | 'validator' | 'recovery' | 'handover'>(initialCategory);
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<'all' | CommandRiskLevel>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isPasteBackOpen, setIsPasteBackOpen] = useState<boolean>(false);
  const [lastVerifiedSnippet, setLastVerifiedSnippet] = useState<string | null>(null);
  const [showRecoverySection, setShowRecoverySection] = useState<boolean>(true);

  // Ambil profil driver tablet yang sedang aktif
  const activeMemberId = typeof window !== 'undefined'
    ? (localStorage.getItem('zlce_active_member_id') || 'eko')
    : 'eko';
  const activeMember = getMemberById(activeMemberId);
  const activeTaskId = stateData.status.activeTask && stateData.status.activeTask !== '-' 
    ? stateData.status.activeTask 
    : 'TASK-026';

  // Verifikasi Acceptance Criteria 3 (Strict Zero Destructive Command)
  const isZeroDestructiveCompliant = useMemo(() => {
    return verifyNoDestructiveCommands(CANONICAL_COMMAND_TEMPLATES);
  }, []);

  // Filter template berdasarkan kategori, risiko, dan query pencarian
  const filteredTemplates = useMemo(() => {
    return CANONICAL_COMMAND_TEMPLATES.filter((tpl) => {
      // Filter Kategori
      if (selectedCategory !== 'all' && tpl.category !== selectedCategory) {
        return false;
      }
      // Filter Risiko
      if (selectedRiskFilter !== 'all' && tpl.riskLevel !== selectedRiskFilter) {
        return false;
      }
      // Filter Pencarian
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = tpl.title.toLowerCase().includes(q);
        const matchDesc = tpl.description.toLowerCase().includes(q);
        const matchDirect = tpl.directCommand.toLowerCase().includes(q);
        const matchDispatcher = tpl.dispatcherCommand?.toLowerCase().includes(q) ?? false;
        const matchId = tpl.id.toLowerCase().includes(q);
        return matchTitle || matchDesc || matchDirect || matchDispatcher || matchId;
      }
      return true;
    });
  }, [selectedCategory, selectedRiskFilter, searchQuery]);

  // Statistik per kategori
  const stats = useMemo(() => {
    const safeCount = CANONICAL_COMMAND_TEMPLATES.filter(t => t.riskLevel === 'safe').length;
    const mutatingCount = CANONICAL_COMMAND_TEMPLATES.filter(t => t.riskLevel === 'mutating').length;
    const destructiveCount = CANONICAL_COMMAND_TEMPLATES.filter(t => t.riskLevel === 'destructive').length;
    return {
      total: CANONICAL_COMMAND_TEMPLATES.length,
      safe: safeCount,
      mutating: mutatingCount,
      destructive: destructiveCount
    };
  }, []);

  const handleApplyVerification = (evidence: string) => {
    setLastVerifiedSnippet(evidence);
    if (onUpdateVerification) {
      onUpdateVerification(evidence);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center shrink-0 text-cyan-400 shadow-md">
              <Terminal className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Command Hub: Katalog Template Perintah Berversi
                </h1>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                  v{COMMAND_TEMPLATES_VERSION} • FASE 5
                </span>
                {isZeroDestructiveCompliant && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    Zero-Destructive
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Katalog perintah operasional Termux &amp; Git tablet dengan binder parameter dinamis, proteksi sanitasi POSIX shell, dan parser terminal.
              </p>
            </div>
          </div>

          {/* Quick Actions & Active Context */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={() => setIsPasteBackOpen(true)}
              className="touch-target-44 min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/30 transition-all active:scale-[0.98]"
            >
              <Terminal className="w-4 h-4" />
              <span>Paste-Back Terminal</span>
            </button>

            <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-2.5 shrink-0 flex flex-col gap-1 text-xs">
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400">Driver Aktif:</span>
                <span className="font-semibold text-slate-200">
                  {activeMember.name}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400">Task Aktif:</span>
                <span className="font-mono font-semibold text-cyan-400">
                  {activeTaskId}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Last Verified Status Banner */}
        {lastVerifiedSnippet && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 flex items-center justify-between text-xs text-emerald-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-mono font-medium">{lastVerifiedSnippet}</span>
            </div>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-200">
              Terverifikasi
            </span>
          </div>
        )}

        {/* Risk Level Indicator Legend */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-950/30 border border-emerald-900/40 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <span className="font-semibold text-emerald-300">🟢 SAFE ({stats.safe})</span>
              <p className="text-[10px] text-slate-400 leading-tight">Operasi baca-saja; bebas disalin tanpa risiko.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-950/30 border border-amber-900/40 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <span className="font-semibold text-amber-300">🟡 MUTATING ({stats.mutating})</span>
              <p className="text-[10px] text-slate-400 leading-tight">Mengubah berkas / commit; terikat identitas driver.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-600 shrink-0 ml-1"></div>
            <div>
              <span className="font-semibold text-slate-300">🔴 DESTRUCTIVE (0)</span>
              <p className="text-[10px] text-slate-400 leading-tight">Dikeluarkan dari katalog bawaan demi integritas Git.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recovery Hub Integration Section (TASK-030) */}
      <div className="border border-slate-800 rounded-2xl bg-slate-900 overflow-hidden">
        <button
          onClick={() => setShowRecoverySection(!showRecoverySection)}
          className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-slate-800/40 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-bold text-white">
              Protokol Pemulihan Kasus A–D (Preskriptif)
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/60">
              TASK-030
            </span>
          </div>
          {showRecoverySection ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {showRecoverySection && (
          <div className="p-4 border-t border-slate-800/80">
            <RecoveryCommandSection
              activeTaskId={activeTaskId}
              activeMember={activeMember}
              onOpenTerminalModal={() => setIsPasteBackOpen(true)}
            />
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`touch-target-44 min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              selectedCategory === 'all'
                ? 'bg-cyan-500 text-slate-950 shadow'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            Semua ({stats.total})
          </button>
          <button
            onClick={() => setSelectedCategory('validator')}
            className={`touch-target-44 min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              selectedCategory === 'validator'
                ? 'bg-cyan-500 text-slate-950 shadow'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Validator &amp; Diagnostik
          </button>
          <button
            onClick={() => setSelectedCategory('git')}
            className={`touch-target-44 min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              selectedCategory === 'git'
                ? 'bg-cyan-500 text-slate-950 shadow'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            Sinkronisasi Git
          </button>
          <button
            onClick={() => setSelectedCategory('recovery')}
            className={`touch-target-44 min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              selectedCategory === 'recovery'
                ? 'bg-cyan-500 text-slate-950 shadow'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Pemulihan Diff
          </button>
          <button
            onClick={() => setSelectedCategory('handover')}
            className={`touch-target-44 min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              selectedCategory === 'handover'
                ? 'bg-cyan-500 text-slate-950 shadow'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            Serah Terima (Auth)
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari perintah atau keyword..."
            className="touch-target-44 min-h-[44px] w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>
      </div>

      {/* Template Cards List */}
      <div className="space-y-4">
        {filteredTemplates.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
            <Info className="w-8 h-8 text-slate-500 mx-auto mb-2" />
            <p className="text-sm font-semibold">Tidak ada template yang cocok dengan filter atau pencarian Anda.</p>
            <button
              onClick={() => { setSelectedCategory('all'); setSearchQuery(''); setSelectedRiskFilter('all'); }}
              className="mt-3 text-xs text-cyan-400 hover:underline"
            >
              Reset semua filter
            </button>
          </div>
        ) : (
          filteredTemplates.map((tpl) => {
            const riskMeta = RISK_LEVEL_META[tpl.riskLevel];

            // Bind parameters dynamically for this template
            const boundDirectCmd = bindCommandTemplate(tpl.directCommand, {
              activeTaskId,
              activeMember,
              commitMessage: `selesaikan ${activeTaskId}`,
              touchedFiles: stateData.wal.plannedFiles || 'src/App.tsx',
            });

            const boundDispatcherCmd = tpl.dispatcherCommand 
              ? bindCommandTemplate(tpl.dispatcherCommand, {
                  activeTaskId,
                  activeMember,
                  commitMessage: `selesaikan ${activeTaskId}`,
                  touchedFiles: stateData.wal.plannedFiles || 'src/App.tsx',
                })
              : null;

            return (
              <div 
                key={tpl.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-4 sm:p-5 transition-all shadow-md space-y-3"
              >
                {/* Header Card: ID, Title, Badges */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-950/80 px-2.5 py-1 rounded-lg border border-cyan-800/60">
                      {tpl.id}
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-white">
                      {tpl.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Risk Badge */}
                    <span className={`text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-lg border ${riskMeta.badgeBg} ${riskMeta.badgeText} ${riskMeta.badgeBorder}`}>
                      {riskMeta.label}
                    </span>
                    {/* Category Badge */}
                    <span className="text-[10px] sm:text-xs font-mono uppercase px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
                      {tpl.category}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs sm:text-sm text-slate-300">
                  {tpl.description}
                </p>

                {/* Direct Command Block */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                      Perintah Langsung Bash / Termux:
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">Parameter Terikat Otomatis</span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-950 border border-slate-800/90 rounded-xl">
                    <code className="text-xs font-mono text-cyan-300 break-all select-all leading-relaxed">
                      {boundDirectCmd}
                    </code>
                    <div className="shrink-0 self-end sm:self-auto">
                      <OneTapCopyButton
                        textToCopy={boundDirectCmd}
                        label="Salin Langsung"
                        feedbackDurationMs={2000}
                      />
                    </div>
                  </div>
                </div>

                {/* Dispatcher Command Block (Optional Format Singkat) */}
                {boundDispatcherCmd && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-amber-400" />
                        Format Singkat via CLI Dispatcher <code className="text-amber-300 font-mono">zlce</code>:
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">~/bin/zlce</span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-slate-950/70 border border-slate-800/70 rounded-xl">
                      <code className="text-xs font-mono text-amber-300 break-all select-all">
                        {boundDispatcherCmd}
                      </code>
                      <div className="shrink-0 self-end sm:self-auto">
                        <OneTapCopyButton
                          textToCopy={boundDispatcherCmd}
                          label="Salin Dispatcher"
                          feedbackDurationMs={2000}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Required Dynamic Parameters Footer */}
                {tpl.requiredParams.length > 0 && (
                  <div className="pt-2 flex items-center gap-2 flex-wrap text-[11px] text-slate-400 border-t border-slate-800/60">
                    <span className="font-semibold text-slate-400">Parameter Diikat:</span>
                    {tpl.requiredParams.map((param) => (
                      <span 
                        key={param}
                        className="font-mono px-2 py-0.5 rounded bg-slate-800/80 text-cyan-300 border border-slate-700"
                      >
                        {`{${param}}`}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Paste-Back Terminal Modal */}
      <PasteBackModal
        isOpen={isPasteBackOpen}
        onClose={() => setIsPasteBackOpen(false)}
        activeTaskId={activeTaskId}
        onApplyVerification={handleApplyVerification}
      />
    </div>
  );
};
