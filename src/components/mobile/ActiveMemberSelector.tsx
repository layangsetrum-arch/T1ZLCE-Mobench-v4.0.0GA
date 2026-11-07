import React, { useState, useEffect, useRef } from 'react';
import { TEAM_MEMBERS, getMemberById } from '../../data/teamMembers';
import { TeamMember } from '../../types/mobile';
import { 
  Users, 
  Check, 
  ChevronDown, 
  ShieldCheck, 
  Sparkles, 
  Cpu, 
  Info,
  X,
  Settings
} from 'lucide-react';
import { TeamRegistryModal } from './TeamRegistryModal';

interface ActiveMemberSelectorProps {
  onMemberChange?: (member: TeamMember) => void;
  className?: string;
}

export const ActiveMemberSelector: React.FC<ActiveMemberSelectorProps> = ({
  onMemberChange,
  className = ''
}) => {
  const [activeMemberId, setActiveMemberId] = useState<string>(() => {
    return localStorage.getItem('zlce_active_member_id') || 'eko';
  });
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isRegistryModalOpen, setIsRegistryModalOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sinkronkan activeMemberId saat ada storage event atau perubahan lokal
  useEffect(() => {
    const handleStorage = () => {
      const stored = localStorage.getItem('zlce_active_member_id') || 'eko';
      setActiveMemberId(stored);
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('zlce-active-member-changed', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('zlce-active-member-changed', handleStorage);
    };
  }, []);

  // Klik di luar menutup dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const activeMember = getMemberById(activeMemberId);

  const handleSelectMember = (member: TeamMember) => {
    setActiveMemberId(member.id);
    localStorage.setItem('zlce_active_member_id', member.id);
    localStorage.setItem('zlce_active_member', JSON.stringify({
      id: member.id,
      name: member.name,
      email: member.email,
      role: member.role
    }));

    // Trigger storage event untuk komponen lain
    window.dispatchEvent(new Event('zlce-active-member-changed'));
    onMemberChange?.(member);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Tombol Pemicu di Header (Target Sentuh Ergonomis Tablet >= 44px) */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="touch-target-44 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-xs transition active:scale-95 shadow-sm"
        title={`Pemegang Tablet Saat Ini: ${activeMember.name} (${activeMember.role}) • Klik untuk ganti driver`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <div className={`w-6 h-6 rounded-full bg-gradient-to-tr ${activeMember.avatarColor} flex items-center justify-center text-[11px] font-bold text-white shadow-sm ring-1 ring-white/20`}>
          {activeMember.name.slice(0, 1)}
        </div>
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-100">{activeMember.name}</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Driver
            </span>
          </div>
          <span className="text-[10px] text-slate-400 hidden lg:inline truncate max-w-[140px]">
            {activeMember.role.split('(')[0]}
          </span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 ml-0.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown / Modal Panel Pemilihan 8 Anggota Tim */}
      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          role="dialog"
          aria-label="Pilih Driver Tablet Bersama"
        >
          {/* Header Panel */}
          <div className="p-3 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Driver Tablet Bersama (8 Anggota)
                </h3>
                <p className="text-[10px] text-slate-400">
                  Pilih anggota yang sedang memegang tablet Samsung SM-T225
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
              aria-label="Tutup panel anggota"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Zero-Secret Security Notice */}
          <div className="px-3 py-1.5 bg-slate-950/70 border-b border-slate-800 flex items-center gap-1.5 text-[10px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>
              <strong>Zero-Secret Policy:</strong> Nol password/token tersimpan. Hanya atribusi nama &amp; email commit.
            </span>
          </div>

          {/* Daftar 8 Anggota Tim (Tinggi tombol minimal 48px) */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-800/60 p-1.5">
            {TEAM_MEMBERS.map((member) => {
              const isSelected = member.id === activeMemberId;
              return (
                <button
                  key={member.id}
                  onClick={() => handleSelectMember(member)}
                  className={`w-full touch-target-48 p-2.5 rounded-lg flex items-center justify-between gap-3 text-left transition-all ${
                    isSelected
                      ? 'bg-indigo-950/60 border border-indigo-600/50 shadow-inner'
                      : 'hover:bg-slate-800/80 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-lg bg-gradient-to-tr ${member.avatarColor} flex items-center justify-center text-sm font-bold text-white shadow ring-1 ring-white/20 shrink-0`}>
                      {member.name.slice(0, 1)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-semibold ${isSelected ? 'text-cyan-300 font-bold' : 'text-slate-200'}`}>
                          {member.name}
                        </span>
                        {isSelected && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            Aktif
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">{member.role}</p>
                      <div className="flex items-center gap-1 mt-0.5 text-[10px] text-slate-500 font-mono">
                        <Cpu className="w-2.5 h-2.5 text-slate-400" />
                        <span className="truncate">{member.aiPreference || 'Multi-AI'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center pl-2">
                    {isSelected ? (
                      <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/40">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-500 hover:text-slate-300">Pilih</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer Serah Terima & Kelola Profil */}
          <div className="p-2.5 bg-slate-950/90 border-t border-slate-800 flex flex-col gap-2">
            <button
              onClick={() => {
                setIsOpen(false);
                setIsRegistryModalOpen(true);
              }}
              className="touch-target-44 w-full py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700/80 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Kelola Registri &amp; Peran 8 Anggota</span>
            </button>
            <p className="text-[10px] text-slate-500 text-center">
              Ganti anggota otomatis memperbarui flag <code className="text-cyan-400">git -c user.name</code> dan atribusi persetujuan gerbang.
            </p>
          </div>
        </div>
      )}

      {/* Modal Registri 8 Anggota */}
      <TeamRegistryModal
        isOpen={isRegistryModalOpen}
        onClose={() => setIsRegistryModalOpen(false)}
        activeMemberId={activeMemberId}
        onSelectMember={(newId) => {
          const m = getMemberById(newId);
          handleSelectMember(m);
        }}
      />
    </div>
  );
};
