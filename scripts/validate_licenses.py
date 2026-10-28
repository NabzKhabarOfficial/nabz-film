#!/usr/bin/env python3
"""Fail the build unless every playable title has matching open-license evidence."""
from __future__ import annotations
import json
import sys
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]

def main() -> int:
    catalog = json.loads((ROOT / "data" / "list.json").read_text(encoding="utf-8"))
    bad = []
    playable = 0
    for item in catalog.get("items", []):
        if not item.get("play"):
            continue
        playable += 1
        key = str(item.get("k") or "")
        detail_path = ROOT / "data" / "t" / f"{key}.json"
        try:
            detail = json.loads(detail_path.read_text(encoding="utf-8"))
        except Exception:
            bad.append((key, "missing detail")); continue
        source = str(detail.get("source") or "").lower()
        source_url = str(detail.get("source_url") or "")
        ia = str(detail.get("ia") or "")
        if not ("مالکیت عمومی" in source or "creative commons" in source or "creative commons" in source_url.lower()):
            bad.append((key, "missing verified open-license label")); continue
        if not ia or "archive.org/details/" not in source_url or ia not in source_url:
            bad.append((key, "source identity mismatch")); continue
        sources = detail.get("sources") or []
        if not sources or any(f"/download/{ia}/" not in str(row.get("src") or "") for row in sources):
            bad.append((key, "media path does not match source identity"))
    if bad:
        print(f"license validation failed: {len(bad)} of {playable} playable entries", file=sys.stderr)
        for key, reason in bad[:30]: print(f"{key}: {reason}", file=sys.stderr)
        return 1
    print(f"license validation passed: {playable} playable entries")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
