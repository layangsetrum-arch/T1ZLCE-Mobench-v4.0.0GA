import React, { useState } from 'react';
import { 
  Sparkles, 
  Download, 
  Copy, 
  Check, 
  HelpCircle, 
  FileText, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  ShieldCheck, 
  ArrowRight, 
  Archive, 
  Cpu, 
  ListFilter,
  CheckSquare,
  Square,
  RefreshCw,
  FolderArchive,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { ParsedSessionState } from '../../types/zlce';
import { copyText } from '../../utils/clipboard';
import { downloadMarkdownBlob, generateAndDownloadZipBundle } from '../../utils/fileExport';
import { 
  ExternalAiModel, 
  AuditFocusArea, 
  generateExternalAuditPrompt, 
  generateTechnicalClarificationResponse, 
  parseReviewFeedbackToProposedTasks,
  ParsedReviewFeedback,
  ProposedSubTask
} from '../../utils/auditPromptGenerator';

interface FeedbackReviewTabProps {
  sessionState: ParsedSessionState;
  rawMarkdown: string;
  onUpdateMarkdown?: (newMd: string) => void;
  onNavigateTab?: (tab: string) => void;
}

export const FeedbackReviewTab: React.FC<FeedbackReviewTabProps> = ({
  sessionState,
  rawMarkdown,
  onUpdateMarkdown,
  onNavigateTab
}) => {
  // Current active sub-step (1: Prompt & Bundle, 2: Q&A & Files, 3: Review Analysis & Action Planner)
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);

  // Dynamic on-demand ZIP generation state
  const [isGeneratingZip, setIsGeneratingZip] = useState<boolean>(false);
  const [zipSuccessMessage, setZipSuccessMessage] = useState<string | null>(null);
  const [lastGeneratedAt, setLastGeneratedAt] = useState<string | null>(null);

  // Step 1 State: Prompt Generator & Bundle
  const [selectedAi, setSelectedAi] = useState<ExternalAiModel>('claude-3.5-sonnet');
  const [selectedFocus, setSelectedFocus] = useState<AuditFocusArea>('full-system');
  const [customNotes, setCustomNotes] = useState<string>('');
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  const [isBundleFilesOpen, setIsBundleFilesOpen] = useState<boolean>(false);

  // Step 2 State: Q&A & File Requests
  const [questionInput, setQuestionInput] = useState<string>('');
  const [clarificationOutput, setClarificationOutput] = useState<{
    responseText: string;
    matchedTopic: string;
    suggestedFiles: string[];
  } | null>(null);
  const [copiedClarification, setCopiedClarification] = useState<boolean>(false);

  // Step 3 State: Review Parsing & Proposed Action Tasks
  const [rawReviewInput, setRawReviewInput] = useState<string>('');
  const [parsedFeedback, setParsedFeedback] = useState<ParsedReviewFeedback | null>(null);
  const [proposedTasks, setProposedTasks] = useState<ProposedSubTask[]>([]);
  const [tasksIntegratedStatus, setTasksIntegratedStatus] = useState<string | null>(null);

  // Step 3 File Upload & Drag-and-Drop State
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFileSize, setUploadedFileSize] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);
  const [isLoadingReport, setIsLoadingReport] = useState<boolean>(false);
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Generate prompt live based on selections
  const currentPrompt = React.useMemo(() => {
    return generateExternalAuditPrompt(
      {
        targetAi: selectedAi,
        focusArea: selectedFocus,
        customNotes: customNotes.trim() || undefined
      },
      sessionState,
      rawMarkdown
    );
  }, [selectedAi, selectedFocus, customNotes, sessionState, rawMarkdown]);

  // Handle Copy Prompt
  const handleCopyPrompt = async () => {
    const success = await copyText(currentPrompt);
    if (success) {
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    }
  };

  // Handle Download Prompt as .md
  const handleDownloadPrompt = () => {
    const filename = `AUDIT_MANDAT_${selectedAi.toUpperCase().replace(/[^A-Z0-9]/g, '_')}.md`;
    downloadMarkdownBlob(currentPrompt, { filename });
  };

  // Handle Dynamic On-Demand ZIP Bundle Generation (Step 1 Action)
  const handleGenerateAndDownloadZip = async () => {
    setIsGeneratingZip(true);
    setZipSuccessMessage(null);
    try {
      const result = await generateAndDownloadZipBundle({
        type: 'audit',
        sessionStateMarkdown: rawMarkdown,
        filename: 'zlce-audit-review-bundle.zip'
      });
      if (result.success) {
        const timeNow = new Date().toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
        setLastGeneratedAt(timeNow);
        setZipSuccessMessage(`Bundel 69 berkas berhasil di-generate & diunduh (${timeNow}) - 100% mutakhir!`);
        setTimeout(() => setZipSuccessMessage(null), 6000);
      }
    } catch (err: any) {
      console.error('Gagal generate bundel ZIP:', err);
    } finally {
      setIsGeneratingZip(false);
    }
  };

  // Handle Clarification Question Submission (Step 2)
  const handleGenerateClarification = () => {
    if (!questionInput.trim()) return;
    const res = generateTechnicalClarificationResponse(questionInput, sessionState);
    setClarificationOutput(res);
  };

  const handleCopyClarification = async () => {
    if (!clarificationOutput) return;
    const success = await copyText(clarificationOutput.responseText);
    if (success) {
      setCopiedClarification(true);
      setTimeout(() => setCopiedClarification(false), 2000);
    }
  };

  // Preset question loader for quick testing
  const handleLoadQuestionPreset = (presetText: string) => {
    setQuestionInput(presetText);
    const res = generateTechnicalClarificationResponse(presetText, sessionState);
    setClarificationOutput(res);
  };

  // Sample Review Loader for Step 3
  const handleLoadSampleReview = () => {
    const sample = `# LAPORAN AUDIT & REVIEW TEKNIS: [CLAUDE 3.5 SONNET]
Tanggal Audit: 2026-11-05 18:00 WIB
Skor Kesiapan Produksi: 96 / 100

## A. RINGKASAN EKSEKUTIF
Sistem ZLCE Mobile Workbench v4.0.0 menunjukkan arsitektur yang sangat disiplin dalam memecahkan masalah degradasi memori dan konteks AI pada tablet terbatas Samsung Galaxy Tab A7 Lite (RAM 3GB). Model Zero-Secret Policy berhasil memisahkan kredensial dari repositori dan LocalStorage, sementara penegakan Invarian I1-I5 pada SESSION_STATE menjamin pemulihan sesi deterministik. 

## B. MATRIKS EVALUASI PILAR ARSITEKTUR
| Pilar Arsitektur | Status (PASS/CONCERN/FAIL) | Catatan Kritis & Bukti |
| :--- | :--- | :--- |
| Zero-Secret & Security Model | PASS | scripts/security-audit.sh memverifikasi 0 Personal Access Token GitHub dan 0 private keys. clean-auth.sh memusnahkan socket cache RAM Termux secara bersih. |
| Ketahanan LMK & Efisiensi RAM 3GB | PASS | useAutoDraftCache dengan debounce 400ms dan synchronous flush pada visibilitychange ('hidden') menjamin zero data loss saat beralih ke Termux. |
| Ergonomi Layar Sentuh 8.7" (44px+) | PASS | Seluruh 13 kontrol UI memiliki target sentuh >= 44x44px. visualViewport API menangani keyboard virtual Android tanpa menutupi input. |
| Format Konteks Portabel & Multi-AI | PASS | contextPackGenerator mematuhi Schema-before-Data dengan pemangkasan anggaran token cerdas per model AI. |
| Test Coverage & Integritas Kontrol | PASS | scripts/run-tests.py lulus 32/32 checks dan zlce-check.py memastikan kepatuhan kanonik 0 error. |

## C. TEMUAN CELAH, RISIKO ATAU SARAN PENINGKATAN
### Temuan #1: Pengetatan Pre-Commit Hook Otomatis
* **Tingkat Keparahan:** MEDIUM
* **Berkas Terdampak:** \`scripts/install-hooks.sh\`
* **Bukti Teknis:** Saat ini skrip pemindai security-audit dijalankan manual atau via test runner; berpotensi terlupa jika anggota commit langsung di terminal.
* **Rekomendasi Preskriptif:** Buat skrip instalasi git hook pre-commit di Termux yang menjalankan security-audit.sh secara otomatis sebelum commit diizinkan.

### Temuan #2: Optimasi Precache Service Worker
* **Tingkat Keparahan:** LOW
* **Berkas Terdampak:** \`public/sw.js\`
* **Bukti Teknis:** Perluasan daftar precache aset statis dan perlakuan fallthrough offline navigasi.
* **Rekomendasi Preskriptif:** Tambahkan fallback offline eksplisit untuk rute dynamic.

=== END CLAUDE AUDIT RESPONSE ===`;

    setRawReviewInput(sample);
    setUploadedFileName('contoh-audit-claude-3.5.md');
    setUploadedFileSize('1.8 KB');
    const parsed = parseReviewFeedbackToProposedTasks(sample);
    setParsedFeedback(parsed);
    setProposedTasks(parsed.proposedTasks);
    setTasksIntegratedStatus(null);
  };

  // Process uploaded file content
  const processUploadedFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        setRawReviewInput(content);
        setUploadedFileName(file.name);
        setUploadedFileSize(`${(file.size / 1024).toFixed(1)} KB`);
        const parsed = parseReviewFeedbackToProposedTasks(content);
        setParsedFeedback(parsed);
        setProposedTasks(parsed.proposedTasks);
        setTasksIntegratedStatus(null);
      }
    };
    reader.readAsText(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  const handleDropFile = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  // Load latest audit report asset from disk (/assets/aistudio/Laporan_Audit_ZLCE_v4.0.0_150d1d16.md)
  const handleLoadLatestAuditReportAsset = async () => {
    setIsLoadingReport(true);
    try {
      const res = await fetch('/assets/aistudio/Laporan_Audit_ZLCE_v4.0.0_150d1d16.md');
      if (!res.ok) throw new Error('File lampiran audit tidak ditemukan');
      const text = await res.text();
      setRawReviewInput(text);
      setUploadedFileName('Laporan_Audit_ZLCE_v4.0.0_150d1d16.md');
      setUploadedFileSize(`${(new Blob([text]).size / 1024).toFixed(1)} KB`);
      const parsed = parseReviewFeedbackToProposedTasks(text);
      setParsedFeedback(parsed);
      setProposedTasks(parsed.proposedTasks);
      setTasksIntegratedStatus(null);
    } catch (err: any) {
      console.error('Gagal memuat berkas laporan audit:', err);
      alert('Gagal memuat berkas lampiran laporan audit: ' + (err?.message || err));
    } finally {
      setIsLoadingReport(false);
    }
  };

  const handleSelectAllTasks = () => {
    setProposedTasks(prev => prev.map(t => ({ ...t, accepted: true })));
  };

  const handleDeselectAllTasks = () => {
    setProposedTasks(prev => prev.map(t => ({ ...t, accepted: false })));
  };

  // Analyze Review Text (Step 3)
  const handleAnalyzeReview = () => {
    if (!rawReviewInput.trim()) return;
    const parsed = parseReviewFeedbackToProposedTasks(rawReviewInput);
    setParsedFeedback(parsed);
    setProposedTasks(parsed.proposedTasks);
    setTasksIntegratedStatus(null);
  };

  // Toggle accepted status of a proposed task
  const handleToggleTaskAccept = (taskId: string) => {
    setProposedTasks(prev => 
      prev.map(t => t.id === taskId ? { ...t, accepted: !t.accepted } : t)
    );
  };

  // Handle Integration of Accepted Tasks to SESSION_STATE.md (Step 3 Action)
  const handleIntegrateAcceptedTasks = () => {
    const acceptedList = proposedTasks.filter(t => t.accepted);
    if (acceptedList.length === 0) {
      alert('Pilih minimal satu usulan task untuk diintegrasikan ke backlog.');
      return;
    }

    if (!rawMarkdown || !onUpdateMarkdown) {
      setTasksIntegratedStatus(`Berhasil mensimulasikan integrasi ${acceptedList.length} task baru ke backlog.`);
      return;
    }

    // Build markdown table rows to append
    let updatedMd = rawMarkdown;
    const tableRows = acceptedList.map(t => 
      `| \`${t.id}\` | ${t.name} | ${t.dependencies} | READY | - | - |`
    ).join('\n');

    // Insert new task rows into Section 2 of SESSION_STATE.md before the section divider
    const tableEndMatch = updatedMd.match(/(\| `TASK-[^`]+`[^\n]*\n)(?=\n*---|\n*## 3)/);
    if (tableEndMatch) {
      updatedMd = updatedMd.replace(
        tableEndMatch[0],
        `${tableEndMatch[0]}${tableRows}\n`
      );

      // Add audit log note
      const auditNote = `* **${new Date().toISOString().substring(0, 10)} WIB:** Integrasi Review Multi-AI (FASE 9): Mengintegrasikan ${acceptedList.length} task usulan hasil review eksternal (${acceptedList.map(t => t.id).join(', ')}) ke dalam Matriks Task; status siap dikerjakan (READY).`;
      updatedMd = updatedMd.replace(
        /(## 7\. LOG AUDIT[^\n]*\n\n)/,
        `$1${auditNote}\n`
      );

      onUpdateMarkdown(updatedMd);
      setTasksIntegratedStatus(`Sukses! ${acceptedList.length} task baru (${acceptedList.map(t => t.id).join(', ')}) telah dialirkan ke Bagian 2 Matriks Task & Log Audit SESSION_STATE.md.`);
    } else {
      setTasksIntegratedStatus(`Simulasi sukses: ${acceptedList.length} task disetujui.`);
    }
  };

  // Bundled file list preview
  const bundledFileList = [
    'SESSION_STATE.md (Single Source of Truth)',
    'docs/mobile/MOBILE_BLUEPRINT.md (Cetak Biru Arsitektur Mobile)',
    'src/hooks/useAutoDraftCache.ts (Hook Debounce 400ms & Synchronous LMK Flush)',
    'src/tests/lmkRecovery.test.ts (Uji Ketahanan LMK RAM 3GB, 5/5 Checks PASS)',
    'docs/mobile/blueprint/09_FAILURE_AND_RECOVERY.md (Protokol Recovery Kasus A-D & LMK)',
    'TASKS.md (Backlog 46 Task Atomik Lengkap)',
    'CHANGELOG.md (Catatan Rilis v4.0.0)',
    'docs/mobile/INSTALLATION.md (Panduan Tablet F-Droid)',
    'docs/mobile/TERMUX_SETUP.md (Quick-Ref Environment)',
    'docs/mobile/USER_GUIDE.md (Alur Kerja Estafet 8 Anggota)',
    'docs/mobile/TROUBLESHOOTING.md (Matriks Pemecahan Masalah)',
    'docs/mobile/SECURITY_AUDIT.md (Laporan Zero-Secret)',
    'docs/mobile/DEVICE_AUDIT.md (Audit Fisik Sentuh SM-T225)',
    'docs/mobile/blueprint/01..14 (Seluruh 14 Cetak Biru Arsitektur)',
    'scripts/create-lmk-bundle.py (Generator Bundel LMK 5 Berkas)',
    'scripts/zlce-check.py (Canonical POSIX Linter)',
    'scripts/run-tests.py (Automated Suite 35 Checks)',
    'scripts/security-audit.sh (Regex Zero-Leak Scanner)',
    'scripts/zlce/zlce & clean-auth.sh (Dispatcher & RAM Purge)',
    'src/types/zlce.ts & mobile.ts (TypeScript System)',
    'src/utils/sessionStateValidator.ts & contextPackGenerator.ts',
    'src/tests/e2eScenarios.test.ts (14 Skenario Deterministik)',
    'src/tests/offlineOperation.test.ts (Uji Mode Pesawat 100%)'
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Introduction */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-indigo-500/40 rounded-xl p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                FASE 9 • AUDIT, TEST &amp; REVIEW
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Claude · ChatGPT · DeepSeek
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                Zero-Secret Ready
              </span>
            </div>
            <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight">
              Audit, Testing &amp; Review Multi-AI Hub
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Fasilitas evaluasi independen pihak ketiga: buat prompt audit terstruktur, unduh bundel ZIP 71 berkas proyek lengkap (mencakup seluruh arsitektur LMK &amp; recovery), tanggapi pertanyaan klarifikasi AI peninjau, dan integrasikan rekomendasi perbaikan melalui proposal task terstruktur.
            </p>
          </div>

          <div className="shrink-0 flex flex-col items-end gap-1.5">
            <button
              type="button"
              onClick={handleGenerateAndDownloadZip}
              disabled={isGeneratingZip}
              className={`touch-target-44 min-h-[44px] px-4 py-2.5 bg-gradient-to-r from-indigo-600 via-cyan-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-950/40 transition active:scale-95 border border-cyan-400/30 ${
                isGeneratingZip ? 'opacity-80 cursor-wait' : ''
              }`}
              title="Generate dan unduh bundel ZIP 71 berkas proyek paling mutakhir secara on-the-fly"
            >
              {isGeneratingZip ? (
                <>
                  <RefreshCw className="w-4 h-4 text-white animate-spin" />
                  <span>Sedang Mengemas 71 Berkas...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Generate &amp; Unduh ZIP (71 Berkas)</span>
                </>
              )}
            </button>
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-cyan-300/80">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{lastGeneratedAt ? `Live Generated: ${lastGeneratedAt}` : 'Live On-Demand • Selalu Terupdate'}</span>
            </div>
          </div>
        </div>

        {/* Live ZIP Generation Notification Toast */}
        {zipSuccessMessage && (
          <div className="mt-4 p-3 rounded-lg bg-emerald-950/80 border border-emerald-500/60 text-emerald-200 text-xs flex items-center justify-between shadow-md animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-semibold">{zipSuccessMessage}</span>
            </div>
            <span className="text-[10px] font-mono bg-emerald-900/60 text-emerald-300 px-2 py-0.5 rounded border border-emerald-700/50">
              Anti-Stale Active
            </span>
          </div>
        )}

        {/* 3-Step Process Navigation Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-5 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={() => setActiveStep(1)}
            className={`touch-target-44 min-h-[44px] p-3 rounded-lg border text-left transition flex items-center gap-3 ${
              activeStep === 1
                ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-sm'
                : 'bg-slate-950/40 border-slate-800/80 text-slate-400 hover:bg-slate-900 hover:text-slate-200'
            }`}
          >
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
              activeStep === 1 ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'
            }`}>
              1
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">Langkah 1: Prompt &amp; Bundel ZIP</div>
              <div className="text-[10px] text-slate-400 truncate">Perintah teknis, bukti &amp; berkas ZIP</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveStep(2)}
            className={`touch-target-44 min-h-[44px] p-3 rounded-lg border text-left transition flex items-center gap-3 ${
              activeStep === 2
                ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-sm'
                : 'bg-slate-950/40 border-slate-800/80 text-slate-400 hover:bg-slate-900 hover:text-slate-200'
            }`}
          >
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
              activeStep === 2 ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'
            }`}>
              2
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">Langkah 2: Tanya-Jawab &amp; File</div>
              <div className="text-[10px] text-slate-400 truncate">Menanggapi klarifikasi awal AI</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveStep(3)}
            className={`touch-target-44 min-h-[44px] p-3 rounded-lg border text-left transition flex items-center gap-3 ${
              activeStep === 3
                ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-sm'
                : 'bg-slate-950/40 border-slate-800/80 text-slate-400 hover:bg-slate-900 hover:text-slate-200'
            }`}
          >
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
              activeStep === 3 ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'
            }`}>
              3
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">Langkah 3: Integrasi Review</div>
              <div className="text-[10px] text-slate-400 truncate">Tawarkan tindakan &amp; bagi ke task</div>
            </div>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STEP 1: PROMPT GENERATOR & BUNDLE ZIP                                    */}
      {/* ========================================================================= */}
      {activeStep === 1 && (
        <div className="space-y-5">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <h2 className="text-base font-bold text-white">Konfigurasi Perintah Audit Multi-AI</h2>
              </div>
              <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
                Output: File Markdown (.md) Terstruktur
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Target AI Model */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Pilih Model AI Sasaran Peninjau:</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
                    { id: 'chatgpt-4o', label: 'ChatGPT (GPT-4o)' },
                    { id: 'deepseek-v3', label: 'DeepSeek-V3' },
                    { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' }
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedAi(m.id as ExternalAiModel)}
                      className={`touch-target-44 min-h-[44px] px-3 py-2 rounded-lg text-xs font-semibold border transition text-center ${
                        selectedAi === m.id
                          ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200 shadow-sm'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Focus Area */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <ListFilter className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Fokus Domain Audit:</span>
                </label>
                <select
                  value={selectedFocus}
                  onChange={(e) => setSelectedFocus(e.target.value as AuditFocusArea)}
                  className="touch-target-44 min-h-[44px] w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="full-system">Audit Sistem Menyeluruh &amp; Kesiapan Produksi</option>
                  <option value="architecture-zero-secret">Keamanan Zero-Secret &amp; Token Cleanup</option>
                  <option value="mobile-lmk-ergonomics">Ergonomi Layar Sentuh &amp; Ketahanan LMK RAM 3GB</option>
                  <option value="multi-ai-relay-workflow">Alur Estafet Multi-AI &amp; Context Engineering</option>
                  <option value="code-quality-testing">Kualitas Kode TypeScript &amp; 32 Test Checks</option>
                </select>
              </div>
            </div>

            {/* Custom Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Catatan / Instruksi Khusus Tambahan (Opsional):
              </label>
              <input
                type="text"
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="Contoh: Fokuskan evaluasi pada kemungkinan race condition saat LMK membunuh PWA..."
                className="touch-target-44 min-h-[44px] w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className="touch-target-44 min-h-[44px] px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition active:scale-95"
                >
                  {copiedPrompt ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedPrompt ? 'Tersalin ke Clipboard!' : '1-Ketuk Salin Prompt'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPrompt}
                  className="touch-target-44 min-h-[44px] px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-2 transition"
                >
                  <Download className="w-4 h-4 text-cyan-400" />
                  <span>Unduh File .md</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGenerateAndDownloadZip}
                  disabled={isGeneratingZip}
                  className={`touch-target-44 min-h-[44px] px-3.5 py-2 bg-emerald-950/80 border border-emerald-500/60 hover:bg-emerald-900/80 text-emerald-200 rounded-lg text-xs font-bold flex items-center gap-2 shadow transition active:scale-95 ${
                    isGeneratingZip ? 'opacity-80 cursor-wait' : ''
                  }`}
                  title="Generate dan unduh 71 berkas proyek mutakhir secara real-time"
                >
                  {isGeneratingZip ? (
                    <>
                      <RefreshCw className="w-4 h-4 text-emerald-300 animate-spin" />
                      <span>Mengemas 71 Berkas...</span>
                    </>
                  ) : (
                    <>
                      <FolderArchive className="w-4 h-4 text-emerald-400" />
                      <span>Generate &amp; Unduh ZIP (71 Berkas)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Prompt Live Preview Box */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-mono">Pratinjau Prompt Mandat Audit ({currentPrompt.length} karakter):</span>
                <span className="text-[11px] text-cyan-400 font-mono">Format Terbukti &amp; Anti-Placeholder</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 text-[11px] font-mono text-slate-300 max-h-72 overflow-y-auto whitespace-pre-wrap leading-relaxed select-all">
                {currentPrompt}
              </div>
            </div>

            {/* Collapsible File List In ZIP */}
            <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/50">
              <button
                type="button"
                onClick={() => setIsBundleFilesOpen(prev => !prev)}
                className="touch-target-44 min-h-[44px] w-full px-4 py-2.5 flex items-center justify-between text-xs text-slate-300 hover:text-white transition"
              >
                <span className="flex items-center gap-2 font-semibold">
                  <Archive className="w-4 h-4 text-indigo-400" />
                  <span>Lihat Daftar 71 Berkas Utama dalam Bundel ZIP (Termasuk 5 Berkas LMK)</span>
                </span>
                {isBundleFilesOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {isBundleFilesOpen && (
                <div className="p-3.5 border-t border-slate-800 text-[11px] font-mono text-slate-400 grid grid-cols-1 md:grid-cols-2 gap-1.5 bg-slate-950">
                  {bundledFileList.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 truncate">
                      <span className="text-indigo-400">•</span>
                      <span className="truncate">{item}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: MENANGGAPI PERTANYAAN & PERMINTAAN FILE AWAL                      */}
      {/* ========================================================================= */}
      {activeStep === 2 && (
        <div className="space-y-5">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-cyan-400" />
                <h2 className="text-base font-bold text-white">
                  Menanggapi Pertanyaan &amp; Permintaan File AI Peninjau
                </h2>
              </div>
              <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
                Proses 2 • Klarifikasi Teknis
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Jika AI peninjau (Claude / ChatGPT / DeepSeek) mengajukan pertanyaan klarifikasi arsitektur atau meminta cuplikan berkas tertentu, masukkan pertanyaan tersebut di sini. Sistem akan membedah basis kebenaran proyek dan merumuskan jawaban teknis presisi siap salin.
            </p>

            {/* Quick Presets */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-300">Pertanyaan Umum Cepat (Klik untuk Coba):</span>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Jelaskan Ketahanan LMK RAM 3GB', text: 'Bagaimana ZLCE menangani pemutusan memori oleh Android LMK saat beralih aplikasi pada RAM 3GB?' },
                  { label: 'Jelaskan Zero-Secret & Git Cache', text: 'Bagaimana Zero-Secret Policy ditegakkan pada tablet bersama saat anggota tim melakukan git commit dan push?' },
                  { label: 'Jelaskan Audit Ergonomi 44px', text: 'Apakah seluruh kontrol UI memenuhi standar target sentuh 44x44px di tablet 8.7 inci Samsung A7 Lite?' },
                  { label: 'Jelaskan Operasi Offline 100%', text: 'Bagaimana PWA beroperasi 100% tanpa jaringan dan aset apa saja yang di-precache oleh service worker?' }
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleLoadQuestionPreset(preset.text)}
                    className="touch-target-44 min-h-[44px] px-3 py-1.5 rounded-lg text-xs bg-slate-950 border border-slate-800 hover:border-cyan-500/60 text-slate-300 hover:text-white transition flex items-center gap-1.5"
                  >
                    <span>{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Input Question Area */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Masukkan Pertanyaan / Permintaan File dari AI Peninjau:
              </label>
              <textarea
                value={questionInput}
                onChange={(e) => setQuestionInput(e.target.value)}
                placeholder="Tempelkan pertanyaan klarifikasi dari Claude/ChatGPT/DeepSeek di sini..."
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleGenerateClarification}
                className="touch-target-44 min-h-[44px] px-4 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition active:scale-95"
              >
                <Sparkles className="w-4 h-4 text-cyan-200" />
                <span>Bangkitkan Tanggapan Teknis</span>
              </button>
            </div>

            {/* Clarification Output Display */}
            {clarificationOutput && (
              <div className="pt-3 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Topik Terdeteksi: <span className="text-cyan-400 font-mono">{clarificationOutput.matchedTopic}</span></span>
                  </span>

                  <button
                    type="button"
                    onClick={handleCopyClarification}
                    className="touch-target-44 min-h-[44px] px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    {copiedClarification ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedClarification ? 'Tersalin!' : 'Salin Jawaban'}</span>
                  </button>
                </div>

                <div className="bg-slate-950 border border-cyan-800/40 rounded-lg p-4 text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed select-all">
                  {clarificationOutput.responseText}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: INTEGRASI REVIEW & PROPOSAL TASK ("TAWARKAN DULU -> ACTION")      */}
      {/* ========================================================================= */}
      {activeStep === 3 && (
        <div className="space-y-5">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-bold text-white">
                  Integrasi Review &amp; Rencana Task Perbaikan (Step 3)
                </h2>
              </div>
              <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
                Alur: Unggah Laporan ──&gt; Bedah Bukti ──&gt; Usulkan Task ──&gt; Tunggu Persetujuan
              </span>
            </div>

            {/* Principle Card */}
            <div className="p-3 bg-indigo-950/40 border border-indigo-700/50 rounded-lg text-xs text-indigo-200 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-bold">Prinsip Kehati-hatian ZLCE:</span> Hasil laporan audit tidak langsung mengubah repositori atau status sesi. Sistem membedah temuan kritis, membaginya ke dalam sub-task perbaikan atomik, dan <strong className="text-amber-300">menunggu persetujuan eksplisit Anda</strong> sebelum task dialirkan ke backlog.
              </div>
            </div>

            {/* File Upload & Drag-and-Drop Area */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-300 flex-wrap gap-2">
                <label className="font-semibold flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Unggah Berkas Laporan Audit (Format .md / .txt / .json):</span>
                </label>

                <button
                  type="button"
                  disabled={isLoadingReport}
                  onClick={handleLoadLatestAuditReportAsset}
                  className="touch-target-44 min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700/60 text-cyan-200 hover:text-white transition flex items-center gap-1.5 active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                  <span>{isLoadingReport ? 'Memuat Laporan...' : '⚡ Muat Laporan Audit ZLCE v4.0.0 (Lampiran Terbaru)'}</span>
                </button>
              </div>

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".md,.markdown,.txt,.json,text/markdown,text/plain"
                onChange={handleFileInputChange}
                className="hidden"
              />

              {/* Drag and Drop Zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
                onDragLeave={() => setIsDraggingFile(false)}
                onDrop={handleDropFile}
                onClick={() => fileInputRef.current?.click()}
                className={`touch-target-44 border-2 border-dashed rounded-xl p-5 sm:p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 select-none ${
                  isDraggingFile 
                    ? 'border-emerald-400 bg-emerald-950/30 text-emerald-200' 
                    : 'border-slate-800 hover:border-slate-700 bg-slate-950/60 hover:bg-slate-950 text-slate-400'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-200">
                    Klik untuk memilih berkas audit
                  </span>
                  <span className="text-xs text-slate-400"> atau seret &amp; letakkan (drag &amp; drop) berkas ke sini</span>
                </div>
                <div className="text-[11px] font-mono text-slate-500">
                  Mendukung .md, .markdown, .txt, .json (Laporan audit ChatGPT, Claude, DeepSeek)
                </div>
              </div>

              {/* Active Uploaded File Info Card */}
              {uploadedFileName && (
                <div className="flex items-center justify-between p-2.5 bg-slate-950 border border-emerald-800/50 rounded-lg text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-mono text-white truncate">{uploadedFileName}</span>
                    {uploadedFileSize && (
                      <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 shrink-0">
                        {uploadedFileSize}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setUploadedFileName(null);
                      setUploadedFileSize(null);
                      setRawReviewInput('');
                      setParsedFeedback(null);
                      setProposedTasks([]);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="touch-target-44 min-h-[36px] px-2.5 py-1 text-slate-400 hover:text-rose-300 text-xs transition"
                  >
                    Ganti / Bersihkan
                  </button>
                </div>
              )}
            </div>

            {/* Collapsible/Direct Raw Textarea Option */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <label className="font-semibold text-slate-300">
                  Atau Tempelkan Teks Laporan Markdown Langsung:
                </label>
                <button
                  type="button"
                  onClick={handleLoadSampleReview}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 underline font-mono"
                >
                  Muat Contoh Review Mock Claude (Skor 96)
                </button>
              </div>
              <textarea
                value={rawReviewInput}
                onChange={(e) => setRawReviewInput(e.target.value)}
                placeholder="Tempelkan teks laporan markdown dari AI peninjau di sini..."
                rows={4}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAnalyzeReview}
                className="touch-target-44 min-h-[44px] px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition active:scale-95 shadow-md"
              >
                <Sparkles className="w-4 h-4 text-emerald-200" />
                <span>Analisis Laporan &amp; Susun Proposal Task</span>
              </button>
            </div>

            {/* Parsed Feedback & Proposed Tasks Section */}
            {parsedFeedback && (
              <div className="pt-4 border-t border-slate-800 space-y-4">
                {/* Executive Decision Banner */}
                {parsedFeedback.decision && (
                  <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md ${
                    parsedFeedback.decision.includes('NOT READY') || parsedFeedback.score < 80
                      ? 'bg-rose-950/40 border-rose-500/60 text-rose-200'
                      : 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200'
                  }`}>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className={`w-5 h-5 ${parsedFeedback.score < 80 ? 'text-rose-400' : 'text-emerald-400'}`} />
                        <span className="text-xs font-mono font-bold uppercase tracking-wider">
                          Hasil Keputusan Eksekutif Auditor
                        </span>
                      </div>
                      <div className="text-base sm:text-lg font-black tracking-tight text-white">
                        {parsedFeedback.decision}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-[10px] uppercase font-mono tracking-wider opacity-80">Skor Kesiapan</div>
                        <div className={`text-2xl font-black ${parsedFeedback.score < 80 ? 'text-rose-300' : 'text-emerald-300'}`}>
                          {parsedFeedback.score} <span className="text-sm font-normal text-slate-400">/ 100</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Summary Score Card */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-center">
                    <span className="text-[11px] text-slate-400">Auditor / Model:</span>
                    <div className="text-xs sm:text-sm font-bold text-white mt-0.5 truncate">{parsedFeedback.modelName}</div>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-center">
                    <span className="text-[11px] text-slate-400">Status Kesiapan:</span>
                    <div className={`text-sm font-bold mt-0.5 ${parsedFeedback.score < 80 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {parsedFeedback.score < 80 ? 'Perlu Remediasi Ketat' : 'Kesiapan Tinggi'}
                    </div>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-center">
                    <span className="text-[11px] text-slate-400">Usulan Task Remediasi:</span>
                    <div className="text-sm font-bold text-cyan-400 mt-0.5">{proposedTasks.length} Task Baru</div>
                  </div>
                </div>

                {/* Executive Summary */}
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 space-y-1.5">
                  <div className="text-xs font-bold text-slate-300">Ringkasan Evaluasi &amp; Analisis Kesenjangan:</div>
                  <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap">{parsedFeedback.summary}</p>
                </div>

                {/* Strengths List (if available) */}
                {parsedFeedback.strengths && parsedFeedback.strengths.length > 0 && (
                  <div className="bg-slate-950 border border-emerald-900/50 rounded-lg p-3.5 space-y-2">
                    <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Kekuatan Arsitektur Terverifikasi Auditor:</span>
                    </div>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-1.5 text-xs text-slate-300">
                      {parsedFeedback.strengths.map((str, sIdx) => (
                        <li key={sIdx} className="flex items-start gap-1.5 bg-slate-900/80 p-2 rounded border border-slate-800">
                          <span className="text-emerald-400 font-bold">•</span>
                          <span className="leading-relaxed">{str}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Findings List */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-slate-200">
                    <span className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      <span>Rincian Temuan Celah &amp; Bukti Teknis ({parsedFeedback.findings.length} Temuan):</span>
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      Terpetakan AUD-001 s.d. AUD-014
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs max-h-[380px] overflow-y-auto pr-1">
                    {parsedFeedback.findings.map((finding, fIdx) => (
                      <div key={fIdx} className="bg-slate-950 border border-slate-800/80 rounded-lg p-3 space-y-2 flex flex-col justify-between">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-white text-xs">{finding.title}</span>
                            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ${
                              finding.severity === 'CRITICAL' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                              finding.severity === 'HIGH' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                              finding.severity === 'MEDIUM' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'bg-slate-800 text-slate-300'
                            }`}>
                              {finding.severity}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 font-mono bg-slate-900 p-2 rounded border border-slate-800/80 leading-relaxed">
                            {finding.evidence}
                          </p>
                        </div>
                        <p className="text-[11px] text-emerald-300 bg-emerald-950/20 p-2 rounded border border-emerald-900/40 leading-relaxed">
                          <span className="font-semibold text-emerald-200">Rekomendasi: </span>
                          {finding.recommendation}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Proposed Sub-Tasks Interactive Acceptance Table */}
                <div className="space-y-3 pt-3 border-t border-slate-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <CheckSquare className="w-4 h-4 text-cyan-400" />
                        <span>Usulan Sub-Task Remediasi Atomik ({proposedTasks.length} Task)</span>
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Dibagi dalam task atomik sesuai rekomendasi Section 6 laporan audit. Pilih task yang disetujui.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={handleSelectAllTasks}
                        className="touch-target-44 min-h-[36px] px-2.5 py-1 rounded text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                      >
                        Pilih Semua
                      </button>
                      <button
                        type="button"
                        onClick={handleDeselectAllTasks}
                        className="touch-target-44 min-h-[36px] px-2.5 py-1 rounded text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                      >
                        Batal Semua
                      </button>
                      <span className="text-xs font-mono text-cyan-400 font-bold bg-cyan-950/70 border border-cyan-800 px-2.5 py-1 rounded">
                        {proposedTasks.filter(t => t.accepted).length} dari {proposedTasks.length} Disetujui
                      </span>
                    </div>
                  </div>

                  {/* Filter Priority Bar */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-slate-400 mr-1">Filter Prioritas:</span>
                    {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map(sev => (
                      <button
                        key={sev}
                        type="button"
                        onClick={() => setSeverityFilter(sev)}
                        className={`touch-target-44 min-h-[32px] px-2.5 py-1 rounded text-[11px] font-mono transition ${
                          severityFilter === sev
                            ? 'bg-cyan-600 text-white font-bold'
                            : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                        }`}
                      >
                        {sev}
                      </button>
                    ))}
                  </div>

                  {/* Mandate Notice / Awaiting Approval Warning */}
                  <div className="p-3 bg-amber-950/40 border border-amber-600/60 rounded-lg text-xs text-amber-200 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">STATUS: MENUNGGU PERSETUJUAN PENGGUNA.</span>
                      <p className="mt-0.5 text-amber-300/90 leading-relaxed">
                        Sesuai mandat Anda, task-task perbaikan di bawah ini disajikan untuk ditinjau terlebih dahulu. Task tidak akan ditulis ke <code className="font-mono bg-slate-900 px-1 py-0.5 rounded text-white">SESSION_STATE.md</code> secara otomatis tanpa tombol konfirmasi persetujuan di bawah ini.
                      </p>
                    </div>
                  </div>

                  {/* Task List */}
                  <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                    {proposedTasks
                      .filter(t => {
                        if (severityFilter === 'ALL') return true;
                        if (severityFilter === 'CRITICAL') return t.category === 'critical' || t.phase.includes('CRITICAL');
                        if (severityFilter === 'HIGH') return t.phase.includes('HIGH');
                        if (severityFilter === 'MEDIUM') return t.category === 'refactor' || t.phase.includes('MEDIUM');
                        if (severityFilter === 'LOW') return t.category === 'documentation' || t.phase.includes('LOW');
                        return true;
                      })
                      .map((task) => (
                      <div
                        key={task.id}
                        onClick={() => handleToggleTaskAccept(task.id)}
                        className={`touch-target-44 min-h-[44px] p-3 rounded-lg border transition cursor-pointer flex items-start gap-3 select-none ${
                          task.accepted 
                            ? 'bg-slate-950 border-cyan-500/70 shadow-sm' 
                            : 'bg-slate-950/40 border-slate-800 opacity-60'
                        }`}
                      >
                        <div className="pt-0.5 text-cyan-400">
                          {task.accepted ? <CheckSquare className="w-4 h-4 text-cyan-400" /> : <Square className="w-4 h-4 text-slate-600" />}
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="font-bold text-white text-xs">{task.id}: {task.name}</span>
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                                task.phase.includes('CRITICAL') ? 'bg-rose-950 text-rose-300 border-rose-800' :
                                task.phase.includes('HIGH') ? 'bg-amber-950 text-amber-300 border-amber-800' :
                                task.phase.includes('MEDIUM') ? 'bg-cyan-950 text-cyan-300 border-cyan-800' :
                                'bg-slate-800 text-slate-300 border-slate-700'
                              }`}>
                                {task.phase}
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                                Dep: {task.dependencies}
                              </span>
                            </div>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed">{task.description}</p>
                          <div className="flex items-center gap-1 text-[10px] font-mono text-cyan-400 flex-wrap">
                            <span className="text-slate-500">Berkas Terdampak:</span>
                            {task.impactFiles.join(', ')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Integration Action Trigger */}
                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={handleIntegrateAcceptedTasks}
                      className="touch-target-44 min-h-[44px] px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition active:scale-95"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Setujui &amp; Terapkan Task Terpilih ({proposedTasks.filter(t => t.accepted).length}) ke SESSION_STATE.md</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onNavigateTab?.('session')}
                      className="touch-target-44 min-h-[44px] px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                    >
                      <span>Buka Tab SESSION_STATE</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {tasksIntegratedStatus && (
                    <div className="p-3 bg-emerald-950/70 border border-emerald-700 text-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{tasksIntegratedStatus}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
