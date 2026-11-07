#!/usr/bin/env node
/**
 * ZLCE Canonical Asset Synchronizer
 * Syncs canonical files from root and scripts/ to scripts/zlce/ and zlce-starter-kit/
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const SYNC_PAIRS = [
  // Scripts: from scripts/ to scripts/zlce/ and zlce-starter-kit/scripts/
  {
    src: 'scripts/zlce-check.py',
    destinations: ['scripts/zlce/zlce-check.py', 'zlce-starter-kit/scripts/zlce-check.py']
  },
  {
    src: 'scripts/zlce-collect.py',
    destinations: ['scripts/zlce/zlce-collect.py', 'zlce-starter-kit/scripts/zlce-collect.py']
  },
  {
    src: 'scripts/zlce-snapshot.sh',
    destinations: ['scripts/zlce/zlce-snapshot.sh', 'zlce-starter-kit/scripts/zlce-snapshot.sh'],
    chmod: 0o755
  },
  // Prompts: from root to zlce-starter-kit/
  {
    src: 'LANDING_PROMPT.md',
    destinations: ['zlce-starter-kit/LANDING_PROMPT.md']
  },
  {
    src: 'HANDOVER_PROMPT.md',
    destinations: ['zlce-starter-kit/HANDOVER_PROMPT.md']
  },
  {
    src: 'examples/SESSION_STATE.example.md',
    destinations: ['zlce-starter-kit/examples/SESSION_STATE.example.md']
  }
];

let syncCount = 0;
for (const item of SYNC_PAIRS) {
  const srcPath = path.join(root, item.src);
  if (!fs.existsSync(srcPath)) {
    console.warn(`[WARN] Source not found: ${item.src}`);
    continue;
  }
  const content = fs.readFileSync(srcPath);

  for (const dest of item.destinations) {
    const destPath = path.join(root, dest);
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, content);
    if (item.chmod) {
      try {
        fs.chmodSync(destPath, item.chmod);
      } catch {
        // ignore on filesystems without chmod
      }
    }
    syncCount++;
  }
}

console.log(`[OK] Synchronized ${syncCount} target files from canonical sources.`);
