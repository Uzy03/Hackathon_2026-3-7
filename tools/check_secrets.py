"""Check tracked files for common credential formats without printing values."""
import re
import subprocess
from pathlib import Path

patterns = [
    rb'AIza[0-9A-Za-z_-]{35}',
    rb'(?:AKIA|ASIA)[0-9A-Z]{16}',
    rb'gh[pousr]_[0-9A-Za-z]{36,}',
    rb'github_pat_[0-9A-Za-z_]{40,}',
    rb'sb_secret_[0-9A-Za-z_-]{20,}',
    rb'sk-(?:proj-|ant-)?[0-9A-Za-z_-]{32,}',
    rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',
]
matcher = re.compile(b'|'.join(patterns))
files = subprocess.check_output(['git', 'ls-files', '-z']).decode().split('\0')
failed = False
for name in files:
    if not name:
        continue
    path = Path(name)
    if path.is_symlink() or not path.is_file():
        continue
    if path.name.startswith('.env') and path.name != '.env.example':
        print(f'{name}: tracked environment file is forbidden')
        failed = True
    if path.stat().st_size > 1_500_000:
        continue
    data = path.read_bytes()
    for match in matcher.finditer(data):
        line = data[:match.start()].count(b'\n') + 1
        print(f'{name}:{line}: possible secret (value redacted)')
        failed = True
if failed:
    raise SystemExit(1)
print('Tracked-file credential checks passed.')
