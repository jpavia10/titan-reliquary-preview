#!/usr/bin/env python3
"""Phase 1 wrapper: `register_p1.py RESULTS_DIR [--dry]` is `register_photos.py RESULTS_DIR --phase 1 [--dry]`.
See register_photos.py for what it reads and writes."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import register_photos

if __name__ == "__main__":
    if len(sys.argv) < 2: sys.exit(__doc__)
    register_photos.main(sys.argv[1], 1, "--dry" in sys.argv)
