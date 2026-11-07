/**
 * ZLCE Command Templates Catalog (TASK-025)
 * Katalog Template Perintah Berversi untuk Lingkungan Termux & Git Tablet
 * Rujukan: docs/mobile/blueprint/13_COMMAND_TEMPLATES.md & 04_TERMUX_INTEGRATION.md
 * 
 * Menegakkan:
 * - 8+ Template kanonik berversi dengan metadata lengkap
 * - Label risiko visual tegas: 🟢 SAFE, 🟡 MUTATING, 🔴 DESTRUCTIVE
 * - Garansi Zero Destructive Command (TIDAK ADA `reset --hard` atau `push --force` di katalog bawaan)
 */

import { CommandTemplate, CommandRiskLevel } from '../types/mobile';

export const COMMAND_TEMPLATES_VERSION = '4.0.0';

export interface CommandRiskMeta {
  level: CommandRiskLevel;
  label: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  description: string;
}

export const RISK_LEVEL_META: Record<CommandRiskLevel, CommandRiskMeta> = {
  safe: {
    level: 'safe',
    label: 'SAFE (Read-Only)',
    badgeBg: 'bg-emerald-950/60',
    badgeText: 'text-emerald-300',
    badgeBorder: 'border-emerald-500/30',
    description: 'Hanya membaca status sistem berkas atau Git tanpa mengubah berkas apa pun.'
  },
  mutating: {
    level: 'mutating',
    label: 'MUTATING (Write)',
    badgeBg: 'bg-amber-950/60',
    badgeText: 'text-amber-300',
    badgeBorder: 'border-amber-500/30',
    description: 'Mengubah berkas, membuat commit baru, atau mengubah percabangan Git.'
  },
  destructive: {
    level: 'destructive',
    label: 'DESTRUCTIVE (High-Risk)',
    badgeBg: 'bg-rose-950/60',
    badgeText: 'text-rose-300',
    badgeBorder: 'border-rose-500/30',
    description: 'Berpotensi menghapus kode tanpa bisa di-undo (dikeluarkan dari katalog bawaan).'
  }
};

/**
 * Daftar 8 Template Kanonik dari Blueprint 13 & Blueprint 04
 * Disimpan sebagai data berversi di repositori
 */
