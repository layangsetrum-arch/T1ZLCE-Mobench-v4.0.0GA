/**
 * TC-P11-13: Quantitative Touch Target & Ergonomics Verification (TASK-073 / AUD-027)
 * Memverifikasi pemenuhan standar ergonomi layar sentuh tablet 8.7" (1340x800 px):
 * 1. Definisi kanonik kelas CSS .touch-target-44 dan .touch-target-48 di src/index.css.
 * 2. Verifikasi kuantitatif seluruh 13 komponen kunci dari matriks DEVICE_AUDIT.md.
 * 3. Penghitungan kuantitatif elemen tombol berstandar >= 44px di src/components/mobile/.
 * 4. Verifikasi adaptasi keyboard virtual visualViewport di MobileLayout.tsx.
 */

import fs from 'fs';
import path from 'path';

// 1. Verifikasi Definisi CSS Kanonik
export function verifyCssDeclarations(cssPath: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!fs.existsSync(cssPath)) {
    return { valid: false, errors: [`Berkas ${cssPath} tidak ditemukan.`] };
  }
  const content = fs.readFileSync(cssPath, 'utf8');

  if (!content.includes('.touch-target-44')) {
    errors.push('CSS missing .touch-target-44 class declaration');
  }
  if (!content.includes('min-height: 44px') || !content.includes('min-width: 44px')) {
    errors.push('.touch-target-44 missing min-height: 44px or min-width: 44px rule');
  }
  if (!content.includes('.touch-target-48')) {
    errors.push('CSS missing .touch-target-48 class declaration');
  }

  return { valid: errors.length === 0, errors };
}

// 2. Daftar Komponen Inti dari Matriks DEVICE_AUDIT.md yang Wajib Memenuhi min-h-[44px]
export const KEY_MOBILE_COMPONENTS = [
  { file: 'src/components/mobile/ActiveMemberSelector.tsx', name: 'ActiveMemberSelector' },
  { file: 'src/components/mobile/ProjectSwitcher.tsx', name: 'ProjectSwitcher' },
  { file: 'src/components/mobile/MobileLayout.tsx', name: 'MobileLayout' },
  { file: 'src/components/mobile/OneTapCopyButton.tsx', name: 'OneTapCopyButton' },
  { file: 'src/components/mobile/WorkspaceEditor.tsx', name: 'WorkspaceEditor' },
  { file: 'src/components/mobile/WorkspaceExportBar.tsx', name: 'WorkspaceExportBar' },
  { file: 'src/components/mobile/CommandHubTab.tsx', name: 'CommandHubTab' },
  { file: 'src/components/mobile/ContextPackTab.tsx', name: 'ContextPackTab' },
  { file: 'src/components/mobile/PromptStudio.tsx', name: 'PromptStudio' },
  { file: 'src/components/mobile/GitPullSection.tsx', name: 'GitPullSection' },
  { file: 'src/components/mobile/DeviceHandoverModal.tsx', name: 'DeviceHandoverModal' },
  { file: 'src/components/mobile/TaskClaimBanner.tsx', name: 'TaskClaimBanner' },
  { file: 'src/components/mobile/RecoveryCommandSection.tsx', name: 'RecoveryCommandSection' }
];

export function verifyKeyComponentsTouchTargets(): { valid: boolean; verifiedCount: number; errors: string[] } {
  const errors: string[] = [];
  let verifiedCount = 0;

  for (const item of KEY_MOBILE_COMPONENTS) {
    if (!fs.existsSync(item.file)) {
      errors.push(`Komponen inti tidak ditemukan: ${item.file}`);
      continue;
    }
    const content = fs.readFileSync(item.file, 'utf8');
    const hasTouchTarget =
      content.includes('touch-target-44') ||
      content.includes('touch-target-48') ||
      content.includes('min-h-[44px]') ||
      content.includes('min-h-[48px]');

    if (!hasTouchTarget) {
      errors.push(`Komponen ${item.name} (${item.file}) tidak memuat kelas target sentuh min-h-[44px]`);
    } else {
      verifiedCount++;
    }
  }

  return { valid: errors.length === 0, verifiedCount, errors };
}

