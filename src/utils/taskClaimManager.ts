/**
 * ZLCE Task Claim Manager
 * Menegakkan aturan kolaborasi tablet bersama (Samsung Galaxy Tab A7 Lite):
 * - Hanya 1 task yang boleh berstatus IN_PROGRESS pada satu waktu (Invarian I1 & I3)
 * - Mencatat identitas anggota pemegang klaim, waktu mulai klaim, dan atribusi WAL
 * - Menyediakan fungsi klaim, rilis, dan penyelesaian klaim secara aman
 * - Atomic Task Claim Guard dengan Monotonic Revision Sequence & Compare-and-Swap (AUD2-006)
 * 
 * Rujukan: docs/mobile/blueprint/14_MULTI_AI_TEAM_MODEL.md, AUD2-006
 */

import { ParsedSessionState, TaskStatus, ZLCETask } from '../types/zlce';
import { TeamMember } from '../types/mobile';
import { serializeSessionStateToMarkdown } from './markdownParser';

export interface TaskClaimRecord {
  taskId: string;
  taskName: string;
  memberId: string;
  memberName: string;
  memberAvatar: string;
  claimedAtISO: string;
  claimedAtWIB: string;
  status: 'ACTIVE' | 'RELEASED' | 'COMPLETED';
  revision: number;
}

export const TASK_CLAIM_STORAGE_KEY = 'zlce_active_task_claim';
export const TASK_CLAIM_REVISION_KEY = 'zlce_task_claim_revision';

/**
 * Mendapatkan cap waktu sekarang dalam format ISO dan WIB
 */
export function getNowTimestamps(): { iso: string; wib: string } {
  const now = new Date();
  const iso = now.toISOString();
  
  // Format WIB (UTC+7)
  const formatter = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(now);
  const partMap: Record<string, string> = {};
  parts.forEach(p => { partMap[p.type] = p.value; });
  
  const wib = `${partMap.year}-${partMap.month}-${partMap.day} ${partMap.hour}:${partMap.minute}:${partMap.second} WIB`;
  return { iso, wib };
}

/**
 * Membaca nomor revisi klaim terkini (monotonic integer)
 */
export function getActiveClaimRevision(): number {
  if (typeof window === 'undefined') return 1;
  try {
    const rawRev = localStorage.getItem(TASK_CLAIM_REVISION_KEY);
    if (rawRev) {
      const parsed = parseInt(rawRev, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  } catch {
    // fallback
  }
  return 1;
}

/**
 * Menambah urutan nomor revisi klaim secara atomik/monotonik
 */
export function incrementClaimRevision(): number {
  const nextRev = getActiveClaimRevision() + 1;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(TASK_CLAIM_REVISION_KEY, nextRev.toString());
    } catch {
      // fallback
    }
  }
  return nextRev;
}

/**
 * Membaca data klaim aktif dari localStorage
 */
export function getActiveTaskClaim(): TaskClaimRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(TASK_CLAIM_STORAGE_KEY);
    if (!raw) return null;
    const claim = JSON.parse(raw) as TaskClaimRecord;
    if (claim && claim.status === 'ACTIVE' && claim.taskId) {
      if (typeof claim.revision !== 'number') {
        claim.revision = getActiveClaimRevision();
      }
      return claim;
    }
  } catch {
    // fallback
  }
  return null;
}

/**
 * Menyimpan data klaim ke localStorage
 */
export function saveActiveTaskClaim(claim: TaskClaimRecord | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (claim && claim.status === 'ACTIVE') {
      localStorage.setItem(TASK_CLAIM_STORAGE_KEY, JSON.stringify(claim));
    } else {
      localStorage.removeItem(TASK_CLAIM_STORAGE_KEY);
    }
    window.dispatchEvent(new CustomEvent('zlce-task-claim-changed', { detail: claim }));
  } catch {
    // fallback
  }
}

export interface CanClaimResult {
  allowed: boolean;
  reason?: string;
  conflictingTaskId?: string;
}

/**
 * Validasi apakah sebuah task boleh diklaim menjadi IN_PROGRESS
 * Aturan keras:
 * 1. Tidak boleh ada task lain yang sudah IN_PROGRESS di matriks
 * 2. Seluruh dependensi task harus berstatus DONE
 * 3. Task belum berstatus DONE
 */