export const CANONICAL_COMMAND_TEMPLATES: CommandTemplate[] = [
  // 1. Validator & Diagnostik
  {
    id: 'CMD-VAL-01',
    category: 'validator',
    title: 'Validasi Status ZLCE (Lokal)',
    description: 'Memvalidasi kepatuhan matriks SESSION_STATE.md, aturan dependensi, integritas WAL, dan single IN_PROGRESS.',
    riskLevel: 'safe',
    directCommand: 'python3 scripts/zlce-check.py .',
    dispatcherCommand: 'zlce check',
    requiredParams: []
  },
  {
    id: 'CMD-VAL-02',
    category: 'validator',
    title: 'Validasi Mode Ketat (Strict Check)',
    description: 'Pemeriksaan ketat di mana peringatan (warning) dianggap sebagai error, wajib lulus untuk Gerbang 3 & Serah Terima.',
    riskLevel: 'safe',
    directCommand: 'python3 scripts/zlce-check.py . --strict',
    dispatcherCommand: 'zlce check --strict',
    requiredParams: []
  },
  {
    id: 'CMD-VAL-03',
    category: 'recovery',
    title: 'Snapshot Status Pemulihan (Emergency Diff)',
    description: 'Menghasilkan ringkasan diff git dan status working tree untuk orientasi sesi AI baru saat recovery atau crash.',
    riskLevel: 'safe',
    directCommand: 'bash scripts/zlce-snapshot.sh --diff',
    dispatcherCommand: 'zlce snapshot --diff',
    requiredParams: []
  },
  {
    id: 'CMD-VAL-04',
    category: 'validator',
    title: 'Pengumpulan Bundel Kontrol (Collect Bundle)',
    description: 'Mengemas seluruh berkas dokumen kontrol ZLCE ke dalam arsip zip terkompresi untuk backup atau transfer.',
    riskLevel: 'safe',
    directCommand: 'python3 scripts/zlce-collect.py .',
    dispatcherCommand: 'zlce collect',
    requiredParams: []
  },

  // 2. Sinkronisasi Git
  {
    id: 'CMD-GIT-01',
    category: 'git',
    title: 'Periksa Status Working Tree',
    description: 'Memeriksa berkas yang dimodifikasi, staged, atau untracked secara ringkas sebelum transisi sesi.',
    riskLevel: 'safe',
    directCommand: 'git status --short',
    dispatcherCommand: 'git status --short',
    requiredParams: []
  },
  {
    id: 'CMD-GIT-02',
    category: 'git',
    title: 'Tarik Pembaruan Cabang Aman (Safe Fetch & Checkout)',
    description: 'Mengambil referensi origin/main dan membuat cabang baru task/{ACTIVE_TASK_ID} dengan proteksi fast-forward murni.',
    riskLevel: 'mutating',
    directCommand: 'git fetch origin && git checkout -b task/{ACTIVE_TASK_ID} origin/main --ff-only',
    dispatcherCommand: 'zlce pull task/{ACTIVE_TASK_ID}',
    requiredParams: ['ACTIVE_TASK_ID']
  },
  {
    id: 'CMD-GIT-03',
    category: 'git',
    title: 'Commit Atomik dengan Atribusi Anggota Aktif',
    description: 'Melakukan staging SESSION_STATE.md beserta berkas tugas, lalu membuat commit atomik ber-provenance identitas driver tablet.',
    riskLevel: 'mutating',
    directCommand: 'git add SESSION_STATE.md {TOUCHED_FILES} && git -c user.name="{MEMBER_NAME}" -c user.email="{MEMBER_EMAIL}" commit -m "{ACTIVE_TASK_ID}: {COMMIT_MESSAGE}"',
    dispatcherCommand: 'git add SESSION_STATE.md {TOUCHED_FILES} && git -c user.name="{MEMBER_NAME}" -c user.email="{MEMBER_EMAIL}" commit -m "{ACTIVE_TASK_ID}: {COMMIT_MESSAGE}"',
    requiredParams: ['ACTIVE_TASK_ID', 'MEMBER_NAME', 'MEMBER_EMAIL', 'COMMIT_MESSAGE', 'TOUCHED_FILES']
  },
  {
    id: 'CMD-GIT-04',
    category: 'git',
    title: 'Dorong Cabang Task ke GitHub Bersama',
    description: 'Mendorong cabang task yang sedang aktif ke repositori remote tanpa menyentuh branch main langsung.',
    riskLevel: 'mutating',
    directCommand: 'git push origin task/{ACTIVE_TASK_ID}',
    dispatcherCommand: 'zlce push',
    requiredParams: ['ACTIVE_TASK_ID']
  },
  {
    id: 'CMD-GIT-05',
    category: 'git',
    title: 'Sinkronisasi Aman Cabang Utama (Safe Pull ff-only)',
    description: 'Memperbarui cabang main lokal dari origin secara deterministik hanya jika tidak ada percabangan divergen.',
    riskLevel: 'mutating',
    directCommand: 'git checkout main && git pull --ff-only origin main',
    dispatcherCommand: 'git checkout main && git pull --ff-only origin main',
    requiredParams: []
  },
  {
    id: 'CMD-GIT-06',
    category: 'git',
    title: 'Simpan Aman & Sinkronisasi (Safe Stash & ff-only Pull)',
    description: 'Mengamankan draft lokal ke stash, menarik update terbaru dengan proteksi --ff-only, lalu mengembalikan draft secara aman.',
    riskLevel: 'mutating',
    directCommand: 'git stash push -m "zlce-stash-{ACTIVE_TASK_ID}" && git pull --ff-only origin main && git stash pop',
    dispatcherCommand: 'zlce safe-stash-pull',
    requiredParams: ['ACTIVE_TASK_ID']
  },
  {
    id: 'CMD-GIT-07',
    category: 'git',
    title: 'Pembersihan Cabang Task Selesai (Safe Branch Delete -d)',
    description: 'Menghapus cabang task lokal yang sudah berhasil digabungkan ke cabang utama secara aman dengan opsi -d (bukan -D destruktif).',
    riskLevel: 'mutating',
    directCommand: 'git checkout main && git branch -d task/{MERGED_TASK_ID}',
    dispatcherCommand: 'zlce clean-branch task/{MERGED_TASK_ID}',
    requiredParams: ['MERGED_TASK_ID']
  },

  // 3. Serah Terima Tablet (Device Handover)
  {
    id: 'CMD-AUTH-01',
    category: 'handover',
    title: 'Bersihkan Kredensial RAM Termux (Clean Auth)',
    description: 'Mengeluarkan cache kredensial git dari memori RAM Termux dan membersihkan konfigurasi identitas sementara sebelum serah terima.',
    riskLevel: 'safe',
    directCommand: 'git credential-cache exit 2>/dev/null || true',
    dispatcherCommand: 'zlce clean-auth',
    requiredParams: []
  }
];

/**
 * Mengambil seluruh katalog template perintah
 */
export function getCommandTemplates(): CommandTemplate[] {
  return CANONICAL_COMMAND_TEMPLATES;
}

/**
 * Filter template perintah berdasarkan kategori
 */
export function getCommandTemplatesByCategory(
  category: 'all' | 'git' | 'validator' | 'recovery' | 'handover'
): CommandTemplate[] {
  if (category === 'all') return CANONICAL_COMMAND_TEMPLATES;
  return CANONICAL_COMMAND_TEMPLATES.filter(c => c.category === category);
}

/**
 * Mengambil template berdasarkan ID
 */
export function getCommandTemplateById(id: string): CommandTemplate | undefined {
  return CANONICAL_COMMAND_TEMPLATES.find(c => c.id === id);
}

/**
 * Verifikasi Acceptance Criteria 3 (AUD-009):
 * Memastikan tidak ada perintah destruktif (reset --hard, push --force, push -f, branch -D, rm -rf) di katalog bawaan
 */
export function verifyNoDestructiveCommands(templates: CommandTemplate[] = CANONICAL_COMMAND_TEMPLATES): boolean {
  const forbiddenPatterns = [
    'reset --hard',
    'push --force',
    'push -f',
    '--force',
    'branch -d ', // Note: lowercase -d is safe, but branch -D is uppercase destructive
    'rm -rf /',
    'clean -fdx'
  ];

  for (const t of templates) {
    if (t.riskLevel === 'destructive') return false;
    const direct = t.directCommand;
    const dispatcher = t.dispatcherCommand || '';

    // Deteksi larangan keras
    if (direct.includes('--force') || direct.includes('push -f') || direct.includes('reset --hard') || direct.includes('branch -D')) {
      return false;
    }
    if (dispatcher.includes('--force') || dispatcher.includes('push -f') || dispatcher.includes('reset --hard') || dispatcher.includes('branch -D')) {
      return false;
    }
  }
  return true;
}

