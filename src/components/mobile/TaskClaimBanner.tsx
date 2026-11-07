import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Unlock, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  UserCheck, 
  ShieldAlert,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { ParsedSessionState, TaskStatus } from '../../types/zlce';
import { TeamMember } from '../../types/mobile';
import { 
  getActiveTaskClaim, 
  TaskClaimRecord, 
  releaseTaskClaim,
  saveActiveTaskClaim,
  incrementClaimRevision
} from '../../utils/taskClaimManager';
import { getMemberById } from '../../data/teamMembers';

interface TaskClaimBannerProps {
  sessionState: ParsedSessionState;
  activeMember: TeamMember;
  onCommitChange: (updatedState: ParsedSessionState) => void;
  onRequestApproval?: (taskId: string) => void;
  className?: string;
}

export const TaskClaimBanner: React.FC<TaskClaimBannerProps> = ({
  sessionState,
  activeMember,
  onCommitChange,
  onRequestApproval,
  className = ''
}) => {
  const [activeClaim, setActiveClaim] = useState<TaskClaimRecord | null>(() => getActiveTaskClaim());
  const [elapsedMinutes, setElapsedMinutes] = useState<number>(0);

  // Cari task berstatus IN_PROGRESS di matriks
  const inProgressTask = sessionState.tasks.find(t => t.status === 'IN_PROGRESS');

  // Sinkronkan claim dengan localStorage dan event
  useEffect(() => {
    const syncClaim = () => {
      const claim = getActiveTaskClaim();
      setActiveClaim(claim);
    };

    window.addEventListener('storage', syncClaim);
    window.addEventListener('zlce-task-claim-changed', syncClaim);
    
    return () => {
      window.removeEventListener('storage', syncClaim);
      window.removeEventListener('zlce-task-claim-changed', syncClaim);
    };
  }, []);

  // Update timer durasi pengerjaan
  useEffect(() => {
    if (!activeClaim?.claimedAtISO) return;

    const updateElapsed = () => {
      const start = new Date(activeClaim.claimedAtISO).getTime();
      const now = Date.now();
      const mins = Math.max(0, Math.floor((now - start) / 60000));
      setElapsedMinutes(mins);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 30000); // Tiap 30 detik
    return () => clearInterval(interval);
  }, [activeClaim]);

  // Jika di matriks ada IN_PROGRESS tapi activeClaim belum tercatat, buat record klaim otomatis
  useEffect(() => {
    if (inProgressTask && (!activeClaim || activeClaim.taskId !== inProgressTask.id)) {
      const fallbackClaim: TaskClaimRecord = {
        taskId: inProgressTask.id,
        taskName: inProgressTask.name,
        memberId: activeMember.id,
        memberName: activeMember.name,
        memberAvatar: activeMember.avatarColor,
        claimedAtISO: new Date().toISOString(),
        claimedAtWIB: new Date().toLocaleTimeString('id-ID', { hour12: false }) + ' WIB',
        status: 'ACTIVE',
        revision: incrementClaimRevision()
      };
      saveActiveTaskClaim(fallbackClaim);
      setActiveClaim(fallbackClaim);
    } else if (!inProgressTask && activeClaim) {
      saveActiveTaskClaim(null);
      setActiveClaim(null);
    }
  }, [inProgressTask, activeMember, activeClaim]);

  // Handle rilis klaim
  const handleRelease = (taskId: string) => {
    if (confirm(`Apakah Anda yakin ingin melepaskan klaim untuk ${taskId}? Task akan dikembalikan ke status READY.`)) {
      const res = releaseTaskClaim(taskId, sessionState, `Dilepaskan oleh ${activeMember.name}`);
      if (res.success && res.updatedState) {
        onCommitChange(res.updatedState);
        setActiveClaim(null);
      }
    }
  };

  // Jika tidak ada task IN_PROGRESS
  if (!inProgressTask) {
    return (
      <div className={`p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between text-xs text-slate-400 ${className}`}>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>
            <strong>Status Pengerjaan:</strong> Tidak ada task aktif. Tablet bebas untuk klaim task baru (Invarian I1: Max 1 IN_PROGRESS).
          </span>
        </div>
        <span className="text-[11px] font-mono text-cyan-400">Siap Klaim</span>
      </div>
    );
  }

  const claimDriver = activeClaim ? getMemberById(activeClaim.memberId) : activeMember;
  const isCurrentDriver = claimDriver.id.toLowerCase() === activeMember.id.toLowerCase();

  return (
    <div className={`p-4 bg-gradient-to-r from-amber-950/40 via-slate-900 to-indigo-950/40 border border-amber-600/40 rounded-2xl shadow-lg ${className}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Detail Task & Pemegang Klaim */}
        <div className="flex items-start gap-3">
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-tr ${claimDriver.avatarColor} flex items-center justify-center font-bold text-white text-base shadow shrink-0 ring-2 ring-amber-500/50`}>
            {claimDriver.name.slice(0, 1)}
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                KLAIM AKTIF: {inProgressTask.id}
              </span>
              <span className="text-xs font-semibold text-slate-300">
                Pemegang: <strong className="text-white">{claimDriver.name}</strong> (@{claimDriver.id})
              </span>
              {isCurrentDriver ? (
                <span className="px-2 py-0.2 rounded-full text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  Anda
                </span>
              ) : (
                <span className="px-2 py-0.2 rounded-full text-[10px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  Anggota Lain
                </span>
              )}
            </div>

            <h4 className="text-sm font-bold text-white">
              {inProgressTask.name}
            </h4>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Mulai: {activeClaim?.claimedAtWIB || 'Baru saja'} {elapsedMinutes > 0 ? `(${elapsedMinutes} mnt)` : ''}
              </span>
              <span>•</span>
              <span className="text-emerald-400">Aturan 1 Task IN_PROGRESS Terkunci</span>
            </div>
          </div>
        </div>

        {/* Action Buttons: Target sentuh ergonomis tablet >= 44px */}
        <div className="flex items-center gap-2 self-end md:self-center shrink-0 pt-2 md:pt-0">
          <button
            type="button"
            onClick={() => handleRelease(inProgressTask.id)}
            className="touch-target-44 min-h-[44px] px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 border border-slate-700"
            title="Kembalikan task ke status READY"
          >
            <Unlock className="w-4 h-4 text-slate-400" />
            <span>Rilis Klaim</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (onRequestApproval) {
                onRequestApproval(inProgressTask.id);
              }
            }}
            className="touch-target-44 min-h-[44px] px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-emerald-900/40"
            title="Ajukan verifikasi gerbang kualitas dan tandai DONE"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            <span>Selesaikan &amp; Setujui</span>
          </button>
        </div>
      </div>
    </div>
  );
};
