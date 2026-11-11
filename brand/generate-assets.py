#!/usr/bin/env python3
"""Compatibility entry point; use the same portable generator as npm run icons."""
from pathlib import Path
import subprocess
import sys

raise SystemExit(subprocess.call([
    "node", str(Path(__file__).with_suffix(".js")), *sys.argv[1:]
]))
