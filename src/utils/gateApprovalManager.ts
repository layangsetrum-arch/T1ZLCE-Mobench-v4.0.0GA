/**
 * ZLCE Gate Approval Manager
 * Mengimplementasikan ADR-07: Hak Persetujuan Gerbang Kualitas bagi Seluruh 8 Anggota
 * dengan Kewajiban Provenance Penyetuju (Invarian I4).
 * 
 * Format matriks: `Disetujui: ya (oleh: [Nama])`
 * Format log audit: `* **[WIB]:** Gerbang Kualitas [Task ID] disetujui oleh [Nama] (Bukti: [Bukti])`
 */

import { ParsedSessionState, TaskStatus } from '../types/zlce';
import { TeamMember } from '../types/mobile';
import { serializeSessionStateToMarkdown } from './markdownParser';
import { saveActiveTaskClaim, getNowTimestamps } from './taskClaimManager';

export interface ApprovalValidationResult {
  valid: boolean;
  isProvenanceFormat: boolean;
  approverName?: string;
  error?: string;
}

/**
 * Validasi keabsahan format kolom Disetujui
 * Sah:
 * - 'ya' atau 'yes' (format klasik kanonik)
 * - 'ya (oleh: Nama)' atau 'yes (by: Name)' (format tim estafet ADR-07)
 */
export function validateApprovalProvenance(rawApproval: string): ApprovalValidationResult {
  if (!rawApproval || rawApproval === '-' || rawApproval.trim() === '') {
    return {
      valid: false,
      isProvenanceFormat: false,
      error: 'Persetujuan kosong atau belum diisi.'
    };
  }

  const cleaned = rawApproval.trim();
  const lower = cleaned.toLowerCase();

  // Format klasik
  if (lower === 'ya' || lower === 'yes') {
    return {
      valid: true,
      isProvenanceFormat: false
    };
  }

  // Format Tim Estafet dengan atribusi nama penyetuju: ya (oleh: Budi) / yes (by: Siti)
  const provenanceMatch = cleaned.match(/^(?:ya\s*\(oleh:\s*([^)]+)\)|yes\s*\(by:\s*([^)]+)\))$/i);
  if (provenanceMatch) {
    const approverName = (provenanceMatch[1] || provenanceMatch[2] || '').trim();
    if (!approverName || approverName.length < 2) {
      return {
        valid: false,
        isProvenanceFormat: true,
        error: 'Nama penyetuju dalam tanda kurung tidak boleh kosong atau terlalu pendek.'
      };
    }

    // Larang placeholder nama
    if (/^(nama|user|admin|pengguna|someone|xxx)$/i.test(approverName) || approverName.includes('[')) {
      return {
        valid: false,
        isProvenanceFormat: true,
        error: `Nama penyetuju '${approverName}' terdeteksi sebagai placeholder. Wajib menggunakan nama anggota tim sah.`
      };
    }

    return {
      valid: true,
      isProvenanceFormat: true,
      approverName
    };
  }

  return {
    valid: false,
    isProvenanceFormat: false,
    error: `Format persetujuan '${cleaned}' tidak sah. Gunakan 'ya' atau 'ya (oleh: [Nama Anggota])'.`
  };
}

export interface RecordGateApprovalParams {
  taskId: string;
  approver: TeamMember;
  evidence: string;
  sessionState: ParsedSessionState;
}

export interface RecordGateApprovalResult {
  success: boolean;
  error?: string;
  updatedState?: ParsedSessionState;
  updatedMarkdown?: string;
  approvalString?: string;
  auditLogEntry?: string;
}

/**
 * Mencatatkan persetujuan Gerbang Kualitas ke dalam state sesi:
 * 1. Mengubah status task menjadi DONE
 * 2. Mengisi bukti verifikasi
 * 3. Menulis persetujuan dengan format `ya (oleh: [Nama Anggota])`
 * 4. Mengosongkan WAL (jika task yang selesai sama dengan task di WAL)
 * 5. Menambahkan entri kronologis ke Bagian 7 Log Audit
 * 6. Mengosongkan klaim aktif dari localStorage
 */
export function recordGateApproval({
  taskId,
  approver,
  evidence,
  sessionState
}: RecordGateApprovalParams): RecordGateApprovalResult {
  const targetTask = sessionState.tasks.find(t => t.id === taskId);
  if (!targetTask) {
    return { success: false, error: `Task ${taskId} tidak ditemukan di matriks task.` };
  }

  const cleanEvidence = evidence.trim() || 'Verifikasi otomatis suite uji lulus 100%';
  const approvalString = `ya (oleh: ${approver.name})`;
  const { wib } = getNowTimestamps();

  // 1. Update task di matriks
  const updatedTasks = sessionState.tasks.map(t => {
    if (t.id === taskId) {
      return {
        ...t,
        status: 'DONE' as TaskStatus,
        evidence: cleanEvidence,
        approved: approvalString
      };
    }
    return t;
  });

  // 2. Update status sesi
  const updatedStatus = {
    ...sessionState.status,
    lastDoneTask: taskId,
    activeTask: sessionState.status.activeTask === taskId ? '-' : sessionState.status.activeTask,
    activeTaskStatus: sessionState.status.activeTask === taskId ? 'READY' as TaskStatus : sessionState.status.activeTaskStatus,
    timestampAudit: wib
  };

  // 3. Clear WAL jika sesuai
  let updatedWal = { ...sessionState.wal };
  if (updatedWal.task === taskId) {
    updatedWal = {
      task: '-',
      currentStep: `Task ${taskId} selesai & disetujui oleh ${approver.name}`,
      plannedFiles: '-',
      completedSoFar: `${targetTask.name} disetujui (Bukti: ${cleanEvidence})`,
      nextStepExact: '-',
      verificationCommand: '-',
      updatedTimestamp: wib
    };
  }

  // Siapkan objek state baru
  const updatedState: ParsedSessionState = {
    ...sessionState,
    tasks: updatedTasks,
    status: updatedStatus,
    wal: updatedWal
  };

  // 4. Tambahkan entri log audit ke markdown
  let baseMarkdown = serializeSessionStateToMarkdown(updatedState);
  const auditEntry = `* **${wib}:** Gerbang Kualitas ${taskId} (${targetTask.name}) disetujui oleh ${approver.name} (@${approver.id}). Bukti: ${cleanEvidence}.`;

  let updatedMarkdown = baseMarkdown;
  const auditHeaderMatch = baseMarkdown.match(/##\s+7\.\s+LOG\s+AUDIT[^\n]*\n/i);
  if (auditHeaderMatch && auditHeaderMatch.index !== undefined) {
    const insertIdx = auditHeaderMatch.index + auditHeaderMatch[0].length;
    updatedMarkdown = 
      baseMarkdown.slice(0, insertIdx) + 
      auditEntry + '\n' + 
      baseMarkdown.slice(insertIdx);
  } else {
    updatedMarkdown = baseMarkdown + '\n\n## 7. LOG AUDIT\n' + auditEntry + '\n';
  }

  updatedState.raw = updatedMarkdown;

  // 5. Hapus klaim aktif
  saveActiveTaskClaim(null);

  return {
    success: true,
    updatedState,
    updatedMarkdown,
    approvalString,
    auditLogEntry: auditEntry
  };
}
