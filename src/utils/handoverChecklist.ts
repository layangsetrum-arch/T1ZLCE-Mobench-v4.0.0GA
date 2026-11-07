/**
 * ZLCE Device Handover Checklist Wizard Utility
 * Mendukung prosedur serah terima fisik Samsung Galaxy Tab A7 Lite (SM-T225).
 * Memastikan Zero-Secret Policy (kredensial git cache dibersihkan dari RAM Termux),
 * logout sesi peramban, dan kontinuitas state sesi antar 8 anggota tim estafet.
 * 
 * Rujukan: docs/mobile/blueprint/07_WORKFLOW_DESIGN.md, 08_SECURITY_MODEL.md, AUD2-004
 */

import { TeamMember } from '../types/mobile';
import { getNowTimestamps } from './taskClaimManager';

export interface DeviceHandoverStep {
  id: string;
  number: number;
  title: string;
  description: string;
  commandSnippet?: string;
  isMandatory: boolean;
  category: 'git' | 'session' | 'auth' | 'browser';
}

export const DEVICE_HANDOVER_STEPS: DeviceHandoverStep[] = [
  {
    id: 'step-verify-commit',
    number: 1,
    title: 'Verifikasi Commit & Status Git di Termux',
    description: 'Pastikan working tree bersih dan seluruh perubahan telah dicommit pada branch aktif sebelum menyerahkan tablet.',
    commandSnippet: 'git status && git log -1 --stat',
    isMandatory: true,
    category: 'git'
  },
  {
    id: 'step-update-notes',
    number: 2,
    title: 'Perbarui Catatan Serah Terima (Bagian 6 SESSION_STATE.md)',
    description: 'Tulis ringkasan progres, task yang selesai, dan instruksi spesifik untuk driver berikutnya agar tidak terjadi amnesia konteks.',
    commandSnippet: 'nano SESSION_STATE.md  # atau gunakan editor di PWA ZLCE',
    isMandatory: true,
    category: 'session'
  },
  {
    id: 'step-clean-auth',
    number: 3,
    title: 'Pembersihan Kredensial Termux (Zero-Secret Policy)',
    description: 'Hentikan daemon cache kredensial dari memori RAM Termux, bersihkan soket cache, dan verifikasi remote URL bebas token.',
    commandSnippet: 'bash scripts/zlce/clean-auth.sh',
    isMandatory: true,
    category: 'auth'
  },
  {
    id: 'step-browser-clipboard',
    number: 4,
    title: 'Pembersihan Sesi AI Peramban & Riwayat Terminal',
    description: 'Tutup tab akun AI eksternal di browser Android, bersihkan riwayat terminal Termux (history -c), dan kosongkan clipboard.',
    commandSnippet: 'history -c  # di terminal Termux',
    isMandatory: true,
    category: 'browser'
  },
  {
    id: 'step-switch-driver',
    number: 5,
    title: 'Pengalihan Profil Driver Tablet ke Anggota Berikutnya',
    description: 'Alihkan profil pengemudi aktif di ZLCE Studio ke anggota tim yang menerima tablet fisik.',
    commandSnippet: 'git -c user.name="[DriverBaru]" -c user.email="[EmailBaru]"',
    isMandatory: true,
    category: 'session'
  }
];

/**
 * Menghasilkan perintah pembersihan kredensial Termux yang aman dan terpadu.
 */
export function getCleanAuthCommand(): string {
  return 'bash scripts/zlce/clean-auth.sh';
}

/**
 * Menghasilkan format catatan serah terima untuk Bagian 6 SESSION_STATE.md
 */
export function formatDeviceHandoverNotes(params: {
  outgoingMember: TeamMember;
  incomingMember: TeamMember;
  progressNotes: string;
  branchName: string;
}): string {
  const { wib } = getNowTimestamps();
  return `### Serah Terima Tablet Bersama: ${params.outgoingMember.name} -> ${params.incomingMember.name} (${wib})
* **Driver Sebelumnya:** ${params.outgoingMember.name} (@${params.outgoingMember.id})
* **Driver Penerima:** ${params.incomingMember.name} (@${params.incomingMember.id})
* **Branch Git Aktif:** \`${params.branchName || 'v4-mobile'}\`
* **Catatan Transisi:** ${params.progressNotes.trim() || 'Tablet diserahkan dalam kondisi working tree bersih, daemon RAM dibersihkan, dan sesi aman.'}
* **Perintah Driver Baru:** \`git -c user.name="${params.incomingMember.name}" -c user.email="${params.incomingMember.email}" commit ...\`
`;
}

/**
 * Menyuntikkan catatan serah terima perangkat ke dalam teks markdown SESSION_STATE.md (Bagian 6).
 */
export function injectHandoverNotesToMarkdown(
  currentMarkdown: string,
  entryText: string
): string {
  const section6Regex = /##\s+6\.\s+CATATAN\s+SERAH\s+TERIMA[^\n]*\n/i;
  const match = currentMarkdown.match(section6Regex);

  if (match && match.index !== undefined) {
    const insertPos = match.index + match[0].length;
    return (
      currentMarkdown.slice(0, insertPos) +
      '\n' + entryText.trim() + '\n\n' +
      currentMarkdown.slice(insertPos)
    );
  }

  // Jika Bagian 6 belum ada
  return currentMarkdown + '\n\n## 6. CATATAN SERAH TERIMA\n\n' + entryText.trim() + '\n';
}
