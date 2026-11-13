"""Read-only secret/sink/lockfile checks. Findings never print matched secret values.

This targeted scanner complements manual review; it is not a general SAST engine.
"""
from pathlib import Path
import json
import os
import re
import tomllib
import subprocess

root = Path(__file__).resolve().parents[1]
excluded = {'.git', '.codex', '.agents', '.planning', 'verification', '.vercel', '.netlify', '.idea', '.vscode', 'node_modules', 'release', 'coverage', 'test-results', 'playwright-report', 'blob-report', '.cache', '__pycache__', '.npm-cache'}
extensions = {'.ts', '.tsx', '.js', '.cjs', '.mjs', '.json', '.html', '.css', '.md', '.txt', '.yml', '.yaml', '.toml', '.py', '.svg'}
secret_patterns = {
    'private-key': re.compile(r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----'),
    'github-token': re.compile(r'gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}'),
    'aws-key': re.compile(r'\bAKIA[0-9A-Z]{16}\b'),
    'openai-key': re.compile(r'\bsk-(?:proj-)?[A-Za-z0-9_-]{30,}'),
    'assigned-credential': re.compile(r'''(?i)(?:password|api[_-]?key|access[_-]?token|client[_-]?secret)\s*[:=]\s*["'][A-Za-z0-9_./+\-=]{12,}["']'''),
}
sink_pattern = re.compile(r'dangerouslySetInnerHTML|\beval\s*\(|new\s+Function\s*\(|\.innerHTML\s*=|document\.write\s*\(')
findings = []
scanned = 0
if (root / '.git').exists():
    # Check the publishable working tree, including accidentally tracked ignored files.
    names = subprocess.check_output(['git', 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], cwd=root).decode('utf-8').split('\0')
    files_to_scan = sorted({root / name for name in names if name})
    tracked_ignored = subprocess.check_output(['git', 'ls-files', '--cached', '--ignored', '--exclude-standard', '-z'], cwd=root).decode('utf-8').split('\0')
    findings.extend({'kind': 'tracked-ignored-file', 'file': name} for name in tracked_ignored if name)
else:
    # Source ZIPs intentionally have no Git metadata.
    files_to_scan = []
    for directory, folders, files in os.walk(root):
        folders[:] = [folder for folder in folders if folder not in excluded]
        files_to_scan.extend(Path(directory) / name for name in files if name != 'pour_lab_prompt.md')

for file in files_to_scan:
    if not file.is_file() or file.is_symlink():
        continue
    name = file.name
    relative = file.relative_to(root).as_posix()
    if (name.startswith('.env') and name != '.env.example') or name in {'.npmrc', '.git-credentials', '.netrc', '.pypirc', 'id_rsa', 'id_ed25519'} or file.suffix in {'.pem', '.key', '.p12', '.pfx', '.jks', '.keystore'} or any(part in {'.ssh', '.aws'} for part in file.relative_to(root).parts):
        findings.append({'kind': 'sensitive-file', 'file': relative})
    if file.suffix not in extensions:
        continue
    scanned += 1
    content = file.read_text(encoding='utf-8', errors='replace')
    for number, line in enumerate(content.splitlines(), 1):
        for kind, pattern in secret_patterns.items():
            if pattern.search(line):
                findings.append({'kind': kind, 'file': relative, 'line': number, 'value': '[REDACTED]'})
        if relative.startswith('src/') and '.test.' not in name and sink_pattern.search(line):
            findings.append({'kind': 'unsafe-dom-sink', 'file': relative, 'line': number})

lock = json.loads((root / 'package-lock.json').read_text(encoding='utf-8'))
packages = lock['packages']
resolved = 0
for path, metadata in packages.items():
    if not path:
        continue
    resolved += 1
    if not metadata.get('resolved', '').startswith('https://registry.npmjs.org/'):
        findings.append({'kind': 'unexpected-registry', 'package': path})
    if not metadata.get('integrity', '').startswith('sha512-'):
        findings.append({'kind': 'missing-sha512-integrity', 'package': path})

policy = json.loads((root / 'security/headers.json').read_text(encoding='utf-8'))
vercel = json.loads((root / 'vercel.json').read_text(encoding='utf-8'))
netlify = tomllib.loads((root / 'netlify.toml').read_text(encoding='utf-8'))
vercel_policy = next((entry['headers'] for entry in vercel['headers'] if entry['source'] == '/(.*)'), [])
if {entry['key']: entry['value'] for entry in vercel_policy} != policy:
    findings.append({'kind': 'security-header-drift', 'file': 'vercel.json'})
netlify_policy = next((entry['values'] for entry in netlify['headers'] if entry['for'] == '/*'), {})
if netlify_policy != policy:
    findings.append({'kind': 'security-header-drift', 'file': 'netlify.toml'})
workflow = (root / '.github/workflows/ci.yml').read_text(encoding='utf-8')
for action in re.findall(r'uses:\s*(\S+)', workflow):
    if not re.search(r'@[a-f0-9]{40}$', action):
        findings.append({'kind': 'mutable-ci-action', 'action': action})

report = {'source_files_scanned': scanned, 'lockfile_packages_checked': resolved, 'findings': findings}
out = root / 'verification/security'
out.mkdir(parents=True, exist_ok=True)
(out / 'static-scan.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
print(json.dumps(report, indent=2))
raise SystemExit(1 if findings else 0)
