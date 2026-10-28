#!/usr/bin/env python3
"""Fail the build unless every playable title has explicit license evidence."""
from __future__ import annotations
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def main() -> int:
    path = ROOT / "data" / "list.json"
    if not path.exists():
        print("catalog missing", file=sys.stderr); return 1
    data = json.loads(path.read_text(encoding="utf-8"))
    bad = []
    for item in data.get("items", []):
        if not item.get("play"):
            continue
        tags = set(item.get("tags") or [])
        # Existing catalog rows do not carry detail fields, so only trust an explicit
        # license tag. The builder is updated to add this tag for verified sources.
        if not ({"public-domain", "creative-commons"} & tags):
            bad.append(item.get("k") or item.get("en") or item.get("fa"))
    if bad:
        print(f"unverified playable entries: {len(bad)}", file=sys.stderr)
        print("\n".join(map(str, bad[:20])), file=sys.stderr)
        return 1
    print(f"license validation passed: {sum(1 for x in data.get('items', []) if x.get('play'))} playable entries")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
