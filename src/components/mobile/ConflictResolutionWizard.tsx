import React, { useState } from 'react';
import { 
  GitMerge, 
  AlertTriangle, 
  CheckCircle2, 
  Terminal, 
  FileCode, 
  RotateCcw, 
  ChevronRight,
  ShieldCheck,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { OneTapCopyButton } from './OneTapCopyButton';

interface ConflictResolutionWizardProps {
  initialConflictLog?: string;
  onResolved?: () => void;
}

export interface DetectedConflictInfo {
  hasConflict: boolean;
  conflictedFiles: string[];
  conflictType: 'merge' | 'rebase' | 'cherry-pick' | 'unknown';
  rawSnippet: string;
}

/**
 * Parses raw terminal output to detect Git merge/rebase conflict signatures
 */
export function detectGitConflictsFromTerminal(output: string): DetectedConflictInfo {
  if (!output || output.trim().length === 0) {
    return { hasConflict: false, conflictedFiles: [], conflictType: 'unknown', rawSnippet: '' };
  }

  const lines = output.split('\n');
  const conflictedFiles: string[] = [];
  let isConflict = false;
  let type: 'merge' | 'rebase' | 'cherry-pick' | 'unknown' = 'unknown';

  for (const line of lines) {
    // Check CONFLICT (content): Merge conflict in file
    const contentMatch = line.match(/CONFLICT\s*\([^)]*\):\s*(?:Merge conflict in|conflict in)\s+([^\s]+)/i);
    if (contentMatch && contentMatch[1]) {
      isConflict = true;
      if (!conflictedFiles.includes(contentMatch[1])) {
        conflictedFiles.push(contentMatch[1]);
      }
    }

    // Check "both modified: file" from git status
    const statusMatch = line.match(/both modified:\s+([^\s]+)/i);
    if (statusMatch && statusMatch[1]) {
      isConflict = true;
      if (!conflictedFiles.includes(statusMatch[1])) {
        conflictedFiles.push(statusMatch[1]);
      }
    }

    if (line.toLowerCase().includes('automatic merge failed')) {
      isConflict = true;
      type = 'merge';
    }
    if (line.toLowerCase().includes('rebase in progress') || line.toLowerCase().includes('could not apply')) {
      isConflict = true;
      type = 'rebase';
    }
  }

  return {
    hasConflict: isConflict,
    conflictedFiles: conflictedFiles.length > 0 ? conflictedFiles : (isConflict ? ['SESSION_STATE.md'] : []),
    conflictType: type,
    rawSnippet: output.slice(0, 300),
  };
}

