import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  CheckCircle, 
  X, 
  FileCheck, 
  UserCheck, 
  AlertCircle,
  HelpCircle,
  Eye,
  Check
} from 'lucide-react';
import { ParsedSessionState, ZLCETask } from '../../types/zlce';
import { TeamMember } from '../../types/mobile';
import { loadTeamRegistry, getMemberById } from '../../data/teamMembers';
import { recordGateApproval } from '../../utils/gateApprovalManager';

interface GateApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: ZLCETask | null;
  activeMember: TeamMember;
  sessionState: ParsedSessionState;
  onApprovalSuccess: (updatedState: ParsedSessionState, updatedMarkdown: string) => void;
}

export const GateApprovalModal: React.FC<GateApprovalModalProps> = ({
  isOpen,
  onClose,
  task,
  activeMember,
  sessionState,
  onApprovalSuccess
}) => {
  const [approverId, setApproverId] = useState<string>(activeMember.id);
  const [evidence, setEvidence] = useState<string>('');
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMembers(loadTeamRegistry());
      setApproverId(activeMember.id);
      setEvidence(task?.evidence && task.evidence !== '-' ? task.evidence : 'Suite uji TC-P4 lulus 100%, 0 error');
      setErrorMessage(null);
    }
  }, [isOpen, activeMember, task]);

  if (!isOpen || !task) return null;

  const currentApprover = getMemberById(approverId);
  const previewApprovalText = `ya (oleh: ${currentApprover.name})`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evidence.trim()) {
      setErrorMessage('Bukti verifikasi tidak boleh kosong untuk menetapkan status DONE.');
      return;
    }

    const result = recordGateApproval({
      taskId: task.id,
      approver: currentApprover,
      evidence: evidence.trim(),
      sessionState
    });

    if (result.success && result.updatedState && result.updatedMarkdown) {
      onApprovalSuccess(result.updatedState, result.updatedMarkdown);
      onClose();
    } else {
      setErrorMessage(result.error || 'Gagal mencatatkan persetujuan gerbang kualitas.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div 
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-labelledby="gate-approval-title"
      >
        {/* Header Modal */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="gate-approval-title" className="text-base sm:text-lg font-bold text-white">
                  Persetujuan Gerbang Kualitas
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  ADR-07
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Pencatatan persetujuan manusia &amp; atribusi provenance (TASK-021)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="touch-target-44 w-10 h-10 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition"
            aria-label="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          {/* Target Task Summary Card */}
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-cyan-400">
                {task.id}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                Menuju DONE
              </span>
            </div>
            <h4 className="text-sm font-bold text-white">
              {task.name}
            </h4>
            <p className="text-xs text-slate-400">
              Dependensi: <code className="text-slate-300">{task.dependencies}</code>
            </p>
          </div>

          {/* Pemilihan Anggota Penyetuju (Hak Persetujuan Merata 8 Anggota) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-cyan-400" />
                Anggota Penyetuju (Driver Tablet / Peer Reviewer):
              </span>
              <span className="text-[10px] text-slate-500 font-normal">
                8 Anggota memiliki hak setuju (ADR-07)
              </span>
            </label>

            <select
              value={approverId}
              onChange={(e) => setApproverId(e.target.value)}
              className="w-full touch-target-44 min-h-[44px] bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 font-medium focus:border-cyan-500 focus:outline-none"
            >
              {members.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} (@{m.id}) — {m.role.split('(')[0]}
                </option>
              ))}
            </select>
          </div>

          {/* Bukti Verifikasi Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-emerald-400" />
                Bukti Verifikasi (Wajib):
              </span>
              <span className="text-[10px] text-slate-500 font-normal">
                Perintah pengujian / log kelulusan
              </span>
            </label>

            <input
              type="text"
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              placeholder="Contoh: pytest 10/10 pass, npm run build 0 error"
              className="w-full touch-target-44 min-h-[44px] bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
              required
            />
          </div>

          {/* Live Preview Box */}
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 space-y-2 text-xs">
            <div className="flex items-center gap-1.5 text-slate-400 font-medium text-[11px]">
              <Eye className="w-3.5 h-3.5 text-cyan-400" />
              <span>Pratinjau Dampak ke SESSION_STATE.md:</span>
            </div>

            <div className="space-y-1 font-mono text-[11px]">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Kolom Disetujui:</span>
                <span className="text-emerald-300 font-bold bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                  {previewApprovalText}
                </span>
              </div>
              <div className="text-slate-500 pt-1">
                Log Audit Bagian 7:
              </div>
              <div className="p-2 bg-slate-900 rounded text-slate-300 text-[10px] border border-slate-800 break-words">
                * [WIB]: Gerbang Kualitas {task.id} ({task.name}) disetujui oleh {currentApprover.name} (@{currentApprover.id}). Bukti: {evidence || '...'}.
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-950/80 border border-rose-600 rounded-xl text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Buttons: Minimal 44px tinggi target sentuh */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="touch-target-44 min-h-[44px] px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
            >
              Batal
            </button>
            <button
              type="submit"
              className="touch-target-44 min-h-[44px] px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition active:scale-95 shadow-md shadow-emerald-900/30"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Sahkan Gerbang Kualitas</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
