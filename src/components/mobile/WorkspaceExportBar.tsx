import React, { useState } from 'react';
import { 
  downloadMarkdownBlob, 
  generateSmartFilename, 
  normalizeToUnixLineEndings 
} from '../../utils/fileExport';
import { copyToClipboard } from '../../utils/clipboard';
import { detectDocumentType } from '../../utils/markdownParser';
import { 
  Download, 
  Copy, 
  Check, 
  FileDown, 
  FileText, 
  Share2, 
  AlertCircle,
  Terminal,
  ExternalLink,
  Sparkles
} from 'lucide-react';

interface WorkspaceExportBarProps {
  content: string;
  defaultFilename?: string;
  projectName?: string;
  onExportSuccess?: (filename: string, size: number) => void;
  className?: string;
}

export const WorkspaceExportBar: React.FC<WorkspaceExportBarProps> = ({
  content,
  defaultFilename,
  projectName,
  onExportSuccess,
  className = ''
}) => {
  const [customFilename, setCustomFilename] = useState<string>(defaultFilename || '');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [downloadStatus, setDownloadStatus] = useState<{
    success?: boolean;
    filename?: string;
    sizeFormatted?: string;
    message?: string;
  } | null>(null);

  const detectedDocType = detectDocumentType(content);
  const smartName = defaultFilename || generateSmartFilename(detectedDocType, projectName);

  const activeFilename = customFilename.trim() ? customFilename.trim() : smartName;

  // Format ukuran byte
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleDownload = () => {
    if (!content.trim()) {
      setDownloadStatus({
        success: false,
        message: 'Konten dokumen kosong. Tidak ada data untuk diekspor.'
      });
      return;
    }

    const res = downloadMarkdownBlob(content, {
      filename: activeFilename,
      ensureUnixLineEndings: true
    });

    if (res.success) {
      const sizeStr = formatSize(res.size);
      setDownloadStatus({
        success: true,
        filename: res.filename,
        sizeFormatted: sizeStr,
        message: `Berkas ${res.filename} (${sizeStr}) berhasil dikirim ke pengunduhan browser!`
      });
      onExportSuccess?.(res.filename, res.size);

      setTimeout(() => {
        setDownloadStatus((prev) => (prev?.success ? null : prev));
      }, 5000);
    } else {
      setDownloadStatus({
        success: false,
        message: res.error || 'Gagal memicu pengunduhan berkas.'
      });
    }
  };

  const handleCopyAll = async () => {
    if (!content.trim()) return;
    // Pastikan di-copy dengan format Unix LF
    const normalized = normalizeToUnixLineEndings(content);
    await copyToClipboard(normalized);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  return (
    <div className={`p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-lg space-y-3 ${className}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Info & Penamaan */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shrink-0">
            <FileDown className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white tracking-tight">
                Ekspor &amp; Salin Markdown
              </h4>
              <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                LF (Unix)
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Unduh berkas fisik ke folder <code className="text-cyan-400 font-mono">Download/</code> tablet atau salin 1-ketukan ke clipboard
            </p>
          </div>
        </div>

        {/* Action Controls (Target sentuh min 44px) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Custom Filename Input */}
          <div className="flex items-center rounded-lg bg-slate-950 border border-slate-800 px-2.5 py-1 focus-within:border-cyan-500 transition">
            <span className="text-xs text-slate-500 font-mono mr-1">Nama:</span>
            <input
              type="text"
              value={customFilename}
              onChange={(e) => setCustomFilename(e.target.value)}
              placeholder={smartName}
              className="bg-transparent text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none w-36 sm:w-44"
              title="Nama berkas saat diunduh"
            />
          </div>

          {/* Tombol Salin Seluruh Markdown */}
          <button
            onClick={handleCopyAll}
            disabled={!content.trim()}
            className={`touch-target-44 px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 ${
              isCopied
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
            title="Salin seluruh isi Markdown ke clipboard Android dengan format Unix LF"
          >
            {isCopied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4 text-slate-300" />}
            <span>{isCopied ? 'Tersalin!' : 'Salin Seluruh MD'}</span>
          </button>

          {/* Tombol Unduh .md */}
          <button
            onClick={handleDownload}
            disabled={!content.trim()}
            className="touch-target-44 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-semibold flex items-center gap-2 shadow-md transition disabled:opacity-40 disabled:cursor-not-allowed"
            title="Unduh berkas Blob .md ke folder penyimpanan Download/ Android"
          >
            <Download className="w-4 h-4" />
            <span>Unduh .md</span>
          </button>
        </div>
      </div>

      {/* Status Feedback Banner */}
      {downloadStatus && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center justify-between gap-2 animate-in fade-in ${
            downloadStatus.success
              ? 'bg-emerald-950/80 border border-emerald-700/80 text-emerald-200'
              : 'bg-rose-950/80 border border-rose-800/80 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {downloadStatus.success ? (
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{downloadStatus.message}</span>
          </div>

          {downloadStatus.success && (
            <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-2 shrink-0">
              <span className="hidden sm:inline">Lokasi: Download/</span>
              <button
                onClick={() => setDownloadStatus(null)}
                className="text-slate-400 hover:text-white px-1"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