export const ConflictResolutionWizard: React.FC<ConflictResolutionWizardProps> = ({
  initialConflictLog = '',
  onResolved
}) => {
  const [pasteLog, setPasteLog] = useState<string>(initialConflictLog);
  const [step, setStep] = useState<number>(1);
  const [selectedFile, setSelectedFile] = useState<string>('SESSION_STATE.md');

  const detection = React.useMemo(() => {
    return detectGitConflictsFromTerminal(pasteLog);
  }, [pasteLog]);

  const activeFiles = detection.conflictedFiles.length > 0 ? detection.conflictedFiles : [selectedFile];

  // Commands for resolution steps
  const openEditorCommand = `micro ${selectedFile || activeFiles[0] || 'SESSION_STATE.md'}`;
  const verifyCheckCommand = `python3 scripts/zlce-check.py .`;
  const stageResolvedCommand = `git add ${selectedFile || activeFiles[0] || 'SESSION_STATE.md'}`;
  const continueMergeCommand = detection.conflictType === 'rebase' ? 'git rebase --continue' : 'git commit -m "fix(merge): resolve branch conflicts"';
  const abortCommand = detection.conflictType === 'rebase' ? 'git rebase --abort' : 'git merge --abort';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-5">
      {/* Wizard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
            <GitMerge className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              Panduan Resolusi Konflik Cabang Tim
              {detection.hasConflict && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-700/60 animate-pulse">
                  Konflik Terdeteksi
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400">
              Prosedur resolusi merge/rebase deterministik di Termux tanpa opsi destruktif (--force)
            </p>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-1.5 self-start sm:self-center">
          {[1, 2, 3, 4].map((s) => (
            <button
              key={s}
              onClick={() => setStep(s)}
              className={`w-7 h-7 rounded-full text-xs font-mono font-bold flex items-center justify-center transition ${
                step === s
                  ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400/50'
                  : step > s
                  ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50'
                  : 'bg-slate-850 text-slate-500 border border-slate-800'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Step 1: Input Terminal Output or Detect Conflict */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-200">
              Langkah 1: Tempelkan Output Terminal Git (Merge / Rebase Conflict)
            </label>
            <button
              onClick={() => {
                setPasteLog(
                  `CONFLICT (content): Merge conflict in SESSION_STATE.md\nAutomatic merge failed; fix conflicts and then commit the result.`
                );
              }}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 underline"
            >
              Gunakan Contoh Konflik
            </button>
          </div>

          <textarea
            value={pasteLog}
            onChange={(e) => setPasteLog(e.target.value)}
            placeholder="Tempelkan teks error terminal di sini (misal: CONFLICT (content): Merge conflict in SESSION_STATE.md...)"
            rows={4}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          />

          {detection.hasConflict ? (
            <div className="bg-amber-950/40 border border-amber-600/50 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Terdeteksi {detection.conflictedFiles.length} berkas yang mengalami bentrokan merge:</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {detection.conflictedFiles.map((f) => (
                  <button
                    key={f}
                    onClick={() => setSelectedFile(f)}
                    className={`px-2.5 py-1 rounded-md text-xs font-mono transition border ${
                      selectedFile === f
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                        : 'bg-slate-900 text-slate-300 border-slate-700'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  className="touch-target-44 min-h-[44px] px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
                >
                  <span>Lanjutkan ke Langkah 2: Buka Editor</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 flex items-center justify-between text-xs text-slate-400">
              <span>Tidak ada konflik aktif pada log di atas. Tempelkan log dari Termux atau pilih berkas manual.</span>
              <button
                onClick={() => setStep(2)}
                className="touch-target-44 min-h-[44px] px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold"
              >
                Lewati ke Panduan
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Open Editor in Termux */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
              <FileCode className="w-4 h-4 text-cyan-400" />
              Langkah 2: Buka Berkas Berkonflik di Editor Terminal (Micro / Nano)
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Di Termux, gunakan editor <code className="text-cyan-300 font-mono">micro</code> yang ramah sentuhan layar atau mouse tablet. Cari penanda konflik Git:
            </p>
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 font-mono text-[11px] text-amber-300">
              <div>&lt;&lt;&lt;&lt;&lt;&lt;&lt; HEAD (Perubahan Lokal Anda)</div>
              <div className="text-slate-400">...</div>
              <div>=======</div>
              <div className="text-slate-400">...</div>
              <div>&gt;&gt;&gt;&gt;&gt;&gt;&gt; task/TASK-xxx (Perubahan Remote Teman Tim)</div>
            </div>

            <div className="pt-1 flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg p-2.5">
              <span className="font-mono text-xs text-cyan-300">{openEditorCommand}</span>
              <OneTapCopyButton textToCopy={openEditorCommand} variant="cyan" />
            </div>
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => setStep(1)}
              className="touch-target-44 min-h-[44px] px-3 py-2 text-xs text-slate-400 hover:text-slate-200"
            >
              Kembali
            </button>
            <button
              onClick={() => setStep(3)}
              className="touch-target-44 min-h-[44px] px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
            >
              <span>Lanjut: Verifikasi Linter (Langkah 3)</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Verify Linter via zlce-check */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Langkah 3: Jalankan Validator Lokal (zlce-check)
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Setelah membersihkan penanda konflik dan menyelaraskan task, pastikan struktur kanonik 8 bagian tetap 100% valid sebelum melakukan commit.
            </p>

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between">
              <span className="font-mono text-xs text-emerald-300">{verifyCheckCommand}</span>
              <OneTapCopyButton textToCopy={verifyCheckCommand} variant="emerald" />
            </div>

            <p className="text-[11px] text-slate-400">
              Ekspektasi keluaran: <code className="text-emerald-400 font-mono">RESULT: OK (0 error, ...)</code>.
            </p>
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => setStep(2)}
              className="touch-target-44 min-h-[44px] px-3 py-2 text-xs text-slate-400 hover:text-slate-200"
            >
              Kembali
            </button>
            <button
              onClick={() => setStep(4)}
              className="touch-target-44 min-h-[44px] px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
            >
              <span>Lanjut: Commit Penyelesaian (Langkah 4)</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Stage & Complete Merge */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-400" />
              Langkah 4: Stage Berkas &amp; Selesaikan Merge
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Tandai berkas telah diselesaikan konfliknya, lalu lanjutkan proses merge atau rebase:
            </p>

            <div className="space-y-2">
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between">
                <span className="font-mono text-xs text-cyan-300">{stageResolvedCommand}</span>
                <OneTapCopyButton textToCopy={stageResolvedCommand} variant="cyan" />
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between">
                <span className="font-mono text-xs text-emerald-300">{continueMergeCommand}</span>
                <OneTapCopyButton textToCopy={continueMergeCommand} variant="emerald" />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Bila ingin membatalkan merge darurat:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-rose-400">{abortCommand}</span>
                <OneTapCopyButton textToCopy={abortCommand} variant="rose" />
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => setStep(3)}
              className="touch-target-44 min-h-[44px] px-3 py-2 text-xs text-slate-400 hover:text-slate-200"
            >
              Kembali
            </button>
            <button
              onClick={() => {
                setPasteLog('');
                setStep(1);
                if (onResolved) onResolved();
              }}
              className="touch-target-44 min-h-[44px] px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Konflik Selesai &amp; Reset Wizard</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
