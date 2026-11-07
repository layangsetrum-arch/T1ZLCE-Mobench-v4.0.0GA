/**
 * ZLCE Mobile Workbench v4.0.0 Type Definitions
 * Spesifikasi tipe data untuk komponen mobile, tim estafet, registri proyek, context pack, dan template perintah.
 * Rujukan: docs/mobile/blueprint/02_COMPONENT_ARCHITECTURE.md & 06_REPOSITORY_CHANGES.md
 */

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  avatarColor: string;
  aiPreference?: string;
  notes?: string;
}

export type ActiveMember = TeamMember;

export interface ProjectMeta {
  id: string;
  name: string;
  termuxPath: string;
  repoUrl: string;
  branch: string;
  activeMemberId: string;
  lastAccessed: string;
  mode: 'FULL' | 'LITE';
  description?: string;
}

export interface ContextPack {
  projectName: string;
  taskId: string;
  taskName: string;
  activeMember: string;
  targetAi: 'gemini' | 'claude' | 'chatgpt' | 'generic';
  tokenBudget: number;
  timestamp: string;
  blueprintSummary: string;
  activeWal: {
    task: string;
    currentStep: string;
    plannedFiles: string;
    verificationCommand: string;
  };
  handoverNotes: string;
  rules: string[];
}

export type CommandRiskLevel = 'safe' | 'mutating' | 'destructive';

export interface CommandTemplate {
  id: string;
  category: 'git' | 'validator' | 'recovery' | 'handover';
  title: string;
  description: string;
  riskLevel: CommandRiskLevel;
  directCommand: string;
  dispatcherCommand?: string;
  requiredParams: string[];
}

export interface TerminalPasteResult {
  rawOutput: string;
  result: 'OK' | 'FAIL' | 'UNKNOWN';
  errorsCount: number;
  warnsCount: number;
  tasksCount: number;
  details: string[];
  timestamp: string;
}

export interface DeviceProfile {
  model: string;
  screenSize: string;
  resolution: string;
  ram: string;
  minTouchTargetPx: number;
  termuxSupported: boolean;
}

export type AiHandoverReason = 
  | 'TOKEN_LIMIT_REACHED' 
  | 'CONTEXT_EXHAUSTED' 
  | 'MODEL_CAPABILITY_SWITCH' 
  | 'SESSION_DISCONNECT' 
  | 'ROUTINE_ROTATION' 
  | 'OTHER';

export type ConflictSeverity = 'HIGH' | 'MEDIUM' | 'LOW';

export type ConflictCategory = 
  | 'ARCHITECTURAL_DIVERGENCE' 
  | 'ASSUMPTION_CONTRADICTION' 
  | 'FILE_SCOPE_DRIFT' 
  | 'DEPENDENCY_CHANGE' 
  | 'STATUS_DISCREPANCY'
  | 'WAL_DIVERGENCE';

export type ConflictResolutionStatus = 
  | 'PENDING_HUMAN' 
  | 'ACCEPTED' 
  | 'REJECTED' 
  | 'OVERRIDDEN';

export interface DecisionConflict {
  id: string;
  code: 'CONFLICT_DECISION' | 'DIVERGENT_WAL' | 'SCOPE_DRIFT' | 'ADR_VIOLATION';
  category: ConflictCategory;
  severity: ConflictSeverity;
  title: string;
  description: string;
  sourceAiProposal: string;
  anchorBaseline: string;
  detectedAt: string;
  resolutionStatus: ConflictResolutionStatus;
  humanNotes?: string;
  resolvedBy?: string;
  resolvedAt?: string;
}

export interface AiHandoverState {
  sourceAi: string;
  sourceModelName: string;
  targetAi: string;
  targetModelName: string;
  targetTokenBudget: string;
  taskId: string;
  reason: AiHandoverReason;
  customReasonNote?: string;
  lastWalSnapshot?: string;
  conflicts: DecisionConflict[];
  handoverPromptMarkdown?: string;
  section6Summary?: string;
  timestamp: string;
}
