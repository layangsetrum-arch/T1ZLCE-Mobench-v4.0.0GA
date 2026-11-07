/**
 * ZLCE Session History & Unified Audit Log Hook (TASK-023)
 * Mengelola riwayat snapshot sesi (hingga 35 snapshot), perbandingan diff,
 * atribusi nama driver tablet, dan batasan kuota aman localStorage.
 * 
 * Rujukan: docs/mobile/blueprint/14_MULTI_AI_TEAM_MODEL.md
 */

import { useState, useMemo, useCallback } from 'react';
import { SessionSnapshot, UseSessionPersistenceReturn } from './useSessionPersistence';
import { TeamMember } from '../types/mobile';
import { loadTeamRegistry, getMemberById } from '../data/teamMembers';

export interface TimelineEntry {
  id: string;
  timestamp: number;
  formattedTime: string;
  formattedDate: string;
  label: string;
  activeDriver: TeamMember;
  activeTask?: string;
  activeTaskStatus?: string;
  totalTasks: number;
  doneTasks: number;
  charCount: number;
  approxTokens: number;
  rawMarkdown: string;
}

export interface DiffSummary {
  addedLinesCount: number;
  removedLinesCount: number;
  changedTasks: Array<{ id: string; oldStatus?: string; newStatus?: string }>;
  diffSnippets: string[];
}

/**
 * Menghitung diff ringkas antara dua teks markdown
 */
export function computeMarkdownDiff(oldMd: string, newMd: string): DiffSummary {
  const oldLines = oldMd.split(/\r?\n/);
  const newLines = newMd.split(/\r?\n/);

  let added = 0;
  let removed = 0;
  const snippets: string[] = [];

  const oldSet = new Set(oldLines);
  const newSet = new Set(newLines);

  for (const l of newLines) {
    if (l.trim() && !oldSet.has(l)) {
      added++;
      if (snippets.length < 8 && (l.startsWith('|') || l.startsWith('*') || l.startsWith('#'))) {
        snippets.push(`+ ${l.trim()}`);
      }
    }
  }

  for (const l of oldLines) {
    if (l.trim() && !newSet.has(l)) {
      removed++;
      if (snippets.length < 8 && (l.startsWith('|') || l.startsWith('*') || l.startsWith('#'))) {
        snippets.push(`- ${l.trim()}`);
      }
    }
  }

  // Deteksi perubahan status task
  const changedTasks: Array<{ id: string; oldStatus?: string; newStatus?: string }> = [];
  const taskRegex = /\|\s*(TASK-\d{3})\s*\|[^|]*\|[^|]*\|\s*(PENDING|READY|IN_PROGRESS|BLOCKED|DONE)\s*\|/g;

  const oldTasks = new Map<string, string>();
  let m: RegExpExecArray | null;
  while ((m = taskRegex.exec(oldMd)) !== null) {
    oldTasks.set(m[1], m[2]);
  }

  const newTasks = new Map<string, string>();
  while ((m = taskRegex.exec(newMd)) !== null) {
    newTasks.set(m[1], m[2]);
  }

  for (const [tid, newStatus] of newTasks.entries()) {
    const oldStatus = oldTasks.get(tid);
    if (oldStatus && oldStatus !== newStatus) {
      changedTasks.push({ id: tid, oldStatus, newStatus });
    }
  }

  return {
    addedLinesCount: added,
    removedLinesCount: removed,
    changedTasks,
    diffSnippets: snippets
  };
}

export function useSessionHistory(
  persistence?: UseSessionPersistenceReturn,
  currentMarkdown: string = ''
) {
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);
  const [filterMemberId, setFilterMemberId] = useState<string>('ALL');

  // Format seluruh snapshot menjadi entri timeline visual
  const timelineEntries: TimelineEntry[] = useMemo(() => {
    if (!persistence?.history) return [];

    return persistence.history.map((snap) => {
      const d = new Date(snap.timestamp);
      const timeStr = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const dateStr = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

      // Deteksi driver dari WAL atau label snapshot
      let driverId = 'oned';
      const labelLower = snap.label.toLowerCase();
      const members = loadTeamRegistry();
      for (const m of members) {
        if (labelLower.includes(m.name.toLowerCase()) || labelLower.includes(m.id)) {
          driverId = m.id;
          break;
        }
      }
      if (snap.stateData?.wal?.currentStep) {
        for (const m of members) {
          if (snap.stateData.wal.currentStep.toLowerCase().includes(m.name.toLowerCase())) {
            driverId = m.id;
            break;
          }
        }
      }

      const driver = getMemberById(driverId);
      const tasks = snap.stateData?.tasks || [];
      const doneCount = tasks.filter(t => t.status === 'DONE').length;
      const charCount = snap.rawMarkdown.length;
      const approxTokens = Math.ceil(charCount / 4);

      return {
        id: snap.id,
        timestamp: snap.timestamp,
        formattedTime: timeStr,
        formattedDate: dateStr,
        label: snap.label,
        activeDriver: driver,
        activeTask: snap.stateData?.status?.activeTask,
        activeTaskStatus: snap.stateData?.status?.activeTaskStatus,
        totalTasks: tasks.length,
        doneTasks: doneCount,
        charCount,
        approxTokens,
        rawMarkdown: snap.rawMarkdown
      };
    }).reverse(); // Yang terbaru di atas
  }, [persistence?.history]);

  // Filter berdasarkan anggota
  const filteredTimeline = useMemo(() => {
    if (filterMemberId === 'ALL') return timelineEntries;
    return timelineEntries.filter(t => t.activeDriver.id.toLowerCase() === filterMemberId.toLowerCase());
  }, [timelineEntries, filterMemberId]);

  // Snapshot yang sedang dipilih untuk perbandingan diff
  const selectedSnapshot = useMemo(() => {
    if (!selectedSnapshotId) return timelineEntries[0] || null;
    return timelineEntries.find(t => t.id === selectedSnapshotId) || null;
  }, [timelineEntries, selectedSnapshotId]);

  // Hitung diff snapshot terpilih terhadap state terkini
  const currentDiff = useMemo(() => {
    if (!selectedSnapshot) return null;
    return computeMarkdownDiff(selectedSnapshot.rawMarkdown, currentMarkdown);
  }, [selectedSnapshot, currentMarkdown]);

  // Restore snapshot
  const restoreSelected = useCallback(() => {
    if (!selectedSnapshotId || !persistence) return false;
    return persistence.restoreSnapshot(selectedSnapshotId);
  }, [selectedSnapshotId, persistence]);

  return {
    timelineEntries,
    filteredTimeline,
    selectedSnapshot,
    selectedSnapshotId,
    setSelectedSnapshotId,
    filterMemberId,
    setFilterMemberId,
    currentDiff,
    restoreSelected,
    totalSnapshots: timelineEntries.length
  };
}
