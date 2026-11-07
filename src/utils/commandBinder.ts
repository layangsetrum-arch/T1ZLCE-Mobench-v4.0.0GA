/**
 * ZLCE Command Parameter Binder (TASK-026)
 * Mengikat parameter dinamis dari status proyek dan profil driver tablet aktif
 * ke template perintah Git & Termux dengan validasi anti-injection.
 * Rujukan: docs/mobile/blueprint/13_COMMAND_TEMPLATES.md
 */

import { CommandTemplate, TeamMember } from '../types/mobile';
import { ParsedSessionState } from '../types/zlce';
import { 
  sanitizeTaskId, 
  sanitizeMemberName, 
  sanitizeMemberEmail, 
  sanitizeCommitMessage, 
  sanitizeTouchedFiles 
} from './commandSanitizer';

export interface CommandBindingContext {
  activeTaskId?: string;
  member?: TeamMember;
  activeMember?: TeamMember;
  commitMessage?: string;
  touchedFiles?: string;
  sessionState?: ParsedSessionState;
}

export interface BoundCommandResult {
  templateId: string;
  boundDirectCommand: string;
  boundDispatcherCommand?: string;
  resolvedParams: Record<string, string>;
  hasInjectionAttempt: boolean;
  warnings: string[];
}

/**
 * Bind parameter mentah pada string perintah
 */
export function bindRawCommand(
  rawCmd: string,
  context: CommandBindingContext
): string {
  const memberObj = context.activeMember || context.member;
  const taskId = sanitizeTaskId(
    context.activeTaskId || 
    context.sessionState?.status?.activeTask || 
    'TASK-001'
  );

  const memberName = sanitizeMemberName(memberObj?.name || 'Eko');
  const memberEmail = sanitizeMemberEmail(memberObj?.email || 'eko.keplek@gmail.com');

  const commitSanitize = sanitizeCommitMessage(
    context.commitMessage || `implementasi solusi untuk ${taskId}`
  );
  const commitMsg = commitSanitize.sanitized;

  const touchedFiles = sanitizeTouchedFiles(
    context.touchedFiles || 
    context.sessionState?.wal?.plannedFiles || 
    'src/'
  );

  const resolvedParams: Record<string, string> = {
    ACTIVE_TASK_ID: taskId,
    MEMBER_NAME: memberName,
    MEMBER_EMAIL: memberEmail,
    COMMIT_MESSAGE: commitMsg,
    TOUCHED_FILES: touchedFiles,
  };

  let result = rawCmd;
  for (const [key, val] of Object.entries(resolvedParams)) {
    const placeholderRegex = new RegExp(`\\{${key}\\}`, 'g');
    result = result.replace(placeholderRegex, val);
  }
  return result;
}

/**
 * Mengikat parameter pada template perintah secara deterministik (mendukung objek CommandTemplate atau string langsung)
 */
export function bindCommandTemplate(
  template: CommandTemplate,
  context: CommandBindingContext
): BoundCommandResult;
export function bindCommandTemplate(
  rawCommand: string,
  context: CommandBindingContext
): string;
export function bindCommandTemplate(
  templateOrString: CommandTemplate | string,
  context: CommandBindingContext
): BoundCommandResult | string {
  if (typeof templateOrString === 'string') {
    return bindRawCommand(templateOrString, context);
  }

  const template = templateOrString;
  const warnings: string[] = [];
  let hasInjectionAttempt = false;

  const memberObj = context.activeMember || context.member;
  const taskId = sanitizeTaskId(
    context.activeTaskId || 
    context.sessionState?.status?.activeTask || 
    'TASK-001'
  );

  const memberName = sanitizeMemberName(memberObj?.name || 'Eko');
  const memberEmail = sanitizeMemberEmail(memberObj?.email || 'eko.keplek@gmail.com');

  const commitSanitize = sanitizeCommitMessage(
    context.commitMessage || `implementasi solusi untuk ${taskId}`
  );
  if (commitSanitize.hasInjectionAttempt) {
    hasInjectionAttempt = true;
    warnings.push(...commitSanitize.warnings);
  }
  const commitMsg = commitSanitize.sanitized;

  const touchedFiles = sanitizeTouchedFiles(
    context.touchedFiles || 
    context.sessionState?.wal?.plannedFiles || 
    'src/'
  );

  const resolvedParams: Record<string, string> = {
    ACTIVE_TASK_ID: taskId,
    MEMBER_NAME: memberName,
    MEMBER_EMAIL: memberEmail,
    COMMIT_MESSAGE: commitMsg,
    TOUCHED_FILES: touchedFiles
  };

  let direct = template.directCommand;
  let dispatcher = template.dispatcherCommand;

  for (const [key, val] of Object.entries(resolvedParams)) {
    const placeholderRegex = new RegExp(`\\{${key}\\}`, 'g');
    direct = direct.replace(placeholderRegex, val);
    if (dispatcher) {
      dispatcher = dispatcher.replace(placeholderRegex, val);
    }
  }

  return {
    templateId: template.id,
    boundDirectCommand: direct,
    boundDispatcherCommand: dispatcher,
    resolvedParams,
    hasInjectionAttempt,
    warnings
  };
}
