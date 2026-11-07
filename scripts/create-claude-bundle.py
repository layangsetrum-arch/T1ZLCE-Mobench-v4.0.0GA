#!/usr/bin/env python3
"""
Script pembuat berkas bundel ZIP ZLCE untuk serah terima ke Claude atau ChatGPT.
Membundel seluruh berkas status sesi, backlog task, blueprint, panduan handover,
dan kode referensi context pack ke dalam public/assets/zlce-claude-chatgpt-bundle.zip.
"""

import os
import zipfile
import sys

FILES_TO_BUNDLE = [
    # Panduan & Handover Khusus
    "CLAUDE_CHATGPT_HANDOVER.md",
    "HANDOVER_PROMPT.md",
    "LANDING_PROMPT.md",
    "ZLCE_KIT_SINGLE.md",

    # Status Kebenaran & Backlog Task
    "SESSION_STATE.md",
    "TASKS.md",

    # Blueprint & Arsitektur Terkait
    "docs/mobile/MOBILE_BLUEPRINT.md",
    "docs/mobile/blueprint/14_MULTI_AI_TEAM_MODEL.md",
    "docs/mobile/blueprint/02_COMPONENT_ARCHITECTURE.md",
    "docs/mobile/blueprint/07_WORKFLOW_DESIGN.md",
    "docs/USAGE.md",

    # Kode Referensi & Types
    "src/types/zlce.ts",
    "src/types/mobile.ts",
    "src/utils/contextPackGenerator.ts",
    "src/components/mobile/ContextPackTab.tsx",
    "src/components/TokenUsageGauge.tsx",
    "src/data/teamMembers.ts",

    # Konfigurasi & Verifikasi
    "package.json",
    "tsconfig.json",
    "scripts/zlce-check.py"
]

OUTPUT_ZIP = "public/assets/zlce-claude-chatgpt-bundle.zip"

def is_executable(rel_path: str) -> bool:
    if rel_path.startswith("scripts/"):
        ext = os.path.splitext(rel_path)[1]
        if ext in (".sh", ".py", ""):
            return True
    return False

def add_file_with_permissions(zipf: zipfile.ZipFile, full_path: str, arcname: str):
    zinfo = zipfile.ZipInfo.from_file(full_path, arcname=arcname)
    if is_executable(arcname):
        zinfo.external_attr = 0o100755 << 16
    else:
        zinfo.external_attr = 0o100644 << 16
    with open(full_path, "rb") as f:
        zipf.writestr(zinfo, f.read(), compress_type=zipfile.ZIP_DEFLATED)

def create_bundle():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.chdir(base_dir)

    os.makedirs(os.path.dirname(OUTPUT_ZIP), exist_ok=True)

    print(f"[*] Menyiapkan bundle ZIP di: {OUTPUT_ZIP}")
    included_count = 0

    with zipfile.ZipFile(OUTPUT_ZIP, "w", zipfile.ZIP_DEFLATED) as zipf:
        for rel_path in FILES_TO_BUNDLE:
            full_path = os.path.join(base_dir, rel_path)
            if os.path.exists(full_path):
                # Masukkan ke dalam zip dengan path relatif dan normalisasi permission
                add_file_with_permissions(zipf, full_path, arcname=rel_path)
                size_kb = os.path.getsize(full_path) / 1024
                mode_str = "0755" if is_executable(rel_path) else "0644"
                print(f"  [+] Ditambahkan: {rel_path} ({size_kb:.1f} KB, mode {mode_str})")
                included_count += 1
            else:
                print(f"  [-] Lewati (tidak ditemukan): {rel_path}")

    zip_size_kb = os.path.getsize(OUTPUT_ZIP) / 1024
    print(f"[OK] Berhasil membuat bundle: {OUTPUT_ZIP} ({included_count} berkas, {zip_size_kb:.1f} KB)")
    return included_count

if __name__ == "__main__":
    count = create_bundle()
    if count == 0:
        sys.exit(1)
    sys.exit(0)