export function canClaimTask(
  taskId: string, 
  sessionState: ParsedSessionState,
  options?: { ignoreCurrentClaim?: boolean }
): CanClaimResult {
  const currentTask = sessionState.tasks.find(t => t.id === taskId);
  if (!currentTask) {
    return { allowed: false, reason: `Task ${taskId} tidak ditemukan di matriks.` };
  }

  if (currentTask.status === 'DONE') {
    return { allowed: false, reason: `Task ${taskId} sudah selesai (DONE) dan tidak dapat diklaim ulang.` };
  }

  // 1. Cek aturan keras: Hanya 1 task IN_PROGRESS
  const existingInProgress = sessionState.tasks.filter(
    t => t.status === 'IN_PROGRESS' && t.id !== taskId
  );

  if (existingInProgress.length > 0) {
    const conflict = existingInProgress[0];
    return {
      allowed: false,
      reason: `Aturan Tablet Bersama: Task ${conflict.id} (${conflict.name}) sedang dikerjakan (IN_PROGRESS). Hanya 1 task yang boleh aktif dalam satu waktu.`,
      conflictingTaskId: conflict.id
    };
  }

  // 2. Cek dependensi
  if (currentTask.dependencies && currentTask.dependencies !== '-') {
    const depIds = currentTask.dependencies.match(/TASK-\d{3}/g) || [];
    const missingOrNotDone = depIds.filter(depId => {
      const depTask = sessionState.tasks.find(t => t.id === depId);
      return !depTask || depTask.status !== 'DONE';
    });

    if (missingOrNotDone.length > 0) {
      return {
        allowed: false,
        reason: `Dependensi belum terpenuhi: ${missingOrNotDone.join(', ')} harus berstatus DONE sebelum mengklaim ${taskId}.`
      };
    }
  }

  return { allowed: true };
}

export interface ClaimTaskResult {
  success: boolean;
  error?: string;
  updatedState?: ParsedSessionState;
  updatedMarkdown?: string;
  claim?: TaskClaimRecord;
}

/**
 * Mengklaim task dengan proteksi Compare-and-Swap (CAS):
 * - Menolak mutasi jika expectedRevision tidak cocok dengan revisi aktif
 * - Menjadikan task IN_PROGRESS
 * - Mengupdate Bagian 1 status sesi (activeTask = taskId)
 * - Mengupdate Bagian 3 WAL dengan identitas task dan driver aktif
 * - Menyimpan klaim ke LocalStorage dengan monotonic revision increment
 */
export function claimTask(
  taskId: string,
  member: TeamMember,
  sessionState: ParsedSessionState,
  expectedRevision?: number
): ClaimTaskResult {
  const currentRev = getActiveClaimRevision();
  if (expectedRevision !== undefined && expectedRevision !== currentRev) {
    return {
      success: false,
      error: `STALE_REVISION: State klaim telah dimutasi oleh konteks lain (revisi aktif: ${currentRev}, diharapkan: ${expectedRevision}). Silakan refresh state.`
    };
  }

  const check = canClaimTask(taskId, sessionState);
  if (!check.allowed) {
    return { success: false, error: check.reason };
  }

  const { iso, wib } = getNowTimestamps();
  const targetTask = sessionState.tasks.find(t => t.id === taskId);
  if (!targetTask) {
    return { success: false, error: `Task ${taskId} tidak ditemukan.` };
  }

  const newRevision = incrementClaimRevision();

  // Buat record klaim dengan sequence revision baru
  const claim: TaskClaimRecord = {
    taskId,
    taskName: targetTask.name,
    memberId: member.id,
    memberName: member.name,
    memberAvatar: member.avatarColor,
    claimedAtISO: iso,
    claimedAtWIB: wib,
    status: 'ACTIVE',
    revision: newRevision
  };

  // Buat state clone yang diperbarui
  const updatedTasks = sessionState.tasks.map(t => {
    if (t.id === taskId) {
      return { ...t, status: 'IN_PROGRESS' as TaskStatus };
    }
    return t;
  });

  const updatedStatus = {
    ...sessionState.status,
    activeTask: taskId,
    activeTaskStatus: 'IN_PROGRESS' as TaskStatus,
    timestampAudit: wib
  };

  const updatedWal = {
    task: taskId,
    currentStep: `Mulai pengerjaan ${taskId}: ${targetTask.name} oleh ${member.name} (rev #${newRevision})`,
    plannedFiles: `src/ (sesuai dependensi ${targetTask.dependencies})`,
    completedSoFar: `Klaim task disahkan oleh ${member.name} pada ${wib}`,
    nextStepExact: `Implementasi kode solusi dan verifikasi mandiri untuk ${taskId}`,
    verificationCommand: 'python3 scripts/zlce-check.py . && npm run build',
    updatedTimestamp: wib
  };

  const updatedState: ParsedSessionState = {
    ...sessionState,
    tasks: updatedTasks,
    status: updatedStatus,
    wal: updatedWal
  };

  const updatedMarkdown = serializeSessionStateToMarkdown(updatedState);
  updatedState.raw = updatedMarkdown;

  // Simpan klaim ke localStorage
  saveActiveTaskClaim(claim);

  return {
    success: true,
    updatedState,
    updatedMarkdown,
    claim
  };
}

