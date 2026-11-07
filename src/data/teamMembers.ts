import { TeamMember } from '../types/mobile';

/**
 * Registri Resmi Tim Estafet Tablet (8 Anggota)
 * Samsung Galaxy Tab A7 Lite (SM-T225)
 * Sesuai arahan pengguna dan Blueprint 14 / ADR-07
 */
export const TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'eko',
    name: 'Eko',
    role: 'System & Git Coordinator (Lead)',
    email: 'eko.keplek@gmail.com',
    avatarColor: 'from-indigo-600 to-violet-500',
    aiPreference: 'Gemini 2.5 Flash / Claude 3.5 Sonnet',
    notes: 'Inisiator ZLCE Mobile Workbench & administrator tablet SM-T225'
  },
  {
    id: 'oned',
    name: 'Oned',
    role: 'Frontend & Mobile UI Specialist',
    email: 'oned@zlce.local',
    avatarColor: 'from-blue-600 to-cyan-500',
    aiPreference: 'Claude 3.5 Sonnet',
    notes: 'Desain layout tablet 8.7", target sentuh 44px, dan komponen visual'
  },
  {
    id: 'cxperia',
    name: 'Cxperia',
    role: 'QA & Test Harness Lead',
    email: 'cxperia@zlce.local',
    avatarColor: 'from-emerald-600 to-teal-500',
    aiPreference: 'Gemini 2.5 Flash',
    notes: 'Eksekusi suite uji cold-start, verifikasi gerbang kualitas, dan regression test'
  },
  {
    id: 'sulistiyani',
    name: 'Sulistiyani',
    role: 'PWA & Offline Architect',
    email: 'sulistiyani@zlce.local',
    avatarColor: 'from-amber-600 to-yellow-500',
    aiPreference: 'Claude 3.5 Sonnet',
    notes: 'Service Worker, cache-first shell, offline resilience, dan Web App Manifest'
  },
  {
    id: 'layang',
    name: 'Layang',
    role: 'Context & Prompt Engineer',
    email: 'layang@zlce.local',
    avatarColor: 'from-purple-600 to-pink-500',
    aiPreference: 'Claude 3.5 Sonnet / ChatGPT',
    notes: 'Penyusun Portable Context Pack, kuota budget manager, dan anti-amnesia guard'
  },
  {
    id: 'acimau',
    name: 'Acimau',
    role: 'Git & Sync Hub Specialist',
    email: 'acimau@zlce.local',
    avatarColor: 'from-rose-600 to-red-500',
    aiPreference: 'Gemini 2.5 Pro',
    notes: 'Pengelola remote repository (layangsetrum-arch/T1ZLCE-Mobench-v4.0.0GA.git) & merge branch'
  },
  {
    id: 'kepek',
    name: 'Kepek',
    role: 'Security & Zero-Secret Officer',
    email: 'kepek@zlce.local',
    avatarColor: 'from-cyan-600 to-blue-500',
    aiPreference: 'Gemini 2.5 Flash',
    notes: 'Audit zero-secret on disk, timeout 900s credential cache, dan sanitasi shell'
  },
  {
    id: 'gete',
    name: 'Gete',
    role: 'Mobile UX & Ergonomics Reviewer',
    email: 'gete@zlce.local',
    avatarColor: 'from-teal-600 to-emerald-500',
    aiPreference: 'Claude 3.5 Haiku',
    notes: 'Verifikasi kenyamanan jempol, rotasi layar, dan virtual keyboard visualViewport'
  }
];

export const getMemberById = (id: string): TeamMember => {
  const members = loadTeamRegistry();
  return members.find(m => m.id.toLowerCase() === id.toLowerCase()) || TEAM_MEMBERS[0];
};

export const TEAM_REGISTRY_STORAGE_KEY = 'zlce_team_members_registry';

/**
 * Memuat daftar 8 anggota tim dari LocalStorage dengan fallback data kanonik default.
 * Menegakkan Zero-Secret Policy: Memastikan tidak ada token/kredensial yang tersimpan.
 */
export function loadTeamRegistry(): TeamMember[] {
  if (typeof window === 'undefined') return TEAM_MEMBERS;
  try {
    const raw = localStorage.getItem(TEAM_REGISTRY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === 8) {
        return parsed.map((m, idx) => ({
          ...TEAM_MEMBERS[idx],
          ...m,
          // Sanitasi keras: tidak boleh ada token atau rahasia
          notes: m.notes?.replace(/(ghp_[a-zA-Z0-9]+|sk-[a-zA-Z0-9]+)/g, '[REDACTED_SECRET]')
        }));
      }
    }
  } catch {
    // fallback
  }
  return TEAM_MEMBERS;
}

/**
 * Menyimpan daftar 8 anggota tim ke LocalStorage dengan penegakan Zero-Secret Policy.
 */
export function saveTeamRegistry(members: TeamMember[]): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const sanitized = members.map(m => {
      // Pastikan atribut rahasia tidak lolos
      const { ...clean } = m as any;
      delete clean.token;
      delete clean.password;
      delete clean.secret;
      return clean as TeamMember;
    });
    localStorage.setItem(TEAM_REGISTRY_STORAGE_KEY, JSON.stringify(sanitized));
    window.dispatchEvent(new Event('storage'));
    return true;
  } catch {
    return false;
  }
}

/**
 * Memperbarui data profil satu anggota tim (misal email commit publik atau preferensi AI).
 */
export function updateTeamMemberProfile(id: string, updates: Partial<TeamMember>): TeamMember[] {
  const current = loadTeamRegistry();
  const updated = current.map(m => {
    if (m.id.toLowerCase() === id.toLowerCase()) {
      return { ...m, ...updates };
    }
    return m;
  });
  saveTeamRegistry(updated);
  return updated;
}

/**
 * Mengembalikan registri ke data profil default bawaan.
 */
export function resetTeamRegistryToDefault(): TeamMember[] {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TEAM_REGISTRY_STORAGE_KEY);
    window.dispatchEvent(new Event('storage'));
  }
  return TEAM_MEMBERS;
}
