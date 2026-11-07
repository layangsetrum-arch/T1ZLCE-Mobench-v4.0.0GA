#!/usr/bin/env python3
"""
Script pembuat berkas bundel ZIP khusus Arsitektur Ketahanan Android LMK & Recovery ZLCE.
Membundel 5 berkas kunci:
1. SESSION_STATE.md (Status sesi & Sumber Kebenaran Tunggal)
2. docs/mobile/MOBILE_BLUEPRINT.md (Cetak Biru Utama Mobile ZLCE)
3. src/hooks/useAutoDraftCache.ts (Implementasi debounce & visibilitychange lifecycle flush)
4. src/tests/lmkRecovery.test.ts (Suite uji simulasi Android LMK & pemulihan memori 3GB)
5. docs/mobile/blueprint/09_FAILURE_AND_RECOVERY.md (Protokol kegagalan & strategi LMK)

Target output: public/assets/zlce-lmk-recovery-bundle.zip
"""

import os
import zipfile
import sys

FILES_TO_BUNDLE = [
    "SESSION_STATE.md",
    "docs/mobile/MOBILE_BLUEPRINT.md",
    "src/hooks/useAutoDraftCache.ts",
    "src/tests/lmkRecovery.test.ts",
    "docs/mobile/blueprint/09_FAILURE_AND_RECOVERY.md"
]

OUTPUT_ZIP = "public/assets/zlce-lmk-recovery-bundle.zip"

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

    print(f"[*] Menyiapkan bundel ZIP LMK Recovery di: {OUTPUT_ZIP}")
    included_count = 0

    with zipfile.ZipFile(OUTPUT_ZIP, "w", zipfile.ZIP_DEFLATED) as zipf:
        for rel_path in FILES_TO_BUNDLE:
            full_path = os.path.join(base_dir, rel_path)
            if os.path.exists(full_path):
                add_file_with_permissions(zipf, full_path, arcname=rel_path)
                size_kb = os.path.getsize(full_path) / 1024
                mode_str = "0755" if is_executable(rel_path) else "0644"
                print(f"  [+] Ditambahkan: {rel_path} ({size_kb:.1f} KB, mode {mode_str})")
                included_count += 1
            else:
                print(f"  [-] Peringatan: Berkas tidak ditemukan: {rel_path}")

    zip_size_kb = os.path.getsize(OUTPUT_ZIP) / 1024
    print(f"[OK] Berhasil membuat bundel LMK Recovery: {OUTPUT_ZIP} ({included_count}/{len(FILES_TO_BUNDLE)} berkas, {zip_size_kb:.1f} KB)")
    return included_count

if __name__ == "__main__":
    count = create_bundle()
    if count == 0:
        sys.exit(1)
    sys.exit(0)
