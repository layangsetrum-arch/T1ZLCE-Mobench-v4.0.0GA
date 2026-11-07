import React, { useState } from 'react';
import { AlertOctagon, ShieldCheck, Terminal, HelpCircle, ChevronRight, Check } from 'lucide-react';
import { OneTapCopyButton } from './OneTapCopyButton';
import { bindCommandTemplate } from '../../utils/commandBinder';
import { ActiveMember } from '../../types/mobile';

interface RecoveryCommandSectionProps {
  activeTaskId?: string;
  activeMember?: ActiveMember;
  onOpenTerminalModal?: () => void;
}

interface RecoveryCaseInfo {
  id: 'A' | 'B' | 'C' | 'D';
  title: string;
  condition: string;
  recipe: string;
  risk: 'Aman' | 'Perubahan Berkas' | 'Berbahaya';
  commands: {
    label: string;
    description: string;
    rawCmd: string;
    risk: 'Aman' | 'Perubahan Berkas' | 'Berbahaya';
  }[];
}

const RECOVERY_CASES: RecoveryCaseInfo[] = [
  {
    id: 'A',
    title: 'KASUS A: Working Tree Bersih (Sesi Terputus)',
    condition: 'Working tree di Termux bersih (git status clean), tapi sesi browser/AI terputus di tengah jalan.',
    recipe: 'Ambil snapshot recovery, baca field Langkah Berikutnya pada WAL, dan lanjutkan sesi AI baru tanpa menulis ulang kode yang sudah di-commit.',
    risk: 'Aman',
    commands: [
      {
        label: '1. Ambil Snapshot Darurat (Diff & Status)',
        description: 'Menghasilkan rangkuman diff dan status terkini untuk ditempel ke prompt sesi AI berikutnya.',
        rawCmd: 'bash scripts/zlce/zlce-snapshot.sh . --diff',
        risk: 'Aman',
      },
      {
        label: '2. Periksa Konsistensi State',
        description: 'Memastikan SESSION_STATE.md dan TASKS.md tetap valid 100%.',
        rawCmd: 'python3 scripts/zlce-check.py .',
        risk: 'Aman',
      },
    ],
  },
  {
    id: 'B',
    title: 'KASUS B: Ada File Uncommitted Sesuai Daftar WAL',
    condition: 'Ada berkas berubah uncommitted di Termux, dan seluruh berkas tercatat di field Berkas Direncanakan pada WAL.',
    recipe: 'DILARANG git reset! Jalankan pengujian verifikasi mandiri, tandai task DONE jika lolos, lalu commit dengan metadata provenance.',
    risk: 'Perubahan Berkas',
    commands: [
      {
        label: '1. Jalankan Pengujian Verifikasi Mandiri',
        description: 'Memastikan seluruh test suite lolos sebelum status diubah ke DONE.',
        rawCmd: 'python3 scripts/run-tests.py',
        risk: 'Aman',
      },
      {
        label: '2. Validasi Kepatuhan Gerbang ZLCE',
        description: 'Memeriksa bukti verifikasi dan kepatuhan gerbang persetujuan.',
        rawCmd: 'python3 scripts/zlce-check.py .',
        risk: 'Aman',
      },
      {
        label: '3. Commit Atomik Ber-Provenance',
        description: 'Menyimpan progres dengan nama & identitas anggota aktif ke git.',
        rawCmd: 'git -c user.name="{MEMBER_NAME}" -c user.email="{MEMBER_EMAIL}" commit -m "feat({ACTIVE_TASK_ID}): selesaikan task terverifikasi"',
        risk: 'Perubahan Berkas',
      },
    ],
  },
  {
    id: 'C',
    title: 'KASUS C: Ada Commit Baru Mendahului WAL (Out of Sync)',
    condition: 'Working tree bersih, namun ada commit git lokal yang belum tercatat pada matriks SESSION_STATE.md.',
    recipe: 'Audit commit log terakhir, verifikasi sub-langkah yang diselesaikan, lalu sinkronkan SESSION_STATE.md di PWA sebelum melangkah ke task berikutnya.',
    risk: 'Aman',
    commands: [
      {
        label: '1. Audit 3 Commit Terakhir',
        description: 'Melihat hash, tanggal, dan pesan commit untuk mencocokkan dengan task backlog.',
        rawCmd: 'git log -3 --oneline --decorate',
        risk: 'Aman',
      },
      {
        label: '2. Tampilkan Detail Perubahan Commit Terakhir',
        description: 'Melihat statistik berkas yang disentuh oleh commit terakhir.',
        rawCmd: 'git show --stat HEAD',
        risk: 'Aman',
      },
      {
        label: '3. Validasi Konsistensi Pasca Sinkronisasi',
        description: 'Memastikan SESSION_STATE.md telah selaras dengan commit git.',
        rawCmd: 'python3 scripts/zlce-check.py .',
        risk: 'Aman',
      },
    ],
  },
  {
    id: 'D',
    title: 'KASUS D: Ada Berkas Berubah di Luar Daftar WAL (Liar)',
    condition: 'Ada berkas berubah di Termux yang TIDAK TERDAFTAR pada field WAL (potensi data loss atau tabrakan kerja).',
    recipe: 'DILARANG git reset tanpa konfirmasi! Periksa git diff untuk memastikan apakah revisi sah (Level S) atau residu kerja. Simpan ke stash bila belum diperlukan.',
    risk: 'Berbahaya',
    commands: [
      {
        label: '1. Periksa Diff Perubahan Liar',
        description: 'Menganalisis baris kode uncommitted yang berada di luar jangkauan WAL aktif.',
        rawCmd: 'git diff',
        risk: 'Aman',
      },
      {
        label: '2. Amankan Perubahan ke Git Stash',
        description: 'Menyimpan sementara berkas tak dikenal agar working tree kembali bersih tanpa menghapus kode.',
        rawCmd: 'git stash save "zlce-recovery-kasus-d-untracked"',
        risk: 'Perubahan Berkas',
      },
      {
        label: '3. Verifikasi Kembali Integritas Repositori',
        description: 'Memastikan repositori kembali dalam status bersih dan siap melanjutkan.',
        rawCmd: 'python3 scripts/zlce-check.py .',
        risk: 'Aman',
      },
    ],
  },
];

