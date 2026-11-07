#!/usr/bin/env python3
"""
Script pembuat berkas bundel ZIP ZLCE untuk Audit, Testing & Review Multi-AI (v4.1.0 Hardened).
Membundel seluruh berkas status sesi, backlog task, blueprint arsitektur, panduan mobile,
komponen, utilitas, tests, dan skrip runner ke dalam public/assets/zlce-audit-review-bundle.zip.
Dilengkapi gerbang validasi closure mandatori (AUD-015) dan normalisasi permission eksekusi (AUD-021).
"""

import os
import re
import sys
import tempfile
import zipfile

FILES_TO_BUNDLE = [
    # 1. Dokumen Kontrol & Kebenaran Tunggal
    "SESSION_STATE.md",
    "TASKS.md",
    "CHANGELOG.md",
    "README.md",
    "SECURITY.md",
    "CONTRIBUTING.md",
    "LICENSE",
    "ZLCE_KIT_SINGLE.md",
    "CLAUDE_CHATGPT_HANDOVER.md",
    "HANDOVER_PROMPT.md",
    "LANDING_PROMPT.md",

    # 2. Dokumen Panduan Tablet & Operasional
    "docs/USAGE.md",
    "docs/mobile/INSTALLATION.md",
    "docs/mobile/TERMUX_SETUP.md",
    "docs/mobile/USER_GUIDE.md",
    "docs/mobile/TROUBLESHOOTING.md",
    "docs/mobile/DEVICE_AUDIT.md",
    "docs/mobile/SECURITY_AUDIT.md",
    "docs/mobile/FEASIBILITY_AND_DECISIONS.md",
    "docs/mobile/MOBILE_BLUEPRINT.md",

    # 3. Seluruh 14 Cetak Biru Arsitektur Mobile
    "docs/mobile/blueprint/01_SYSTEM_OVERVIEW.md",
    "docs/mobile/blueprint/02_COMPONENT_ARCHITECTURE.md",
    "docs/mobile/blueprint/03_PWA_ARCHITECTURE.md",
    "docs/mobile/blueprint/04_TERMUX_INTEGRATION.md",
    "docs/mobile/blueprint/05_STORAGE_AND_SYNC.md",
    "docs/mobile/blueprint/06_REPOSITORY_CHANGES.md",
    "docs/mobile/blueprint/07_WORKFLOW_DESIGN.md",
    "docs/mobile/blueprint/08_SECURITY_MODEL.md",
    "docs/mobile/blueprint/09_FAILURE_AND_RECOVERY.md",
    "docs/mobile/blueprint/10_TEST_STRATEGY.md",
    "docs/mobile/blueprint/11_IMPLEMENTATION_ROADMAP.md",
    "docs/mobile/blueprint/12_ARCHITECTURE_DECISIONS.md",
    "docs/mobile/blueprint/13_COMMAND_TEMPLATES.md",
    "docs/mobile/blueprint/14_MULTI_AI_TEAM_MODEL.md",

    # 4. Berkas Contoh Kanonik & Template
    "examples/AI_WORKFLOW.example.md",
    "examples/BLUEPRINT.example.md",
    "examples/SESSION_STATE.example.md",
    "examples/TASKS.example.md",
    "templates/AI_WORKFLOW.template.md",
    "templates/ARCHITECTURE.template.md",
    "templates/BLUEPRINT.template.md",
    "templates/CHANGELOG.template.md",
    "templates/CHECKLISTS.template.md",
    "templates/DATA_MODEL.template.md",
    "templates/SESSION_STATE.template.md",
    "templates/TASKS.template.md",
    "templates/TESTING.template.md",
    "templates/profiles/DOMAIN_BOOKING.profile.md",

    # 5. Skrip Utilitas, Runner Uji & Dispatcher
    "scripts/zlce-check.py",
    "scripts/zlce-collect.py",
    "scripts/zlce-snapshot.sh",
    "scripts/run-tests.py",
    "scripts/security-audit.sh",
    "scripts/install-hooks.sh",
    "scripts/test-lmk-physical.sh",
    "scripts/sync-assets.mjs",
    "scripts/create-lmk-bundle.py",
    "scripts/create-claude-bundle.py",
    "scripts/create-audit-bundle.py",
    "scripts/zlce/zlce",
    "scripts/zlce/clean-auth.sh",
    "scripts/zlce/zlce-check.py",
    "scripts/zlce/zlce-collect.py",
    "scripts/zlce/zlce-snapshot.sh",
    "scripts/zlce/README.md",

    # 6. Types & Data
    "src/types/zlce.ts",
    "src/types/mobile.ts",
    "src/data/teamMembers.ts",
    "src/data/commandTemplates.ts",
    "src/data/scenarios.ts",
    "src/data/templates.ts",

    # 7. Hooks
    "src/hooks/useAutoDraftCache.ts",
    "src/hooks/useFileImport.ts",
    "src/hooks/useProjectRegistry.ts",
    "src/hooks/useSessionHistory.ts",
    "src/hooks/useSessionPersistence.ts",

    # 8. Utilitas Lengkap (Menutup Celah Temuan #1)
    "src/utils/auditPromptGenerator.ts",
    "src/utils/clipboard.ts",
    "src/utils/commandBinder.ts",
    "src/utils/commandSanitizer.ts",
    "src/utils/conflictDetector.ts",
    "src/utils/contextPackGenerator.ts",
    "src/utils/fileExport.ts",
    "src/utils/gateApprovalManager.ts",
    "src/utils/gitBranchManager.ts",
    "src/utils/gitCommitFormatter.ts",
    "src/utils/handoverChecklist.ts",
    "src/utils/markdownParser.ts",
    "src/utils/promptGenerator.ts",
    "src/utils/provenanceInjector.ts",
    "src/utils/redactSecrets.ts",
    "src/utils/relayHandoverGenerator.ts",
    "src/utils/sessionStateValidator.ts",
    "src/utils/taskClaimManager.ts",
    "src/utils/terminalParser.ts",
    "src/utils/tokenBudgetAdapter.ts",
    "src/utils/uuid.ts",
    "src/utils/zlceValidator.ts",

    # 9. Test Suite
    "src/tests/browserRecovery.test.ts",
    "src/tests/coldStartAi.test.ts",
    "src/tests/coldStartMember.test.ts",
    "src/tests/e2eScenarios.test.ts",
    "src/tests/gitWorkflow.test.ts",
    "src/tests/lmkRecovery.test.ts",
    "src/tests/multiUserIsolation.test.ts",
    "src/tests/offlineOperation.test.ts",
    "src/tests/taskClaim.test.ts",
    "src/tests/touchTarget.test.ts",
    "src/tests/transactionalPersistence.test.ts",

    # 10. Komponen Mobile (Menutup Celah Temuan #1 & #14)
    "src/components/mobile/index.ts",
    "src/components/mobile/ActiveMemberSelector.tsx",
    "src/components/mobile/AiHandoverWizard.tsx",
    "src/components/mobile/CommandHubTab.tsx",
    "src/components/mobile/ConflictResolutionWizard.tsx",
    "src/components/mobile/ContextPackTab.tsx",
    "src/components/mobile/DeviceHandoverModal.tsx",
    "src/components/mobile/FeedbackReviewTab.tsx",
    "src/components/mobile/GateApprovalModal.tsx",
    "src/components/mobile/GitPullSection.tsx",
    "src/components/mobile/GitSyncTab.tsx",
    "src/components/mobile/MobileLayout.tsx",
    "src/components/mobile/OneTapCopyButton.tsx",
    "src/components/mobile/PasteBackModal.tsx",
    "src/components/mobile/ProjectSwitcher.tsx",
    "src/components/mobile/PromptStudio.tsx",
    "src/components/mobile/RecoveryCommandSection.tsx",
    "src/components/mobile/ResultCaptureTab.tsx",
    "src/components/mobile/SecurityAuthTab.tsx",
    "src/components/mobile/SessionTimelineTab.tsx",
    "src/components/mobile/TaskClaimBanner.tsx",
    "src/components/mobile/TeamRegistryModal.tsx",
    "src/components/mobile/TokenBudgetSelector.tsx",
    "src/components/mobile/WorkspaceEditor.tsx",
    "src/components/mobile/WorkspaceExportBar.tsx",
    "src/components/mobile/WorkspaceReader.tsx",

    # 11. Komponen Studio Inti
    "src/components/DashboardTab.tsx",
    "src/components/FullscreenEditorModal.tsx",
    "src/components/Header.tsx",
    "src/components/LandingWizardTab.tsx",
    "src/components/PersistentSidebar.tsx",
    "src/components/PromptEngineTab.tsx",
    "src/components/RecoveryTab.tsx",
    "src/components/RevisionTriageTab.tsx",
    "src/components/RuntimeEngineTab.tsx",
    "src/components/SessionStateTab.tsx",
    "src/components/TemplatesTab.tsx",
    "src/components/TestHarnessTab.tsx",
    "src/components/TokenUsageGauge.tsx",
    "src/components/TutorialTab.tsx",

    # 12. App Shell & PWA Assets
    "src/App.tsx",
    "src/main.tsx",
    "src/index.css",
    "src/sw-register.ts",
    "src/vite-env.d.ts",
    "public/manifest.webmanifest",
    "public/sw.js",

    # 13. Konfigurasi Proyek & Git
    ".gitattributes",
    ".gitignore",
    "package.json",
    "tsconfig.json",
    "index.html",
    "metadata.json"
]

