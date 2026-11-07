import React, { useState, useMemo } from 'react';
import { TabType, ParsedSessionState } from './types/zlce';
import { INITIAL_SESSION_STATE_MD } from './data/templates';
import { parseSessionStateMarkdown } from './utils/markdownParser';
import { validateSessionState } from './utils/zlceValidator';
import { validateSessionStateIntegrity } from './utils/sessionStateValidator';
import { Header } from './components/Header';
import { DashboardTab } from './components/DashboardTab';
import { SessionStateTab } from './components/SessionStateTab';
import { LandingWizardTab } from './components/LandingWizardTab';
import { RevisionTriageTab } from './components/RevisionTriageTab';
import { TestHarnessTab } from './components/TestHarnessTab';
import { TutorialTab } from './components/TutorialTab';
import { PersistentSidebar } from './components/PersistentSidebar';
import { FullscreenEditorModal } from './components/FullscreenEditorModal';
import { useSessionPersistence, SessionSnapshot, UseSessionPersistenceReturn } from './hooks/useSessionPersistence';
import { MobileLayout } from './components/mobile/MobileLayout';
import { WorkspaceReader } from './components/mobile/WorkspaceReader';
import { ContextPackTab } from './components/mobile/ContextPackTab';
import { ResultCaptureTab } from './components/mobile/ResultCaptureTab';
import { AiHandoverWizard } from './components/mobile/AiHandoverWizard';
import { SessionTimelineTab } from './components/mobile/SessionTimelineTab';
import { CommandHubTab } from './components/mobile/CommandHubTab';
import { GitSyncTab } from './components/mobile/GitSyncTab';
import { FeedbackReviewTab } from './components/mobile/FeedbackReviewTab';
import { ShieldCheck, Info, RotateCcw, Undo2, Redo2, Check } from 'lucide-react';

