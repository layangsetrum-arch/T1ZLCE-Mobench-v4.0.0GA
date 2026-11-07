import React, { useState, useEffect } from 'react';
import { 
  Users, 
  X, 
  ShieldCheck, 
  Edit3, 
  Save, 
  RotateCcw, 
  Check, 
  Mail, 
  Bot, 
  AlertCircle,
  Sparkles,
  Info
} from 'lucide-react';
import { TeamMember } from '../../types/mobile';
import { 
  loadTeamRegistry, 
  saveTeamRegistry, 
  updateTeamMemberProfile, 
  resetTeamRegistryToDefault 
} from '../../data/teamMembers';

interface TeamRegistryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMember?: (memberId: string) => void;
  activeMemberId?: string;
}

export const TeamRegistryModal: React.FC<TeamRegistryModalProps> = ({
  isOpen,
  onClose,
  onSelectMember,
  activeMemberId = 'oned'
}) => {
  const [members, setMembers] = useState<TeamMember[]>(() => loadTeamRegistry());
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState<string>('');
  const [editAiPref, setEditAiPref] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMembers(loadTeamRegistry());
      setEditingMemberId(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartEdit = (m: TeamMember) => {
    setEditingMemberId(m.id);
    setEditEmail(m.email);
    setEditAiPref(m.aiPreference || '');
    setEditNotes(m.notes || '');
  };

  const handleSaveEdit = (id: string) => {
    // Penegakan Zero-Secret Policy: Larang input yang menyerupai token/kredensial
    const secretPattern = /(ghp_[a-zA-Z0-9]{20,}|sk-[a-zA-Z0-9]{20,}|password\s*[:=])/i;
    if (secretPattern.test(editEmail) || secretPattern.test(editAiPref) || secretPattern.test(editNotes)) {
      alert('Peringatan Keamanan (Zero-Secret Policy): Dilarang memasukkan token, password, atau API key rahasia ke profil tim.');
      return;
    }

    const updated = updateTeamMemberProfile(id, {
      email: editEmail.trim(),
      aiPreference: editAiPref.trim(),
      notes: editNotes.trim()
    });
    setMembers(updated);
    setEditingMemberId(null);
    setSaveFeedback(`Profil @${id} berhasil disimpan!`);
    setTimeout(() => setSaveFeedback(null), 2500);
  };

  const handleResetDefaults = () => {
    if (confirm('Kembalikan seluruh 8 profil anggota tim ke konfigurasi default kanonik?')) {
      const reset = resetTeamRegistryToDefault();
      setMembers(reset);
      setEditingMemberId(null);
      setSaveFeedback('Registri tim dikembalikan ke konfigurasi default.');
      setTimeout(() => setSaveFeedback(null), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div 
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-labelledby="team-registry-title"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-md shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="team-registry-title" className="text-base sm:text-lg font-bold text-white">
                  Registri Anggota Tim Estafet Tablet (8 Anggota)
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  TASK-019
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Profil alias non-kredensial untuk Samsung Galaxy Tab A7 Lite • Zero-Secret Policy
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

        {/* Security Policy Bar */}
        <div className="bg-emerald-950/30 border-b border-emerald-800/40 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-emerald-300 font-mono text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Zero-Secret Policy Aktif</strong>: Hanya menyimpan alias, email commit publik, dan peran. Nol token GitHub atau sandi di memori disk.
            </span>
          </div>
          <button
            onClick={handleResetDefaults}
            className="text-[11px] text-slate-400 hover:text-cyan-300 font-mono flex items-center gap-1 transition"
            title="Reset ke profil bawaan"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Bawaan</span>
          </button>
        </div>

        {/* Feedback alert */}
        {saveFeedback && (
          <div className="mx-4 mt-3 p-2.5 bg-emerald-950/80 border border-emerald-600 rounded-lg text-emerald-200 text-xs flex items-center gap-2 animate-fadeIn">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{saveFeedback}</span>
          </div>
        )}

        {/* Member Grid List */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 divide-y divide-slate-800/60">
          {members.map(member => {
            const isEditing = editingMemberId === member.id;
            const isActive = activeMemberId === member.id;

            return (
              <div 
                key={member.id} 
                className={`pt-3 first:pt-0 rounded-xl transition ${
                  isActive ? 'bg-slate-950/50 p-3 border border-cyan-500/40' : 'p-2'
                }`}
              >
                {!isEditing ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${member.avatarColor} flex items-center justify-center font-bold text-white text-sm shadow shrink-0`}>
                        {member.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{member.name}</span>
                          <span className="text-[11px] font-mono text-cyan-400">@{member.id}</span>
                          {isActive && (
                            <span className="px-2 py-0.2 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/50">
                              Driver Aktif
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-300 font-medium">{member.role}</p>
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 font-mono pt-0.5">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-500" />
                            {member.email}
                          </span>
                          {member.aiPreference && (
                            <span className="flex items-center gap-1 text-indigo-300">
                              <Bot className="w-3 h-3 text-indigo-400" />
                              {member.aiPreference}
                            </span>
                          )}
                        </div>
                        {member.notes && (
                          <p className="text-[11px] text-slate-500 italic pt-0.5">{member.notes}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {onSelectMember && !isActive && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectMember(member.id);
                            onClose();
                          }}
                          className="touch-target-44 min-h-[44px] px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition active:scale-95"
                        >
                          Pilih Driver
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleStartEdit(member)}
                        className="touch-target-44 min-h-[44px] px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
                        title="Edit Profil"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Edit Form */
                  <div className="bg-slate-950 p-4 rounded-xl border border-cyan-500/50 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-xs font-bold text-cyan-400">
                        Mengedit Profil: {member.name} (@{member.id})
                      </span>
                      <span className="text-[11px] text-slate-400">{member.role}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-slate-400 mb-1">Email Commit Publik (Git Author):</label>
                        <input
                          type="email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono text-xs focus:border-cyan-500 focus:outline-none min-h-[44px]"
                          placeholder="nama@zlce.local"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 mb-1">Preferensi AI Engine:</label>
                        <input
                          type="text"
                          value={editAiPref}
                          onChange={(e) => setEditAiPref(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-xs focus:border-cyan-500 focus:outline-none min-h-[44px]"
                          placeholder="Claude 3.5 Sonnet / Gemini"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-slate-400 mb-1">Catatan Tanggung Jawab:</label>
                        <input
                          type="text"
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-xs focus:border-cyan-500 focus:outline-none min-h-[44px]"
                          placeholder="Fokus tanggung jawab pada tablet..."
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setEditingMemberId(null)}
                        className="touch-target-44 min-h-[44px] px-3.5 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs font-medium hover:bg-slate-700 transition"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(member.id)}
                        className="touch-target-44 min-h-[44px] px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Simpan Perubahan</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400">
            Total <strong>8 Anggota Terdaftar</strong> • Hak persetujuan gerbang merata (ADR-07).
          </span>
          <button
            onClick={onClose}
            className="touch-target-44 min-h-[44px] px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold transition"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
