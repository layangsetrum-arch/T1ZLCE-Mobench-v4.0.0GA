import React, { useState } from 'react';
import { 
  History, 
  Clock, 
  RotateCcw, 
  FileText, 
  Users, 
  CheckCircle2, 
  ArrowRight, 
  Copy, 
  ShieldCheck, 
  Eye, 
  Filter,
  Sparkles,
  Layers,
  Check
} from 'lucide-react';
import { UseSessionPersistenceReturn } from '../../hooks/useSessionPersistence';
import { useSessionHistory, TimelineEntry } from '../../hooks/useSessionHistory';
import { loadTeamRegistry } from '../../data/teamMembers';
import { copyText } from '../../utils/clipboard';

interface SessionTimelineTabProps {
  persistence?: UseSessionPersistenceReturn;
  currentMarkdown: string;
  onRestoreMarkdown?: (restoredMd: string) => void;
}

export const SessionTimelineTab: React.FC<SessionTimelineTabProps> = ({
  persistence,
  currentMarkdown,
  onRestoreMarkdown
}) => {
  const {
    filteredTimeline,
    selectedSnapshot,
    selectedSnapshotId,
    setSelectedSnapshotId,
    filterMemberId,
    setFilterMemberId,
    currentDiff,
    restoreSelected,
    totalSnapshots
  } = useSessionHistory(persistence, currentMarkdown);

  const [copiedMd, setCopiedMd] = useState(false);
  const [restoreFeedback, setRestoreFeedback] = useState<string | null>(null);
  const members = loadTeamRegistry();

  const handleCopySnapshot = async (text: string) => {
    const ok = await copyText(text);
    if (ok) {
      setCopiedMd(true);
      setTimeout(() => setCopiedMd(false), 2000);
    }
  };

  const handleRestore = () => {
    if (!selectedSnapshot) return;
    if (confirm(`Pulihkan state sesi ke snapshot "${selectedSnapshot.label}" (${selectedSnapshot.formattedDate} ${selectedSnapshot.formattedTime})? Perubahan yang belum disimpan pada draft aktif akan digantikan.`)) {
      const ok = restoreSelected();
      if (ok || onRestoreMarkdown) {
        onRestoreMarkdown?.(selectedSnapshot.rawMarkdown);
        setRestoreFeedback(`Berhasil dipulihkan ke versi "${selectedSnapshot.label}"!`);
        setTimeout(() => setRestoreFeedback(null), 3000);
      }
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Tab Header Banner */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-cyan-950/40 via-slate-900 to-indigo-950/40 border border-slate-800 rounded-2xl shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-cyan-900/30 shrink-0">
            <History className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white">
                Session History Timeline &amp; Audit Log
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                TASK-023
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Riwayat snapshot sesi terpadu ({totalSnapshots}/35 snapshot) • Atribusi giliran 8 anggota
            </p>
          </div>
        </div>

        {/* Filter Driver Dropdown */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-xs text-slate-400 hidden md:inline">Filter Driver:</span>
          <select
            value={filterMemberId}
            onChange={(e) => setFilterMemberId(e.target.value)}
            className="touch-target-44 min-h-[44px] bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">Semua Anggota (8 Driver)</option>
            {members.map(m => (
              <option key={m.id} value={m.id}>
                {m.name} (@{m.id})
              </option>
            ))}
          </select>
        </div>
      </div>

      {restoreFeedback && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-600 rounded-xl text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{restoreFeedback}</span>
        </div>
      )}

      {/* Main Grid: Left Timeline List (1/3), Right Diff & Detail Preview (2/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Kolom Kiri: Daftar Timeline (35 Snapshot) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span className="font-semibold uppercase tracking-wider text-[11px]">
              Daftar Snapshot ({filteredTimeline.length})
            </span>
            <span className="font-mono text-[10px] text-slate-500">
              Limit: 35 item aman
            </span>
          </div>

          <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
            {filteredTimeline.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/40 rounded-xl border border-slate-800 text-xs text-slate-500">
                Belum ada snapshot untuk filter ini. Setiap perubahan pada SESSION_STATE.md akan otomatis tercatat.
              </div>
            ) : (
              filteredTimeline.map((item, idx) => {
                const isSelected = selectedSnapshotId === item.id || (!selectedSnapshotId && idx === 0);
                const isLatest = idx === 0;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedSnapshotId(item.id)}
                    className={`w-full touch-target-44 min-h-[52px] p-3 rounded-xl border text-left transition-all flex items-start justify-between gap-3 ${
                      isSelected
                        ? 'bg-slate-900 border-cyan-500/70 shadow-md ring-1 ring-cyan-500/30'
                        : 'bg-slate-950/70 hover:bg-slate-900/90 border-slate-800'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${item.activeDriver.avatarColor} flex items-center justify-center font-bold text-white text-xs shadow shrink-0 mt-0.5`}>
                        {item.activeDriver.name.slice(0, 1)}
                      </div>

                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                            {item.label}
                          </span>
                          {isLatest && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                              Terbaru
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                          <span className="flex items-center gap-1 text-slate-300">
                            <Clock className="w-2.5 h-2.5 text-slate-500" />
                            {item.formattedDate} {item.formattedTime}
                          </span>
                          <span>•</span>
                          <span className="text-indigo-300 font-semibold">{item.activeDriver.name}</span>
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono pt-0.5">
                          <span>{item.doneTasks}/{item.totalTasks} Done</span>
                          <span>•</span>
                          <span>~{item.approxTokens} tok</span>
                        </div>
                      </div>
                    </div>

                    <ArrowRight className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? 'text-cyan-400 translate-x-0.5' : 'text-slate-600'}`} />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Kolom Kanan: Detail & Pratinjau Diff Snapshot Terpilih */}
        <div className="lg:col-span-7 space-y-4">
          {selectedSnapshot ? (
            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
              {/* Header Snapshot Terpilih */}
              <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">
                      {selectedSnapshot.label}
                    </span>
                    <span className="text-[10px] font-mono text-cyan-400 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30">
                      ID: {selectedSnapshot.id.slice(0, 8)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                    <span>Waktu: {selectedSnapshot.formattedDate} {selectedSnapshot.formattedTime}</span>
                    <span>•</span>
                    <span>Driver: <strong className="text-slate-200">{selectedSnapshot.activeDriver.name}</strong></span>
                  </div>
                </div>

                {/* Tombol Aksi: Target sentuh ergonomis >= 44px */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCopySnapshot(selectedSnapshot.rawMarkdown)}
                    className="touch-target-44 min-h-[44px] px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
                    title="Salin seluruh isi markdown snapshot ini"
                  >
                    {copiedMd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedMd ? 'Tersalin' : 'Salin .md'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRestore}
                    className="touch-target-44 min-h-[44px] px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-cyan-900/40"
                    title="Pulihkan draft aktif ke snapshot ini"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Pulihkan Draft</span>
                  </button>
                </div>
              </div>

              {/* Diff Summary Card */}
              <div className="p-4 sm:p-5 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">Task Selesai</span>
                    <strong className="text-emerald-400 text-sm font-mono">
                      {selectedSnapshot.doneTasks} / {selectedSnapshot.totalTasks}
                    </strong>
                  </div>

                  <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">Perubahan Baris</span>
                    <strong className="text-cyan-400 text-sm font-mono">
                      +{currentDiff?.addedLinesCount || 0} / -{currentDiff?.removedLinesCount || 0}
                    </strong>
                  </div>

                  <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">Perubahan Status Task</span>
                    <strong className="text-amber-400 text-sm font-mono">
                      {currentDiff?.changedTasks.length || 0} task
                    </strong>
                  </div>

                  <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">Ukuran Konteks</span>
                    <strong className="text-slate-300 text-sm font-mono">
                      ~{selectedSnapshot.approxTokens} tok
                    </strong>
                  </div>
                </div>

                {/* Perubahan Status Task yang Terdeteksi */}
                {currentDiff && currentDiff.changedTasks.length > 0 && (
                  <div className="p-3 bg-amber-950/30 border border-amber-700/40 rounded-xl space-y-1.5">
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Perbedaan Status Task Dibandingkan Versi Aktif:
                    </span>
                    <div className="space-y-1 text-xs font-mono">
                      {currentDiff.changedTasks.map(t => (
                        <div key={t.id} className="flex items-center gap-2 text-slate-300">
                          <span className="text-amber-400 font-bold">{t.id}:</span>
                          <span className="line-through text-slate-500">{t.oldStatus}</span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <span className="text-emerald-400 font-bold">{t.newStatus}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cuplikan Perbedaan Baris (Diff Snippets) */}
                {currentDiff && currentDiff.diffSnippets.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-cyan-400" />
                      Cuplikan Baris Berubah:
                    </span>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 max-h-48 overflow-y-auto space-y-1">
                      {currentDiff.diffSnippets.map((snip, i) => (
                        <div 
                          key={i} 
                          className={snip.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'}
                        >
                          {snip}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pratinjau Teks Markdown Snapshot */}
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    Pratinjau SESSION_STATE.md Snapshot:
                  </span>
                  <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-400 max-h-56 overflow-y-auto leading-relaxed">
                    {selectedSnapshot.rawMarkdown}
                  </pre>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-slate-900/60 rounded-2xl border border-slate-800 text-slate-400 text-xs">
              Pilih salah satu snapshot di kolom kiri untuk melihat ringkasan diff dan memulihkan draft.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