export { useSessionPersistence };
export type { SessionSnapshot, UseSessionPersistenceReturn };

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isFullscreenEditorOpen, setIsFullscreenEditorOpen] = useState<boolean>(false);

  // Initialize rawMarkdown from localStorage if present
  const [rawMarkdown, setRawMarkdown] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('zlce_session_raw_markdown');
      if (saved && saved.trim().length > 0) {
        // If stored data is the old Todo API example, migrate to current workspace project
        if (saved.includes('Todo API') && !saved.includes('ZLCE Mobile Workbench')) {
          localStorage.setItem('zlce_session_raw_markdown', INITIAL_SESSION_STATE_MD);
          return INITIAL_SESSION_STATE_MD;
        }
        return saved;
      }
    } catch {
      // fallback
    }
    return INITIAL_SESSION_STATE_MD;
  });

  // Initialize stateData from localStorage or fallback
  const [stateData, setStateData] = useState<ParsedSessionState>(() => {
    try {
      const savedState = localStorage.getItem('zlce_session_state_data');
      if (savedState) {
        const parsed = JSON.parse(savedState);
        if (parsed.context?.projectName?.includes('Todo API') && !parsed.context?.projectName?.includes('ZLCE Mobile')) {
          const fresh = parseSessionStateMarkdown(INITIAL_SESSION_STATE_MD);
          localStorage.setItem('zlce_session_state_data', JSON.stringify(fresh));
          return fresh;
        }
        return parsed;
      }
      const savedMd = localStorage.getItem('zlce_session_raw_markdown');
      if (savedMd) {
        return parseSessionStateMarkdown(savedMd);
      }
    } catch {
      // fallback
    }
    return parseSessionStateMarkdown(INITIAL_SESSION_STATE_MD);
  });

  // Automatic persistence to localStorage with Undo/Restore history capability
  const persistence = useSessionPersistence(
    rawMarkdown,
    stateData,
    setRawMarkdown,
    setStateData,
    { maxHistory: 35, debounceMs: 400 }
  );

  // Global keyboard shortcuts:
  // - Ctrl/Cmd + Shift + F: Toggle Fullscreen Editor
  // - Ctrl/Cmd + Z: Undo session change (when not typing inside an input/textarea)
  // - Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z: Redo session change
  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Fullscreen shortcut
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'F' || e.key === 'f')) {
        e.preventDefault();
        setIsFullscreenEditorOpen(prev => !prev);
        return;
      }

      // Check if user is typing in standard textarea/input
      const activeEl = document.activeElement;
      const isInputFocused = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

      // Undo: Ctrl/Cmd + Z (outside raw input, or global)
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
        if (!isInputFocused && persistence.canUndo) {
          e.preventDefault();
          persistence.undo();
        }
      }

      // Redo: Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z
      if (
        ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'y' || e.key === 'Y')) ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z'))
      ) {
        if (!isInputFocused && persistence.canRedo) {
          e.preventDefault();
          persistence.redo();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [persistence]);

  // Real-time validation computation with strict canonical integrity checks (TASK-011)
  const validation = useMemo(() => {
    return validateSessionStateIntegrity(rawMarkdown);
  }, [rawMarkdown]);

  const handleUpdateMarkdown = React.useCallback((newMd: string) => {
    setRawMarkdown(newMd);
  }, []);

  const handleUpdateStateData = React.useCallback((newData: ParsedSessionState) => {
    setStateData(newData);
  }, []);

  const handleRunLinter = React.useCallback(() => {
    // Force re-evaluation and switch to session tab to view diagnostics
    setActiveTab('session');
  }, []);

  const handleToggleFullscreen = React.useCallback(() => {
    setIsFullscreenEditorOpen(prev => !prev);
  }, []);

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col font-sans overflow-x-hidden">
      <MobileLayout activeTab={activeTab} onNavigateTab={(tab) => setActiveTab(tab as TabType)}>
        {/* App Header & Navigation */}
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          validation={validation}
          onRunLinter={handleRunLinter}
          rawMarkdown={rawMarkdown}
          onUpdateMarkdown={handleUpdateMarkdown}
          onToggleFullscreen={handleToggleFullscreen}
          persistence={persistence}
        />

        {/* Main Container */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
          {activeTab === 'dashboard' && (
            <DashboardTab
              stateData={stateData}
              rawMarkdown={rawMarkdown}
              validation={validation}
              onUpdateMarkdown={handleUpdateMarkdown}
              onUpdateStateData={handleUpdateStateData}
              onNavigateTab={(tab) => setActiveTab(tab as TabType)}
              onRunLinter={handleRunLinter}
              persistence={persistence}
            />
          )}

          {activeTab === 'session' && (
            <SessionStateTab
              stateData={stateData}
              rawMarkdown={rawMarkdown}
              validation={validation}
              onUpdateMarkdown={handleUpdateMarkdown}
              onUpdateStateData={handleUpdateStateData}
              onRunLinter={handleRunLinter}
              onToggleFullscreen={handleToggleFullscreen}
              persistence={persistence}
            />
          )}

          {activeTab === 'workspace-reader' && (
            <WorkspaceReader
              initialMarkdown={rawMarkdown}
              onSelectDocument={(md) => handleUpdateMarkdown(md)}
            />
          )}

          {activeTab === 'context-pack' && (
            <ContextPackTab
              sessionState={stateData}
              onNavigateTab={(tab) => setActiveTab(tab as TabType)}
              initialTaskId={stateData.status.activeTask || 'TASK-013'}
            />
          )}

          {activeTab === 'result-capture' && (
            <ResultCaptureTab
              sessionState={stateData}
              rawMarkdown={rawMarkdown}
              onUpdateMarkdown={handleUpdateMarkdown}
              onNavigateTab={(tab) => setActiveTab(tab as TabType)}
            />
          )}

          {activeTab === 'ai-handover' && (
            <AiHandoverWizard
              sessionState={stateData}
              rawMarkdown={rawMarkdown}
              onUpdateMarkdown={handleUpdateMarkdown}
              onNavigateTab={(tab) => setActiveTab(tab as TabType)}
            />
          )}

          {activeTab === 'feedback' && (
            <FeedbackReviewTab
              sessionState={stateData}
              rawMarkdown={rawMarkdown}
              onUpdateMarkdown={handleUpdateMarkdown}
              onNavigateTab={(tab) => setActiveTab(tab as TabType)}
            />
          )}

          {activeTab === 'session-timeline' && (
            <SessionTimelineTab
              persistence={persistence}
              currentMarkdown={rawMarkdown}
              onRestoreMarkdown={handleUpdateMarkdown}
            />
          )}

          {activeTab === 'command-hub' && (
            <CommandHubTab
              stateData={stateData}
              rawMarkdown={rawMarkdown}
              onNavigateTab={(tab) => setActiveTab(tab as TabType)}
              onUpdateVerification={(evidence) => {
                if (!rawMarkdown) return;
                const updated = rawMarkdown.replace(
                  /(\*\*Perintah Verifikasi:\*\*)[^\n]*/i,
                  `$1 \`${evidence}\``
                );
                handleUpdateMarkdown(updated);
              }}
            />
          )}

          {activeTab === 'git-sync' && (
            <GitSyncTab
              sessionState={stateData}
              rawMarkdown={rawMarkdown}
              onNavigateTab={(tab) => setActiveTab(tab as TabType)}
              onUpdateMarkdown={handleUpdateMarkdown}
            />
          )}

          {activeTab === 'initiation' && (
            <LandingWizardTab
              stateData={stateData}
              rawMarkdown={rawMarkdown}
              onNavigateTab={(tab) => setActiveTab(tab as TabType)}
            />
          )}

          {activeTab === 'prompt-engine' && (
            <ContextPackTab 
              sessionState={stateData}
              onNavigateTab={(tab) => setActiveTab(tab as TabType)} 
              initialTaskId={stateData.status.activeTask || 'TASK-013'}
              initialMode="prompt-studio"
            />
          )}

          {activeTab === 'runtime-engine' && (
            <ContextPackTab
              sessionState={stateData}
              onNavigateTab={(tab) => setActiveTab(tab as TabType)}
              initialTaskId={stateData.status.activeTask || 'TASK-013'}
              initialMode="context-pack"
            />
          )}

          {activeTab === 'recovery' && (
            <CommandHubTab 
              stateData={stateData} 
              rawMarkdown={rawMarkdown} 
              initialCategory="recovery"
              onNavigateTab={(tab) => setActiveTab(tab as TabType)}
            />
          )}

          {activeTab === 'triage' && <RevisionTriageTab stateData={stateData} />}

          {activeTab === 'harness' && <TestHarnessTab />}

          {activeTab === 'templates' && (
            <WorkspaceReader
              initialMarkdown={rawMarkdown}
              onSelectDocument={(md) => handleUpdateMarkdown(md)}
            />
          )}

          {activeTab === 'tutorial' && (
            <TutorialTab 
              sessionState={stateData} 
              onNavigateTab={setActiveTab} 
            />
          )}
        </main>

        {/* Persistent Quick Ops Sidebar */}
        <PersistentSidebar
          rawMarkdown={rawMarkdown}
          onUpdateMarkdown={handleUpdateMarkdown}
          stateData={stateData}
          onUpdateStateData={handleUpdateStateData}
          validation={validation}
          onRunLinter={handleRunLinter}
          onToggleFullscreen={handleToggleFullscreen}
          isFullscreen={isFullscreenEditorOpen}
          persistence={persistence}
        />

        {/* Fullscreen Editor Modal */}
        {isFullscreenEditorOpen && (
          <FullscreenEditorModal
            rawMarkdown={rawMarkdown}
            onUpdateMarkdown={handleUpdateMarkdown}
            onUpdateStateData={handleUpdateStateData}
            validation={validation}
            onClose={() => setIsFullscreenEditorOpen(false)}
            persistence={persistence}
          />
        )}

        {/* Footer info bar */}
        <footer className="border-t border-slate-800/80 bg-slate-950/90 py-4 px-4 sm:px-8 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>Zero-Loss Context Engineering (ZLCE) Kit v3.2.2 • Single Source of Truth</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span>Anti-Ekstrapolasi Jam: <strong className="text-emerald-400">Fix X1 Aktif</strong></span>
            <span>Protokol Recovery: <strong className="text-cyan-400">Kasus A / B / C / D</strong></span>
          </div>
        </footer>
      </MobileLayout>
    </div>
  );
};

export default App;