OUTPUT_ZIP = "public/assets/zlce-audit-review-bundle.zip"
MANIFEST_FILE = "SHA256SUMS.txt"

IMPORT_RE = re.compile(r"""(?:from|import)\s*\(?\s*['"](\.{1,2}/[^'"]+)['"]""")
EXTS = (".ts", ".tsx", ".js", ".mjs", ".json", ".css")

def calculate_sha256(filepath):
    import hashlib
    sha = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            sha.update(chunk)
    return sha.hexdigest()

def resolves_in_tree(base_dir, spec):
    clean_spec = spec.split('?')[0]
    target = os.path.normpath(os.path.join(base_dir, clean_spec))
    candidates = [target] + [target + e for e in EXTS] + [os.path.join(target, "index" + e) for e in EXTS]
    return any(os.path.isfile(c) for c in candidates)

def verify_bundle_closure(zip_path):
    """
    Gerbang verifikasi closure mandatori (AUD-015).
    Mengekstrak zip ke folder sementara dan memastikan seluruh relative import
    terselesaikan (0 missing imports).
    """
    missing = set()
    with tempfile.TemporaryDirectory() as tmp:
        with zipfile.ZipFile(zip_path) as zf:
            zf.extractall(tmp)
        for root, _, files in os.walk(tmp):
            for name in files:
                if not name.endswith((".ts", ".tsx")):
                    continue
                path = os.path.join(root, name)
                with open(path, encoding="utf-8") as f:
                    text = f.read()
                for spec in IMPORT_RE.findall(text):
                    if not resolves_in_tree(root, spec):
                        missing.add(f"{os.path.relpath(path, tmp)} -> {spec}")
    return sorted(missing)

