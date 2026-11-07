import React, { useState, useRef, useEffect } from 'react';
import { useFileImport, ImportedFileInfo } from '../../hooks/useFileImport';
import { useAutoDraftCache, AutoDraftMeta } from '../../hooks/useAutoDraftCache';
import { detectDocumentType } from '../../utils/markdownParser';
import { ZLCEControlDocType } from '../../types/zlce';
import { copyToClipboard } from '../../utils/clipboard';
import { 
  FolderOpen, 
  FileText, 
  Upload, 
  Check, 
  Copy, 
  RotateCcw, 
  AlertCircle, 
  Layers, 
  Calendar, 
  HardDrive, 
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  X,
  FileCode,
  Undo2,
  Redo2,
  CornerDownLeft,
  Download,
  Clock,
  Save,
  Trash2
} from 'lucide-react';
import { WorkspaceExportBar } from './WorkspaceExportBar';

interface WorkspaceEditorProps {
  initialContent?: string;
  onContentChange?: (content: string, docType: ZLCEControlDocType) => void;
  onApplyToActiveSession?: (content: string) => void;
  className?: string;
  storageKey?: string;
  autoRestore?: boolean;
}

export const WorkspaceEditor: React.FC<WorkspaceEditorProps> = ({
  initialContent = '',
  onContentChange,
  onApplyToActiveSession,
  className = '',
  storageKey = 'zlce_workspace_draft_content',
  autoRestore = true
}) => {
  // Hook Cache Draft LocalStorage dengan Debounce 400ms & Auto-Sync (TASK-012)
  const {
    draftContent,
    setDraftContent,
    isSaving,
    isDraftSaved,
    lastSavedAt,
    hasStoredDraft,
    storedDraftMeta,
    isRestoredFromDraft,
    saveNow,
    discardDraft,
    restoreStoredDraft,
    hasDetectedSecrets,
    detectedSecrets,
    lastPersistedRevision,
    lastEditedRevision
  } = useAutoDraftCache(initialContent, {
    storageKey,
    debounceMs: 400,
    autoRestore,
    onAutoSave: (savedText) => {
      const docType = detectDocumentType(savedText);
      onContentChange?.(savedText, docType);
    },
    onRestore: (restoredText) => {
      const docType = detectDocumentType(restoredText);
      onContentChange?.(restoredText, docType);
    }
  });

  // History stack lokal untuk Undo / Redo instan
  const [history, setHistory] = useState<string[]>([draftContent]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [appliedNotice, setAppliedNotice] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [showRestoredBanner, setShowRestoredBanner] = useState<boolean>(isRestoredFromDraft);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Deteksi tipe dokumen saat ini
  const detectedDocType = detectDocumentType(draftContent);

  // Hook impor berkas lokal
  const {
    isLoading,
    error,
    lastImported,
    importFromFile,
    handleFileInputChange,
    clearError
  } = useFileImport((info: ImportedFileInfo) => {
    updateContentWithHistory(info.content);
    const docType = detectDocumentType(info.content);
    onContentChange?.(info.content, docType);
  });

  // Sinkronkan initialContent jika berubah dari luar dan belum ada ketikan lokal
  useEffect(() => {
    if (initialContent && initialContent !== draftContent && !hasStoredDraft && history.length <= 1) {
      setDraftContent(initialContent);
      setHistory([initialContent]);
      setHistoryIndex(0);
    }
  }, [initialContent]);

  // Perbarui status banner pemulihan jika status berubah
  useEffect(() => {
    if (isRestoredFromDraft) {
      setShowRestoredBanner(true);
    }
  }, [isRestoredFromDraft]);

  // Manajemen Riwayat Editor Lokal (Undo / Redo) terhubung ke Auto-Draft 400ms
  const updateContentWithHistory = (newText: string) => {
    setDraftContent(newText);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newText);
    if (newHistory.length > 35) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);

    const docType = detectDocumentType(newText);
    onContentChange?.(newText, docType);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setDraftContent(prev);
      const docType = detectDocumentType(prev);
      onContentChange?.(prev, docType);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setDraftContent(next);
      const docType = detectDocumentType(next);
      onContentChange?.(next, docType);
    }
  };

  const handleCopy = async (targetText?: string | React.MouseEvent) => {
    const text = typeof targetText === 'string' ? targetText : draftContent;
    await copyToClipboard(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleTriggerFilePicker = () => {
    fileInputRef.current?.click();
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await importFromFile(e.dataTransfer.files[0]);
    }
  };

  // Quick insertion helpers
  const insertSnippet = (snippet: string) => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const newContent = draftContent.substring(0, start) + snippet + draftContent.substring(end);
    updateContentWithHistory(newContent);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start + snippet.length, start + snippet.length);
      }
    }, 50);
  };

  const handleApplySession = () => {
    if (onApplyToActiveSession) {
      onApplyToActiveSession(draftContent);
    } else {
      localStorage.setItem('zlce_session_raw_markdown', draftContent);
      window.dispatchEvent(new Event('storage'));
    }
    setAppliedNotice(true);
    setTimeout(() => setAppliedNotice(false), 3000);
  };

  // Handler buang draft dan kembali ke teks awal
  const handleDiscardDraft = () => {
    discardDraft(initialContent);
    setHistory([initialContent]);
    setHistoryIndex(0);
    setShowRestoredBanner(false);
    const docType = detectDocumentType(initialContent);
    onContentChange?.(initialContent, docType);
  };

  // Metrik dokumen
  const linesCount = draftContent ? draftContent.split('\n').length : 0;
  const charsCount = draftContent.length;
  const estimatedTokens = Math.round(charsCount / 4);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown,.txt,text/markdown,text/plain"
        onChange={handleFileInputChange}
        className="hidden"
        aria-label="Pilih berkas Markdown"
      />

      {/* Main Action Bar Card */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-md shrink-0">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Workspace Markdown Editor
                </h3>
                {/* Badge Tipe Dokumen Terdeteksi */}
                <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold border ${
                  detectedDocType === 'SESSION_STATE'
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-600/50'
                    : detectedDocType === 'TASKS'
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-600/50'
                    : detectedDocType === 'BLUEPRINT'
                    ? 'bg-purple-950 text-purple-300 border-purple-600/50'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {detectedDocType}
                </span>

                {/* Indikator Visual Ringkas Cache Draft LocalStorage (TASK-012 Acceptance Criteria 3) */}
                {isSaving ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-amber-950/80 text-amber-300 border border-amber-800/70 animate-pulse">
                    <Clock className="w-3 h-3 animate-spin text-amber-400" />
                    <span>Menyimpan (400ms)...</span>
                  </span>
                ) : isDraftSaved && lastSavedAt ? (
                  <span 
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-800/70 shadow-sm"
                    title="Draft otomatis tersimpan di LocalStorage setelah debounce 400ms (Aman dari LMK Android)"
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>Draft tersimpan {lastSavedAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700">
                    <span>Draft aktif</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Impor dari penyimpanan tablet • Auto-cache debounce 400ms • Proteksi LMK Android
              </p>
            </div>
          </div>

          {/* Tombol Impor & Aksi Utama (Target Sentuh Min 44px) */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleTriggerFilePicker}
              disabled={isLoading}
              className="touch-target-44 px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-2 shadow-md active:scale-95 transition"
              title="Buka pemilih berkas bawaan Android (.md, .markdown)"
            >
              <Upload className={`w-4 h-4 ${isLoading ? 'animate-bounce' : ''}`} />
              <span>{isLoading ? 'Membaca...' : 'Buka Berkas .md'}</span>
            </button>

            {/* Tombol Simpan Instan Manual */}
            <button
              onClick={saveNow}
              className="touch-target-44 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 shadow active:scale-95 transition"
              title="Paksa simpan draft ke LocalStorage saat ini tanpa menunggu debounce"
            >
              <Save className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Simpan Draft</span>
            </button>

            {detectedDocType === 'SESSION_STATE' && (
              <button
                onClick={handleApplySession}
                className="touch-target-44 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow active:scale-95 transition"
                title="Terapkan teks Markdown ini sebagai SESSION_STATE aktif workspace"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                <span className="hidden sm:inline">Terapkan ke Sesi</span>
              </button>
            )}
          </div>
        </div>

        {/* Banner Pemulihan Transparan (TASK-012 Acceptance Criteria 2) */}
        {showRestoredBanner && (
          <div className="p-3 rounded-lg bg-cyan-950/80 border border-cyan-800/80 text-cyan-100 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-in fade-in">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <span className="font-semibold text-white">Draft Sesi Terakhir Dipulihkan Otomatis!</span>
                <span className="text-cyan-300 ml-1">
                  Perubahan Anda sebelum aplikasi ditutup atau terkena Android LMK telah dimuat ulang secara transparan
                  {storedDraftMeta?.savedAtFormatted && ` (tersimpan pk. ${storedDraftMeta.savedAtFormatted})`}.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowRestoredBanner(false)}
                className="px-2.5 py-1 rounded bg-cyan-800/80 hover:bg-cyan-700 text-white text-[11px] font-medium transition"
              >
                Gunakan Draft
              </button>
              <button
                onClick={handleDiscardDraft}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-rose-950 hover:text-rose-300 text-slate-300 text-[11px] font-medium flex items-center gap-1 border border-slate-700 transition"
                title="Buang draft tersimpan dan kembali ke berkas awal"
              >
                <Trash2 className="w-3 h-3 text-rose-400" />
                <span>Buang Draft</span>
              </button>
            </div>
          </div>
        )}

        {/* AUD2-002: Banner Peringatan Kredensial / Secret Terdeteksi (Non-Destruktif) */}
        {hasDetectedSecrets && (
          <div className="p-3 rounded-lg bg-amber-950/90 border border-amber-600/70 text-amber-200 text-xs flex items-center justify-between shadow-md animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="font-semibold text-amber-300">Peringatan Zero-Secret:</span>
                <span className="text-amber-200 ml-1">
                  Terdeteksi pola kredensial/token pada teks ({detectedSecrets.join(', ')}). Teks kerja Anda tetap dipertahankan murni, namun pastikan kredensial dihapus sebelum melakukan git commit atau ekspor publik.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Error Alert jika pembacaan berkas gagal */}
        {error && (
          <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-800/80 text-rose-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={clearError} className="p-1 text-rose-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Visual Feedback Berkas Terimpor */}
        {lastImported && (
          <div className="p-3 rounded-xl bg-slate-950/90 border border-cyan-800/60 flex flex-wrap items-center justify-between gap-2 text-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-cyan-950 flex items-center justify-center text-cyan-400 border border-cyan-800/50">
                <FileCode className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">{lastImported.name}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-cyan-950 text-cyan-300 border border-cyan-700/50">
                    {lastImported.sizeFormatted}
                  </span>
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <Check className="w-3 h-3 stroke-[3]" /> Terimpor Sukses
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 flex items-center gap-2 font-mono">
                  <span>Waktu Impor: {lastImported.importedAt.toLocaleTimeString('id-ID')}</span>
                  <span>•</span>
                  <span>Karakter: {lastImported.content.length.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleCopy(lastImported.content)}
              className="touch-target-44 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1 transition"
            >
              <Copy className="w-3 h-3" />
              <span>Salin Konten</span>
            </button>
          </div>
        )}

        {/* Notifikasi Sukses Terapkan ke Sesi */}
        {appliedNotice && (
          <div className="p-2.5 rounded-lg bg-emerald-950 border border-emerald-700 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Dokumen berhasil diterapkan ke SESSION_STATE aktif repositori!</span>
          </div>
        )}
      </div>

      {/* Area Drag-and-Drop Dropzone & Textarea Editor */}
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative rounded-xl border transition-all ${
          isDragOver
            ? 'border-cyan-400 bg-cyan-950/20 ring-2 ring-cyan-500/30'
            : 'border-slate-800 bg-slate-900'
        }`}
      >
        {/* Editor Quick Toolbar (Target Sentuh Min 44px) */}
        <div className="p-2.5 bg-slate-850 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Quick Snippets */}
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[11px] text-slate-400 font-semibold px-1 hidden sm:inline">Sisipkan:</span>
            <button
              onClick={() => insertSnippet(`* **Timestamp Audit:** ${new Date().toISOString().replace('T', ' ').substring(0, 19)} WIB\n`)}
              className="touch-target-44 px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-700 text-[11px] font-mono text-cyan-300"
              title="Sisipkan cap waktu audit saat ini"
            >
              + Timestamp
            </button>
            <button
              onClick={() => insertSnippet('| `TASK-XXX` | Nama Task Baru | - | PENDING | - | - |\n')}
              className="touch-target-44 px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-700 text-[11px] font-mono text-slate-200"
              title="Sisipkan baris matriks task baru"
            >
              + Baris Task
            </button>
            <button
              onClick={() => insertSnippet(`* **Task:** TASK-XXX\n* **Langkah Sedang Dikerjakan:** ...\n* **Berkas Direncanakan/Disentuh:** ...\n* **Sudah Dilakukan:** ...\n* **Langkah Berikutnya (persis):** ...\n* **Perintah Verifikasi:** npm run build\n`)}
              className="touch-target-44 px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-700 text-[11px] font-mono text-amber-300"
              title="Sisipkan template blok WAL (7 butir kanonik)"
            >
              + Blok WAL
            </button>
          </div>

          {/* Editor Action Controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className={`touch-target-44 px-2.5 py-1 rounded border text-xs font-mono flex items-center gap-1 ${
                historyIndex > 0
                  ? 'bg-slate-950 border-slate-700 hover:bg-slate-800 text-slate-200'
                  : 'bg-slate-950/40 border-slate-800 text-slate-600 opacity-50 cursor-not-allowed'
              }`}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className={`touch-target-44 px-2.5 py-1 rounded border text-xs font-mono flex items-center gap-1 ${
                historyIndex < history.length - 1
                  ? 'bg-slate-950 border-slate-700 hover:bg-slate-800 text-slate-200'
                  : 'bg-slate-950/40 border-slate-800 text-slate-600 opacity-50 cursor-not-allowed'
              }`}
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleCopy}
              className="touch-target-44 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 transition"
              title="Salin seluruh isi Markdown ke clipboard"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isCopied ? 'Tersalin' : 'Salin Semua'}</span>
            </button>
          </div>
        </div>

        {/* Main Textarea */}
        <textarea
          ref={textareaRef}
          value={draftContent}
          onChange={(e) => updateContentWithHistory(e.target.value)}
          rows={16}
          placeholder="Ketik teks Markdown atau klik 'Buka Berkas .md' untuk mengimpor dari tablet..."
          className="w-full p-4 bg-slate-950 text-xs font-mono text-slate-100 placeholder-slate-600 leading-relaxed focus:outline-none resize-y"
        />

        {/* Footer Metrics Bar */}
        <div className="p-2.5 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-500">
          <div className="flex items-center gap-3">
            <span>Baris: <strong className="text-slate-300">{linesCount}</strong></span>
            <span>Karakter: <strong className="text-slate-300">{charsCount.toLocaleString()}</strong></span>
            <span>Est. Token: <strong className="text-cyan-400">~{estimatedTokens.toLocaleString()}</strong></span>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${isDraftSaved ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'}`} />
              <span className="text-slate-400">Auto-Cache 400ms</span>
            </span>
            <span>Encoding: <strong className="text-slate-400">UTF-8 (LF)</strong></span>
            <span>Tipe: <strong className="text-indigo-400">{detectedDocType}</strong></span>
          </div>
        </div>
      </div>

      {/* Ekspor & Unduh Berkas Blob (TASK-010) */}
      <WorkspaceExportBar
        content={draftContent}
        defaultFilename={detectedDocType === 'SESSION_STATE' ? 'SESSION_STATE.md' : detectedDocType === 'TASKS' ? 'TASKS.md' : detectedDocType === 'BLUEPRINT' ? 'BLUEPRINT.md' : 'DOKUMEN_ZLCE.md'}
      />
    </div>
  );
};
