import { 
  ParsedSessionState, 
  ZLCETask, 
  AssumptionOrQuestion, 
  RevisionSlot, 
  TaskStatus,
  ZLCEControlDocType,
  ParsedTasksDoc,
  ParsedBacklogTask,
  ParsedBlueprintDoc,
  ParsedBlueprintModule,
  ParsedControlDocument
} from '../types/zlce';

/**
 * Deteksi jenis dokumen kontrol ZLCE berdasarkan header dan struktur konten.
 * Mendukung SESSION_STATE.md, TASKS.md, dan BLUEPRINT.md.
 */
export function detectDocumentType(content: string): ZLCEControlDocType {
  if (!content || typeof content !== 'string') return 'UNKNOWN';

  const clean = content.trim();

  // 1. Cek SESSION_STATE.md
  if (
    clean.includes('STATUS SESI') ||
    clean.includes('SESSION_STATE.md') ||
    (clean.includes('## 0. KONTEKS PROYEK') && clean.includes('## 2. MATRIKS TASK')) ||
    (clean.includes('## 3. WORK IN PROGRESS (WAL)') && clean.includes('MATRIKS TASK'))
  ) {
    return 'SESSION_STATE';
  }

  // 2. Cek TASKS.md
  if (
    clean.includes('BACKLOG TASK') ||
    clean.includes('TASKS.md') ||
    (clean.includes('PETA FASE') && clean.includes('### TASK-')) ||
    (clean.includes('Acceptance Criteria:') && clean.includes('Metode Verifikasi:'))
  ) {
    return 'TASKS';
  }

  // 3. Cek BLUEPRINT.md
  if (
    clean.includes('BLUEPRINT') ||
    clean.includes('SPESIFIKASI TEKNIS') ||
    clean.includes('PARAMETER SISTEM & LINGKUNGAN') ||
    clean.includes('MATRIKS MODUL') ||
    clean.includes('BATASAN DOMAIN BISNIS')
  ) {
    return 'BLUEPRINT';
  }

  return 'UNKNOWN';
}

/**
 * Parser untuk SESSION_STATE.md
 * Sangat tangguh terhadap format Markdown tidak terduga; tidak pernah memicu crash.
 */