/**
 * Melepaskan klaim task:
 * - Mengembalikan task ke status READY
 * - Mengosongkan status task aktif dan WAL
 * - Menghapus catatan klaim dari LocalStorage
 */
export function releaseTaskClaim(
  taskId: string,
  sessionState: ParsedSessionState,
  reason: string = 'Klaim dilepaskan oleh anggota tim',
  expectedRevision?: number
): ClaimTaskResult {
  const currentRev = getActiveClaimRevision();
  if (expectedRevision !== undefined && expectedRevision !== currentRev) {
    return {
      success: false,
      error: `STALE_REVISION: State klaim telah dimutasi oleh konteks lain (revisi aktif: ${currentRev}, diharapkan: ${expectedRevision}).`
    };
  }

  const { wib } = getNowTimestamps();
  const nextRev = incrementClaimRevision();
  
  const updatedTasks = sessionState.tasks.map(t => {
    if (t.id === taskId) {
      return { ...t, status: 'READY' as TaskStatus };
    }
    return t;
  });

  const updatedStatus = {
    ...sessionState.status,
    activeTask: '-',
    activeTaskStatus: 'READY' as TaskStatus,
    timestampAudit: wib
  };

  const updatedWal = {
    task: '-',
    currentStep: `Klaim ${taskId} dilepaskan: ${reason} (rev #${nextRev})`,
    plannedFiles: '-',
    completedSoFar: '-',
    nextStepExact: '-',
    verificationCommand: '-',
    updatedTimestamp: wib
  };

  const updatedState: ParsedSessionState = {
    ...sessionState,
    tasks: updatedTasks,
    status: updatedStatus,
    wal: updatedWal
  };

  const updatedMarkdown = serializeSessionStateToMarkdown(updatedState);
  updatedState.raw = updatedMarkdown;

  // Hapus klaim dari localStorage
  saveActiveTaskClaim(null);

  return {
    success: true,
    updatedState,
    updatedMarkdown
  };
}

export interface ExclusivityVerificationResult {
  valid: boolean;
  inProgressCount: number;
  activeTaskIds: string[];
  message: string;
}

/**
 * AUD-006: Verifikasi kepatuhan aturan keras eksklusivitas klaim task
 * Memastikan maksimal hanya ada 1 task yang berstatus IN_PROGRESS di seluruh matriks
 */
export function verifyClaimExclusivity(tasks: ZLCETask[]): ExclusivityVerificationResult {
  const inProgress = tasks.filter(t => t.status === 'IN_PROGRESS');
  const count = inProgress.length;
  const activeTaskIds = inProgress.map(t => t.id);

  if (count === 0) {
    return {
      valid: true,
      inProgressCount: 0,
      activeTaskIds: [],
      message: 'Matriks valid: Tidak ada task yang sedang IN_PROGRESS.'
    };
  }

  if (count === 1) {
    return {
      valid: true,
      inProgressCount: 1,
      activeTaskIds,
      message: `Matriks valid: Eksklusivitas terpenuhi untuk task ${activeTaskIds[0]}.`
    };
  }

  return {
    valid: false,
    inProgressCount: count,
    activeTaskIds,
    message: `Pelanggaran Eksklusivitas: Terdapat ${count} task yang berstatus IN_PROGRESS (${activeTaskIds.join(', ')}). Hanya 1 task yang diizinkan aktif.`
  };
}

