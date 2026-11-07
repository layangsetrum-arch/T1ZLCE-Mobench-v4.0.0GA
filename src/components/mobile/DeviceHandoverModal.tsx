import React, { useState, useEffect } from 'react';
import { 
  Tablet, 
  Check, 
  X, 
  Copy, 
  ShieldCheck, 
  ArrowRight, 
  Terminal, 
  Users, 
  AlertTriangle,
  FileText,
  KeyRound,
  CheckCircle2
} from 'lucide-react';
import { TeamMember } from '../../types/mobile';
import { loadTeamRegistry, getMemberById } from '../../data/teamMembers';
import { copyText } from '../../utils/clipboard';
import { 
  DEVICE_HANDOVER_STEPS, 
  getCleanAuthCommand, 
  formatDeviceHandoverNotes, 
  injectHandoverNotesToMarkdown 
} from '../../utils/handoverChecklist';

interface DeviceHandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  outgoingMember: TeamMember;
  currentMarkdown: string;
  currentBranch?: string;
  onHandoverComplete: (newMember: TeamMember, updatedMarkdown: string) => void;
}

export const DeviceHandoverModal: React.FC<DeviceHandoverModalProps> = ({
  isOpen,
  onClose,
  outgoingMember,
  currentMarkdown,
  currentBranch = 'v4-mobile',
  onHandoverComplete
}) => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [incomingMemberId, setIncomingMemberId] = useState<string>('oned');
  const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean>>({
    'step-verify-commit': false,
    'step-update-notes': false,
    'step-clean-auth': false,
    'step-switch-driver': false
  });
  const [progressNotes, setProgressNotes] = useState<string>('');
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const reg = loadTeamRegistry();
      setMembers(reg);
      // Pilih anggota pertama yang bukan outgoingMember
      const candidate = reg.find(m => m.id !== outgoingMember.id) || reg[0];
      setIncomingMemberId(candidate.id);
      setCheckedSteps({
        'step-verify-commit': false,
        'step-update-notes': false,
        'step-clean-auth': false,
        'step-switch-driver': false
      });
      setProgressNotes('');
      setCopiedCmd(null);
    }
  }, [isOpen, outgoingMember]);

  if (!isOpen) return null;

  const incomingMember = getMemberById(incomingMemberId);
  const cleanAuthCmd = getCleanAuthCommand();

  const handleToggleStep = (stepId: string) => {
    setCheckedSteps(prev => ({
      ...prev,
      [stepId]: !prev[stepId]
    }));
  };

  const handleCopyCmd = async (cmd: string, key: string) => {
    const ok = await copyText(cmd);
    if (ok) {
      setCopiedCmd(key);
      setTimeout(() => setCopiedCmd(null), 2500);
      // Otomatis tandai langkah terkait jika langkah 3
      if (key === 'clean-auth') {
        setCheckedSteps(prev => ({ ...prev, 'step-clean-auth': true }));
      }
    }
  };

  const allMandatoryChecked = 
    checkedSteps['step-verify-commit'] &&
    checkedSteps['step-update-notes'] &&
    checkedSteps['step-clean-auth'] &&
    checkedSteps['step-switch-driver'];

  const handleCompleteHandover = () => {
    if (!allMandatoryChecked) {
      alert('Wajib menyelesaikan dan mencentang seluruh 4 butir prosedur serah terima tablet.');
      return;
    }

    // 1. Buat catatan serah terima
    const notesEntry = formatDeviceHandoverNotes({
      outgoingMember,
      incomingMember,
      progressNotes,
      branchName: currentBranch
    });

    // 2. Suntikkan ke markdown
    const updatedMarkdown = injectHandoverNotesToMarkdown(currentMarkdown, notesEntry);

    // 3. Simpan anggota aktif baru ke localStorage
    localStorage.setItem('zlce_active_member_id', incomingMember.id);
    localStorage.setItem('zlce_active_member', JSON.stringify({
      id: incomingMember.id,
      name: incomingMember.name,
      email: incomingMember.email,
      role: incomingMember.role
    }));

    window.dispatchEvent(new Event('zlce-active-member-changed'));
    window.dispatchEvent(new Event('storage'));

    onHandoverComplete(incomingMember, updatedMarkdown);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div 
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-labelledby="device-handover-title"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow shrink-0">
              <Tablet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="device-handover-title" className="text-base sm:text-lg font-bold text-white">
                  Wizard Serah Terima Tablet Bersama
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  TASK-022
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Prosedur oper tablet Samsung SM-T225 &amp; Zero-Secret Sanitize
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

        {/* Handover Driver Banner (From -> To) */}
        <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-2 sm:gap-4">
          {/* Driver Keluar */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-9 h-9 rounded-full bg-gradient-to-tr ${outgoingMember.avatarColor} flex items-center justify-center text-xs font-bold text-white shadow shrink-0`}>
              {outgoingMember.name.slice(0, 1)}
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-mono text-slate-500 block uppercase">Driver Sebelumnya</span>
              <span className="text-xs font-bold text-slate-200 truncate block">{outgoingMember.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-slate-500 shrink-0">
            <span className="text-[10px] font-mono hidden sm:inline">Oper Fisik</span>
            <ArrowRight className="w-4 h-4 text-cyan-400" />
          </div>

          {/* Driver Penerima Dropdown */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="min-w-0 text-right">
              <span className="text-[10px] font-mono text-cyan-400 block uppercase">Driver Penerima</span>
              <select
                value={incomingMemberId}
                onChange={(e) => setIncomingMemberId(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-white focus:outline-none focus:border-cyan-500 max-w-[150px] sm:max-w-[180px] truncate"
              >
                {members.filter(m => m.id !== outgoingMember.id).map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} (@{m.id})
                  </option>
                ))}
              </select>
            </div>
            <div className={`w-9 h-9 rounded-full bg-gradient-to-tr ${incomingMember.avatarColor} flex items-center justify-center text-xs font-bold text-white shadow shrink-0 ring-2 ring-cyan-500/50`}>
              {incomingMember.name.slice(0, 1)}
            </div>
          </div>
        </div>

        {/* 4 Interactive Checklist Steps */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          <div className="text-xs text-slate-400">
            Harap verifikasi dan selesaikan 4 langkah wajib sebelum tablet fisik berpindah tangan:
          </div>

          {/* Step 1: Commit & Git Status */}
          <div className={`p-3.5 rounded-xl border transition ${
            checkedSteps['step-verify-commit']
              ? 'bg-slate-950/70 border-emerald-500/40'
              : 'bg-slate-950 border-slate-800'
          }`}>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={checkedSteps['step-verify-commit']}
                onChange={() => handleToggleStep('step-verify-commit')}
                className="mt-1 w-4 h-4 rounded text-cyan-500 focus:ring-0 bg-slate-900 border-slate-700"
              />
              <div className="space-y-1 text-xs flex-1">
                <span className="font-bold text-white block">
                  1. Verifikasi Commit &amp; Status Git di Termux
                </span>
                <p className="text-slate-400 text-[11px]">
                  Pastikan tidak ada berkas tertinggal di working tree dan riwayat commit tersimpan di branch <code className="text-cyan-300 font-mono">{currentBranch}</code>.
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="p-1.5 bg-slate-900 rounded font-mono text-[10px] text-slate-300 flex-1 truncate border border-slate-800">
                    git status &amp;&amp; git log -1 --stat
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      handleCopyCmd('git status && git log -1 --stat', 'step1');
                    }}
                    className="touch-target-44 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded text-[11px] font-mono flex items-center gap-1 shrink-0"
                  >
                    {copiedCmd === 'step1' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCmd === 'step1' ? 'Disalin' : 'Salin'}</span>
                  </button>
                </div>
              </div>
            </label>
          </div>

          {/* Step 2: Update Handover Notes */}
          <div className={`p-3.5 rounded-xl border transition ${
            checkedSteps['step-update-notes']
              ? 'bg-slate-950/70 border-emerald-500/40'
              : 'bg-slate-950 border-slate-800'
          }`}>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={checkedSteps['step-update-notes']}
                onChange={() => handleToggleStep('step-update-notes')}
                className="mt-1 w-4 h-4 rounded text-cyan-500 focus:ring-0 bg-slate-900 border-slate-700"
              />
              <div className="space-y-1 text-xs flex-1">
                <span className="font-bold text-white block">
                  2. Perbarui Catatan Serah Terima (Bagian 6 SESSION_STATE.md)
                </span>
                <p className="text-slate-400 text-[11px]">
                  Tuliskan pesan singkat untuk {incomingMember.name} mengenai konteks atau langkah selanjutnya:
                </p>
                <textarea
                  value={progressNotes}
                  onChange={(e) => {
                    setProgressNotes(e.target.value);
                    if (e.target.value.length > 5 && !checkedSteps['step-update-notes']) {
                      setCheckedSteps(prev => ({ ...prev, 'step-update-notes': true }));
                    }
                  }}
                  placeholder="Contoh: TASK-021 telah selesai terverifikasi. Silakan lanjutkan implementasi FASE 4..."
                  rows={2}
                  className="w-full mt-2 bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </label>
          </div>

          {/* Step 3: Clean-Auth Command */}
          <div className={`p-3.5 rounded-xl border transition ${
            checkedSteps['step-clean-auth']
              ? 'bg-slate-950/70 border-emerald-500/40'
              : 'bg-slate-950 border-slate-800'
          }`}>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={checkedSteps['step-clean-auth']}
                onChange={() => handleToggleStep('step-clean-auth')}
                className="mt-1 w-4 h-4 rounded text-cyan-500 focus:ring-0 bg-slate-900 border-slate-700"
              />
              <div className="space-y-1 text-xs flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white block">
                    3. Pembersihan Kredensial Termux (Zero-Secret Policy)
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Wajib
                  </span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  Hapus token dari RAM git credential-cache dan lepaskan nama akun global:
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="p-2 bg-slate-900 rounded font-mono text-[10px] text-amber-300 flex-1 truncate border border-slate-800">
                    {cleanAuthCmd}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      handleCopyCmd(cleanAuthCmd, 'clean-auth');
                    }}
                    className="touch-target-44 min-h-[44px] px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold font-mono flex items-center gap-1.5 shrink-0 shadow transition active:scale-95"
                    title="Salin dan bersihkan kredensial"
                  >
                    {copiedCmd === 'clean-auth' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedCmd === 'clean-auth' ? 'Tersalin!' : 'Salin Perintah'}</span>
                  </button>
                </div>
              </div>
            </label>
          </div>

          {/* Step 4: Switch Active Driver */}
          <div className={`p-3.5 rounded-xl border transition ${
            checkedSteps['step-switch-driver']
              ? 'bg-slate-950/70 border-emerald-500/40'
              : 'bg-slate-950 border-slate-800'
          }`}>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={checkedSteps['step-switch-driver']}
                onChange={() => handleToggleStep('step-switch-driver')}
                className="mt-1 w-4 h-4 rounded text-cyan-500 focus:ring-0 bg-slate-900 border-slate-700"
              />
              <div className="space-y-1 text-xs flex-1">
                <span className="font-bold text-white block">
                  4. Pengalihan Profil Driver Tablet ke {incomingMember.name}
                </span>
                <p className="text-slate-400 text-[11px]">
                  Menyetujui bahwa pengemudi aktif tablet beralih ke <strong>{incomingMember.name}</strong> (@{incomingMember.id}) dan semua commit git berikutnya akan dialokasikan dengan flag <code className="text-cyan-300 font-mono">-c user.name="{incomingMember.name}"</code>.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-[11px]">
              Status: <strong>{Object.values(checkedSteps).filter(Boolean).length}/4 Langkah Selesai</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="touch-target-44 min-h-[44px] px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleCompleteHandover}
              disabled={!allMandatoryChecked}
              className={`touch-target-44 min-h-[44px] px-5 py-2 rounded-xl font-bold flex items-center gap-2 transition active:scale-95 shadow-lg ${
                allMandatoryChecked
                  ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white shadow-indigo-900/30'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Selesaikan Serah Terima Tablet</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
