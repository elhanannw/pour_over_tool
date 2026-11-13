"""Package public source and an optional production build, excluding local artifacts."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import os

root = Path(__file__).resolve().parents[1]
output = root / 'release' / 'pour-lab-v1.0.0.zip'
output.parent.mkdir(exist_ok=True)
excluded = {'.git', '.codex', '.agents', '.planning', 'verification', '.vercel', '.netlify', '.idea', '.vscode', '.ssh', '.aws', 'node_modules', 'release', 'coverage', 'test-results', 'playwright-report', 'blob-report', '.cache', '.npm-cache', '__pycache__'}
project_folders = {'src', 'e2e', 'public', 'scripts', 'security', '.github', 'dist'}
project_files = {'README.md', 'SECURITY.md', 'package.json', 'package-lock.json', 'index.html', 'vite.config.ts', 'playwright.config.ts', 'tsconfig.json', 'vercel.json', 'netlify.toml', '.nvmrc', '.gitignore', '.prettierrc.json'}
with ZipFile(output, 'w', ZIP_DEFLATED) as archive:
    for directory, folders, files in os.walk(root):
        folders[:] = sorted(folder for folder in folders if folder not in excluded and not folder.startswith('.env') and not (Path(directory) / folder).is_symlink() and (Path(directory) != root or folder in project_folders))
        for name in sorted(files):
            file = Path(directory) / name
            if Path(directory) == root and name not in project_files:
                continue
            if not file.is_symlink() and not name.startswith('.env') and name not in {'.npmrc', '.git-credentials', '.netrc', '.pypirc', 'id_rsa', 'id_ed25519'} and not name.endswith(('.tsbuildinfo', '.local', '.pem', '.key', '.p12', '.pfx', '.jks', '.keystore', '.log', '.pyc', '.pyo')):
                archive.write(file, Path('pour-lab') / file.relative_to(root))
print(f'{output} ({output.stat().st_size:,} bytes)')