// 3. Penghitungan Kuantitatif Elemen Tombol Berkelas Target Sentuh
export function countMobileTouchElements(): { totalFiles: number; totalTouchButtons: number } {
  const dir = 'src/components/mobile';
  if (!fs.existsSync(dir)) return { totalFiles: 0, totalTouchButtons: 0 };

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx') && !f.includes('.test.'));
  let totalTouchButtons = 0;

  for (const f of files) {
    const content = fs.readFileSync(path.join(dir, f), 'utf8');
    const matches = content.match(/<button\b([^>]*)>/g) || [];
    for (const m of matches) {
      if (
        m.includes('touch-target') ||
        m.includes('min-h-[44px]') ||
        m.includes('min-h-[48px]') ||
        m.includes('h-11') ||
        m.includes('h-12')
      ) {
        totalTouchButtons++;
      }
    }
  }

  return { totalFiles: files.length, totalTouchButtons };
}

// 4. Verifikasi Hook visualViewport untuk Penanganan Keyboard Virtual
export function verifyVisualViewportAdaptation(): { valid: boolean; error?: string } {
  const layoutPath = 'src/components/mobile/MobileLayout.tsx';
  if (!fs.existsSync(layoutPath)) {
    return { valid: false, error: `${layoutPath} tidak ditemukan` };
  }
  const content = fs.readFileSync(layoutPath, 'utf8');

  const hasViewportHook = content.includes('useVisualViewport');
  const hasKeyboardVar = content.includes('--keyboard-height');
  const hasViewportVar = content.includes('--viewport-height');

  if (!hasViewportHook || !hasKeyboardVar || !hasViewportVar) {
    return { valid: false, error: 'MobileLayout.tsx missing visualViewport awareness or CSS variable binding' };
  }

  return { valid: true };
}

function main() {
  console.log('=================================================================');
  console.log('TC-P11-13: Quantitative Touch Target & Ergonomics Verification');
  console.log('Target: Samsung Galaxy Tab A7 Lite (SM-T225) 8.7" Touch Discipline');
  console.log('=================================================================');

  // Check 1: CSS
  const cssRes = verifyCssDeclarations('src/index.css');
  if (!cssRes.valid) {
    console.error('❌ Check 1 Gagal:', cssRes.errors);
    process.exit(1);
  }
  console.log('✅ [CHECK 1] Definisi CSS .touch-target-44 & .touch-target-48 valid.');

  // Check 2: Key Components Matrix
  const compRes = verifyKeyComponentsTouchTargets();
  if (!compRes.valid) {
    console.error('❌ Check 2 Gagal:', compRes.errors);
    process.exit(1);
  }
  console.log(`✅ [CHECK 2] Seluruh ${compRes.verifiedCount}/${KEY_MOBILE_COMPONENTS.length} komponen mobile inti menerapkan min-h-[44px].`);

  // Check 3: Quantitative Touch Buttons Count
  const stats = countMobileTouchElements();
  if (stats.totalTouchButtons < 30) {
    console.error(`❌ Check 3 Gagal: Terlalu sedikit elemen berkelas touch target (${stats.totalTouchButtons})`);
    process.exit(1);
  }
  console.log(`✅ [CHECK 3] Terverifikasi ${stats.totalTouchButtons} elemen tombol dengan kelas sentuh 44px+ di ${stats.totalFiles} berkas mobile.`);

  // Check 4: Viewport & Keyboard Adaptation
  const viewRes = verifyVisualViewportAdaptation();
  if (!viewRes.valid) {
    console.error('❌ Check 4 Gagal:', viewRes.error);
    process.exit(1);
  }
  console.log('✅ [CHECK 4] Adaptasi virtual keyboard visualViewport terverifikasi.');

  console.log('=================================================================');
  console.log('RESULT: ALL ERGONOMICS & TOUCH TARGET CHECKS PASSED (4/4 PASS)');
  console.log('=================================================================');
}

if (process.argv[1]?.endsWith('touchTarget.test.ts')) {
  main();
}
