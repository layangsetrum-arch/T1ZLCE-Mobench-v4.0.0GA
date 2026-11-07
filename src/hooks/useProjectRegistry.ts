import { useState, useEffect, useCallback } from 'react';
import { ProjectMeta } from '../types/mobile';

export const DEFAULT_PROJECTS: ProjectMeta[] = [
  {
    id: 'zlce-mobile-workbench',
    name: 'ZLCE Mobile Workbench',
    termuxPath: '~/projects/ZLCE3.22-studio',
    repoUrl: 'https://github.com/acimau99-netizen/ZLCE3.22-studio.git',
    branch: 'v4-mobile',
    activeMemberId: 'eko',
    lastAccessed: new Date().toISOString(),
    mode: 'FULL',
    description: 'AI agent context control workbench & relay workbench untuk tablet Android Samsung Tab A7 Lite'
  },
  {
    id: 'todo-api-service',
    name: 'Todo API Microservice',
    termuxPath: '~/projects/todo-api',
    repoUrl: 'https://github.com/acimau99-netizen/todo-api.git',
    branch: 'task/TASK-002',
    activeMemberId: 'oned',
    lastAccessed: new Date(Date.now() - 3600000).toISOString(),
    mode: 'LITE',
    description: 'RESTful API backend service (Go / Node.js) dengan arsitektur microservice'
  }
];

const REGISTRY_STORAGE_KEY = 'zlce_projects_registry';
const ACTIVE_PROJECT_ID_KEY = 'zlce_active_project_id';

export function useProjectRegistry() {
  const [projects, setProjects] = useState<ProjectMeta[]>(() => {
    try {
      const saved = localStorage.getItem(REGISTRY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return DEFAULT_PROJECTS;
  });

  const [activeProjectId, setActiveProjectIdState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(ACTIVE_PROJECT_ID_KEY);
      if (saved) return saved;
    } catch {
      // fallback
    }
    return DEFAULT_PROJECTS[0].id;
  });

  // Simpan projects ke localStorage saat berubah
  useEffect(() => {
    try {
      localStorage.setItem(REGISTRY_STORAGE_KEY, JSON.stringify(projects));
    } catch (e) {
      console.warn('Gagal menyimpan registry proyek ke localStorage:', e);
    }
  }, [projects]);

  // Pantau storage event lintas tab
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const savedProjects = localStorage.getItem(REGISTRY_STORAGE_KEY);
        if (savedProjects) {
          setProjects(JSON.parse(savedProjects));
        }
        const savedActiveId = localStorage.getItem(ACTIVE_PROJECT_ID_KEY);
        if (savedActiveId) {
          setActiveProjectIdState(savedActiveId);
        }
      } catch {
        // ignore
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('zlce-project-changed', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('zlce-project-changed', handleStorageChange);
    };
  }, []);

  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0] || DEFAULT_PROJECTS[0];

  const switchProject = useCallback((id: string) => {
    setActiveProjectIdState(id);
    localStorage.setItem(ACTIVE_PROJECT_ID_KEY, id);

    // Update lastAccessed pada proyek bersangkutan
    setProjects(prev =>
      prev.map(p => (p.id === id ? { ...p, lastAccessed: new Date().toISOString() } : p))
    );

    // Trigger custom event untuk memberitahu komponen lain
    window.dispatchEvent(new CustomEvent('zlce-project-changed', { detail: { projectId: id } }));
  }, []);

  const addProject = useCallback((newProj: Omit<ProjectMeta, 'id' | 'lastAccessed'>) => {
    const id = `proj-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const fullProject: ProjectMeta = {
      ...newProj,
      id,
      lastAccessed: new Date().toISOString()
    };
    setProjects(prev => [fullProject, ...prev]);
    switchProject(id);
    return fullProject;
  }, [switchProject]);

  const updateProject = useCallback((id: string, updates: Partial<ProjectMeta>) => {
    setProjects(prev =>
      prev.map(p => (p.id === id ? { ...p, ...updates, lastAccessed: new Date().toISOString() } : p))
    );
  }, []);

  const deleteProject = useCallback((id: string) => {
    setProjects(prev => {
      if (prev.length <= 1) return prev; // Pertahankan minimal 1 proyek
      const filtered = prev.filter(p => p.id !== id);
      if (activeProjectId === id) {
        const nextActive = filtered[0];
        setActiveProjectIdState(nextActive.id);
        localStorage.setItem(ACTIVE_PROJECT_ID_KEY, nextActive.id);
        window.dispatchEvent(new CustomEvent('zlce-project-changed', { detail: { projectId: nextActive.id } }));
      }
      return filtered;
    });
  }, [activeProjectId]);

  return {
    projects,
    activeProject,
    activeProjectId,
    switchProject,
    addProject,
    updateProject,
    deleteProject
  };
}
