import React, { useState, useMemo } from 'react';
import { 
  Activity, 
  CheckCircle2, 
  Clock, 
  Terminal, 
  Play, 
  GitBranch, 
  FileText, 
  Users, 
  Tablet, 
  Layers, 
  Sparkles, 
  ShieldCheck, 
  AlertTriangle, 
  Copy, 
  Check, 
  ExternalLink, 
  Filter, 
  Search, 
  ArrowRight, 
  Cpu, 
  Database, 
  ChevronRight, 
  ChevronDown,
  FolderGit2, 
  Flame, 
  RotateCcw,
  Zap,
  Globe,
  GitPullRequest,
  Key,
  Share2,
  ArrowUpRight,
  Code2,
  BookOpen
} from 'lucide-react';
import { ParsedSessionState, ValidationResult, TaskStatus, ZLCETask, ParsedBacklogTask } from '../types/zlce';
import { copyText } from '../utils/clipboard';
import { serializeSessionStateToMarkdown, parseSessionStateMarkdown, parseTasksMarkdown } from '../utils/markdownParser';
import { generatePortableContextPack } from '../utils/contextPackGenerator';
import { CURRENT_PROJECT_SESSION_STATE_MD, CURRENT_PROJECT_TASKS_MD } from '../data/templates';
import { TEAM_MEMBERS } from '../data/teamMembers';
import { TeamMember } from '../types/mobile';
import { UseSessionPersistenceReturn } from '../hooks/useSessionPersistence';

export { TEAM_MEMBERS };
export type { TeamMember };

interface DashboardTabProps {
  stateData: ParsedSessionState;
  rawMarkdown: string;
  validation: ValidationResult;
  onUpdateMarkdown: (newMd: string) => void;
  onUpdateStateData: (newData: ParsedSessionState) => void;
  onNavigateTab: (tab: string) => void;
  onRunLinter: () => void;
  persistence?: UseSessionPersistenceReturn;
}

export const TASK_PHASES = [
  { id: 'all', name: 'Semua Task', range: 'TASK-001 s/d TASK-043', minNum: 1, maxNum: 43 },
  { id: 'fase-0', name: 'Fase 0: Baseline & Test Runner', range: 'TASK-001 s/d TASK-002', count: 2, minNum: 1, maxNum: 2 },
  { id: 'fase-1', name: 'Fase 1: PWA & Ergonomi Tablet', range: 'TASK-003 s/d TASK-007', count: 5, minNum: 3, maxNum: 7 },
  { id: 'fase-2', name: 'Fase 2: Markdown Workspace', range: 'TASK-008 s/d TASK-012', count: 5, minNum: 8, maxNum: 12 },
  { id: 'fase-3', name: 'Fase 3: Multi-AI & Context Pack', range: 'TASK-013 s/d TASK-018', count: 6, priority: true, minNum: 13, maxNum: 18 },
  { id: 'fase-4', name: 'Fase 4: Multi-Akun & Tim Estafet', range: 'TASK-019 s/d TASK-024', count: 6, priority: true, minNum: 19, maxNum: 24 },
  { id: 'fase-5', name: 'Fase 5: Command Hub & Termux', range: 'TASK-025 s/d TASK-030', count: 6, minNum: 25, maxNum: 30 },
  { id: 'fase-6', name: 'Fase 6: Git Sync & Kolaborasi Cabang', range: 'TASK-031 s/d TASK-035', count: 5, minNum: 31, maxNum: 35 },
  { id: 'fase-7', name: 'Fase 7: Uji Fisik SM-T225 & Integrasi', range: 'TASK-036 s/d TASK-040', count: 5, minNum: 36, maxNum: 40 },
  { id: 'fase-8', name: 'Fase 8: Dokumentasi & Panduan', range: 'TASK-041 s/d TASK-043', count: 3, minNum: 41, maxNum: 43 }
];