def create_bundle():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.chdir(base_dir)

    os.makedirs(os.path.dirname(OUTPUT_ZIP), exist_ok=True)

    print(f"[*] Menyiapkan bundle ZIP audit deterministik di: {OUTPUT_ZIP}")
    included_count = 0
    manifest_lines = []
    missing_files = []

    # 0. AUD2-001: Verifikasi Paritas Direktori src/ (Tidak boleh ada berkas src/ yang tertinggal)
    bundled_set = set(FILES_TO_BUNDLE)
    unbundled_src = []
    src_dir = os.path.join(base_dir, "src")
    for root, _, files in os.walk(src_dir):
        for f in files:
            if f.endswith((".ts", ".tsx", ".css", ".d.ts")):
                rel_f = os.path.relpath(os.path.join(root, f), base_dir).replace("\\", "/")
                if rel_f not in bundled_set:
                    unbundled_src.append(rel_f)

    if unbundled_src:
        print(f"[FATAL] Paritas Bundel GAGAL! Ada {len(unbundled_src)} berkas di src/ yang belum didaftarkan di FILES_TO_BUNDLE:")
        for ub in sorted(unbundled_src):
            print(f"  [MISSING IN BUNDLE] {ub}")
        return 0

    print("[PASS] Paritas Direktori src/ LULUS: 100% berkas src/ telah terdaftar dalam bundel.")

    # 1. Validasi keberadaan file & buat manifest SHA-256
    for rel_path in sorted(FILES_TO_BUNDLE):
        full_path = os.path.join(base_dir, rel_path)
        if os.path.exists(full_path):
            file_hash = calculate_sha256(full_path)
            manifest_lines.append(f"{file_hash}  {rel_path}")
        else:
            missing_files.append(rel_path)

    if missing_files:
        print("[FATAL] Berkas terdaftar di FILES_TO_BUNDLE tidak ditemukan di workspace:")
        for mf in missing_files:
            print(f"  [-] {mf}")
        return 0

    manifest_content = "\n".join(manifest_lines) + "\n"

    # 2. Tulis zip dengan ZipInfo deterministik & normalisasi permission (AUD-021)
    deterministic_time = (2026, 11, 7, 0, 0, 0)

    with zipfile.ZipFile(OUTPUT_ZIP, "w", zipfile.ZIP_DEFLATED) as zipf:
        manifest_info = zipfile.ZipInfo(MANIFEST_FILE, date_time=deterministic_time)
        manifest_info.compress_type = zipfile.ZIP_DEFLATED
        manifest_info.external_attr = 0o100644 << 16
        zipf.writestr(manifest_info, manifest_content.encode("utf-8"))

        for rel_path in sorted(FILES_TO_BUNDLE):
            full_path = os.path.join(base_dir, rel_path)
            if os.path.exists(full_path):
                with open(full_path, "rb") as f:
                    file_data = f.read()
                zinfo = zipfile.ZipInfo(rel_path, date_time=deterministic_time)
                zinfo.compress_type = zipfile.ZIP_DEFLATED
                # AUD-021: Berikan bit permission eksekusi 0755 untuk skrip bash/cli
                is_exec = rel_path.endswith(".sh") or rel_path == "scripts/zlce/zlce" or rel_path.endswith(".py")
                zinfo.external_attr = (0o100755 if is_exec else 0o100644) << 16
                zipf.writestr(zinfo, file_data)
                included_count += 1

    zip_size_kb = os.path.getsize(OUTPUT_ZIP) / 1024
    print(f"[OK] Berkas ZIP dibuat: {OUTPUT_ZIP} ({included_count} berkas + manifest, {zip_size_kb:.1f} KB)")

    # 3. Gerbang Validasi Closure Mandatori (AUD-015)
    print("[*] Memverifikasi closure import modul di dalam bundel ZIP...")
    gaps = verify_bundle_closure(OUTPUT_ZIP)
    if gaps:
        print(f"[FATAL] Bundle Closure Gate GAGAL! Ditemukan {len(gaps)} import tidak terselesaikan di dalam bundel:")
        for gap in gaps:
            print(f"  [MISSING] {gap}")
        return 0

    print(f"[PASS] Bundle Closure Gate LULUS: 0 broken import. Bundel 100% self-contained.")
    return included_count

if __name__ == "__main__":
    count = create_bundle()
    if count == 0:
        sys.exit(1)
    sys.exit(0)