export function parseSessionStateMarkdown(content: string): ParsedSessionState {
  if (!content || typeof content !== 'string') {
    content = '';
  }

  const lines = content.split(/\r?\n/);

  // Extract project name from title header if available: `# STATUS SESI (SESSION_STATE.md): Name`
  let headerProjectName = '';
  const firstHeaderMatch = content.match(/^#\s+STATUS SESI\s*(?:\(SESSION_STATE\.md\))?:\s*(.+)$/m);
  if (firstHeaderMatch && firstHeaderMatch[1]) {
    headerProjectName = firstHeaderMatch[1].trim();
  }

  const context = {
    projectName: headerProjectName || '-',
    stack: '-',
    mode: 'LITE' as 'FULL' | 'LITE',
    fileWriteCapability: '-',
    execCapability: '-',
  };

  const status = {
    timestampAudit: '-',
    gitBranch: '-',
    lastDoneTask: '-',
    activeTask: '-',
    activeTaskStatus: 'PENDING' as TaskStatus,
    nextTask: '-',
  };

  const wal = {
    task: '-',
    currentStep: '-',
    plannedFiles: '-',
    completedSoFar: '-',
    nextStepExact: '-',
    verificationCommand: '-',
    updatedTimestamp: '-',
  };

  const tasks: ZLCETask[] = [];
  const assumptions: AssumptionOrQuestion[] = [];
  const revisions: RevisionSlot[] = [];
  const auditLog: string[] = [];
  let handoverNotes = '';

  let currentSection = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] || '';

    if (line.includes('## 0. KONTEKS PROYEK')) { currentSection = 0; continue; }
    if (line.includes('## 1. STATUS AKTIF')) { currentSection = 1; continue; }
    if (line.includes('## 2. MATRIKS TASK')) { currentSection = 2; continue; }
    if (line.includes('## 3. WORK IN PROGRESS (WAL)')) { currentSection = 3; continue; }
    if (line.includes('## 4. ASSUMPTIONS & OPEN QUESTIONS')) { currentSection = 4; continue; }
    if (line.includes('## 5. SLOT REVISI AKTIF')) { currentSection = 5; continue; }
    if (line.includes('## 6. CATATAN SERAH TERIMA')) { currentSection = 6; continue; }
    if (line.includes('## 7. LOG AUDIT')) { currentSection = 7; continue; }

    // Section 0 parsing
    if (currentSection === 0) {
      if (line.includes('* **Proyek:**')) context.projectName = line.split('* **Proyek:**')[1]?.trim() || context.projectName;
      if (line.includes('* **Stack:**')) context.stack = line.split('* **Stack:**')[1]?.trim() || context.stack;
      if (line.includes('* **MODE:**')) context.mode = line.includes('FULL') ? 'FULL' : 'LITE';
      if (line.includes('* **Kemampuan Tulis Berkas AI:**')) context.fileWriteCapability = line.split('* **Kemampuan Tulis Berkas AI:**')[1]?.trim() || context.fileWriteCapability;
      if (line.includes('* **Kemampuan Eksekusi AI:**')) context.execCapability = line.split('* **Kemampuan Eksekusi AI:**')[1]?.trim() || context.execCapability;
    }

    // Section 1 parsing
    if (currentSection === 1) {
      if (line.includes('* **Timestamp Audit:**')) status.timestampAudit = line.split('* **Timestamp Audit:**')[1]?.trim() || status.timestampAudit;
      if (line.includes('* **Cabang Git:**')) status.gitBranch = line.split('* **Cabang Git:**')[1]?.replace(/[`*]/g, '').trim() || status.gitBranch;
      if (line.includes('* **Task Terakhir DONE:**')) status.lastDoneTask = line.split('* **Task Terakhir DONE:**')[1]?.replace(/[`*]/g, '').trim() || status.lastDoneTask;
      if (line.includes('* **Task Aktif:**')) status.activeTask = line.split('* **Task Aktif:**')[1]?.replace(/[`*]/g, '').trim() || status.activeTask;
      if (line.includes('* **Status Task Aktif:**')) {
        const parsedStatus = line.split('* **Status Task Aktif:**')[1]?.replace(/[`*]/g, '').trim() as TaskStatus;
        if (parsedStatus) status.activeTaskStatus = parsedStatus;
      }
      if (line.includes('* **Task Berikutnya:**')) status.nextTask = line.split('* **Task Berikutnya:**')[1]?.replace(/[`*]/g, '').trim() || status.nextTask;
    }

    // Section 2 parsing (Tasks)
    if (currentSection === 2) {
      const trimmed = line.trim();
      const isSep = /^\|\s*:?-{3,}/.test(trimmed);
      if (trimmed.startsWith('|') && !isSep) {
        const parts = line.split('|').map(p => p.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        if (parts.length >= 4) {
          const rawId = parts[0].replace(/[`*]/g, '').trim();
          if (/^ID\s*Task$/i.test(rawId) || rawId === 'ID' || rawId === '-' || rawId === '---') {
            continue;
          }
          const tidMatch = rawId.match(/TASK-(?:REV-)?\d+/);
          const id = tidMatch ? tidMatch[0] : rawId;
          const name = parts[1]?.trim() || '-';
          const dependencies = parts[2]?.trim() || '-';
          const taskStatus = (parts[3]?.replace(/[`*]/g, '').trim() || 'PENDING') as TaskStatus;
          const evidence = parts[4] ? parts[4].trim() : '-';
          const approved = parts[5] ? parts[5].trim() : '-';

          if (id && id !== '---') {
            tasks.push({ id, name, dependencies, status: taskStatus, evidence, approved });
          }
        }
      }
    }

    // Section 3 parsing (WAL)
    if (currentSection === 3) {
      if (line.includes('* **Task:**')) wal.task = line.split('* **Task:**')[1]?.trim() || wal.task;
      if (line.includes('* **Langkah Sedang Dikerjakan:**')) wal.currentStep = line.split('* **Langkah Sedang Dikerjakan:**')[1]?.trim() || wal.currentStep;
      if (line.includes('* **Berkas Direncanakan/Disentuh:**')) wal.plannedFiles = line.split('* **Berkas Direncanakan/Disentuh:**')[1]?.trim() || wal.plannedFiles;
      if (line.includes('* **Sudah Dilakukan:**')) wal.completedSoFar = line.split('* **Sudah Dilakukan:**')[1]?.trim() || wal.completedSoFar;
      if (line.includes('* **Langkah Berikutnya (persis):**')) wal.nextStepExact = line.split('* **Langkah Berikutnya (persis):**')[1]?.trim() || wal.nextStepExact;
      if (line.includes('* **Perintah Verifikasi:**')) wal.verificationCommand = line.split('* **Perintah Verifikasi:**')[1]?.trim() || wal.verificationCommand;
      if (line.includes('* **Diperbarui:**')) wal.updatedTimestamp = line.split('* **Diperbarui:**')[1]?.trim() || wal.updatedTimestamp;
    }

    // Section 4 parsing (Assumptions)
    if (currentSection === 4) {
      const trimmed = line.trim();
      const isSep = /^\|\s*:?-{3,}/.test(trimmed);
      if (trimmed.startsWith('|') && !isSep) {
        const parts = line.split('|').map(p => p.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        if (parts.length >= 5) {
          const rawId = parts[0].replace(/[`*]/g, '').trim();
          if (/^ID$/i.test(rawId) || rawId === '-' || rawId === '(kosong)') {
            continue;
          }
          assumptions.push({
            id: rawId,
            type: (parts[1] || 'Asumsi') as 'Asumsi' | 'Pertanyaan',
            content: parts[2]?.trim() || '-',
            impactIfWrong: parts[3]?.trim() || '-',
            status: (parts[4]?.replace(/[`*]/g, '').trim() || 'OPEN') as 'OPEN' | 'CONFIRMED' | 'REJECTED' | 'ANSWERED' | 'RESOLVED' | 'ACCEPTED'
          });
        }
      }
    }

    // Section 5 parsing (Revisions)
    if (currentSection === 5) {
      const trimmed = line.trim();
      const isSep = /^\|\s*:?-{3,}/.test(trimmed);
      if (trimmed.startsWith('|') && !isSep) {
        const parts = line.split('|').map(p => p.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        if (parts.length >= 4) {
          const rawId = parts[0].replace(/[`*]/g, '').trim();
          if (/^ID$/i.test(rawId) || rawId === '-' || rawId === '(kosong)') {
            continue;
          }
          revisions.push({
            id: rawId,
            level: (parts[1] || 'M') as 'S' | 'M' | 'L',
            description: parts[2]?.trim() || '-',
            action: parts[3]?.trim() || '-'
          });
        }
      }
    }

    // Section 6 parsing (Handover notes)
    if (currentSection === 6) {
      if (!line.startsWith('## ') && !line.startsWith('---')) {
        handoverNotes += (handoverNotes ? '\n' : '') + line;
      }
    }

    // Section 7 parsing (Audit log)
    if (currentSection === 7) {
      if (line.trim().startsWith('*')) {
        auditLog.push(line.trim());
      }
    }
  }

  return {
    raw: content,
    context,
    status,
    tasks,
    wal,
    assumptions,
    revisions,
    handoverNotes: handoverNotes.trim(),
    auditLog
  };
}

