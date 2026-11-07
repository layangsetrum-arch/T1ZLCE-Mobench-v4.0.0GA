/**
 * Git Commit Formatter for ZLCE Mobile Workbench (TASK-032 & TASK-063 AUD-017)
 * Injects dynamic identity flags `-c user.name='...' -c user.email='...'`
 * per commit with strict POSIX single-quoting to prevent configuration injection (ADR-05).
 * Enforces atomic task commit messages prefixed with `TASK-xxx:` and strict file path validation.
 */
import { TeamMember } from '../types/mobile';
import { 
  sanitizeGitMessage, 
  sanitizeTaskId, 
  shellQuote, 
  assertSafeRepoPath 
} from './commandSanitizer';

export interface FormattedCommitPayload {
  taskId: string;
  member: TeamMember;
  message: string;
  filesToStage?: string[];
  scope?: string; // e.g. feat, fix, docs, refactor, test
}

export interface FormattedCommitResult {
  fullCommand: string;
  stageCommand: string;
  commitCommand: string;
  pushCommand: string;
  combinedCommand: string;
  formattedMessage: string;
  attribution: {
    authorName: string;
    authorEmail: string;
  };
}

/**
 * Normalizes the commit message to guarantee strict atomic format:
 * `TASK-xxx: [type(scope)] description`
 */
export function formatAtomicCommitMessage(
  taskId: string,
  rawMessage: string,
  scope?: string
): string {
  const cleanTaskId = sanitizeTaskId(taskId);
  const cleanMsg = sanitizeGitMessage(rawMessage);

  // If the message already starts with the taskId, avoid duplicating it
  const pattern = new RegExp(`^${cleanTaskId}[:\\s]+`, 'i');
  const stripped = cleanMsg.replace(pattern, '').trim();

  let body = stripped || 'update implementasi task';
  if (scope && !body.startsWith(scope)) {
    body = `${scope}: ${body}`;
  }

  return `${cleanTaskId}: ${body}`;
}

/**
 * Builds the atomic Git commit command with POSIX single-quoted identity flags:
 * `git -c user.name='[Nama]' -c user.email='[Email]' commit -m '[TASK-xxx]: ...'`
 * and safe path separator `--`.
 */
export function generateIdentityCommitCommand(payload: FormattedCommitPayload): FormattedCommitResult {
  const { taskId, member, message, filesToStage = ['SESSION_STATE.md'], scope } = payload;

  const cleanTaskId = sanitizeTaskId(taskId);
  const formattedMessage = formatAtomicCommitMessage(cleanTaskId, message, scope);

  const name = (member?.name ?? '').trim();
  const email = (member?.email ?? '').trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9 ._()-]{0,63}$/.test(name)) {
    throw new Error('Nama anggota tidak valid untuk identitas commit');
  }
  if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) {
    throw new Error('Email anggota tidak valid untuk identitas commit');
  }

  const rawFiles = filesToStage && filesToStage.length > 0 ? filesToStage : ['SESSION_STATE.md'];
  const files = rawFiles.map(assertSafeRepoPath);

  const stageCommand = `git add -- ${files.map(shellQuote).join(' ')}`;
  const commitCommand = `git -c user.name=${shellQuote(name)} -c user.email=${shellQuote(email)} commit -m ${shellQuote(formattedMessage)}`;
  const pushCommand = `git push origin ${shellQuote(`task/${cleanTaskId}`)}`;

  const combinedCommand = `${stageCommand} && ${commitCommand} && ${pushCommand}`;

  return {
    fullCommand: `${stageCommand} && ${commitCommand}`,
    stageCommand,
    commitCommand,
    pushCommand,
    combinedCommand,
    formattedMessage,
    attribution: {
      authorName: name,
      authorEmail: email,
    },
  };
}
