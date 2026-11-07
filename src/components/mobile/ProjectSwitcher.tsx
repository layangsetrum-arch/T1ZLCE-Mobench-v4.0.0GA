import React, { useState, useRef, useEffect } from 'react';
import { useProjectRegistry } from '../../hooks/useProjectRegistry';
import { ProjectMeta } from '../../types/mobile';
import { TEAM_MEMBERS } from '../../data/teamMembers';
import { copyToClipboard } from '../../utils/clipboard';
import { 
  FolderKanban, 
  ChevronDown, 
  Plus, 
  Check, 
  Terminal, 
  GitBranch, 
  ExternalLink, 
  Trash2, 
  Edit3, 
  Copy, 
  X,
  Layers
} from 'lucide-react';

interface ProjectSwitcherProps {
  className?: string;
}

export const ProjectSwitcher: React.FC<ProjectSwitcherProps> = ({ className = '' }) => {
  const {
    projects,
    activeProject,
    activeProjectId,
    switchProject,
    addProject,
    updateProject,
    deleteProject
  } = useProjectRegistry();

  const [isOpen, setIsOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectMeta | null>(null);
  const [copiedPathId, setCopiedPathId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formTermuxPath, setFormTermuxPath] = useState('');
  const [formRepoUrl, setFormRepoUrl] = useState('');
  const [formBranch, setFormBranch] = useState('main');
  const [formMode, setFormMode] = useState<'FULL' | 'LITE'>('FULL');
  const [formMember, setFormMember] = useState('eko');
  const [formDesc, setFormDesc] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Klik di luar menutup dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleOpenAddModal = () => {
    setFormName('');
    setFormTermuxPath('~/projects/proyek-baru');
    setFormRepoUrl('https://github.com/acimau99-netizen/proyek-baru.git');
    setFormBranch('main');
    setFormMode('FULL');
    setFormMember('eko');
    setFormDesc('');
    setShowAddModal(true);
    setIsOpen(false);
  };

  const handleOpenEditModal = (p: ProjectMeta, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProject(p);
    setFormName(p.name);
    setFormTermuxPath(p.termuxPath);
    setFormRepoUrl(p.repoUrl);
    setFormBranch(p.branch);
    setFormMode(p.mode);
    setFormMember(p.activeMemberId || 'eko');
    setFormDesc(p.description || '');
    setIsOpen(false);
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formTermuxPath.trim()) return;

    addProject({
      name: formName.trim(),
      termuxPath: formTermuxPath.trim(),
      repoUrl: formRepoUrl.trim(),
      branch: formBranch.trim() || 'main',
      mode: formMode,
      activeMemberId: formMember,
      description: formDesc.trim()
    });

    setShowAddModal(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject || !formName.trim() || !formTermuxPath.trim()) return;

    updateProject(editingProject.id, {
      name: formName.trim(),
      termuxPath: formTermuxPath.trim(),
      repoUrl: formRepoUrl.trim(),
      branch: formBranch.trim() || 'main',
      mode: formMode,
      activeMemberId: formMember,
      description: formDesc.trim()
    });

    setEditingProject(null);
  };

  const handleCopyTermuxCommand = async (path: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const cmd = `cd ${path}`;
    await copyToClipboard(cmd);
    setCopiedPathId(id);
    setTimeout(() => setCopiedPathId(null), 2000);
  };

  const handleDelete = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Hapus proyek "${name}" dari registry tablet?`)) {
      deleteProject(id);
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Tombol Pemicu di Header (Target Sentuh Ergonomis Tablet >= 44px) */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="touch-target-44 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-xs transition active:scale-95 shadow-sm"
        title={`Proyek Aktif: ${activeProject.name} (${activeProject.termuxPath}) • Klik untuk berganti proyek`}
        aria-expanded={isOpen}
      >
        <div className="w-6 h-6 rounded-lg bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
          <FolderKanban className="w-3.5 h-3.5" />
        </div>
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-100 max-w-[120px] sm:max-w-[150px] truncate">
              {activeProject.name}
            </span>
            <span className="text-[9px] px-1 py-0.2 rounded font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              {activeProject.mode}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
            <GitBranch className="w-2.5 h-2.5 text-slate-500" />
            <span className="truncate max-w-[110px]">{activeProject.branch}</span>
          </div>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 ml-0.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu Proyek */}
      {isOpen && (
        <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-80 sm:w-96 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header Panel */}
          <div className="p-3 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-cyan-400" />
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Registry Multi-Proyek Tablet
                </h3>
                <p className="text-[10px] text-slate-400">
                  Penyimpanan sandbox di ~/projects Termux
                </p>
              </div>
            </div>
            <button
              onClick={handleOpenAddModal}
              className="touch-target-44 px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1 shadow active:scale-95 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah</span>
            </button>
          </div>

          {/* Daftar Proyek */}
          <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-800/60 p-1.5">
            {projects.map((project) => {
              const isActive = project.id === activeProjectId;
              return (
                <div
                  key={project.id}
                  onClick={() => {
                    switchProject(project.id);
                    setIsOpen(false);
                  }}
                  className={`touch-target-48 p-2.5 rounded-lg flex items-center justify-between gap-2.5 cursor-pointer transition-all ${
                    isActive
                      ? 'bg-cyan-950/60 border border-cyan-500/50 shadow-inner'
                      : 'hover:bg-slate-800/70 border border-transparent'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-semibold truncate ${isActive ? 'text-cyan-300 font-bold' : 'text-slate-200'}`}>
                        {project.name}
                      </span>
                      {isActive && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          Aktif
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 font-mono">
                      <span className="truncate text-slate-300">{project.termuxPath}</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-indigo-400">{project.branch}</span>
                    </div>
                    {project.description && (
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">
                        {project.description}
                      </p>
                    )}
                  </div>

                  {/* Actions per item */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => handleCopyTermuxCommand(project.termuxPath, project.id, e)}
                      className="p-1.5 rounded-md text-slate-400 hover:text-cyan-300 hover:bg-slate-800"
                      title="Salin perintah 'cd' ke clipboard Termux"
                    >
                      {copiedPathId === project.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Terminal className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={(e) => handleOpenEditModal(project, e)}
                      className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                      title="Edit konfigurasi proyek"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {projects.length > 1 && (
                      <button
                        onClick={(e) => handleDelete(project.id, project.name, e)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                        title="Hapus proyek dari registry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Info */}
          <div className="p-2.5 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500">
            <span>Penyimpanan: <strong className="text-slate-400">LocalStorage</strong></span>
            <span>{projects.length} Proyek Terdaftar</span>
          </div>
        </div>
      )}

      {/* Modal Tambah Proyek Baru */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderKanban className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Tambah Proyek Baru ke Tablet</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-md text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Proyek <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="Misal: Booking System Mobile"
                  required
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Path Direktori di Termux <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={formTermuxPath}
                  onChange={e => setFormTermuxPath(e.target.value)}
                  placeholder="~/projects/nama-repo"
                  required
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Cabang Default</label>
                  <input
                    type="text"
                    value={formBranch}
                    onChange={e => setFormBranch(e.target.value)}
                    placeholder="main"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Mode Eksekusi</label>
                  <select
                    value={formMode}
                    onChange={e => setFormMode(e.target.value as 'FULL' | 'LITE')}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="FULL">FULL (Komprehensif)</option>
                    <option value="LITE">LITE (Ringkas)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">URL Remote Git (Opsional)</label>
                <input
                  type="text"
                  value={formRepoUrl}
                  onChange={e => setFormRepoUrl(e.target.value)}
                  placeholder="https://github.com/organisasi/repo.git"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Deskripsi Singkat</label>
                <textarea
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                  rows={2}
                  placeholder="Keterangan singkat arsitektur atau tujuan proyek..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="touch-target-44 px-4 py-2 rounded-lg border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="touch-target-44 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white shadow"
                >
                  Simpan Proyek
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Proyek */}
      {editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Edit Proyek: {editingProject.name}</h3>
              </div>
              <button
                onClick={() => setEditingProject(null)}
                className="p-1 rounded-md text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nama Proyek</label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Path Direktori di Termux</label>
                <input
                  type="text"
                  value={formTermuxPath}
                  onChange={e => setFormTermuxPath(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Cabang Default</label>
                  <input
                    type="text"
                    value={formBranch}
                    onChange={e => setFormBranch(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Mode Eksekusi</label>
                  <select
                    value={formMode}
                    onChange={e => setFormMode(e.target.value as 'FULL' | 'LITE')}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="FULL">FULL (Komprehensif)</option>
                    <option value="LITE">LITE (Ringkas)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">URL Remote Git</label>
                <input
                  type="text"
                  value={formRepoUrl}
                  onChange={e => setFormRepoUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="touch-target-44 px-4 py-2 rounded-lg border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="touch-target-44 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white shadow"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
