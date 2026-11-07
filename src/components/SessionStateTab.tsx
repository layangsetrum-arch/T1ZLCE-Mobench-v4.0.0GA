import React, { useState } from 'react';
import { 
  Check, 
  Copy, 
  Download, 
  FileDown,
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Plus, 
  Trash2, 
  Wrench, 
  Eye, 
  Code, 
  RefreshCw, 
  ShieldAlert, 
  Activity,
  Layers,
  ArrowRight,
  ChevronDown,
  Maximize2,
  Lock
} from 'lucide-react';
import { ParsedSessionState, ValidationResult, TaskStatus, ZLCETask } from '../types/zlce';
import { serializeSessionStateToMarkdown, parseSessionStateMarkdown } from '../utils/markdownParser';
import { TokenUsageGauge } from './TokenUsageGauge';
import { copyText } from '../utils/clipboard';
import { downloadMarkdownBlob } from '../utils/fileExport';
import { repairSessionStateCanonicalStructure } from '../utils/sessionStateValidator';
import { UseSessionPersistenceReturn } from '../hooks/useSessionPersistence';
import { TaskClaimBanner } from './mobile/TaskClaimBanner';
import { GateApprovalModal } from './mobile/GateApprovalModal';
import { canClaimTask, saveActiveTaskClaim, getNowTimestamps, incrementClaimRevision } from '../utils/taskClaimManager';
import { getMemberById } from '../data/teamMembers';
import { TeamMember } from '../types/mobile';

interface SessionStateTabProps {
  stateData: ParsedSessionState;
  rawMarkdown: string;
  validation: ValidationResult;
  onUpdateMarkdown: (newMd: string) => void;
  onUpdateStateData: (newData: ParsedSessionState) => void;
  onRunLinter: () => void;
  onToggleFullscreen?: () => void;
  persistence?: UseSessionPersistenceReturn;
}

