#!/usr/bin/env python3
import json, sys, os
from pathlib import Path

SAMPLES_DIR = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("samples")
OUT_FILE    = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("samples/sample-index.json")

VALID_EXTS = {".wav"}
IGNORE = {"README.md", "README.txt", ".DS_Store", "Thumbs.db"}

def is_audio_file(p: Path) -> bool:
    return p.is_file() and (p.suffix.lower() in VALID_EXTS) and (p.name not in IGNORE)

def build_index(samples_dir: Path) -> dict:
    index = {}
    if not samples_dir.exists():
        return index

    for category in sorted([d for d in samples_dir.iterdir() if d.is_dir()]):
        packs = [p for p in category.iterdir() if p.is_dir()]
        if not packs:
            continue

        index[category.name] = {}
        for pack in sorted(packs):
            files = sorted(
                [f.name for f in pack.iterdir() if is_audio_file(f)],
                key=lambda n: (n.lower())
            )
            if files:
                index[category.name][pack.name] = files

        if not index[category.name]:
            del index[category.name]

    return index

def main():
    idx = build_index(SAMPLES_DIR)
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUT_FILE.write_text(json.dumps(idx, indent=2) + "\n", encoding="utf-8")
    print(f"✅ Wrote {OUT_FILE}")

if __name__ == "__main__":
    main()