export const RecoveryCommandSection: React.FC<RecoveryCommandSectionProps> = ({
  activeTaskId = 'TASK-026',
  activeMember,
  onOpenTerminalModal,
}) => {
  const [selectedCaseId, setSelectedCaseId] = useState<'A' | 'B' | 'C' | 'D'>('B');

  const currentCase = RECOVERY_CASES.find((c) => c.id === selectedCaseId) || RECOVERY_CASES[1];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <AlertOctagon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Protokol Pemulihan Kasus A–D (Recovery Hub)
            </h3>
            <p className="text-xs text-slate-400">
              Resep deterministik penanganan gangguan tablet & kegagalan sinkronisasi git
            </p>
          </div>
        </div>

        {onOpenTerminalModal && (
          <button
            onClick={onOpenTerminalModal}
            className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 flex items-center gap-2 transition-colors active:scale-95"
          >
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span>Paste-Back Terminal</span>
          </button>
        )}
      </div>

      {/* Case Tabs Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {RECOVERY_CASES.map((rc) => {
          const isActive = rc.id === selectedCaseId;
          return (
            <button
              key={rc.id}
              onClick={() => setSelectedCaseId(rc.id)}
              className={`min-h-[44px] px-3 py-2.5 rounded-xl text-left border transition-all flex flex-col justify-center ${
                isActive
                  ? 'bg-amber-950/40 border-amber-500 text-amber-200 shadow-sm'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs">Kasus {rc.id}</span>
                {isActive && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
              </div>
              <span className="text-[10px] truncate opacity-75">
                {rc.id === 'A' && 'Sesi Terputus'}
                {rc.id === 'B' && 'Uncommitted WAL'}
                {rc.id === 'C' && 'Commit Liar'}
                {rc.id === 'D' && 'File Liar'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Case Details Box */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <span>{currentCase.title}</span>
            </h4>
            <p className="text-xs text-slate-300 mt-1">
              <span className="text-slate-400 font-medium">Kondisi Fisik: </span>
              {currentCase.condition}
            </p>
          </div>
          <span
            className={`text-[10px] font-mono px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0 ${
              currentCase.risk === 'Aman'
                ? 'bg-emerald-950 border border-emerald-800 text-emerald-400'
                : currentCase.risk === 'Perubahan Berkas'
                  ? 'bg-amber-950 border border-amber-800 text-amber-400'
                  : 'bg-rose-950 border border-rose-800 text-rose-400'
            }`}
          >
            {currentCase.risk}
          </span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/80 rounded-lg p-3 text-xs text-amber-300/90 leading-relaxed">
          <span className="font-semibold text-white">Resep Preskriptif: </span>
          {currentCase.recipe}
        </div>
      </div>

      {/* Action Commands List */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span>Perintah Preskriptif 1-Tap Termux:</span>
        </h4>

        <div className="space-y-2.5">
          {currentCase.commands.map((cmd, idx) => {
            const boundCmd = bindCommandTemplate(cmd.rawCmd, {
              activeTaskId,
              activeMember,
            });

            return (
              <div
                key={idx}
                className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 text-[11px] font-mono flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-200">{cmd.label}</span>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                      cmd.risk === 'Aman'
                        ? 'text-emerald-400 bg-emerald-950/60'
                        : cmd.risk === 'Perubahan Berkas'
                          ? 'text-amber-400 bg-amber-950/60'
                          : 'text-rose-400 bg-rose-950/60'
                    }`}
                  >
                    {cmd.risk}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 pl-7">{cmd.description}</p>

                <div className="pl-7 pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <code className="text-xs font-mono text-cyan-300 bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 flex-1 overflow-x-auto whitespace-pre-wrap">
                    {boundCmd}
                  </code>
                  <div className="shrink-0 self-end sm:self-auto">
                    <OneTapCopyButton
                      textToCopy={boundCmd}
                      label="Salin Perintah"
                      feedbackDurationMs={2000}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