export interface TakeoverTaskResult extends ClaimTaskResult {
  previousClaim?: TaskClaimRecord | null;
  takeoverReason?: string;
}

/**
 * AUD-006 & AUD2-006: Pengambilalihan klaim task secara eksplisit dari anggota tim sebelumnya
 * dengan proteksi Compare-and-Swap (CAS) terhadap stale revision.
 */
export function takeoverTaskClaim(
  taskId: string,
  newMember: TeamMember,
  reason: string,
  sessionState: ParsedSessionState,
  expectedRevision?: number
): TakeoverTaskResult {
  const currentRev = getActiveClaimRevision();
  if (expectedRevision !== undefined && expectedRevision !== currentRev) {
    return {
      success: false,
      error: `STALE_REVISION: Gagal mengambil alih klaim karena state telah dimutasi oleh konteks lain (revisi aktif: ${currentRev}, diharapkan: ${expectedRevision}).`
    };
  }

  if (!reason || reason.trim().length < 5) {
    return {
      success: false,
      error: 'Pengambilalihan klaim membutuhkan alasan eksplisit (minimal 5 karakter) untuk jejak audit.'
    };
  }

  const targetTask = sessionState.tasks.find(t => t.id === taskId);
  if (!targetTask) {
    return { success: false, error: `Task ${taskId} tidak ditemukan.` };
  }

  const previousClaim = getActiveTaskClaim();
  const { iso, wib } = getNowTimestamps();
  const newRevision = incrementClaimRevision();

  // Buat record klaim baru dengan penanda takeover dan nomor revisi terbarui
  const newClaim: TaskClaimRecord = {
    taskId,
    taskName: targetTask.name,
    memberId: newMember.id,
    memberName: newMember.name,
    memberAvatar: newMember.avatarColor,
    claimedAtISO: iso,
    claimedAtWIB: wib,
    status: 'ACTIVE',
    revision: newRevision
  };

  // Pastikan hanya taskId ini yang IN_PROGRESS
  const updatedTasks = sessionState.tasks.map(t => {
    if (t.id === taskId) {
      return { ...t, status: 'IN_PROGRESS' as TaskStatus };
    }
    if (t.status === 'IN_PROGRESS') {
      return { ...t, status: 'READY' as TaskStatus };
    }
    return t;
  });

  const previousHolder = previousClaim ? previousClaim.memberName : 'anggota sebelumnya';

  const updatedStatus = {
    ...sessionState.status,
    activeTask: taskId,
    activeTaskStatus: 'IN_PROGRESS' as TaskStatus,
    timestampAudit: wib
  };

  const updatedWal = {
    task: taskId,
    currentStep: `Pengambilalihan klaim ${taskId}: ${targetTask.name} oleh ${newMember.name} (rev #${newRevision}, sebelumnya: ${previousHolder})`,
    plannedFiles: `src/ (sesuai spesifikasi ${taskId})`,
    completedSoFar: `Klaim dialihkan dari ${previousHolder} ke ${newMember.name}. Alasan: ${reason}`,
    nextStepExact: `Melanjutkan implementasi solusi untuk ${taskId}`,
    verificationCommand: 'python3 scripts/zlce-check.py . && npm run build',
    updatedTimestamp: wib
  };

  const updatedState: ParsedSessionState = {
    ...sessionState,
    tasks: updatedTasks,
    status: updatedStatus,
    wal: updatedWal
  };

  const updatedMarkdown = serializeSessionStateToMarkdown(updatedState);
  updatedState.raw = updatedMarkdown;

  // Simpan klaim baru
  saveActiveTaskClaim(newClaim);

  return {
    success: true,
    updatedState,
    updatedMarkdown,
    claim: newClaim,
    previousClaim,
    takeoverReason: reason
  };
}
