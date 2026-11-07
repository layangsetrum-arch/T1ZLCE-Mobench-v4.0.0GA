/**
 * ZLCE Active Secret Redaction Utility (TASK-069 / AUD-023)
 * Mencegah kebocoran kredensial (PAT, API keys, private keys, password) ke
 * LocalStorage draft, Context Pack portabel, atau unduhan Blob markdown.
 * Rujukan: docs/mobile/blueprint/08_SECURITY_MODEL.md
 */

export interface RedactionResult {
  redactedText: string;
  hasRedactions: boolean;
  redactedCount: number;
  summary: string[];
}

export const SECRET_PATTERNS: { name: string; pattern: RegExp }[] = [
  { name: 'GitHub PAT / Token', pattern: /(ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{40}|gho_[A-Za-z0-9]{36}|ghs_[A-Za-z0-9]{36}|ghu_[A-Za-z0-9]{36})/g },
  { name: 'Anthropic API Key', pattern: /(sk-ant-[a-zA-Z0-9_-]{32,})/g },
  { name: 'AWS Access Key', pattern: /(AKIA[0-9A-Z]{16})/g },
  { name: 'Google API Key', pattern: /(AIza[0-9A-Za-z_-]{35})/g },
  { name: 'Slack Token', pattern: /(xox[baprs]-[0-9a-zA-Z]{10,})/g },
  { name: 'Private Key Header', pattern: /-----BEGIN (RSA|OPENSSH|DSA|EC|PGP)? ?PRIVATE KEY[^-]*-----END (RSA|OPENSSH|DSA|EC|PGP)? ?PRIVATE KEY-----/gs },
  { name: 'Embedded URL Credential', pattern: /(https?:\/\/)([^/\s@:]+):([^/\s@]+)(@)/g }
];

export function redactSecrets(input: string): RedactionResult {
  if (!input) {
    return { redactedText: input, hasRedactions: false, redactedCount: 0, summary: [] };
  }

  let text = input;
  let count = 0;
  const detectedTypes = new Set<string>();

  for (const { name, pattern } of SECRET_PATTERNS) {
    if (name === 'Embedded URL Credential') {
      text = text.replace(pattern, (match, protocol, user, pass, at) => {
        // Abaikan placeholder dokumentasi seperti user:token atau user:pass
        if ((user === 'user' || user === 'username') && (pass === 'token' || pass === 'password' || pass === 'pass')) {
          return match;
        }
        count++;
        detectedTypes.add(name);
        return `${protocol}[REDACTED_USER]:[REDACTED_SECRET]${at}`;
      });
    } else {
      text = text.replace(pattern, () => {
        count++;
        detectedTypes.add(name);
        return '[REDACTED_SECRET]';
      });
    }
  }

  return {
    redactedText: text,
    hasRedactions: count > 0,
    redactedCount: count,
    summary: Array.from(detectedTypes)
  };
}
