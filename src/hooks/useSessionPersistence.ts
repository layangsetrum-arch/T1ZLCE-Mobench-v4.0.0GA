import { useState, useEffect, useRef, useCallback } from 'react';
import { ParsedSessionState } from '../types/zlce';
import { parseSessionStateMarkdown } from '../utils/markdownParser';
import { INITIAL_SESSION_STATE_MD } from '../data/templates';

const STORAGE_KEY_MARKDOWN = 'zlce_session_raw_markdown';
const STORAGE_KEY_STATE = 'zlce_session_state_data';
const STORAGE_KEY_LAST_SAVED = 'zlce_session_last_saved';
const STORAGE_KEY_HISTORY = 'zlce_session_history';

export interface SessionSnapshot {
  id: string;
  timestamp: number;
  label: string;
  rawMarkdown: string;
  stateData: ParsedSessionState;
}

export interface DiskSyncState {
  isLive: boolean;
  isSaving: boolean;
  isReading: boolean;
  lastDiskSync: Date | null;
  diskMtime: number | null;
  filePath: string;
  error: string | null;
  externalChangeDetected: boolean;
}

export interface UseSessionPersistenceReturn {
  lastSaved: Date | null;
  isSaved: boolean;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => boolean;
  redo: () => boolean;
  restoreFromStorage: () => boolean;
  restoreSnapshot: (snapshotId: string) => boolean;
  resetToDefault: () => void;
  createManualSnapshot: (label?: string) => void;
  clearStorage: () => void;
  hasStoredSession: boolean;
  history: SessionSnapshot[];
  historyIndex: number;
  // Live Disk Sync (Single Source of Truth)
  diskSync: DiskSyncState;
  reloadFromDisk: () => Promise<boolean>;
  saveToDiskNow: () => Promise<boolean>;
  dismissExternalChange: () => void;
}

function saveLightweightHistory(snapshots: SessionSnapshot[]) {
  try {
    // Only persist the 5 most recent snapshots to keep LocalStorage write snappy (<25KB instead of 1MB)
    const lightweight = snapshots.slice(-5).map(({ id, timestamp, label, rawMarkdown }) => ({
      id,
      timestamp,
      label,
      rawMarkdown
    }));
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(lightweight));
  } catch {
    // Storage quota fallback
  }
}

