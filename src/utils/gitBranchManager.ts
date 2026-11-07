/**
 * Git Branch Manager for ZLCE Mobile Workbench (TASK-031)
 * Enforces branch-per-task workflow (`task/TASK-xxx`) and protection for `main`.
 * Adheres to Blueprint 05 (Storage & Sync) and Blueprint 07 (Workflow Design).
 */
import { sanitizeTaskId } from './commandSanitizer';

export interface BranchProtectionResult {
  isProtected: boolean;
  isCompliant: boolean;
  currentBranch: string;
  expectedBranch?: string;
  warningMessage?: string;
  suggestedCommand?: string;
}

export interface TaskBranchInfo {
  taskId: string;
  branchName: string;
  createCommand: string;
  switchCommand: string;
  deleteLocalCommand: string;
}

/**
 * Normalizes and formats canonical branch name for a task
 * E.g., 'TASK-031' -> 'task/TASK-031'
 */
export function getBranchNameForTask(taskId: string): string {
  const cleanId = sanitizeTaskId(taskId);
  return `task/${cleanId}`;
}

/**
 * Checks whether a branch name represents the protected main/master branch
 */
export function isMainBranch(branchName: string): boolean {
  if (!branchName) return false;
  const normalized = branchName.trim().toLowerCase();
  return (
    normalized === 'main' ||
    normalized === 'master' ||
    normalized === 'origin/main' ||
    normalized === 'origin/master'
  );
}

/**
 * Validates branch compliance against the active task ID
 * Emits warnings if the user is on `main` or on an mismatched branch
 */
export function validateBranchCompliance(
  currentBranch: string,
  activeTaskId?: string | null
): BranchProtectionResult {
  const normalized = (currentBranch || '').trim();

  // 1. Direct work on main branch is strictly protected/forbidden
  if (isMainBranch(normalized)) {
    const expected = activeTaskId ? getBranchNameForTask(activeTaskId) : 'task/TASK-xxx';
    const suggestedCmd = activeTaskId
      ? generateBranchCheckoutCommand(activeTaskId)
      : 'git checkout -b task/TASK-xxx origin/main --ff-only';

    return {
      isProtected: true,
      isCompliant: false,
      currentBranch: normalized,
      expectedBranch: expected,
      warningMessage: `PERINGATAN: Bekerja langsung di cabang '${normalized}' dilarang (ADR-03). Cabang utama diproteksi! Segera buat cabang task terisolasi.`,
      suggestedCommand: suggestedCmd,
    };
  }

  // 2. If active task is present, check matching
  if (activeTaskId) {
    const expected = getBranchNameForTask(activeTaskId);
    if (normalized && normalized !== expected) {
      return {
        isProtected: false,
        isCompliant: false,
        currentBranch: normalized,
        expectedBranch: expected,
        warningMessage: `Cabang aktif '${normalized}' tidak sinkron dengan Task Aktif '${activeTaskId}' (ekspektasi: '${expected}').`,
        suggestedCommand: `git checkout ${expected} 2>/dev/null || git checkout -b ${expected} origin/main --ff-only`,
      };
    }
  }

  return {
    isProtected: false,
    isCompliant: true,
    currentBranch: normalized,
    expectedBranch: activeTaskId ? getBranchNameForTask(activeTaskId) : undefined,
  };
}

/**
 * Generates the atomic safe branch checkout command from origin/main
 * `git fetch origin && git checkout -b task/TASK-xxx origin/main --ff-only`
 */
export function generateBranchCheckoutCommand(
  taskId: string,
  baseBranch = 'origin/main'
): string {
  const branchName = getBranchNameForTask(taskId);
  return `git fetch origin && git checkout -b ${branchName} ${baseBranch} --ff-only`;
}

/**
 * Generates the branch switch command
 */
export function generateBranchSwitchCommand(taskId: string): string {
  const branchName = getBranchNameForTask(taskId);
  return `git checkout ${branchName}`;
}

/**
 * Returns complete branch operational info for a given task ID
 */
export function getTaskBranchInfo(taskId: string): TaskBranchInfo {
  const branchName = getBranchNameForTask(taskId);
  return {
    taskId,
    branchName,
    createCommand: generateBranchCheckoutCommand(taskId),
    switchCommand: generateBranchSwitchCommand(taskId),
    deleteLocalCommand: `git branch -d ${branchName}`,
  };
}