const DashboardTabComponent: React.FC<DashboardTabProps> = ({
  stateData,
  rawMarkdown,
  validation,
  onUpdateMarkdown,
  onUpdateStateData,
  onNavigateTab,
  onRunLinter,
  persistence
}) => {
  const [selectedPhase, setSelectedPhase] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [activeMemberId, setActiveMemberId] = useState<string>(() => {
    return localStorage.getItem('zlce_active_member_id') || 'eko';
  });

  // Evidence modal / inline input for marking DONE
  const [doneModalTaskId, setDoneModalTaskId] = useState<string | null>(null);
  const [evidenceInput, setEvidenceInput] = useState<string>('Verifikasi build & uji lulus 100%');

  // GitHub Sync & Remote Hub Modal state
  const [isGitSyncOpen, setIsGitSyncOpen] = useState<boolean>(false);
  const [gitSyncMode, setGitSyncMode] = useState<'direct-push' | 'fork-clone' | 'new-repo'>('direct-push');
  const [targetBranch, setTargetBranch] = useState<string>('v4-mobile');

  // Parse TASKS.md kanonik untuk mendapatkan detail setiap task atomik
  const parsedBacklogDoc = useMemo(() => {
    try {
      return parseTasksMarkdown(CURRENT_PROJECT_TASKS_MD);
    } catch {
      return { projectName: '-', raw: '', phases: [], tasks: [] };
    }
  }, []);

  const taskDetailMap = useMemo(() => {
    const map = new Map<string, ParsedBacklogTask>();
    parsedBacklogDoc.tasks.forEach(t => map.set(t.id, t));
    return map;
  }, [parsedBacklogDoc]);

  const activeMember = useMemo(() => {
    return TEAM_MEMBERS.find(m => m.id === activeMemberId) || TEAM_MEMBERS[0];
  }, [activeMemberId]);

  const handleSelectMember = (id: string) => {
    setActiveMemberId(id);
    localStorage.setItem('zlce_active_member_id', id);
    window.dispatchEvent(new Event('zlce-active-member-changed'));
  };

  const handleCopy = async (text: string, id: string) => {
    const ok = await copyText(text);
    if (ok) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Compute status summary
  const statusStats = useMemo(() => {
    const tasks = stateData.tasks || [];
    let ready = 0;
    let inProgress = 0;
    let done = 0;
    let pending = 0;
    let blocked = 0;

    tasks.forEach(t => {
      if (t.status === 'READY') ready++;
      else if (t.status === 'IN_PROGRESS') inProgress++;
      else if (t.status === 'DONE') done++;
      else if (t.status === 'BLOCKED') blocked++;
      else pending++;
    });

    const completionPercent = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;

    return { total: tasks.length, ready, inProgress, done, pending, blocked, completionPercent };
  }, [stateData.tasks]);

  // Hitung progres setiap fase untuk navigator fase
  const phaseProgressMap = useMemo(() => {
    const map = new Map<string, { total: number; done: number; isComplete: boolean }>();
    const tasks = stateData.tasks || [];

    TASK_PHASES.forEach(p => {
      if (p.id === 'all') {
        map.set('all', {
          total: tasks.length,
          done: statusStats.done,
          isComplete: statusStats.done === tasks.length
        });
        return;
      }

      let count = 0;
      let doneCount = 0;
      tasks.forEach(t => {
        const numMatch = t.id.match(/\d+/);
        if (numMatch) {
          const num = parseInt(numMatch[0], 10);
          if (num >= p.minNum && num <= p.maxNum) {
            count++;
            if (t.status === 'DONE') doneCount++;
          }
        }
      });
      map.set(p.id, {
        total: count,
        done: doneCount,
        isComplete: count > 0 && count === doneCount
      });
    });

    return map;
  }, [stateData.tasks, statusStats.done]);

  // Temukan task aktif saat ini atau task berikutnya
  const activeOrNextTask = useMemo(() => {
    const inProg = stateData.tasks.find(t => t.status === 'IN_PROGRESS');
    if (inProg) return inProg;

    const ready = stateData.tasks.find(t => t.status === 'READY');
    if (ready) return ready;

    if (stateData.status.nextTask && stateData.status.nextTask !== '-') {
      const match = stateData.tasks.find(t => t.id === stateData.status.nextTask);
      if (match) return match;
    }

    return stateData.tasks[0] || null;
  }, [stateData.tasks, stateData.status.nextTask]);

  // Detail backlog untuk activeOrNextTask
  const activeTaskDetail = useMemo(() => {
    if (!activeOrNextTask) return null;
    return taskDetailMap.get(activeOrNextTask.id) || null;
  }, [activeOrNextTask, taskDetailMap]);

  // Filter tasks based on phase, status, search
  const filteredTasks = useMemo(() => {
    return stateData.tasks.filter(t => {
      // Phase filter
      if (selectedPhase !== 'all') {
        const numMatch = t.id.match(/\d+/);
        if (numMatch) {
          const num = parseInt(numMatch[0], 10);
          const p = TASK_PHASES.find(phase => phase.id === selectedPhase);
          if (p && (num < p.minNum || num > p.maxNum)) {
            return false;
          }
        }
      }

      // Status filter
      if (statusFilter !== 'all' && t.status !== statusFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return t.id.toLowerCase().includes(q) || t.name.toLowerCase().includes(q);
      }

      return true;
    });
  }, [stateData.tasks, selectedPhase, statusFilter, searchQuery]);

  // Handle task status transition
  const handleUpdateTaskStatus = (taskId: string, newStatus: TaskStatus, customEvidence?: string) => {
    // Check 1 Task IN_PROGRESS rule
    if (newStatus === 'IN_PROGRESS') {
      const existingInProg = stateData.tasks.find(t => t.status === 'IN_PROGRESS' && t.id !== taskId);
      if (existingInProg) {
        alert(`Aturan Kolaborasi Tablet: Task ${existingInProg.id} sedang berstatus IN_PROGRESS. Hanya diperbolehkan 1 task aktif pada satu waktu di tablet bersama.`);
        return;
      }
    }

    const updatedTasks = stateData.tasks.map(t => {
      if (t.id === taskId) {
        const isNowDone = newStatus === 'DONE';
        return {
          ...t,
          status: newStatus,
          evidence: isNowDone 
            ? (customEvidence || (t.evidence !== '-' ? t.evidence : 'Verifikasi terminal sukses 0 error')) 
            : t.evidence,
          approved: isNowDone 
            ? 'ya' 
            : t.approved
        };
      }
      return t;
    });

    const updatedStatus = { ...stateData.status };
    const updatedWal = { ...stateData.wal };
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' WIB';
    const detail = taskDetailMap.get(taskId);

    if (newStatus === 'IN_PROGRESS') {
      const target = stateData.tasks.find(t => t.id === taskId);
      updatedStatus.activeTask = taskId;
      updatedStatus.activeTaskStatus = 'IN_PROGRESS';
      updatedWal.task = taskId;
      updatedWal.currentStep = `Implementasi ${target?.name || taskId} oleh ${activeMember.name}`;
      updatedWal.plannedFiles = detail?.files?.join(', ') || 'src/components/mobile/';
      updatedWal.completedSoFar = 'Penyiapan konteks kerja & verifikasi dependensi';
      updatedWal.nextStepExact = detail?.acceptanceCriteria?.[0] || 'Eksekusi kode dan verifikasi tes';
      updatedWal.verificationCommand = 'npm run build && python3 scripts/zlce-check.py .';
      updatedWal.updatedTimestamp = nowStr;
    } else if (newStatus === 'DONE') {
      updatedStatus.lastDoneTask = taskId;
      if (updatedStatus.activeTask === taskId) {
        updatedStatus.activeTask = '-';
        updatedStatus.activeTaskStatus = 'READY';
      }
      // Determine next task
      const currentIdx = stateData.tasks.findIndex(t => t.id === taskId);
      if (currentIdx >= 0 && currentIdx < stateData.tasks.length - 1) {
        const next = stateData.tasks[currentIdx + 1];
        updatedStatus.nextTask = next.id;
      }
      updatedWal.task = '-';
      updatedWal.currentStep = `Task ${taskId} tuntas diverifikasi oleh ${activeMember.name}`;
      updatedWal.nextStepExact = `Mulai task berikutnya: ${updatedStatus.nextTask}`;
      updatedWal.updatedTimestamp = nowStr;
    }

    // Append to audit log
    const updatedAuditLog = [
      `**${nowStr}:** Task ${taskId} status diubah ke ${newStatus} oleh ${activeMember.name}.`,
      ...(stateData.auditLog || []).slice(0, 20)
    ];

    const newState: ParsedSessionState = {
      ...stateData,
      tasks: updatedTasks,
      status: updatedStatus,
      wal: updatedWal,
      auditLog: updatedAuditLog
    };

    const newMd = serializeSessionStateToMarkdown(newState);
    onUpdateStateData(newState);
    onUpdateMarkdown(newMd);
  };

  // Reset or reload live canonical SESSION_STATE directly from physical disk file
  const handleReloadLiveSessionState = async () => {
    if (persistence?.reloadFromDisk) {
      const ok = await persistence.reloadFromDisk();
      if (ok) {
        alert('Berhasil disinkronkan langsung dari berkas disk /SESSION_STATE.md repositori!');
        return;
      }
    }
    if (confirm('Muat ulang state dari template kanonik workspace (ZLCE Mobile Workbench v4.0.0)?')) {
      const parsed = parseSessionStateMarkdown(CURRENT_PROJECT_SESSION_STATE_MD);
      onUpdateMarkdown(CURRENT_PROJECT_SESSION_STATE_MD);
      onUpdateStateData(parsed);
    }
  };

  // Generate complete Context Pack for current active task
  const generateContextPack = (targetTaskId?: string) => {
    const tId = targetTaskId || activeOrNextTask?.id || 'TASK-013';
    const detail = taskDetailMap.get(tId);
    const targetTask: ZLCETask = stateData.tasks.find(t => t.id === tId) || {
      id: tId,
      name: detail?.title || activeOrNextTask?.name || 'Task Atomik ZLCE',
      dependencies: detail?.dependencies || '-',
      status: activeOrNextTask?.status || 'IN_PROGRESS',
      evidence: '-',
      approved: '-'
    };

    const output = generatePortableContextPack({
      task: targetTask,
      taskDetail: detail,
      sessionState: stateData,
      activeMember,
      mode: stateData.context.mode || 'FULL'
    });

    return output.markdown;
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-12">
      {/* 1. Top Executive Banner: Project Identity & Roadmap Progress Bar */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/70 border border-slate-800 shadow-xl p-4 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 sm:space-y-2">
            {/* Clean inline metadata without pill clusters */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-mono text-slate-400">
              <span className="text-cyan-400 font-bold tracking-wider">TRACK 2</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-slate-200">ACTIVE WORKSPACE</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-emerald-400">BRANCH: {stateData.status.gitBranch || 'v4-mobile'}</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-indigo-300">MODE: {stateData.context.mode || 'FULL'}</span>
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
              {stateData.context.projectName || 'ZLCE Mobile Workbench v4.0.0'}
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-3xl leading-relaxed">
              Arsitektur <span className="text-cyan-300 font-semibold">Samsung Galaxy Tab A7 Lite 8.7" (SM-T225)</span> untuk Tim Estafet 8 Anggota &amp; Multi-AI tanpa amnesia konteks.
            </p>

            {/* Quick Context & Hardware specs strip */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px] sm:text-xs font-mono text-slate-400 pt-0.5">
              <div className="flex items-center gap-1.5 text-slate-300">
                <Tablet className="w-3.5 h-3.5 text-cyan-400" />
                <span>1340x800 · Sentuh 44px+</span>
              </div>
              <span aria-hidden="true" className="text-slate-700">·</span>
              <div className="flex items-center gap-1.5 text-slate-300">
                <Cpu className="w-3.5 h-3.5 text-amber-400" />
                <span>Termux: Python 3.11</span>
              </div>
              <span aria-hidden="true" className="text-slate-700">·</span>
              <div className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Zero-Secret Policy</span>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0 w-full sm:w-auto">
            <button
              onClick={() => onNavigateTab('session')}
              className="touch-target-44 min-h-[44px] flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs bg-cyan-600 hover:bg-cyan-500 text-white shadow-md active:scale-95 transition"
            >
              <FileText className="w-4 h-4" />
              <span>Buka SESSION_STATE &amp; WAL</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-80" />
            </button>

            <button
              onClick={() => handleCopy(generateContextPack(), 'context-pack-hero')}
              className="touch-target-44 min-h-[44px] flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl font-semibold text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 active:scale-95 transition"
            >
              {copiedId === 'context-pack-hero' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
              <span>{copiedId === 'context-pack-hero' ? 'Context Pack Tersalin!' : 'Salin Context Pack'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsGitSyncOpen(true)}
                className="touch-target-44 min-h-[44px] flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 transition"
              >
                <GitBranch className="w-3.5 h-3.5 text-emerald-400" />
                <span>GitHub Push</span>
              </button>
              <button
                onClick={handleReloadLiveSessionState}
                className="touch-target-44 min-h-[44px] p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition"
                title="Tarik & Muat Ulang Berkas SESSION_STATE.md repositori"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Executive Roadmap Progress Bar */}
        <div className="pt-4 border-t border-slate-800/80 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono gap-1 text-slate-300">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">PROGRES ROADMAP TRACK 2:</span>
              <span className="text-cyan-400 font-bold">{statusStats.done} / {statusStats.total} Task Selesai ({statusStats.completionPercent}%)</span>
            </div>
            <div className="flex items-center gap-3 text-slate-400">
              <span className="text-emerald-400">{statusStats.done} DONE</span>
              <span>·</span>
              <span className="text-amber-400">{statusStats.ready} READY</span>
              <span>·</span>
              <span>{statusStats.pending} PENDING</span>
            </div>
          </div>

          <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
            <div 
              className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all duration-500 shadow-sm shadow-emerald-500/20"
              style={{ width: `${Math.max(statusStats.completionPercent, 4)}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. Real-time Disk Bridge Card */}
      <div className={`p-3 sm:p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 transition-all ${
        persistence?.diskSync?.isSaving
          ? 'bg-amber-950/20 border-amber-800/50'
          : persistence?.diskSync?.isLive
          ? 'bg-emerald-950/20 border-emerald-800/40'
          : 'bg-slate-900 border-slate-800'
      }`}>
        <div className="flex items-start sm:items-center gap-2.5 sm:gap-3">
          <div className={`p-2 sm:p-2.5 rounded-xl shrink-0 ${
            persistence?.diskSync?.isLive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'
          }`}>
            <Database className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="font-bold text-xs sm:text-sm text-white">
                Integrasi Berkas: <code className="text-cyan-300 font-mono">/SESSION_STATE.md</code>
              </span>
              <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {persistence?.diskSync?.isSaving ? 'Menulis...' : persistence?.diskSync?.isLive ? 'Live Bridge' : 'Offline'}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 leading-relaxed">
              Task, WAL, status DONE, dan estafet tim <span className="text-slate-200">tersinkronisasi langsung ke disk fisik</span>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0 font-mono text-xs">
          <button
            onClick={() => persistence?.saveToDiskNow && persistence.saveToDiskNow()}
            disabled={persistence?.diskSync?.isSaving}
            className="touch-target-44 px-3 py-1.5 rounded-lg bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-800/80 text-cyan-200 transition active:scale-95 disabled:opacity-50"
            title="Tulis paksa markdown ke berkas /SESSION_STATE.md"
          >
            Tulis Disk
          </button>
          <button
            onClick={() => persistence?.reloadFromDisk && persistence.reloadFromDisk()}
            disabled={persistence?.diskSync?.isReading}
            className="touch-target-44 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 transition active:scale-95 disabled:opacity-50 flex items-center gap-1"
            title="Muat ulang isi langsung dari disk fisik"
          >
            <RotateCcw className={`w-3.5 h-3.5 text-emerald-400 ${persistence?.diskSync?.isReading ? 'animate-spin' : ''}`} />
            <span>Tarik Disk</span>
          </button>
        </div>
      </div>

      {/* 3. Metrics Counter Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        {/* Total Tasks */}
        <div className="bg-slate-900 border border-slate-800 p-3 sm:p-3.5 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-[11px] sm:text-xs font-medium mb-1">
            <span>Total Backlog</span>
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-white">{statusStats.total}</div>
          <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 font-mono">9 Fase Eksekusi</div>
        </div>

        {/* Ready Tasks */}
        <div className="bg-slate-900 border border-amber-900/40 p-3 sm:p-3.5 rounded-xl">
          <div className="flex items-center justify-between text-amber-400 text-[11px] sm:text-xs font-medium mb-1">
            <span>Siap Eksekusi</span>
            <Zap className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-300">{statusStats.ready}</div>
          <div className="text-[10px] sm:text-[11px] text-amber-400/80 mt-0.5 font-mono">{activeOrNextTask?.id || 'TASK-013'}</div>
        </div>

        {/* In Progress */}
        <div className="bg-slate-900 border border-cyan-900/40 p-3 sm:p-3.5 rounded-xl">
          <div className="flex items-center justify-between text-cyan-400 text-[11px] sm:text-xs font-medium mb-1">
            <span>In Progress</span>
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-cyan-300">{statusStats.inProgress} / 1</div>
          <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 font-mono">1 Task Tablet</div>
        </div>

        {/* Completed */}
        <div className="bg-slate-900 border border-emerald-900/40 p-3 sm:p-3.5 rounded-xl">
          <div className="flex items-center justify-between text-emerald-400 text-[11px] sm:text-xs font-medium mb-1">
            <span>Task DONE</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-300">{statusStats.done}</div>
          <div className="text-[10px] sm:text-[11px] text-emerald-400/80 mt-0.5 font-mono">Fase 0, 1, 2 OK</div>
        </div>

        {/* Pending */}
        <div className="bg-slate-900 border border-slate-800 p-3 sm:p-3.5 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-[11px] sm:text-xs font-medium mb-1">
            <span>Pending</span>
            <Clock className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-300">{statusStats.pending}</div>
          <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 font-mono">Antrean</div>
        </div>

        {/* State Health */}
        <div className={`border p-3 sm:p-3.5 rounded-xl ${validation.valid ? 'bg-emerald-950/20 border-emerald-800/40' : 'bg-rose-950/20 border-rose-800/40'}`}>
          <div className="flex items-center justify-between text-[11px] sm:text-xs font-medium mb-1">
            <span className={validation.valid ? 'text-emerald-400' : 'text-rose-400'}>State Health</span>
            <ShieldCheck className={`w-3.5 h-3.5 ${validation.valid ? 'text-emerald-400' : 'text-rose-400'}`} />
          </div>
          <div className={`text-lg sm:text-xl font-extrabold ${validation.valid ? 'text-emerald-300' : 'text-rose-300'}`}>
            {validation.valid ? '100% VALID' : `${validation.errorsCount} ERROR`}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 font-mono">
            {validation.valid ? 'zlce-check PASS' : 'Cek Error'}
          </div>
        </div>
      </div>

      {/* 4. Main Grid: Dynamic Spotlight on Active Task + Team Selector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Spotlight Card: The Task Running / Next Up (Span 2 cols) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3 sm:pb-4">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="p-2 sm:p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <div className="text-[10px] sm:text-xs uppercase font-mono font-bold text-amber-400 tracking-wider">
                  Fokus Eksekusi Sekarang
                </div>
                <h3 className="text-base sm:text-lg lg:text-xl font-bold text-white">
                  {activeOrNextTask?.id}: {activeTaskDetail?.title || activeOrNextTask?.name}
                </h3>
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className={`px-2.5 py-1 rounded-md text-[11px] sm:text-xs font-mono font-bold uppercase border ${
                activeOrNextTask?.status === 'IN_PROGRESS'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 animate-pulse'
                  : activeOrNextTask?.status === 'READY'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}>
                ● Status: {activeOrNextTask?.status || 'READY'}
              </span>
            </div>
          </div>

          {/* Dynamic Details & Acceptance Criteria from TASKS.md */}
          <div className="space-y-3 sm:space-y-4 text-xs sm:text-sm">
            {/* Description if present */}
            {activeTaskDetail?.description && (
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/70 p-2.5 sm:p-3 rounded-lg border border-slate-800/80">
                {activeTaskDetail.description}
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 text-xs font-mono">
              <div className="bg-slate-950 p-2.5 sm:p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400 block mb-0.5 text-[11px]">Fase &amp; Jalur:</span>
                <span className="text-slate-200 font-bold truncate block">{activeTaskDetail?.phase || 'Fase Eksekusi ZLCE'}</span>
              </div>
              <div className="bg-slate-950 p-2.5 sm:p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400 block mb-0.5 text-[11px]">Dependensi:</span>
                <span className="text-emerald-400 font-bold">{activeOrNextTask?.dependencies || '-'}</span>
              </div>
              <div className="bg-slate-950 p-2.5 sm:p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400 block mb-0.5 text-[11px]">Berkas Direncanakan:</span>
                <span className="text-cyan-300 font-bold truncate block" title={activeTaskDetail?.files?.join(', ') || stateData.wal.plannedFiles}>
                  {activeTaskDetail?.files?.join(', ') || stateData.wal.plannedFiles || '-'}
                </span>
              </div>
            </div>

            {/* Dynamic Acceptance Criteria Box */}
            <div className="bg-slate-950/80 rounded-xl p-3 sm:p-4 border border-slate-800/80 space-y-2">
              <div className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Kriteria Penerimaan (Acceptance Criteria):
                </span>
                {activeTaskDetail?.testCase && (
                  <span className="font-mono text-cyan-400 text-[10px] sm:text-[11px] font-normal">
                    Test Case: {activeTaskDetail.testCase}
                  </span>
                )}
              </div>
              
              {activeTaskDetail?.acceptanceCriteria && activeTaskDetail.acceptanceCriteria.length > 0 ? (
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {activeTaskDetail.acceptanceCriteria.map((ac, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] shrink-0 mt-0.5 font-bold">
                        {idx + 1}
                      </span>
                      <span>{ac}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-xs text-slate-400 font-mono">
                  Langkah berikutnya dari WAL: {stateData.wal.nextStepExact || 'Selesaikan implementasi sesuai cetak biru.'}
                </div>
              )}
            </div>

            {/* Terminal Command to Run in Termux */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span className="flex items-center gap-1.5 text-[11px] sm:text-xs">
                  <Terminal className="w-3.5 h-3.5 text-amber-400" />
                  Perintah Verifikasi di Termux / Shell:
                </span>
                <button
                  onClick={() => handleCopy(stateData.wal.verificationCommand || 'npm run build && python3 scripts/zlce-check.py .', 'cmd-spotlight')}
                  className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 transition"
                >
                  {copiedId === 'cmd-spotlight' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copiedId === 'cmd-spotlight' ? 'Tersalin' : 'Salin Perintah'}
                </button>
              </div>
              <pre className="bg-slate-950 p-2.5 sm:p-3 rounded-lg border border-slate-800 text-[11px] sm:text-xs font-mono text-cyan-300 overflow-x-auto">
{stateData.wal.verificationCommand || 'npm run build && python3 scripts/zlce-check.py .'}
              </pre>
            </div>

            {/* Dynamic Git Commit Command with Atribusi Anggota Aktif */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span className="flex items-center gap-1.5 text-[11px] sm:text-xs">
                  <FolderGit2 className="w-3.5 h-3.5 text-emerald-400" />
                  Template Commit Git (Atribusi: {activeMember.name}):
                </span>
                <button
                  onClick={() => handleCopy(
                    `git -c user.name="${activeMember.name}" -c user.email="${activeMember.email}" commit -m "${activeOrNextTask?.id || 'TASK-013'}: ${(activeTaskDetail?.title || activeOrNextTask?.name || 'update').toLowerCase()}"`,
                    'git-commit-spotlight'
                  )}
                  className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 transition"
                >
                  {copiedId === 'git-commit-spotlight' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copiedId === 'git-commit-spotlight' ? 'Tersalin' : 'Salin Commit'}
                </button>
              </div>
              <pre className="bg-slate-950 p-2.5 sm:p-3 rounded-lg border border-slate-800 text-[11px] sm:text-xs font-mono text-emerald-400 overflow-x-auto">
{`git -c user.name="${activeMember.name}" -c user.email="${activeMember.email}" commit -m "${activeOrNextTask?.id || 'TASK-013'}: ${(activeTaskDetail?.title || activeOrNextTask?.name || 'update').toLowerCase()}"`}
              </pre>
            </div>
          </div>

          {/* Interactive State Transition Actions */}
          <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
            {activeOrNextTask?.status !== 'IN_PROGRESS' ? (
              <button
                onClick={() => handleUpdateTaskStatus(activeOrNextTask?.id || 'TASK-013', 'IN_PROGRESS')}
                className="touch-target-44 min-h-[44px] flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm bg-cyan-600 hover:bg-cyan-500 text-white shadow-md active:scale-95 transition"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Mulai Kerjakan (Set IN_PROGRESS)</span>
              </button>
            ) : (
              <button
                onClick={() => setDoneModalTaskId(activeOrNextTask?.id || 'TASK-013')}
                className="touch-target-44 min-h-[44px] flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-md active:scale-95 transition"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Selesaikan &amp; Setujui (Set DONE)</span>
              </button>
            )}

            <button
              onClick={() => handleCopy(generateContextPack(activeOrNextTask?.id), 'spotlight-cp')}
              className="touch-target-44 min-h-[44px] flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              {copiedId === 'spotlight-cp' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
              <span>{copiedId === 'spotlight-cp' ? 'Context Pack Tersalin' : 'Salin Context Pack'}</span>
            </button>

            <button
              onClick={() => onNavigateTab('session')}
              className="touch-target-44 min-h-[44px] flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition"
            >
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span>Buka WAL Lengkap</span>
            </button>

            <button
              onClick={() => onNavigateTab('git-sync')}
              className="touch-target-44 min-h-[44px] flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-indigo-950/70 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/60 transition"
            >
              <GitBranch className="w-3.5 h-3.5 text-indigo-400" />
              <span>Git Sync (Fase 6)</span>
            </button>
          </div>
        </div>

        {/* Right Column: 8-Member Relay Team Selector & Device Monitor */}
        <div className="space-y-4 sm:space-y-6">
          {/* Active Member Selector Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 sm:pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white">Tim Estafet (8 Anggota)</h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-400">Pemegang tablet saat ini (ADR-07)</p>
                </div>
              </div>
            </div>

            {/* Active Driver Highlight */}
            <div className="bg-gradient-to-r from-slate-950 to-indigo-950/40 p-3 rounded-xl border border-indigo-900/40 flex items-center justify-between">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr ${activeMember.avatarColor} flex items-center justify-center font-bold text-white shadow-md ring-2 ring-white/10 shrink-0 text-xs sm:text-sm`}>
                  {activeMember.name.slice(0, 2)}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs sm:text-sm font-bold text-white">{activeMember.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-indigo-500/20 text-indigo-300">
                      Driver
                    </span>
                  </div>
                  <div className="text-[11px] sm:text-xs text-slate-400">{activeMember.role}</div>
                </div>
              </div>
              <div className="text-right font-mono text-[10px] sm:text-[11px] text-slate-400 shrink-0">
                <div>AI: <span className="text-cyan-300">{(activeMember.aiPreference || 'Gemini').split(' ')[0]}</span></div>
                <div className="text-[10px] text-emerald-400">Sah</div>
              </div>
            </div>

            {/* Grid of all 8 members with 1-tap select */}
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2 text-xs">
              {TEAM_MEMBERS.map(m => (
                <button
                  key={m.id}
                  onClick={() => handleSelectMember(m.id)}
                  className={`touch-target-44 flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-lg border text-left transition ${
                    activeMemberId === m.id
                      ? 'bg-cyan-950/60 border-cyan-500/80 text-white shadow-sm ring-1 ring-cyan-500/40'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-tr ${m.avatarColor} flex items-center justify-center text-[9px] sm:text-[10px] font-bold text-white shrink-0`}>
                    {m.name.slice(0, 1)}
                  </div>
                  <div className="truncate min-w-0">
                    <div className="font-semibold truncate text-[11px] sm:text-xs">{m.name}</div>
                    <div className="text-[10px] text-slate-400 truncate">{m.role.split(' ')[0]}</div>
                  </div>
                </button>
              ))}
            </div>

            <div className="text-[10px] sm:text-[11px] text-slate-400 bg-slate-950 p-2 sm:p-2.5 rounded-lg border border-slate-800 space-y-0.5">
              <span className="font-semibold text-slate-300 block">Prosedur Serah Terima Tablet:</span>
              <p>Commit di Termux, perbarui Bagian 6, lalu pilih anggota baru.</p>
            </div>
          </div>

          {/* Device Constraints & Architecture Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-2.5 sm:space-y-3">
            <h4 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <Tablet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" />
              Spesifikasi &amp; ADR Tablet:
            </h4>
            <div className="space-y-1.5 sm:space-y-2 text-[11px] sm:text-xs text-slate-300 font-mono">
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Model:</span>
                <span className="text-white font-semibold">Galaxy Tab A7 Lite (SM-T225)</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">RAM:</span>
                <span className="text-amber-300 font-semibold">3GB (LMK Aware · 400ms)</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">ADR-09:</span>
                <span className="text-cyan-300 font-semibold">Obsidian Dieksklusikan</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Keamanan:</span>
                <span className="text-emerald-300 font-semibold">Zero-Secret (git-cache 900s)</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400">Viewport:</span>
                <span className="text-white font-semibold">8.7" (1340x800)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Task Backlog Matrix & 9-Phase Roadmap */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 border-b border-slate-800 pb-3 sm:pb-4">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
              Matriks Backlog 43 Task Atomik (Fase 0 s/d 8)
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
              Klik task untuk melihat acceptance criteria &amp; berkas. Aturan: hanya 1 task IN_PROGRESS pada tablet bersama.
            </p>
          </div>

          {/* Search & Status Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari ID atau nama..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-full sm:w-48 lg:w-56 font-mono"
              />
            </div>

            {/* Segmented Status Selector */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono w-full sm:w-auto"
            >
              <option value="all">Semua Status ({statusStats.total})</option>
              <option value="READY">READY ({statusStats.ready})</option>
              <option value="IN_PROGRESS">IN_PROGRESS ({statusStats.inProgress})</option>
              <option value="DONE">DONE ({statusStats.done})</option>
              <option value="PENDING">PENDING ({statusStats.pending})</option>
              <option value="BLOCKED">BLOCKED ({statusStats.blocked})</option>
            </select>
          </div>
        </div>

        {/* Phase Filter Buttons with Completion Progress */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-2 scrollbar-none w-full flex-nowrap min-w-0">
          {TASK_PHASES.map(phase => {
            const pStats = phaseProgressMap.get(phase.id);
            const isSelected = selectedPhase === phase.id;
            return (
              <button
                key={phase.id}
                onClick={() => setSelectedPhase(phase.id)}
                className={`touch-target-44 shrink-0 px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-mono whitespace-nowrap transition border flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-cyan-950/70 text-cyan-300 border-cyan-500/80 font-bold shadow-sm'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <span>{phase.name}</span>
                {pStats && (
                  <span className={`text-[10px] px-1 rounded ${
                    pStats.isComplete ? 'bg-emerald-950 text-emerald-400 font-bold' : 'text-slate-400'
                  }`}>
                    {pStats.done}/{pStats.total} {pStats.isComplete && '✓'}
                  </span>
                )}
                {phase.priority && <span className="text-[10px] text-amber-400 font-bold">★</span>}
              </button>
            );
          })}
        </div>

        {/* Tasks List / Expandable Cards */}
        <div className="space-y-2">
          {filteredTasks.length === 0 ? (
            <div className="bg-slate-950/50 p-8 rounded-xl border border-slate-800 text-center text-slate-400 text-xs font-mono">
              Tidak ada task yang cocok dengan filter atau pencarian.
            </div>
          ) : (
            filteredTasks.map((task) => {
              const isSpotlight = task.id === activeOrNextTask?.id;
              const isExpanded = expandedTaskId === task.id;
              const detail = taskDetailMap.get(task.id);

              return (
                <div
                  key={task.id}
                  className={`rounded-xl border transition-all ${
                    task.status === 'IN_PROGRESS'
                      ? 'bg-cyan-950/30 border-cyan-500/70 shadow-md ring-1 ring-cyan-500/30'
                      : isSpotlight
                      ? 'bg-slate-950/90 border-amber-600/50'
                      : 'bg-slate-950/50 border-slate-800/80 hover:bg-slate-950/90 hover:border-slate-700'
                  }`}
                >
                  {/* Task Summary Row */}
                  <div className="p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-start md:items-center gap-3">
                      <span className={`px-2.5 py-1 rounded font-mono font-bold text-xs shrink-0 ${
                        task.status === 'DONE'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : task.status === 'IN_PROGRESS'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : task.status === 'READY'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {task.id}
                      </span>

                      <div>
                        <div className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                          <span>{detail?.title || task.name}</span>
                          {task.status === 'IN_PROGRESS' && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/30 text-cyan-300 font-mono">
                              Sedang Dikerjakan
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-0.5 font-mono">
                          <span>Dep: <span className="text-slate-300">{task.dependencies}</span></span>
                          {detail?.phase && (
                            <>
                              <span>·</span>
                              <span className="text-slate-400">{detail.phase.split(':')[0]}</span>
                            </>
                          )}
                          {task.approved !== '-' && (
                            <>
                              <span>·</span>
                              <span className="text-emerald-400">Persetujuan: {task.approved}</span>
                            </>
                          )}
                          {task.evidence !== '-' && (
                            <>
                              <span>·</span>
                              <span className="text-cyan-400 truncate max-w-xs">Bukti: {task.evidence}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions & Expand Button */}
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-auto font-mono">
                      <button
                        onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                        className="touch-target-44 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs flex items-center gap-1 transition"
                        title="Lihat detail kriteria penerimaan dan berkas"
                      >
                        <span>{isExpanded ? 'Tutup' : 'Detail'}</span>
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </button>

                      <select
                        value={task.status}
                        onChange={e => handleUpdateTaskStatus(task.id, e.target.value as TaskStatus)}
                        className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border focus:outline-none transition ${
                          task.status === 'DONE'
                            ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60'
                            : task.status === 'IN_PROGRESS'
                            ? 'bg-cyan-950/60 text-cyan-300 border-cyan-600/60'
                            : task.status === 'READY'
                            ? 'bg-amber-950/60 text-amber-300 border-amber-700/60'
                            : 'bg-slate-900 text-slate-300 border-slate-700'
                        }`}
                      >
                        <option value="PENDING">PENDING</option>
                        <option value="READY">READY</option>
                        <option value="IN_PROGRESS">IN_PROGRESS</option>
                        <option value="BLOCKED">BLOCKED</option>
                        <option value="DONE">DONE</option>
                      </select>

                      {task.status !== 'IN_PROGRESS' && task.status !== 'DONE' && (
                        <button
                          onClick={() => handleUpdateTaskStatus(task.id, 'IN_PROGRESS')}
                          className="touch-target-44 px-2.5 py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-semibold transition"
                          title="Klaim task ini sebagai aktif"
                        >
                          Klaim
                        </button>
                      )}

                      {task.status === 'IN_PROGRESS' && (
                        <button
                          onClick={() => setDoneModalTaskId(task.id)}
                          className="touch-target-44 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition"
                          title="Tandai task selesai dengan bukti verifikasi"
                        >
                          Selesaikan
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Task Drawer with Full Metadata */}
                  {isExpanded && (
                    <div className="p-4 bg-slate-950/90 border-t border-slate-800 space-y-3 text-xs animate-in fade-in">
                      {detail?.description && (
                        <div>
                          <span className="text-slate-400 font-bold block mb-1 font-mono uppercase text-[10px]">
                            Deskripsi Task:
                          </span>
                          <p className="text-slate-200 leading-relaxed bg-slate-900/80 p-2.5 rounded border border-slate-800">
                            {detail.description}
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                        <div className="p-2.5 bg-slate-900/80 rounded border border-slate-800">
                          <span className="text-slate-400 block text-[10px]">Berkas Yang Disentuh:</span>
                          <span className="text-cyan-300 font-bold">
                            {detail?.files?.join(', ') || '-'}
                          </span>
                        </div>
                        <div className="p-2.5 bg-slate-900/80 rounded border border-slate-800">
                          <span className="text-slate-400 block text-[10px]">Dokumen Terkait / Rujukan:</span>
                          <span className="text-slate-300 truncate block">
                            {detail?.docsRelated || '-'}
                          </span>
                        </div>
                      </div>

                      {detail?.acceptanceCriteria && detail.acceptanceCriteria.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-slate-400 font-bold block font-mono uppercase text-[10px]">
                            Kriteria Penerimaan (Acceptance Criteria):
                          </span>
                          <ul className="space-y-1.5 pl-1">
                            {detail.acceptanceCriteria.map((ac, acIdx) => (
                              <li key={acIdx} className="flex items-start gap-2 text-slate-300">
                                <span className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[9px] shrink-0 mt-0.5 font-bold">
                                  {acIdx + 1}
                                </span>
                                <span>{ac}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Quick copy buttons for this task */}
                      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/80 font-mono">
                        <button
                          onClick={() => handleCopy(task.id, `copy-id-${task.id}`)}
                          className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-[11px] flex items-center gap-1"
                        >
                          {copiedId === `copy-id-${task.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>Salin ID Task</span>
                        </button>

                        <button
                          onClick={() => handleCopy(generateContextPack(task.id), `copy-cp-${task.id}`)}
                          className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-cyan-300 text-[11px] flex items-center gap-1"
                        >
                          {copiedId === `copy-cp-${task.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>Salin Context Pack ({task.id})</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 6. Write-Ahead Log (WAL) & Handover Notes Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* WAL Display Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-cyan-400" />
              Write-Ahead Log (WAL) Saat Ini
            </h4>
            <button
              onClick={() => onNavigateTab('session')}
              className="text-[11px] text-slate-400 hover:text-cyan-300 font-mono"
            >
              Edit di SESSION_STATE →
            </button>
          </div>

          <div className="space-y-2 text-xs font-mono text-slate-300">
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[10px]">TASK:</span>
              <span className="text-white font-bold">{stateData.wal.task || '-'}</span>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[10px]">LANGKAH SEDANG DIKERJAKAN:</span>
              <span className="text-slate-200">{stateData.wal.currentStep || '-'}</span>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[10px]">LANGKAH BERIKUTNYA (PERSIS):</span>
              <span className="text-cyan-300">{stateData.wal.nextStepExact || '-'}</span>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[10px]">PERINTAH VERIFIKASI:</span>
              <span className="text-emerald-400">{stateData.wal.verificationCommand || '-'}</span>
            </div>
          </div>
        </div>

        {/* Serah Terima Notes Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-amber-400" />
              Catatan Serah Terima (Bagian 6)
            </h4>
            <span className="text-[10px] text-slate-400 font-mono">Single Source of Truth</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs text-slate-300 font-mono leading-relaxed space-y-1.5 whitespace-pre-wrap max-h-60 overflow-y-auto">
            {stateData.handoverNotes || '* Gerbang P2-CP4 (Blueprint Approval) telah disetujui resmi.\n* Backlog 43 task atomik telah dirumuskan di TASKS.md.'}
          </div>
        </div>
      </div>

      {/* Done Modal (Verification Evidence Prompt) */}
      {doneModalTaskId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Selesaikan {doneModalTaskId}</h3>
                <p className="text-xs text-slate-400">Aturan ZLCE: Status DONE wajib disertai bukti verifikasi riil</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Bukti Verifikasi (Evidence Output / Test Results):
                </label>
                <input
                  type="text"
                  value={evidenceInput}
                  onChange={e => setEvidenceInput(e.target.value)}
                  placeholder="Contoh: npm test 100% pass, build 0 error, lint clean"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1 font-mono text-[11px] text-slate-400">
                <div>Penyetuju (Provenance): <span className="text-white font-bold">{activeMember.name}</span></div>
                <div>Status Gerbang: <span className="text-emerald-400">ya</span> (Provenance dicatat ke Audit Log &amp; Git)</div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setDoneModalTaskId(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  handleUpdateTaskStatus(doneModalTaskId, 'DONE', evidenceInput);
                  setDoneModalTaskId(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-lg shadow-emerald-600/30"
              >
                Konfirmasi Status DONE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GitHub Sync & Remote Hub Modal */}
      {isGitSyncOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl my-8">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md">
                  <GitBranch className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>GitHub Sync &amp; Remote Hub</span>
                    <span className="text-xs font-mono font-normal px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      v4-mobile
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Panduan &amp; perintah siap pakai untuk push dan sinkronisasi ke GitHub
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsGitSyncOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
              <div className="space-y-0.5">
                <span className="text-slate-400 block text-[10px]">REMOTE ORIGIN TERHUBUNG:</span>
                <span className="text-emerald-400 font-bold break-all">https://github.com/layangsetrum-arch/T1ZLCE-Mobench-v4.0.0GA.git</span>
              </div>
              <div className="text-left sm:text-right space-y-0.5 shrink-0">
                <span className="text-slate-400 block text-[10px]">CABANG AKTIF:</span>
                <span className="text-cyan-300 font-bold">{targetBranch} (120 berkas ter-commit)</span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <span className="font-bold text-slate-200 block font-mono">Perintah Terminal untuk Push ke GitHub:</span>
              <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-cyan-300 overflow-x-auto text-xs">
{`git remote -v
git checkout ${targetBranch}
git push origin ${targetBranch}`}
              </pre>

              <button
                onClick={() => handleCopy(`git checkout ${targetBranch} && git push origin ${targetBranch}`, 'copy-git-push-modal')}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition flex items-center justify-center gap-2"
              >
                {copiedId === 'copy-git-push-modal' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedId === 'copy-git-push-modal' ? 'Perintah Push Tersalin!' : 'Salin Perintah Push Terminal'}</span>
              </button>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsGitSyncOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 text-slate-300 hover:text-white transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const DashboardTab = React.memo(DashboardTabComponent);
