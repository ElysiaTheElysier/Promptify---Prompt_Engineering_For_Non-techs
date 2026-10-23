"""Compatibility launcher for app-local explicit offline allowlists; never glob live tests."""
import pathlib, subprocess, sys
root = pathlib.Path(__file__).resolve().parents[1]
failed = False
for app in ('promptify-mvp', 'promptify-intrepid'):
    result = subprocess.run(['node', 'scripts/run_offline_tests.mjs'], cwd=root / 'apps' / app)
    failed = failed or result.returncode != 0
sys.exit(1 if failed else 0)
