import React, { useState, useMemo } from 'react';
import { 
  parseControlDocument, 
  detectDocumentType 
} from '../../utils/markdownParser';
import { 
  ZLCEControlDocType, 
  ParsedControlDocument, 
  ParsedBacklogTask,
  ParsedBlueprintModule
} from '../../types/zlce';
import { copyToClipboard } from '../../utils/clipboard';
import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Layers, 
  Search, 
  Copy, 
  Check, 
  Cpu, 
  Terminal, 
  GitBranch, 
  ShieldCheck, 
  BookOpen, 
  Code2, 
  Sparkles,
  ExternalLink,
  Edit3
} from 'lucide-react';
import { WorkspaceEditor } from './WorkspaceEditor';
import { WorkspaceExportBar } from './WorkspaceExportBar';
import { ZLCE_TEMPLATES } from '../../data/templates';

interface WorkspaceReaderProps {
  initialMarkdown?: string;
  onSelectDocument?: (content: string) => void;
  className?: string;
}

export const WorkspaceReader: React.FC<WorkspaceReaderProps> = ({
  initialMarkdown = '',
  onSelectDocument,
  className = ''
}) => {
  const [inputText, setInputText] = useState<string>(initialMarkdown);
  const [activeView, setActiveView] = useState<'structured' | 'editor' | 'raw' | 'json'>('structured');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPhase, setSelectedPhase] = useState<string>('all');
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Parsing reaktif terhadap perubahan input teks
  const parsedDoc: ParsedControlDocument = useMemo(() => {
    return parseControlDocument(inputText);
  }, [inputText]);

  const handleCopy = async (text: string) => {
    await copyToClipboard(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Preset dokumen cepat untuk uji parsing ZLCE
  const loadPreset = (type: ZLCEControlDocType) => {
    if (type === 'SESSION_STATE') {
      const activeState = localStorage.getItem('zlce_session_raw_markdown');
      if (activeState) {
        setInputText(activeState);
        return;
      }
      setInputText(`# STATUS SESI (SESSION_STATE.md): ZLCE Mobile Workbench v4.0.0

---

## 0. KONTEKS PROYEK (statis)

* **Proyek:** ZLCE Mobile Workbench v4.0.0
* **Stack:** React 19 + TypeScript + Vite + Tailwind CSS
* **MODE:** FULL
* **Kemampuan Tulis Berkas AI:** YA
* **Kemampuan Eksekusi AI:** YA

---

## 1. STATUS AKTIF

* **Timestamp Audit:** 2026-11-04 14:45:00 WIB
* **Cabang Git:** \`v4-mobile\`
* **Task Terakhir DONE:** \`TASK-007\`
* **Task Aktif:** \`-\`
* **Status Task Aktif:** READY
* **Task Berikutnya:** \`TASK-008\`

---

## 2. MATRIKS TASK

| ID Task | Nama | Dependensi | Status | Bukti Verifikasi | Disetujui |
| :--- | :--- | :--- | :--- | :--- | :--- |
| \`TASK-001\` | Verifikasi Baseline Uji | - | DONE | 5/5 pass | ya |
| \`TASK-002\` | Struktur Komponen Mobile | TASK-001 | DONE | tsc 0 err | ya |
| \`TASK-007\` | Project Switcher & Registry | TASK-006 | DONE | local storage ok | ya |
| \`TASK-008\` | Workspace Reader & Parser | TASK-007 | READY | - | - |

---

## 3. WORK IN PROGRESS (WAL)

* **Task:** TASK-008
* **Langkah Sedang Dikerjakan:** Parser dokumen kontrol ZLCE
* **Berkas Direncanakan/Disentuh:** src/utils/markdownParser.ts
* **Sudah Dilakukan:** FASE 1 tuntas
* **Langkah Berikutnya (persis):** Implementasi WorkspaceReader.tsx
* **Perintah Verifikasi:** npm run build
* **Diperbarui:** 2026-11-04 14:45:00 WIB
`);
    } else if (type === 'TASKS') {
      setInputText(`# BACKLOG TASK PENGEMBANGAN: ZLCE Mobile Workbench v4.0.0

---

## 1. PETA FASE

* **FASE 0: Baseline & Persiapan Lingkungan Uji** (\`TASK-001\` s/d \`TASK-002\`)
* **FASE 1: Fondasi PWA Tablet Android & Ergonomi Layar Sentuh** (\`TASK-003\` s/d \`TASK-007\`)
* **FASE 2: Markdown Workspace & Manajemen Multi-Proyek** (\`TASK-008\` s/d \`TASK-012\`)

---

## 2. RINCIAN TASK ATOMIK

### TASK-007: Komponen Project Switcher & Registry Ringan
* **Fase:** FASE 1
* **Deskripsi:** Membangun komponen ProjectSwitcher.tsx untuk mengelola multi-proyek di tablet.
* **Dependensi:** TASK-006
* **File:** src/components/mobile/ProjectSwitcher.tsx, src/hooks/useProjectRegistry.ts
* **Docs Terkait:** docs/mobile/blueprint/05_STORAGE_AND_SYNC.md
* **Docs Impact:** src/components/Header.tsx
* **Acceptance Criteria:**
  1. Registry multi-proyek tersimpan di localStorage.
  2. Pengguna dapat menambah, mengedit, dan berpindah antar proyek secara instan.
  3. Berganti proyek memuat context yang sesuai.
* **Test Case:** TC-P1-05
* **Metode Verifikasi:** Tambahkan proyek uji dan verifikasi isolasi state.

---

### TASK-008: Workspace Reader & Parser Dokumen Kontrol ZLCE
* **Fase:** FASE 2
* **Deskripsi:** Membangun parser berkas Markdown kontrol ZLCE (BLUEPRINT.md, TASKS.md, SESSION_STATE.md).
* **Dependensi:** TASK-007
* **File:** src/utils/markdownParser.ts, src/components/mobile/WorkspaceReader.tsx
* **Docs Terkait:** docs/mobile/blueprint/02_COMPONENT_ARCHITECTURE.md
* **Acceptance Criteria:**
  1. Parser mampu membedakan format dokumen SESSION_STATE.md, TASKS.md, dan BLUEPRINT.md.
  2. Matriks task diparsing menjadi array objek terstruktur.
  3. Tidak memicu crash bila terdapat baris Markdown tak terduga.
* **Test Case:** TC-P2-01
* **Metode Verifikasi:** Uji unit parsing terhadap berkas contoh di templates/ dan examples/.
`);
    } else if (type === 'BLUEPRINT') {
      setInputText(`# SPESIFIKASI TEKNIS & BLUEPRINT SISTEM: ZLCE Mobile Workbench

---

## 1. PARAMETER SISTEM & LINGKUNGAN

* **Nama Sistem:** ZLCE Mobile Workbench v4.0.0
* **Profil Domain:** mobile-relay
* **Lingkungan Produksi:**
  - Runtime: Node.js 22+ / Termux Python 3.11+
  - Web Server: Vite 6+ Dev Middleware / PWA Standalone Cache
  - Database: LocalStorage + IndexedDB (Ext4 Git Working Tree)
  - Framework: React 19 + TypeScript + Tailwind CSS

---

## 2. BATASAN DOMAIN BISNIS

1. **Aturan Bisnis (BR-xx):**
   - \`BR-01\`: Zero-Loss Context Engineering wajib mempertahankan invarian I1 s.d. I5 tanpa riwayat obrolan AI.
   - \`BR-02\`: Maksimal 1 task IN_PROGRESS pada tablet bersama dalam waktu yang sama.
   - \`BR-03\`: Seluruh anggota tim (8 anggota) memiliki hak persetujuan gerbang kualitas.
2. **Out of Scope:**
   - Obsidian App integration dieksklusikan dari Blueprint Inti v4.0.0 demi efisiensi RAM 3GB.

---

## 3. MATRIKS MODUL

| ID Modul | Nama Modul | Fungsi Utama | Dependensi |
| :--- | :--- | :--- | :--- |
| \`MOD-01\` | PWA Core & Ergonomi | Shell offline, visualViewport, touch targets 44px | Browser Sandbox |
| \`MOD-02\` | Member & Project Switcher | Profil 8 anggota estafet, registry multi-proyek | MOD-01 |
| \`MOD-03\` | Markdown Workspace Reader | Parser SESSION_STATE, TASKS, BLUEPRINT | MOD-01 |
| \`MOD-04\` | Portable Context Pack | Generator prompt, adapter kuota token per AI | MOD-02, MOD-03 |
| \`MOD-05\` | Command Hub & Termux | Dispatcher perintah git atomik & zlce-check | Termux Runtime |
`);
    }
  };

  // Filter tasks jika membuka dokumen TASKS
  const filteredTasks = useMemo(() => {
    if (!parsedDoc.tasksDoc) return [];
    return parsedDoc.tasksDoc.tasks.filter((t: ParsedBacklogTask) => {
      const matchPhase = selectedPhase === 'all' || t.phase.toLowerCase().includes(selectedPhase.toLowerCase());
      const matchQuery = !searchQuery.trim() || 
        t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchPhase && matchQuery;
    });
  }, [parsedDoc.tasksDoc, selectedPhase, searchQuery]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Top Header Card */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-cyan-600 via-indigo-600 to-emerald-500 flex items-center justify-center text-white shadow-md shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Workspace Reader &amp; Parser Dokumen ZLCE
                </h2>
                {/* Badge Tipe Dokumen */}
                <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-mono font-bold border ${
                  parsedDoc.docType === 'SESSION_STATE'
                    ? 'bg-emerald-950/70 text-emerald-300 border-emerald-600/60'
                    : parsedDoc.docType === 'TASKS'
                    ? 'bg-cyan-950/70 text-cyan-300 border-cyan-600/60'
                    : parsedDoc.docType === 'BLUEPRINT'
                    ? 'bg-purple-950/70 text-purple-300 border-purple-600/60'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {parsedDoc.docType === 'SESSION_STATE' && '🟢 SESSION_STATE.md'}
                  {parsedDoc.docType === 'TASKS' && '🔵 TASKS.md'}
                  {parsedDoc.docType === 'BLUEPRINT' && '🟣 BLUEPRINT.md'}
                  {parsedDoc.docType === 'UNKNOWN' && '⚪ Teks Bebas / Unknown'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Parser otomatis dokumen kontrol kanonik untuk tablet Android (Invarian I1–I4)
              </p>
            </div>
          </div>

          {/* Preset Buttons & View Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => loadPreset('SESSION_STATE')}
                className="touch-target-44 px-2.5 py-1 rounded text-xs font-semibold text-slate-300 hover:text-emerald-400 hover:bg-slate-800/80 transition"
              >
                SESSION_STATE
              </button>
              <button
                onClick={() => loadPreset('TASKS')}
                className="touch-target-44 px-2.5 py-1 rounded text-xs font-semibold text-slate-300 hover:text-cyan-400 hover:bg-slate-800/80 transition"
              >
                TASKS
              </button>
              <button
                onClick={() => loadPreset('BLUEPRINT')}
                className="touch-target-44 px-2.5 py-1 rounded text-xs font-semibold text-slate-300 hover:text-purple-400 hover:bg-slate-800/80 transition"
              >
                BLUEPRINT
              </button>
            {/* Muat Template Standar (Kasus 4) */}
            <div className="flex items-center gap-1.5 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800">
              <BookOpen className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <select
                aria-label="Muat Template Kanonik ZLCE"
                onChange={(e) => {
                  const tmpl = ZLCE_TEMPLATES.find(t => t.id === e.target.value);
                  if (tmpl) {
                    setInputText(tmpl.content);
                    onSelectDocument?.(tmpl.content);
                  }
                  e.target.value = '';
                }}
                defaultValue=""
                className="bg-transparent text-xs font-semibold text-slate-300 focus:outline-none focus:text-white cursor-pointer min-h-[36px]"
              >
                <option value="" disabled className="bg-slate-900 text-slate-400">
                  📑 Muat Template Standar (10)...
                </option>
                {ZLCE_TEMPLATES.map(t => (
                  <option key={t.id} value={t.id} className="bg-slate-900 text-slate-200">
                    {t.filename} ({t.category})
                  </option>
                ))}
              </select>
            </div>
          </div>

            <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setActiveView('structured')}
                className={`touch-target-44 px-3 py-1 rounded text-xs font-semibold transition ${
                  activeView === 'structured'
                    ? 'bg-cyan-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Struktur
              </button>
              <button
                onClick={() => setActiveView('editor')}
                className={`touch-target-44 px-3 py-1 rounded text-xs font-semibold flex items-center gap-1 transition ${
                  activeView === 'editor'
                    ? 'bg-cyan-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Edit3 className="w-3 h-3" />
                <span>Editor &amp; Impor</span>
              </button>
              <button
                onClick={() => setActiveView('raw')}
                className={`touch-target-44 px-3 py-1 rounded text-xs font-semibold transition ${
                  activeView === 'raw'
                    ? 'bg-cyan-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Raw MD
              </button>
              <button
                onClick={() => setActiveView('json')}
                className={`touch-target-44 px-3 py-1 rounded text-xs font-semibold transition ${
                  activeView === 'json'
                    ? 'bg-cyan-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                JSON
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* TAMPILAN 1: TERSTRUKTUR (STRUCTURED VIEW) */}
      {activeView === 'structured' && (
        <div className="space-y-4">
          {/* A. DOKUMEN SESSION_STATE.md */}
          {parsedDoc.docType === 'SESSION_STATE' && parsedDoc.sessionState && (
            <div className="space-y-4 animate-in fade-in">
              {/* Parameter Konteks & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Proyek Aktif</span>
                  <p className="text-sm font-bold text-white truncate">{parsedDoc.sessionState.context.projectName}</p>
                  <span className="text-[10px] font-mono text-cyan-400">Mode: {parsedDoc.sessionState.context.mode}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Cabang Git</span>
                  <p className="text-sm font-bold text-indigo-300 font-mono truncate">{parsedDoc.sessionState.status.gitBranch}</p>
                  <span className="text-[10px] text-slate-500">Audit: {parsedDoc.sessionState.status.timestampAudit}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Task Aktif</span>
                  <p className="text-sm font-bold text-cyan-400 font-mono truncate">{parsedDoc.sessionState.status.activeTask}</p>
                  <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-cyan-950 text-cyan-300 border border-cyan-700/50">
                    {parsedDoc.sessionState.status.activeTaskStatus}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Task Berikutnya</span>
                  <p className="text-sm font-bold text-slate-200 font-mono truncate">{parsedDoc.sessionState.status.nextTask}</p>
                  <span className="text-[10px] text-emerald-400">Last Done: {parsedDoc.sessionState.status.lastDoneTask}</span>
                </div>
              </div>

              {/* Matriks Task Table */}
              <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shadow">
                <div className="p-3.5 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Matriks Task Terstruktur ({parsedDoc.sessionState.tasks.length} Task)
                    </h3>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold">
                        <th className="p-3">ID Task</th>
                        <th className="p-3">Nama Task</th>
                        <th className="p-3">Dependensi</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Bukti Verifikasi</th>
                        <th className="p-3">Disetujui</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {parsedDoc.sessionState.tasks.map((task) => (
                        <tr key={task.id} className="hover:bg-slate-800/40 transition">
                          <td className="p-3 font-bold text-cyan-300">{task.id}</td>
                          <td className="p-3 font-sans font-medium text-slate-200">{task.name}</td>
                          <td className="p-3 text-slate-400">{task.dependencies}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              task.status === 'DONE'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-600/50'
                                : task.status === 'IN_PROGRESS'
                                ? 'bg-cyan-950 text-cyan-300 border border-cyan-600/50 animate-pulse'
                                : task.status === 'READY'
                                ? 'bg-blue-950 text-blue-300 border border-blue-600/50'
                                : 'bg-slate-800 text-slate-400'
                            }`}>
                              {task.status}
                            </span>
                          </td>
                          <td className="p-3 font-sans text-slate-400 truncate max-w-xs">{task.evidence}</td>
                          <td className="p-3 text-indigo-300">{task.approved}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* WAL (Work In Progress) Card */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase">
                  <Terminal className="w-4 h-4" />
                  <span>Write-Ahead Log (WAL) Saat Ini</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-slate-400">Task:</span> <strong className="text-white font-mono">{parsedDoc.sessionState.wal.task}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Langkah Sedang Dikerjakan:</span> <strong className="text-slate-200">{parsedDoc.sessionState.wal.currentStep}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Langkah Berikutnya:</span> <strong className="text-cyan-300">{parsedDoc.sessionState.wal.nextStepExact}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Perintah Verifikasi:</span> <code className="text-amber-300 font-mono">{parsedDoc.sessionState.wal.verificationCommand}</code>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* B. DOKUMEN TASKS.md */}
          {parsedDoc.docType === 'TASKS' && parsedDoc.tasksDoc && (
            <div className="space-y-4 animate-in fade-in">
              {/* Header Peta Fase */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    <span>Peta Fase &amp; Filter Task</span>
                  </h3>
                  <span className="text-xs text-slate-400">
                    Total: <strong className="text-cyan-300">{parsedDoc.tasksDoc.tasks.length} Task</strong>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => setSelectedPhase('all')}
                    className={`touch-target-44 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                      selectedPhase === 'all'
                        ? 'bg-cyan-600 text-white shadow'
                        : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    Semua Fase
                  </button>
                  {parsedDoc.tasksDoc.phases.map((ph, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedPhase(ph.name.split(':')[0] || ph.name)}
                      className={`touch-target-44 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                        selectedPhase.toLowerCase().includes(ph.name.split(':')[0].toLowerCase())
                          ? 'bg-cyan-600 text-white shadow'
                          : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {ph.name.split(':')[0]}
                    </button>
                  ))}
                </div>

                {/* Search Bar */}
                <div className="relative pt-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-4" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari task berdasarkan ID, judul, atau deskripsi..."
                    className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Daftar Task Atomik Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredTasks.map((task) => (
                  <div key={task.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5 hover:border-slate-700 transition">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-cyan-400 font-mono px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-800/50">
                        {task.id}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold px-2 py-0.5 rounded bg-slate-800">
                        {task.phase}
                      </span>
                    </div>

                    <h4 className="text-xs sm:text-sm font-bold text-slate-100">{task.title}</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">{task.description}</p>

                    {/* Target Berkas */}
                    {task.files.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 pt-1 text-[11px] font-mono">
                        <span className="text-slate-500">Berkas:</span>
                        {task.files.map((f, i) => (
                          <span key={i} className="px-1.5 py-0.2 rounded bg-slate-950 border border-slate-800 text-slate-300">
                            {f}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Acceptance Criteria */}
                    {task.acceptanceCriteria.length > 0 && (
                      <div className="pt-1.5 border-t border-slate-800/80 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Kriteria Selesai (AC):
                        </span>
                        <ul className="space-y-1 text-xs text-slate-300">
                          {task.acceptanceCriteria.map((ac, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                              <span>{ac}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Verifikasi */}
                    {task.verificationMethod && task.verificationMethod !== '-' && (
                      <div className="pt-1 text-[11px] text-slate-400">
                        <span className="text-slate-500">Verifikasi:</span> {task.verificationMethod}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* C. DOKUMEN BLUEPRINT.md */}
          {parsedDoc.docType === 'BLUEPRINT' && parsedDoc.blueprintDoc && (
            <div className="space-y-4 animate-in fade-in">
              {/* Parameter Sistem */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-purple-400" />
                  <span>Parameter Arsitektur &amp; Lingkungan Produksi</span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Runtime:</span>
                    <strong className="text-white font-mono">{parsedDoc.blueprintDoc.runtime}</strong>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Web Server / PWA:</span>
                    <strong className="text-white font-mono">{parsedDoc.blueprintDoc.webServer}</strong>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Database / Storage:</span>
                    <strong className="text-white font-mono">{parsedDoc.blueprintDoc.database}</strong>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Framework:</span>
                    <strong className="text-white font-mono">{parsedDoc.blueprintDoc.framework}</strong>
                  </div>
                </div>
              </div>

              {/* Matriks Modul */}
              <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shadow">
                <div className="p-3.5 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-purple-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Matriks Modul Sistem ({parsedDoc.blueprintDoc.modules.length} Modul)
                    </h3>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold">
                        <th className="p-3">ID Modul</th>
                        <th className="p-3">Nama Modul</th>
                        <th className="p-3">Fungsi Utama</th>
                        <th className="p-3">Dependensi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {parsedDoc.blueprintDoc.modules.map((mod) => (
                        <tr key={mod.id} className="hover:bg-slate-800/40 transition">
                          <td className="p-3 font-bold text-purple-300">{mod.id}</td>
                          <td className="p-3 font-sans font-medium text-slate-200">{mod.name}</td>
                          <td className="p-3 font-sans text-slate-400">{mod.function}</td>
                          <td className="p-3 text-indigo-300">{mod.dependencies}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Aturan Bisnis (BR-xx) */}
              {parsedDoc.blueprintDoc.businessRules.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    Batasan &amp; Aturan Bisnis (Business Rules)
                  </h4>
                  <div className="space-y-1.5 pt-1">
                    {parsedDoc.blueprintDoc.businessRules.map((br) => (
                      <div key={br.id} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs flex items-start gap-2">
                        <span className="font-mono font-bold text-cyan-400 px-1.5 py-0.2 rounded bg-slate-900 shrink-0">
                          {br.id}
                        </span>
                        <span className="text-slate-300">{br.rule}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* D. DOKUMEN TIDAK DIKENAL / TEKS UMUM */}
          {parsedDoc.docType === 'UNKNOWN' && (
            <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-3">
              <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
              <h3 className="text-sm font-bold text-white">Format Dokumen Belum Teridentifikasi</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Tempelkan teks dokumen kontrol ZLCE kanonik (<code className="text-cyan-400">SESSION_STATE.md</code>, <code className="text-cyan-400">TASKS.md</code>, atau <code className="text-cyan-400">BLUEPRINT.md</code>) atau gunakan tombol preset di atas.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAMPILAN EDITOR & IMPOR BERKAS (TASK-009) */}
      {activeView === 'editor' && (
        <div className="space-y-4 animate-in fade-in">
          <WorkspaceEditor
            initialContent={inputText}
            onContentChange={(newText) => {
              setInputText(newText);
            }}
            onApplyToActiveSession={(appliedText) => {
              setInputText(appliedText);
              onSelectDocument?.(appliedText);
            }}
          />
        </div>
      )}

      {/* TAMPILAN 2: RAW MARKDOWN EDITOR / VIEWER */}
      {activeView === 'raw' && (
        <div className="space-y-2 animate-in fade-in">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Editor Teks Markdown Mentah:</span>
            <button
              onClick={() => handleCopy(inputText)}
              className="touch-target-44 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 transition"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isCopied ? 'Tersalin' : 'Salin Markdown'}</span>
            </button>
          </div>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={16}
            placeholder="Ketik atau tempelkan teks Markdown kontrol ZLCE di sini..."
            className="w-full p-4 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-slate-200 focus:outline-none focus:border-cyan-500 leading-relaxed resize-y"
          />
          <WorkspaceExportBar
            content={inputText}
            defaultFilename={parsedDoc.docType === 'SESSION_STATE' ? 'SESSION_STATE.md' : parsedDoc.docType === 'TASKS' ? 'TASKS.md' : parsedDoc.docType === 'BLUEPRINT' ? 'BLUEPRINT.md' : 'DOKUMEN_ZLCE.md'}
          />
        </div>
      )}

      {/* TAMPILAN 3: JSON AST INSPECTION */}
      {activeView === 'json' && (
        <div className="space-y-2 animate-in fade-in">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Struktur Objek Terurai (JSON):</span>
            <button
              onClick={() => handleCopy(JSON.stringify(parsedDoc, null, 2))}
              className="touch-target-44 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 transition"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isCopied ? 'Tersalin' : 'Salin JSON'}</span>
            </button>
          </div>
          <pre className="p-4 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-emerald-300 overflow-x-auto max-h-[500px]">
            {JSON.stringify(parsedDoc, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};