/**
 * Parser untuk TASKS.md
 * Mengekstrak peta fase, metadata proyek, dan seluruh task atomik beserta acceptance criteria.
 */
export function parseTasksMarkdown(content: string): ParsedTasksDoc {
  if (!content || typeof content !== 'string') {
    return { projectName: '-', raw: '', phases: [], tasks: [] };
  }

  let projectName = '-';
  const nameMatch = content.match(/^#\s+BACKLOG TASK PENGEMBANGAN:\s*(.+)$/m);
  if (nameMatch && nameMatch[1]) {
    projectName = nameMatch[1].trim();
  }

  const phases: { name: string; range: string }[] = [];
  const tasks: ParsedBacklogTask[] = [];

  const lines = content.split(/\r?\n/);

  // 1. Ekstrak Peta Fase
  for (const line of lines) {
    const phaseMatch = line.match(/\*\s+\*\*([^*]+)\*\*\s*(?:\(([^)]+)\))?/);
    if (phaseMatch && phaseMatch[1].toLowerCase().includes('fase')) {
      phases.push({
        name: phaseMatch[1].trim(),
        range: phaseMatch[2] ? phaseMatch[2].trim() : ''
      });
    }
  }

  // 2. Ekstrak Task Atomik (blok "### TASK-xxx: Title")
  const taskBlocks = content.split(/^###\s+(TASK-(?:REV-)?\d+):\s*(.+)$/m);

  if (taskBlocks.length > 1) {
    for (let i = 1; i < taskBlocks.length; i += 3) {
      const taskId = taskBlocks[i]?.trim();
      const taskTitle = taskBlocks[i + 1]?.trim();
      const taskBody = taskBlocks[i + 2] || '';

      if (!taskId) continue;

      let phase = '-';
      let description = '-';
      let dependencies = '-';
      let files: string[] = [];
      let docsRelated = '-';
      let docsImpact = '-';
      const acceptanceCriteria: string[] = [];
      let testCase = '-';
      let verificationMethod = '-';

      const bodyLines = taskBody.split(/\r?\n/);
      let inACSection = false;

      for (const bLine of bodyLines) {
        const trimmed = bLine.trim();

        if (trimmed.startsWith('* **Fase:**')) {
          phase = trimmed.replace('* **Fase:**', '').trim();
          inACSection = false;
        } else if (trimmed.startsWith('* **Deskripsi:**')) {
          description = trimmed.replace('* **Deskripsi:**', '').trim();
          inACSection = false;
        } else if (trimmed.startsWith('* **Dependensi:**')) {
          dependencies = trimmed.replace('* **Dependensi:**', '').trim();
          inACSection = false;
        } else if (trimmed.startsWith('* **File:**')) {
          const rawFiles = trimmed.replace('* **File:**', '').trim();
          files = rawFiles.split(',').map(f => f.replace(/[`*]/g, '').trim()).filter(Boolean);
          inACSection = false;
        } else if (trimmed.startsWith('* **Docs Terkait')) {
          docsRelated = trimmed.split(':')[1]?.trim() || '-';
          inACSection = false;
        } else if (trimmed.startsWith('* **Docs Impact:**')) {
          docsImpact = trimmed.replace('* **Docs Impact:**', '').trim();
          inACSection = false;
        } else if (trimmed.startsWith('* **Acceptance Criteria:**')) {
          inACSection = true;
        } else if (trimmed.startsWith('* **Test Case:**')) {
          testCase = trimmed.replace('* **Test Case:**', '').trim();
          inACSection = false;
        } else if (trimmed.startsWith('* **Metode Verifikasi:**')) {
          verificationMethod = trimmed.replace('* **Metode Verifikasi:**', '').trim();
          inACSection = false;
        } else if (inACSection) {
          const acMatch = trimmed.match(/^\d+\.\s*(.+)$/);
          if (acMatch) {
            acceptanceCriteria.push(acMatch[1].trim());
          }
        }
      }

      tasks.push({
        id: taskId,
        title: taskTitle || '-',
        phase,
        description,
        dependencies,
        files,
        docsRelated,
        docsImpact,
        acceptanceCriteria,
        testCase,
        verificationMethod
      });
    }
  }

  return {
    projectName,
    raw: content,
    phases,
    tasks
  };
}

/**
 * Parser untuk BLUEPRINT.md
 * Mengekstrak parameter sistem, matriks modul, batasan domain (BR-xx), dan out-of-scope.
 */
export function parseBlueprintMarkdown(content: string): ParsedBlueprintDoc {
  if (!content || typeof content !== 'string') {
    return {
      projectName: '-',
      raw: '',
      systemName: '-',
      domainProfile: '-',
      runtime: '-',
      webServer: '-',
      database: '-',
      framework: '-',
      modules: [],
      businessRules: [],
      outOfScope: [],
      externalIntegrations: []
    };
  }

  let projectName = '-';
  const headerMatch = content.match(/^#\s+(?:SPESIFIKASI TEKNIS & BLUEPRINT SISTEM|BLUEPRINT[^:]*):\s*(.+)$/m);
  if (headerMatch && headerMatch[1]) {
    projectName = headerMatch[1].trim();
  }

  let systemName = '-';
  let domainProfile = '-';
  let runtime = '-';
  let webServer = '-';
  let database = '-';
  let framework = '-';

  const modules: ParsedBlueprintModule[] = [];
  const businessRules: { id: string; rule: string }[] = [];
  const outOfScope: string[] = [];
  const externalIntegrations: string[] = [];

  const lines = content.split(/\r?\n/);
  let currentSection = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] || '';
    const trimmed = line.trim();

    if (trimmed.startsWith('## 1.')) { currentSection = 'params'; continue; }
    if (trimmed.startsWith('## 2.')) { currentSection = 'domain'; continue; }
    if (trimmed.startsWith('## 3.')) { currentSection = 'modules'; continue; }
    if (trimmed.startsWith('## 4.')) { currentSection = 'integrations'; continue; }

    if (currentSection === 'params') {
      if (trimmed.startsWith('* **Nama Sistem:**')) systemName = trimmed.replace('* **Nama Sistem:**', '').trim();
      if (trimmed.startsWith('* **Profil Domain:**')) domainProfile = trimmed.replace('* **Profil Domain:**', '').trim();
      if (trimmed.startsWith('- Runtime:')) runtime = trimmed.replace('- Runtime:', '').trim();
      if (trimmed.startsWith('- Web Server:')) webServer = trimmed.replace('- Web Server:', '').trim();
      if (trimmed.startsWith('- Database:')) database = trimmed.replace('- Database:', '').trim();
      if (trimmed.startsWith('- Framework')) framework = trimmed.split(':')[1]?.trim() || framework;
    }

    if (currentSection === 'domain') {
      const brMatch = trimmed.match(/`?(BR-\d+)`?:\s*(.+)$/);
      if (brMatch) {
        businessRules.push({ id: brMatch[1], rule: brMatch[2].trim() });
      }
      if (trimmed.startsWith('- ') && !trimmed.includes('BR-')) {
        outOfScope.push(trimmed.replace(/^-\s*/, '').trim());
      }
    }

    if (currentSection === 'modules') {
      const isSep = /^\|\s*:?-{3,}/.test(trimmed);
      if (trimmed.startsWith('|') && !isSep) {
        const parts = trimmed.split('|').map(p => p.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        if (parts.length >= 4) {
          const rawId = parts[0].replace(/[`*]/g, '').trim();
          if (/^ID\s*Modul$/i.test(rawId) || rawId === 'ID' || rawId === '---') continue;
          modules.push({
            id: rawId,
            name: parts[1]?.trim() || '-',
            function: parts[2]?.trim() || '-',
            dependencies: parts[3]?.trim() || '-'
          });
        }
      }
    }

    if (currentSection === 'integrations') {
      if (trimmed.startsWith('*')) {
        externalIntegrations.push(trimmed.replace(/^\*\s*/, '').trim());
      }
    }
  }

  return {
    projectName,
    raw: content,
    systemName,
    domainProfile,
    runtime,
    webServer,
    database,
    framework,
    modules,
    businessRules,
    outOfScope,
    externalIntegrations
  };
}

/**
 * Parser Kontrol Terpadu ZLCE
 * Otomatis mendeteksi tipe berkas lalu memparsing isi ke objek yang sesuai.
 */
export function parseControlDocument(content: string): ParsedControlDocument {
  const docType = detectDocumentType(content);

  let projectName = '-';
  let sessionState: ParsedSessionState | null = null;
  let tasksDoc: ParsedTasksDoc | null = null;
  let blueprintDoc: ParsedBlueprintDoc | null = null;

  try {
    if (docType === 'SESSION_STATE') {
      sessionState = parseSessionStateMarkdown(content);
      projectName = sessionState.context.projectName;
    } else if (docType === 'TASKS') {
      tasksDoc = parseTasksMarkdown(content);
      projectName = tasksDoc.projectName;
    } else if (docType === 'BLUEPRINT') {
      blueprintDoc = parseBlueprintMarkdown(content);
      projectName = blueprintDoc.projectName;
    }
  } catch (err) {
    console.warn('[ZLCE Parser] Parsing warning:', err);
  }

  return {
    docType,
    projectName,
    sessionState,
    tasksDoc,
    blueprintDoc,
    raw: content
  };
}

export function serializeSessionStateToMarkdown(data: ParsedSessionState): string {
  const { context, status, tasks, wal, assumptions, revisions, handoverNotes, auditLog } = data;

  const taskRows = tasks.map(t => 
    `| \`${t.id}\` | ${t.name} | ${t.dependencies || '-'} | ${t.status} | ${t.evidence || '-'} | ${t.approved || '-'} |`
  ).join('\n');

  const assumptionRows = assumptions.length > 0
    ? assumptions.map(a => `| \`${a.id}\` | ${a.type} | ${a.content} | ${a.impactIfWrong} | ${a.status} |`).join('\n')
    : '| - | - | Tidak ada asumsi terbuka | - | - |';

  const revisionRows = revisions.length > 0
    ? revisions.map(r => `| \`${r.id}\` | ${r.level} | ${r.description} | ${r.action} |`).join('\n')
    : '| - | - | Kosong | - |';

  const auditLogRows = auditLog.length > 0
    ? auditLog.join('\n')
    : `* **[${status.timestampAudit || '2026-10-14 jam: ?'}]** Sesi sinkronisasi dan verifikasi audit state.`;

  return `# STATUS SESI (SESSION_STATE.md): ${context.projectName}

**Sumber kebenaran tunggal status task dan titik pemulihan sesi.** Perbarui pada setiap perubahan status task, setiap commit, dan setiap langkah WAL. Enum: \`PENDING | READY | IN_PROGRESS | BLOCKED | DONE\`.
Format dibaca skrip \`scripts/zlce-check.py\`; jangan ubah nama field, kolom, atau nomor bagian.

---

## 0. KONTEKS PROYEK (statis)

* **Proyek:** ${context.projectName}
* **Stack:** ${context.stack}
* **MODE:** ${context.mode}
* **Kemampuan Tulis Berkas AI:** ${context.fileWriteCapability}
* **Kemampuan Eksekusi AI:** ${context.execCapability}

---

## 1. STATUS AKTIF

* **Timestamp Audit:** ${status.timestampAudit}
* **Cabang Git:** \`${status.gitBranch}\`
* **Task Terakhir DONE:** \`${status.lastDoneTask || '-'}\`
* **Task Aktif:** \`${status.activeTask || '-'}\`
* **Status Task Aktif:** ${status.activeTaskStatus || 'PENDING'}
* **Task Berikutnya:** \`${status.nextTask || '-'}\`

---

## 2. MATRIKS TASK

| ID Task | Nama | Dependensi | Status | Bukti Verifikasi | Disetujui |
| :--- | :--- | :--- | :--- | :--- | :--- |
${taskRows}

---

## 3. WORK IN PROGRESS (WAL)

* **Task:** ${wal.task}
* **Langkah Sedang Dikerjakan:** ${wal.currentStep}
* **Berkas Direncanakan/Disentuh:** ${wal.plannedFiles}
* **Sudah Dilakukan:** ${wal.completedSoFar}
* **Langkah Berikutnya (persis):** ${wal.nextStepExact}
* **Perintah Verifikasi:** ${wal.verificationCommand}
* **Diperbarui:** ${wal.updatedTimestamp}

---

## 4. ASSUMPTIONS & OPEN QUESTIONS

| ID | Jenis | Isi | Dampak jika salah | Status |
| :--- | :--- | :--- | :--- | :--- |
${assumptionRows}

---

## 5. SLOT REVISI AKTIF

| ID | Level (S/M/L) | Deskripsi | Tindakan |
| :--- | :--- | :--- | :--- |
${revisionRows}

---

## 6. CATATAN SERAH TERIMA

${handoverNotes || '- Sesi berjalan normal, tidak ada catatan blocking.'}

---

## 7. LOG AUDIT

${auditLogRows}
`;
}
