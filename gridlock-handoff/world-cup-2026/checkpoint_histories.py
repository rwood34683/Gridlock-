"""Incremental profile-only checkpoint, no roster reimport or browser work."""
from pathlib import Path
import subprocess,sys
P=Path(__file__).parent
for name in ['import_player_histories.py','audit_coverage.py','package_clean.py']:
 subprocess.run([sys.executable,str(P/name)],check=True)
