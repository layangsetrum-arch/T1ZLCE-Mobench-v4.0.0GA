import React from 'react';
import { Shield, KeyRound, Clock, Trash2, CheckCircle2, AlertTriangle, Terminal } from 'lucide-react';
import { OneTapCopyButton } from './OneTapCopyButton';

export const SecurityAuthTab: React.FC = () => {
  const configCacheCommand = 'git config --global credential.helper "cache --timeout=900"';
  const cleanAuthCommand = 'bash scripts/zlce/clean-auth.sh';
  const dispatcherCleanCommand = 'zlce clean-auth';
  const checkSecretsCommand = 'git log -n 5 --oneline && git diff --staged';

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-indigo-800/40 rounded-2xl p-5 shadow-xl">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center shrink-0">
            <Shield className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-white">
                Keamanan Kredensial &amp; Zero-Secret Model
              </h2>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-700/50">
                ADR-04
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Manajemen sesi Git aman di Samsung Galaxy Tab A7 Lite bersama 8 anggota tim. Kredensial hanya disimpan di RAM Termux selama 15 menit dan wajib dibersihkan seketika sebelum oper tablet.
            </p>
          </div>
        </div>
      </div>

      {/* 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Card 1: Konfigurasi Cache Kredensial (900s) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-700/50 flex items-center justify-center">
              <Clock className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">1. Git In-Memory Cache (15 Menit)</h3>
              <p className="text-xs text-slate-400">Penyimpanan token sementara hanya di RAM Termux</p>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Perintah ini mengonfigurasi Git Termux agar menyimpan Personal Access Token (PAT) di memori proses volatile selama maksimal 900 detik (15 menit). Token <strong className="text-rose-300">tidak pernah ditulis ke disk</strong>.
          </p>

          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-mono">Konfigurasi Termux:</span>
              <span className="text-[10px] text-cyan-400">Sekali jalankan</span>
            </div>
            <div className="font-mono text-xs text-cyan-300 bg-slate-900 p-2.5 rounded border border-slate-800 flex items-center justify-between gap-2 break-all">
              <code>{configCacheCommand}</code>
              <OneTapCopyButton textToCopy={configCacheCommand} variant="cyan" />
            </div>
          </div>
        </div>

        {/* Card 2: Pembersihan Bersih (clean-auth) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-rose-950/80 border border-rose-700/50 flex items-center justify-center">
              <Trash2 className="w-4 h-4 text-rose-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">2. Eksekusi `clean-auth` (Oper Tablet)</h3>
              <p className="text-xs text-slate-400">Pemusnahan socket RAM seketika</p>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Sebelum menyerahkan tablet fisik ke anggota tim lain, wajib mengeksekusi skrip pembersihan ini di Termux untuk mematikan daemon <code className="text-rose-300 font-mono">git-credential-cache</code> dan menghapus socket RAM.
          </p>

          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-mono">Perintah Skrip:</span>
              <span className="text-[10px] text-emerald-400">1-Ketukan Salin</span>
            </div>
            <div className="font-mono text-xs text-rose-300 bg-slate-900 p-2.5 rounded border border-slate-800 flex items-center justify-between gap-2 break-all">
              <code>{cleanAuthCommand}</code>
              <OneTapCopyButton textToCopy={cleanAuthCommand} variant="rose" />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
              <span>Format singkat:</span>
              <span className="font-mono text-cyan-300">{dispatcherCleanCommand}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Card 3: Prinsip Zero-Secret Checklist */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          Checklist Kebijakan Zero-Secret Tablet Bersama
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
          <div className="bg-slate-950/70 border border-emerald-900/40 rounded-lg p-3">
            <div className="font-semibold text-emerald-300 mb-1">Nol Token di Repositori</div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Tidak ada Personal Access Token, kata sandi, atau API Key rahasia yang pernah di-commit ke Git atau disimpan di berkas markdown.
            </p>
          </div>

          <div className="bg-slate-950/70 border border-emerald-900/40 rounded-lg p-3">
            <div className="font-semibold text-emerald-300 mb-1">Nol Kredensial di LocalStorage</div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              LocalStorage PWA hanya memuat nama alias anggota, email publik, dan ID task, tanpa data rahasia peramban.
            </p>
          </div>

          <div className="bg-slate-950/70 border border-emerald-900/40 rounded-lg p-3">
            <div className="font-semibold text-emerald-300 mb-1">Identitas Per-Commit Dinamis</div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Identitas commit menggunakan flag dinamis <code className="text-cyan-300 font-mono">-c user.name</code> tanpa menimpa config global anggota lain.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