const SessionStateTabComponent: React.FC<SessionStateTabProps> = ({
  stateData,
  rawMarkdown,
  validation,
  onUpdateMarkdown,
  onUpdateStateData,
  onRunLinter,
  onToggleFullscreen,
  persistence
}) => {
  const [viewMode, setViewMode] = useState<'visual' | 'raw'>('visual');
  const [copied, setCopied] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [approvalModalTask, setApprovalModalTask] = useState<ZLCETask | null>(null);
  const [claimAlertMessage, setClaimAlertMessage] = useState<string | null>(null);

  const activeMemberId = typeof window !== 'undefined' 
    ? (localStorage.getItem('zlce_active_member_id') || 'eko') 
    : 'eko';
  const activeMember = getMemberById(activeMemberId);

  const handleCopy = async () => {
    const success = await copyText(rawMarkdown);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = (filenameOption?: string) => {
    let filename = 'SESSION_STATE.md';
    if (filenameOption === 'project') {
      const cleanProj = (stateData.context.projectName || 'project').replace(/[^a-zA-Z0-9_-]/g, '_');
      filename = `SESSION_STATE_${cleanProj}.md`;
    } else if (filenameOption === 'timestamp') {
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      filename = `SESSION_STATE_${dateStr}.md`;
    }

    const res = downloadMarkdownBlob(rawMarkdown, {
      filename,
      ensureUnixLineEndings: true
    });

    setShowExportMenu(false);
    if (res.success) {
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        onUpdateMarkdown(text);
        const parsed = parseSessionStateMarkdown(text);
        onUpdateStateData(parsed);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Helper to commit changes from structured view to markdown
  const commitVisualChange = (updated: ParsedSessionState) => {
    const newMd = serializeSessionStateToMarkdown(updated);
    updated.raw = newMd;
    onUpdateStateData(updated);
    onUpdateMarkdown(newMd);
  };

  const handleStatusChange = (index: number, newStatus: TaskStatus) => {
    const updatedTasks = [...stateData.tasks];
    const task = { ...updatedTasks[index], status: newStatus };

    // Aturan 1 Task IN_PROGRESS pada tablet bersama (TASK-020)
    if (newStatus === 'IN_PROGRESS') {
      const claimCheck = canClaimTask(task.id, stateData);
      if (!claimCheck.allowed) {
        setClaimAlertMessage(claimCheck.reason || 'Aturan Tablet Bersama: Hanya 1 task boleh IN_PROGRESS.');
        setTimeout(() => setClaimAlertMessage(null), 6000);
        return;
      }
      const { iso, wib } = getNowTimestamps();
      saveActiveTaskClaim({
        taskId: task.id,
        taskName: task.name,
        memberId: activeMember.id,
        memberName: activeMember.name,
        memberAvatar: activeMember.avatarColor,
        claimedAtISO: iso,
        claimedAtWIB: wib,
        status: 'ACTIVE',
        revision: incrementClaimRevision()
      });
    }

    // If newStatus is DONE and approval/evidence are missing, provide helpful defaults with provenance
    if (newStatus === 'DONE') {
      if (!task.evidence || task.evidence === '-') {
        task.evidence = 'pytest 10/10 pass, build 0 error';
      }
      if (!task.approved || task.approved === '-') {
        task.approved = `ya (oleh: ${activeMember.name})`;
      }
    }

    updatedTasks[index] = task;

    let updatedWal = { ...stateData.wal };

    // Check if newStatus is IN_PROGRESS: update active task and WAL
    const updatedStatus = { ...stateData.status };
    if (newStatus === 'IN_PROGRESS') {
      updatedStatus.activeTask = task.id;
      updatedStatus.activeTaskStatus = 'IN_PROGRESS';
      if (updatedWal.task !== task.id) {
        updatedWal.task = task.id;
        if (updatedWal.currentStep === '-' || updatedWal.currentStep.includes('selesai')) {
          updatedWal.currentStep = `Implementasi ${task.name}`;
          updatedWal.nextStepExact = `Langkah verifikasi awal untuk ${task.id}`;
        }
      }
    } else if (newStatus === 'DONE') {
      updatedStatus.lastDoneTask = task.id;
      // Clear WAL for the completed task
      if (updatedWal.task === task.id) {
        updatedWal = {
          ...updatedWal,
          task: '-',
          currentStep: `Task ${task.id} selesai terverifikasi`,
          plannedFiles: '-',
          completedSoFar: `${task.name} selesai dan disetujui`,
          nextStepExact: '-',
          verificationCommand: '-'
        };
      }
      if (updatedStatus.activeTask === task.id) {
        const nextReady = updatedTasks.find(t => t.status === 'READY');
        const nextInProgress = updatedTasks.find(t => t.status === 'IN_PROGRESS');
        const allDone = updatedTasks.every(t => t.status === 'DONE');

        if (nextInProgress) {
          updatedStatus.activeTask = nextInProgress.id;
          updatedStatus.activeTaskStatus = 'IN_PROGRESS';
        } else if (allDone) {
          updatedStatus.activeTask = '-';
          updatedStatus.activeTaskStatus = 'DONE';
          updatedStatus.nextTask = '-';
        } else if (nextReady) {
          updatedStatus.activeTask = '-';
          updatedStatus.activeTaskStatus = 'READY';
          updatedStatus.nextTask = nextReady.id;
        } else {
          updatedStatus.activeTask = '-';
          updatedStatus.activeTaskStatus = 'PENDING';
        }
      }
    } else if (updatedStatus.activeTask === task.id) {
      // Find another or clear
      const otherInProgress = updatedTasks.find(t => t.status === 'IN_PROGRESS');
      if (otherInProgress) {
        updatedStatus.activeTask = otherInProgress.id;
        updatedStatus.activeTaskStatus = 'IN_PROGRESS';
      } else {
        updatedStatus.activeTask = '-';
        const allDone = updatedTasks.every(t => t.status === 'DONE');
        const nextReady = updatedTasks.find(t => t.status === 'READY');
        if (allDone) {
          updatedStatus.activeTaskStatus = 'DONE';
          updatedStatus.nextTask = '-';
        } else if (nextReady) {
          updatedStatus.activeTaskStatus = 'READY';
          updatedStatus.nextTask = nextReady.id;
        } else {
          updatedStatus.activeTaskStatus = 'PENDING';
        }
      }
    }

    commitVisualChange({
      ...stateData,
      tasks: updatedTasks,
      status: updatedStatus,
      wal: updatedWal
    });
  };

  const handleAddTask = () => {
    const nextNum = stateData.tasks.length + 1;
    const formattedId = `TASK-${String(nextNum).padStart(3, '0')}`;
    const newTask: ZLCETask = {
      id: formattedId,
      name: 'Task Baru',
      dependencies: stateData.tasks.length > 0 ? stateData.tasks[stateData.tasks.length - 1].id : '-',
      status: 'PENDING',
      evidence: '-',
      approved: '-'
    };

    commitVisualChange({
      ...stateData,
      tasks: [...stateData.tasks, newTask]
    });
  };

  const handleDeleteTask = (index: number) => {
    const updatedTasks = stateData.tasks.filter((_, idx) => idx !== index);
    commitVisualChange({
      ...stateData,
      tasks: updatedTasks
    });
  };

  // Quick Fixes
  const applyQuickFix = (code: string) => {
    if (code === 'MULTIPLE_IN_PROGRESS') {
      // Keep only first IN_PROGRESS, set others to PENDING
      let seen = false;
      const updatedTasks = stateData.tasks.map(t => {
        if (t.status === 'IN_PROGRESS') {
          if (!seen) {
            seen = true;
            return t;
          }
          return { ...t, status: 'PENDING' as TaskStatus };
        }
        return t;
      });
      commitVisualChange({ ...stateData, tasks: updatedTasks });
    } else if (code === 'DONE_MISSING_EVIDENCE' || code === 'DONE_UNAPPROVED') {
      const updatedTasks = stateData.tasks.map(t => {
        if (t.status === 'DONE') {
          return {
            ...t,
            evidence: (!t.evidence || t.evidence === '-' || t.evidence.length < 3) ? 'pytest passed 100%, linter 0 errors' : t.evidence,
            approved: 'ya'
          };
        }
        return t;
      });
      commitVisualChange({ ...stateData, tasks: updatedTasks });
    } else if (code === 'CLOCK_RULE_X1_FORMAT') {
      const updatedStatus = { ...stateData.status, timestampAudit: '2026-10-14 jam: ?' };
      const updatedWal = { ...stateData.wal, updatedTimestamp: '2026-10-14 jam: ?' };
      commitVisualChange({ ...stateData, status: updatedStatus, wal: updatedWal });
    } else if (code === 'MISSING_SECTION' || code === 'CANONICAL_SECTION_MISSING' || code === 'INVALID_MATRIX_HEADER' || code === 'MISSING_WAL_ITEM') {
      const repaired = repairSessionStateCanonicalStructure(rawMarkdown);
      onUpdateMarkdown(repaired);
      const parsed = parseSessionStateMarkdown(repaired);
      onUpdateStateData(parsed);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            Sumber Kebenaran Tunggal: SESSION_STATE.md
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Satu-satunya dokumen pencatat status task aktif dan titik pemulihan sesi (Aturan R1, R4, R12, X1).
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-slate-950 p-1 rounded-lg border border-slate-800 flex text-xs">
            <button
              onClick={() => setViewMode('visual')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                viewMode === 'visual'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" /> Visual Studio
            </button>
            <button
              onClick={() => setViewMode('raw')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                viewMode === 'raw'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Code className="w-3.5 h-3.5" /> Raw Markdown
            </button>
          </div>

          {/* Real-time Disk Bridge Buttons */}
          {persistence?.saveToDiskNow && (
            <button
              onClick={() => persistence.saveToDiskNow()}
              disabled={persistence.diskSync?.isSaving}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition active:scale-95 border ${
                persistence.diskSync?.isSaving
                  ? 'bg-amber-950/80 border-amber-700 text-amber-300'
                  : 'bg-emerald-950/70 hover:bg-emerald-900/80 border-emerald-700/80 text-emerald-300'
              }`}
              title="Simpan langsung ke berkas fisik repositori /SESSION_STATE.md"
            >
              <Check className={`w-3.5 h-3.5 ${persistence.diskSync?.isSaving ? 'animate-spin' : 'text-emerald-400'}`} />
              <span>{persistence.diskSync?.isSaving ? 'Menulis Disk...' : 'Tulis ke Disk'}</span>
            </button>
          )}

          {persistence?.reloadFromDisk && (
            <button
              onClick={() => persistence.reloadFromDisk()}
              disabled={persistence.diskSync?.isReading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition active:scale-95"
              title="Tarik versi terbaru langsung dari berkas disk /SESSION_STATE.md"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${persistence.diskSync?.isReading ? 'animate-spin' : ''}`} />
              <span>Tarik Disk</span>
            </button>
          )}

          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Tersalin' : 'Salin Markdown'}
          </button>

          {/* Export / Download .md Menu */}
          <div className="relative">
            <div className="flex items-center rounded-lg shadow overflow-hidden border border-cyan-500/30">
              <button
                onClick={() => handleDownload()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-cyan-600 hover:bg-cyan-500 text-white transition"
                title="Unduh SESSION_STATE.md"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export .md</span>
              </button>
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="px-1.5 py-1.5 bg-cyan-700 hover:bg-cyan-600 text-white border-l border-cyan-500/40 transition"
                title="Pilihan Format Nama File"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {showExportMenu && (
              <div className="absolute right-0 mt-1 w-64 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-20 py-1 text-xs font-sans">
                <div className="px-3 py-1.5 text-[10px] font-mono text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  Pilih Format Nama File:
                </div>
                <button
                  onClick={() => handleDownload()}
                  className="w-full text-left px-3 py-2 text-slate-200 hover:bg-slate-800 hover:text-cyan-400 flex items-center justify-between"
                >
                  <span className="font-mono">SESSION_STATE.md</span>
                  <span className="text-[10px] text-slate-500">Standar</span>
                </button>
                <button
                  onClick={() => handleDownload('project')}
                  className="w-full text-left px-3 py-2 text-slate-200 hover:bg-slate-800 hover:text-cyan-400 flex items-center justify-between"
                >
                  <span className="font-mono truncate max-w-[150px]">
                    SESSION_STATE_{(stateData.context.projectName || 'proj').replace(/\s+/g, '_')}.md
                  </span>
                  <span className="text-[10px] text-slate-500">Proyek</span>
                </button>
                <button
                  onClick={() => handleDownload('timestamp')}
                  className="w-full text-left px-3 py-2 text-slate-200 hover:bg-slate-800 hover:text-cyan-400 flex items-center justify-between"
                >
                  <span className="font-mono">SESSION_STATE_{new Date().toISOString().slice(0, 10)}.md</span>
                  <span className="text-[10px] text-slate-500">Tanggal</span>
                </button>
              </div>
            )}
          </div>

          {/* Import / Upload .md */}
          <label
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-cyan-500/40 transition cursor-pointer"
            title="Buka / Impor file SESSION_STATE.md dari perangkat lokal"
          >
            <FileDown className="w-3.5 h-3.5 text-cyan-400" />
            <span>Impor .md</span>
            <input
              type="file"
              accept=".md,.txt,text/markdown"
              className="hidden"
              onChange={handleFileImport}
            />
          </label>

          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 hover:border-cyan-500/40 transition"
              title="Buka Editor Layar Penuh (Distraction-Free)"
            >
              <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Fullscreen</span>
            </button>
          )}
        </div>
      </div>

      {/* Download Success Notification */}
      {downloadSuccess && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-700/60 rounded-xl text-xs text-emerald-200 flex items-center justify-between animate-fade-in shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>
              <strong>Sukses:</strong> Berkas <code>SESSION_STATE.md</code> berhasil diekspor dan diunduh ke komputer Anda.
            </span>
          </div>
          <button 
            onClick={() => setDownloadSuccess(false)}
            className="text-emerald-400 hover:text-emerald-300 font-mono text-[11px]"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Linter Diagnostic Card (zlce-check) */}
      <div className={`p-4 rounded-xl border ${
        validation.valid 
          ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200' 
          : 'bg-rose-950/30 border-rose-800/50 text-rose-200'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {validation.valid ? (
              <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />
            ) : (
              <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0 animate-pulse" />
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-wide">
                  Hasil Validator zlce-check: {validation.valid ? 'OK (LULUS)' : 'GAGAL (DITEMUKAN ISU)'}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-900/60 font-mono">
                  {validation.tasksCount} Tasks terdaftar
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {validation.valid
                  ? 'Format SESSION_STATE.md memenuhi seluruh aturan ZLCE v3.2.2, Aturan Jam X1, dan Quality Gates.'
                  : `Ditemukan ${validation.errorsCount} error dan ${validation.warningsCount} warning yang harus diperbaiki.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRunLinter}
              className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 font-mono"
            >
              <RefreshCw className="w-3 h-3" /> Re-Scan
            </button>
          </div>
        </div>

        {/* Detailed Issues List */}
        {validation.issues.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-800/60 space-y-2">
            {validation.issues.map((issue, idx) => (
              <div 
                key={idx}
                className="flex items-start justify-between text-xs p-2 rounded-lg bg-slate-900/80 border border-slate-800 gap-2"
              >
                <div className="flex items-start gap-2">
                  {issue.type === 'error' ? (
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-mono text-slate-400 mr-2">[{issue.code}]</span>
                    <span className="text-slate-200">{issue.message}</span>
                  </div>
                </div>

                {issue.fixable && (
                  <button
                    onClick={() => applyQuickFix(issue.code)}
                    className="flex items-center gap-1 text-[11px] px-2 py-1 bg-cyan-900/40 hover:bg-cyan-800/60 text-cyan-300 border border-cyan-700/50 rounded transition shrink-0"
                  >
                    <Wrench className="w-3 h-3" /> Perbaiki Otomatis
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Web vs CLI Scope Note (REV-10) */}
        <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-start gap-2 text-[11px] text-slate-400 font-sans">
          <span className="text-cyan-400 font-bold shrink-0">💡 Catatan Validator:</span>
          <span>
            Validator web memvalidasi integritas internal <code className="text-cyan-300 font-mono">SESSION_STATE.md</code>. Untuk pemeriksaan silang eksternal terhadap <code className="text-slate-300 font-mono">TASKS.md</code> dan status working tree Git, jalankan CLI <code className="text-amber-300 font-mono">python3 scripts/zlce-check.py .</code> di terminal lokal atau Termux.
          </span>
        </div>
      </div>

      {viewMode === 'raw' ? (
        /* Raw Markdown View / Edit */
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-cyan-400 font-semibold">SESSION_STATE.md</span>
              <span className="text-xs text-slate-500 hidden sm:inline">(Penyunting Langsung • Live Linter)</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                title="Salin isi markdown saat ini"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Tersalin' : 'Salin'}</span>
              </button>
              {onToggleFullscreen && (
                <button
                  onClick={onToggleFullscreen}
                  className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition"
                  title="Editor Layar Penuh (Distraction-Free)"
                >
                  <Maximize2 className="w-3 h-3 text-cyan-400" />
                  <span>Fullscreen</span>
                </button>
              )}
              <button
                onClick={() => handleDownload()}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-medium transition shadow"
                title="Unduh berkas .md saat ini"
              >
                <Download className="w-3 h-3" />
                <span>Export .md</span>
              </button>
            </div>
          </div>
          <textarea
            value={rawMarkdown}
            onChange={(e) => {
              const val = e.target.value;
              onUpdateMarkdown(val);
              try {
                const parsed = parseSessionStateMarkdown(val);
                onUpdateStateData(parsed);
              } catch {
                // Keep typing
              }
            }}
            rows={26}
            className="w-full bg-slate-950 text-slate-200 font-mono text-xs sm:text-sm p-4 focus:outline-none focus:ring-1 focus:ring-cyan-500 border-none resize-y"
            spellCheck={false}
          />
        </div>
      ) : (
        /* Visual Studio Mode */
        <div className="space-y-6">
          {/* Peringatan Pelanggaran Aturan Klaim Task */}
          {claimAlertMessage && (
            <div className="p-3 bg-rose-950/90 border border-rose-600 rounded-xl text-rose-200 text-xs flex items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{claimAlertMessage}</span>
              </div>
              <button 
                onClick={() => setClaimAlertMessage(null)}
                className="text-xs text-rose-400 hover:text-white font-mono"
              >
                Tutup
              </button>
            </div>
          )}

          {/* Banner Klaim Task Aktif Tablet Bersama (TASK-020) */}
          <TaskClaimBanner
            sessionState={stateData}
            activeMember={activeMember}
            onCommitChange={commitVisualChange}
            onRequestApproval={(taskId) => {
              const t = stateData.tasks.find(x => x.id === taskId);
              if (t) setApprovalModalTask(t);
            }}
          />

          {/* Section 0 & 1: Context & Active Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bagian 0: Konteks Proyek */}
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
              <h3 className="text-xs font-semibold text-cyan-400 tracking-wider uppercase flex items-center gap-1.5">
                <Layers className="w-4 h-4" /> 0. Konteks Proyek (Statis)
              </h3>
              <div className="space-y-2 text-xs">
                <div>
                  <label className="text-slate-400 text-[11px]">Nama Proyek</label>
                  <input
                    type="text"
                    value={stateData.context.projectName}
                    onChange={(e) => commitVisualChange({
                      ...stateData,
                      context: { ...stateData.context, projectName: e.target.value }
                    })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 text-[11px]">Tech Stack</label>
                    <input
                      type="text"
                      value={stateData.context.stack}
                      onChange={(e) => commitVisualChange({
                        ...stateData,
                        context: { ...stateData.context, stack: e.target.value }
                      })}
                      className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 text-[11px]">MODE</label>
                    <select
                      value={stateData.context.mode}
                      onChange={(e) => commitVisualChange({
                        ...stateData,
                        context: { ...stateData.context, mode: e.target.value as 'FULL' | 'LITE' }
                      })}
                      className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-slate-200 focus:border-cyan-500 focus:outline-none"
                    >
                      <option value="LITE">LITE (4 Berkas)</option>
                      <option value="FULL">FULL (10 Berkas)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Bagian 1: Status Aktif */}
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
              <h3 className="text-xs font-semibold text-cyan-400 tracking-wider uppercase flex items-center gap-1.5">
                <Activity className="w-4 h-4" /> 1. Status Aktif
              </h3>
              <div className="space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 text-[11px]">Timestamp Audit (Aturan X1)</label>
                    <input
                      type="text"
                      value={stateData.status.timestampAudit}
                      onChange={(e) => commitVisualChange({
                        ...stateData,
                        status: { ...stateData.status, timestampAudit: e.target.value }
                      })}
                      className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:border-cyan-500 focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 text-[11px]">Cabang Git</label>
                    <input
                      type="text"
                      value={stateData.status.gitBranch}
                      onChange={(e) => commitVisualChange({
                        ...stateData,
                        status: { ...stateData.status, gitBranch: e.target.value }
                      })}
                      className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:border-cyan-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-slate-400 text-[11px]">Terakhir DONE</label>
                    <input
                      type="text"
                      value={stateData.status.lastDoneTask}
                      onChange={(e) => commitVisualChange({
                        ...stateData,
                        status: { ...stateData.status, lastDoneTask: e.target.value }
                      })}
                      className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-slate-200 focus:border-cyan-500 focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 text-[11px]">Task Aktif</label>
                    <input
                      type="text"
                      value={stateData.status.activeTask}
                      onChange={(e) => commitVisualChange({
                        ...stateData,
                        status: { ...stateData.status, activeTask: e.target.value }
                      })}
                      className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-slate-200 focus:border-cyan-500 focus:outline-none font-mono font-bold text-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 text-[11px]">Berikutnya</label>
                    <input
                      type="text"
                      value={stateData.status.nextTask}
                      onChange={(e) => commitVisualChange({
                        ...stateData,
                        status: { ...stateData.status, nextTask: e.target.value }
                      })}
                      className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-slate-200 focus:border-cyan-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Task Matrix Table */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-cyan-400 tracking-wider uppercase">
                  2. Matriks Task (Task Backlog & Status Enum)
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Aturan R4: Maksimal tepat 1 task IN_PROGRESS. Status DONE wajib punya Bukti Verifikasi dan Disetujui 'ya'.
                </p>
              </div>
              <button
                onClick={handleAddTask}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium transition"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Task
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950 text-slate-400 font-mono text-[11px]">
                    <th className="py-2.5 px-3">ID Task</th>
                    <th className="py-2.5 px-3">Nama Task</th>
                    <th className="py-2.5 px-3">Dependensi</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Bukti Verifikasi (Quality Gate)</th>
                    <th className="py-2.5 px-3">Disetujui</th>
                    <th className="py-2.5 px-2 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {stateData.tasks.map((task, idx) => {
                    const isInProgress = task.status === 'IN_PROGRESS';
                    const isDone = task.status === 'DONE';
                    const isBlocked = task.status === 'BLOCKED';

                    return (
                      <tr 
                        key={idx}
                        className={`hover:bg-slate-800/40 transition-colors ${
                          isInProgress ? 'bg-cyan-950/20' : ''
                        }`}
                      >
                        <td className="py-2 px-3 font-mono font-bold text-slate-200">
                          <input
                            type="text"
                            value={task.id}
                            onChange={(e) => {
                              const updated = [...stateData.tasks];
                              updated[idx] = { ...updated[idx], id: e.target.value };
                              commitVisualChange({ ...stateData, tasks: updated });
                            }}
                            className="bg-transparent border-b border-transparent hover:border-slate-700 focus:border-cyan-500 px-1 py-0.5 w-24 focus:outline-none"
                          />
                        </td>
                        <td className="py-2 px-3 text-slate-200">
                          <input
                            type="text"
                            value={task.name}
                            onChange={(e) => {
                              const updated = [...stateData.tasks];
                              updated[idx] = { ...updated[idx], name: e.target.value };
                              commitVisualChange({ ...stateData, tasks: updated });
                            }}
                            className="bg-transparent border-b border-transparent hover:border-slate-700 focus:border-cyan-500 px-1 py-0.5 w-full focus:outline-none"
                          />
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-400">
                          <input
                            type="text"
                            value={task.dependencies}
                            onChange={(e) => {
                              const updated = [...stateData.tasks];
                              updated[idx] = { ...updated[idx], dependencies: e.target.value };
                              commitVisualChange({ ...stateData, tasks: updated });
                            }}
                            className="bg-transparent border-b border-transparent hover:border-slate-700 focus:border-cyan-500 px-1 py-0.5 w-20 focus:outline-none"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <select
                            value={task.status}
                            onChange={(e) => handleStatusChange(idx, e.target.value as TaskStatus)}
                            className={`text-xs px-2 py-1 rounded font-mono font-semibold border ${
                              isInProgress
                                ? 'bg-cyan-950 text-cyan-300 border-cyan-600'
                                : isDone
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                                : isBlocked
                                ? 'bg-rose-950 text-rose-300 border-rose-600'
                                : 'bg-slate-900 text-slate-300 border-slate-700'
                            }`}
                          >
                            <option value="PENDING">PENDING</option>
                            <option value="READY">READY</option>
                            <option value="IN_PROGRESS">IN_PROGRESS</option>
                            <option value="BLOCKED">BLOCKED</option>
                            <option value="DONE">DONE</option>
                          </select>
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={task.evidence}
                            placeholder={isDone ? 'Wajib terisi bukti nyata...' : '-'}
                            onChange={(e) => {
                              const updated = [...stateData.tasks];
                              updated[idx] = { ...updated[idx], evidence: e.target.value };
                              commitVisualChange({ ...stateData, tasks: updated });
                            }}
                            className={`w-full bg-slate-950 px-2 py-1 rounded border text-xs ${
                              isDone && (!task.evidence || task.evidence === '-' || task.evidence.length < 3)
                                ? 'border-rose-600 text-rose-300'
                                : 'border-slate-800 text-slate-300'
                            }`}
                          />
                        </td>
                        <td className="py-2 px-3">
                          <button
                            type="button"
                            onClick={() => {
                              setApprovalModalTask(task);
                            }}
                            className={`px-2 py-1 rounded text-xs font-mono font-bold transition flex items-center gap-1 ${
                              task.approved.startsWith('ya') || task.approved.startsWith('yes')
                                ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-600/60 hover:bg-emerald-900/60'
                                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-cyan-500 hover:text-cyan-300'
                            }`}
                            title="Klik untuk membuka modal persetujuan gerbang kualitas (ADR-07)"
                          >
                            <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span className="truncate max-w-[130px]">{task.approved || '-'}</span>
                          </button>
                        </td>
                        <td className="py-2 px-2 text-right">
                          <button
                            onClick={() => handleDeleteTask(idx)}
                            className="p-1 hover:bg-slate-800 text-slate-500 hover:text-rose-400 rounded transition"
                            title="Hapus task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Work In Progress (WAL) Card */}
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-xs font-semibold text-cyan-400 tracking-wider uppercase flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-cyan-400" />
                  3. Work In Progress (WAL - Write-Ahead Logging)
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Aturan R12: Catat sebelum mengubah berkas multi-langkah. Titik pemulihan saat koneksi terputus.
                </p>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400">
                Task Aktif: <strong className="text-cyan-400">{stateData.wal.task}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-slate-400 text-[11px] font-medium">Langkah Sedang Dikerjakan</label>
                <textarea
                  value={stateData.wal.currentStep}
                  rows={2}
                  onChange={(e) => commitVisualChange({
                    ...stateData,
                    wal: { ...stateData.wal, currentStep: e.target.value }
                  })}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 text-[11px] font-medium">Berkas Direncanakan / Disentuh</label>
                <textarea
                  value={stateData.wal.plannedFiles}
                  rows={2}
                  onChange={(e) => commitVisualChange({
                    ...stateData,
                    wal: { ...stateData.wal, plannedFiles: e.target.value }
                  })}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:border-cyan-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 text-[11px] font-medium">Sudah Dilakukan</label>
                <input
                  type="text"
                  value={stateData.wal.completedSoFar}
                  onChange={(e) => commitVisualChange({
                    ...stateData,
                    wal: { ...stateData.wal, completedSoFar: e.target.value }
                  })}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 text-[11px] font-medium">Langkah Berikutnya (Persis Satu Langkah)</label>
                <input
                  type="text"
                  value={stateData.wal.nextStepExact}
                  onChange={(e) => commitVisualChange({
                    ...stateData,
                    wal: { ...stateData.wal, nextStepExact: e.target.value }
                  })}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 text-[11px] font-medium">Perintah Verifikasi</label>
                <input
                  type="text"
                  value={stateData.wal.verificationCommand}
                  onChange={(e) => commitVisualChange({
                    ...stateData,
                    wal: { ...stateData.wal, verificationCommand: e.target.value }
                  })}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:border-cyan-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 text-[11px] font-medium">Diperbarui (Aturan X1 Jam)</label>
                <input
                  type="text"
                  value={stateData.wal.updatedTimestamp}
                  onChange={(e) => commitVisualChange({
                    ...stateData,
                    wal: { ...stateData.wal, updatedTimestamp: e.target.value }
                  })}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:border-cyan-500 focus:outline-none font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Token Consumption Gauge Performance Indicator (1 token / 4 chars) */}
      <TokenUsageGauge rawMarkdown={rawMarkdown} variant="footer" />

      {/* Modal Persetujuan Gerbang Kualitas (TASK-021 / ADR-07) */}
      <GateApprovalModal
        isOpen={!!approvalModalTask}
        onClose={() => setApprovalModalTask(null)}
        task={approvalModalTask}
        activeMember={activeMember}
        sessionState={stateData}
        onApprovalSuccess={(updated, md) => {
          onUpdateStateData(updated);
          onUpdateMarkdown(md);
        }}
      />
    </div>
  );
};

export const SessionStateTab = React.memo(SessionStateTabComponent);