export function useSessionPersistence(
  rawMarkdown: string,
  stateData: ParsedSessionState,
  setRawMarkdown: React.Dispatch<React.SetStateAction<string>>,
  setStateData: React.Dispatch<React.SetStateAction<ParsedSessionState>>,
  options: { maxHistory?: number; debounceMs?: number } = {}
): UseSessionPersistenceReturn {
  const { maxHistory = 35, debounceMs = 350 } = options;

  const [lastSaved, setLastSaved] = useState<Date | null>(() => {
    try {
      const savedTime = localStorage.getItem(STORAGE_KEY_LAST_SAVED);
      return savedTime ? new Date(savedTime) : null;
    } catch {
      return null;
    }
  });

  const [isSaved, setIsSaved] = useState<boolean>(true);
  const [hasStoredSession, setHasStoredSession] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MARKDOWN);
      return Boolean(saved && saved.trim().length > 0 && saved !== INITIAL_SESSION_STATE_MD);
    } catch {
      return false;
    }
  });

  // Disk sync state tracking
  const [diskSync, setDiskSync] = useState<DiskSyncState>({
    isLive: false,
    isSaving: false,
    isReading: false,
    lastDiskSync: null,
    diskMtime: null,
    filePath: '/SESSION_STATE.md',
    error: null,
    externalChangeDetected: false
  });

  // History stack for Undo / Redo in current session
  const [history, setHistory] = useState<SessionSnapshot[]>(() => {
    try {
      const savedHistory = localStorage.getItem(STORAGE_KEY_HISTORY);
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.slice(-maxHistory).map((item: any) => ({
            id: item.id,
            timestamp: item.timestamp,
            label: item.label,
            rawMarkdown: item.rawMarkdown,
            stateData: item.stateData || parseSessionStateMarkdown(item.rawMarkdown)
          }));
        }
      }
    } catch {
      // Fallback
    }
    return [
      {
        id: 'init-' + Date.now(),
        timestamp: Date.now(),
        label: 'Initial State',
        rawMarkdown,
        stateData
      }
    ];
  });

  const [historyIndex, setHistoryIndex] = useState<number>(() => {
    return history.length - 1;
  });

  // Ref flags to prevent infinite loops when updating from undo/redo/restore or external disk sync
  const isInternalChangeRef = useRef<boolean>(false);
  const isDiskOriginUpdateRef = useRef<boolean>(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastKnownDiskMtimeRef = useRef<number | null>(null);

  // Helper: Reload live state directly from disk /SESSION_STATE.md
  const reloadFromDisk = useCallback(async (): Promise<boolean> => {
    try {
      setDiskSync(prev => ({ ...prev, isReading: true, error: null }));
      const response = await fetch('/api/session-state', {
        headers: { 'Cache-Control': 'no-cache' }
      });

      if (!response.ok) {
        throw new Error(`Gagal memuat status disk (HTTP ${response.status})`);
      }

      const data = await response.json();
      if (data && typeof data.content === 'string') {
        const parsed = parseSessionStateMarkdown(data.content);

        // Mark as internal disk update to prevent echoing back to disk immediately
        isInternalChangeRef.current = true;
        isDiskOriginUpdateRef.current = true;
        lastKnownDiskMtimeRef.current = data.mtime;

        setRawMarkdown(data.content);
        setStateData(parsed);

        // Persist to local cache as well
        localStorage.setItem(STORAGE_KEY_MARKDOWN, data.content);
        localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(parsed));
        localStorage.setItem(STORAGE_KEY_LAST_SAVED, new Date().toISOString());

        const now = new Date();
        setLastSaved(now);
        setIsSaved(true);
        setHasStoredSession(true);

        setDiskSync(prev => ({
          ...prev,
          isLive: true,
          isReading: false,
          lastDiskSync: now,
          diskMtime: data.mtime,
          error: null,
          externalChangeDetected: false
        }));

        // Append to history snapshot
        const newSnap: SessionSnapshot = {
          id: 'disk-sync-' + Date.now(),
          timestamp: Date.now(),
          label: `Disk Reload (${parsed.status?.activeTask || 'Live'})`,
          rawMarkdown: data.content,
          stateData: parsed
        };

        setHistory(prev => {
          const next = [...prev, newSnap].slice(-maxHistory);
          setHistoryIndex(next.length - 1);
          saveLightweightHistory(next);
          return next;
        });

        return true;
      }
      return false;
    } catch (err: any) {
      console.warn('[ZLCE Disk Sync] Gagal membaca dari disk:', err);
      setDiskSync(prev => ({
        ...prev,
        isReading: false,
        error: err?.message || 'Gagal sinkronisasi disk'
      }));
      return false;
    }
  }, [maxHistory, setRawMarkdown, setStateData]);

  // Helper: Force save current in-memory markdown directly to disk /SESSION_STATE.md
  const saveToDiskNow = useCallback(async (): Promise<boolean> => {
    try {
      setDiskSync(prev => ({ ...prev, isSaving: true, error: null }));
      const response = await fetch('/api/session-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: rawMarkdown,
          source: 'ui-manual-save'
        })
      });

      if (!response.ok) {
        throw new Error(`Gagal menyimpan ke disk (HTTP ${response.status})`);
      }

      const res = await response.json();
      const now = new Date();
      lastKnownDiskMtimeRef.current = res.mtime;

      setDiskSync(prev => ({
        ...prev,
        isLive: true,
        isSaving: false,
        lastDiskSync: now,
        diskMtime: res.mtime,
        error: null
      }));

      // Also persist to localStorage
      localStorage.setItem(STORAGE_KEY_MARKDOWN, rawMarkdown);
      localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(stateData));
      localStorage.setItem(STORAGE_KEY_LAST_SAVED, now.toISOString());
      setLastSaved(now);
      setIsSaved(true);

      return true;
    } catch (err: any) {
      console.error('[ZLCE Disk Sync] Gagal menulis ke disk:', err);
      setDiskSync(prev => ({
        ...prev,
        isSaving: false,
        error: err?.message || 'Gagal menulis ke berkas disk /SESSION_STATE.md'
      }));
      return false;
    }
  }, [rawMarkdown, stateData]);

  // Dismiss external change indicator
  const dismissExternalChange = useCallback(() => {
    setDiskSync(prev => ({ ...prev, externalChangeDetected: false }));
  }, []);

  // 1. Initial Load & SSE Stream Setup
  useEffect(() => {
    let isMounted = true;
    let eventSource: EventSource | null = null;
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    // Load initial data from disk
    const initDiskSync = async () => {
      try {
        const res = await fetch('/api/session-state', {
          headers: { 'Cache-Control': 'no-cache' }
        });

        if (res.ok && isMounted) {
          const data = await res.json();
          if (data && typeof data.content === 'string' && data.content.trim().length > 0) {
            const parsed = parseSessionStateMarkdown(data.content);
            isInternalChangeRef.current = true;
            isDiskOriginUpdateRef.current = true;
            lastKnownDiskMtimeRef.current = data.mtime;

            setRawMarkdown(data.content);
            setStateData(parsed);

            const now = new Date();
            setLastSaved(now);
            setIsSaved(true);
            setHasStoredSession(true);

            setDiskSync(prev => ({
              ...prev,
              isLive: true,
              lastDiskSync: now,
              diskMtime: data.mtime,
              error: null
            }));

            // Sync initial state into history
            setHistory([
              {
                id: 'disk-init-' + Date.now(),
                timestamp: Date.now(),
                label: 'Disk Initial (/SESSION_STATE.md)',
                rawMarkdown: data.content,
                stateData: parsed
              }
            ]);
            setHistoryIndex(0);
          }
        } else if (isMounted) {
          // If disk API returns 404/500, mark as local mode
          setDiskSync(prev => ({
            ...prev,
            isLive: false,
            error: 'Endpoint disk tidak merespon, berjalan di mode lokal'
          }));
        }
      } catch (err: any) {
        if (isMounted) {
          setDiskSync(prev => ({
            ...prev,
            isLive: false,
            error: 'Koneksi disk bridge tidak tersedia'
          }));
        }
      }
    };

    initDiskSync();

    // Setup SSE connection for live file changes
    try {
      eventSource = new EventSource('/api/session-state/watch');

      eventSource.onopen = () => {
        if (!isMounted) return;
        setDiskSync(prev => {
          if (prev.isLive && prev.error === null) return prev;
          return { ...prev, isLive: true, error: null };
        });
      };

      eventSource.onmessage = (e) => {
        if (!isMounted) return;
        try {
          const payload = JSON.parse(e.data);
          if (payload.type === 'CONNECTED') {
            setDiskSync(prev => {
              if (prev.isLive && prev.diskMtime === payload.mtime) return prev;
              return { ...prev, isLive: true, diskMtime: payload.mtime };
            });
          } else if (payload.type === 'DISK_FILE_CHANGED') {
            // External file change from disk! (CLI / Termux / Git / AI edit)
            if (payload.mtime !== lastKnownDiskMtimeRef.current) {
              lastKnownDiskMtimeRef.current = payload.mtime;
              reloadFromDisk();
            }
          }
        } catch {
          // Heartbeat or ping comment
        }
      };

      eventSource.onerror = () => {
        if (!isMounted) return;
        // Don't thrash state if document is hidden (user switched to chat)
        if (typeof document !== 'undefined' && document.hidden) return;
        setDiskSync(prev => {
          if (!prev.isLive) return prev;
          return { ...prev, isLive: false };
        });
      };
    } catch {
      // SSE fallback: periodic polling
    }

    // Immediate single check on switching back from Chat to Preview tab
    const handleVisibilityChange = async () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible' && isMounted) {
        try {
          const res = await fetch('/api/disk-status');
          if (res.ok) {
            const status = await res.json();
            if (
              status.mtime &&
              lastKnownDiskMtimeRef.current &&
              status.mtime !== lastKnownDiskMtimeRef.current
            ) {
              lastKnownDiskMtimeRef.current = status.mtime;
              reloadFromDisk();
            }
          }
        } catch {
          // quiet fallback
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Polling fallback to ensure sync even if SSE disconnects (8s interval, idle when tab hidden)
    pollInterval = setInterval(async () => {
      if (!isMounted) return;
      if (typeof document !== 'undefined' && document.hidden) return; // Skip polling when user switched to chat
      try {
        const res = await fetch('/api/disk-status');
        if (res.ok) {
          const status = await res.json();
          if (
            status.mtime &&
            lastKnownDiskMtimeRef.current &&
            status.mtime !== lastKnownDiskMtimeRef.current
          ) {
            lastKnownDiskMtimeRef.current = status.mtime;
            reloadFromDisk();
          }
        }
      } catch {
        // quiet fallback
      }
    }, 8000);

    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (eventSource) {
        eventSource.close();
      }
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [reloadFromDisk, setRawMarkdown, setStateData]);

  // 2. Persist to Disk & LocalStorage whenever rawMarkdown or stateData changes
  useEffect(() => {
    // If change was triggered by undo/redo/restore or disk pull, skip echo save
    if (isInternalChangeRef.current || isDiskOriginUpdateRef.current) {
      isInternalChangeRef.current = false;
      isDiskOriginUpdateRef.current = false;
      return;
    }

    setIsSaved(false);
    setDiskSync(prev => {
      if (prev.isSaving) return prev;
      return { ...prev, isSaving: true };
    });

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      const now = new Date();

      // 1. Always save to LocalStorage for offline safety
      try {
        localStorage.setItem(STORAGE_KEY_MARKDOWN, rawMarkdown);
        localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(stateData));
        localStorage.setItem(STORAGE_KEY_LAST_SAVED, now.toISOString());
        setLastSaved(now);
        setIsSaved(true);
        setHasStoredSession(true);

        // Update history snapshot
        const currentSnapshot = history[historyIndex];
        if (!currentSnapshot || currentSnapshot.rawMarkdown !== rawMarkdown) {
          const updatedHistory = history.slice(0, historyIndex + 1);
          const newSnapshot: SessionSnapshot = {
            id: 'snap-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
            timestamp: Date.now(),
            label: `Edit (${stateData.status?.activeTask || stateData.context?.projectName || 'Update'})`,
            rawMarkdown,
            stateData
          };

          const trimmed = [...updatedHistory, newSnapshot].slice(-maxHistory);
          setHistory(trimmed);
          setHistoryIndex(trimmed.length - 1);
          saveLightweightHistory(trimmed);
        }
      } catch (err) {
        console.warn('[ZLCE Storage] LocalStorage write error:', err);
      }

      // 2. Real-time Disk Write: Write to physical /SESSION_STATE.md
      try {
        const response = await fetch('/api/session-state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: rawMarkdown,
            source: 'ui-auto-save'
          })
        });

        if (response.ok) {
          const res = await response.json();
          lastKnownDiskMtimeRef.current = res.mtime;
          setDiskSync(prev => ({
            ...prev,
            isLive: true,
            isSaving: false,
            lastDiskSync: now,
            diskMtime: res.mtime,
            error: null
          }));
        } else {
          setDiskSync(prev => ({
            ...prev,
            isSaving: false,
            error: `Disk write failed (HTTP ${response.status})`
          }));
        }
      } catch (err: any) {
        setDiskSync(prev => ({
          ...prev,
          isSaving: false,
          error: 'Jaringan disk bridge terputus'
        }));
      }
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [rawMarkdown, stateData, historyIndex, maxHistory, debounceMs]);

  // Undo: Step back in history
  const undo = useCallback((): boolean => {
    if (historyIndex > 0) {
      const prevIdx = historyIndex - 1;
      const targetSnapshot = history[prevIdx];
      if (targetSnapshot) {
        isInternalChangeRef.current = true;
        setHistoryIndex(prevIdx);
        setRawMarkdown(targetSnapshot.rawMarkdown);
        setStateData(targetSnapshot.stateData);
        setIsSaved(true);

        // Also push undo state to disk
        fetch('/api/session-state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: targetSnapshot.rawMarkdown, source: 'ui-undo' })
        }).catch(() => {});

        return true;
      }
    }
    return false;
  }, [historyIndex, history, setRawMarkdown, setStateData]);

  // Redo: Step forward in history
  const redo = useCallback((): boolean => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      const targetSnapshot = history[nextIdx];
      if (targetSnapshot) {
        isInternalChangeRef.current = true;
        setHistoryIndex(nextIdx);
        setRawMarkdown(targetSnapshot.rawMarkdown);
        setStateData(targetSnapshot.stateData);
        setIsSaved(true);

        // Also push redo state to disk
        fetch('/api/session-state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: targetSnapshot.rawMarkdown, source: 'ui-redo' })
        }).catch(() => {});

        return true;
      }
    }
    return false;
  }, [historyIndex, history, setRawMarkdown, setStateData]);

  // Restore: Load persisted rawMarkdown & stateData from localStorage
  const restoreFromStorage = useCallback((): boolean => {
    try {
      const storedMd = localStorage.getItem(STORAGE_KEY_MARKDOWN);
      const storedState = localStorage.getItem(STORAGE_KEY_STATE);

      if (!storedMd) {
        return false;
      }

      let parsedState: ParsedSessionState;
      if (storedState) {
        try {
          parsedState = JSON.parse(storedState);
        } catch {
          parsedState = parseSessionStateMarkdown(storedMd);
        }
      } else {
        parsedState = parseSessionStateMarkdown(storedMd);
      }

      isInternalChangeRef.current = true;
      setRawMarkdown(storedMd);
      setStateData(parsedState);
      setIsSaved(true);

      // Create snapshot
      const restoreSnap: SessionSnapshot = {
        id: 'snap-restore-' + Date.now(),
        timestamp: Date.now(),
        label: 'Restored from LocalStorage',
        rawMarkdown: storedMd,
        stateData: parsedState
      };

      const next = [...history, restoreSnap].slice(-maxHistory);
      setHistory(next);
      setHistoryIndex(next.length - 1);
      saveLightweightHistory(next);

      // Write restored to disk
      fetch('/api/session-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: storedMd, source: 'ui-restore' })
      }).catch(() => {});

      return true;
    } catch (err) {
      console.error('[ZLCE Storage] Gagal memulihkan sesi:', err);
      return false;
    }
  }, [history, maxHistory, setRawMarkdown, setStateData]);

  // Restore snapshot by ID
  const restoreSnapshot = useCallback((snapshotId: string): boolean => {
    const target = history.find(s => s.id === snapshotId);
    if (!target) return false;

    const idx = history.findIndex(s => s.id === snapshotId);
    isInternalChangeRef.current = true;
    setHistoryIndex(idx);
    setRawMarkdown(target.rawMarkdown);
    setStateData(target.stateData);
    setIsSaved(true);

    fetch('/api/session-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: target.rawMarkdown, source: 'ui-restore-snapshot' })
    }).catch(() => {});

    return true;
  }, [history, setRawMarkdown, setStateData]);

  // Reset to default template
  const resetToDefault = useCallback(() => {
    const defaultData = parseSessionStateMarkdown(INITIAL_SESSION_STATE_MD);
    isInternalChangeRef.current = true;
    setRawMarkdown(INITIAL_SESSION_STATE_MD);
    setStateData(defaultData);

    const resetSnap: SessionSnapshot = {
      id: 'snap-reset-' + Date.now(),
      timestamp: Date.now(),
      label: 'Reset to Template Awal',
      rawMarkdown: INITIAL_SESSION_STATE_MD,
      stateData: defaultData
    };

    const next = [...history, resetSnap].slice(-maxHistory);
    setHistory(next);
    setHistoryIndex(next.length - 1);
    saveLightweightHistory(next);

    try {
      localStorage.setItem(STORAGE_KEY_MARKDOWN, INITIAL_SESSION_STATE_MD);
      localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(defaultData));
      localStorage.setItem(STORAGE_KEY_LAST_SAVED, new Date().toISOString());
      setLastSaved(new Date());
      setIsSaved(true);
    } catch {
      // ignore
    }

    fetch('/api/session-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: INITIAL_SESSION_STATE_MD, source: 'ui-reset' })
    }).catch(() => {});
  }, [maxHistory, setRawMarkdown, setStateData]);

  // Manual snapshot checkpoint
  const createManualSnapshot = useCallback((label?: string) => {
    const newSnapshot: SessionSnapshot = {
      id: 'snap-manual-' + Date.now(),
      timestamp: Date.now(),
      label: label || `Manual Checkpoint (${new Date().toLocaleTimeString('id-ID')})`,
      rawMarkdown,
      stateData
    };

    setHistory(prev => {
      const next = [...prev, newSnapshot].slice(-maxHistory);
      setHistoryIndex(next.length - 1);
      saveLightweightHistory(next);
      return next;
    });
  }, [rawMarkdown, stateData, maxHistory]);

  // Clear storage
  const clearStorage = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY_MARKDOWN);
      localStorage.removeItem(STORAGE_KEY_STATE);
      localStorage.removeItem(STORAGE_KEY_LAST_SAVED);
      localStorage.removeItem(STORAGE_KEY_HISTORY);
      setHasStoredSession(false);
      setLastSaved(null);
    } catch {
      // ignore
    }
  }, []);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return {
    lastSaved,
    isSaved,
    canUndo,
    canRedo,
    undo,
    redo,
    restoreFromStorage,
    restoreSnapshot,
    resetToDefault,
    createManualSnapshot,
    clearStorage,
    hasStoredSession,
    history,
    historyIndex,
    // Real-time Disk Bridge
    diskSync,
    reloadFromDisk,
    saveToDiskNow,
    dismissExternalChange
  };
}
