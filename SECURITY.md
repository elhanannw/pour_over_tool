# Security

Pour Lab runs entirely in the browser. Recipes, history and JSON backups are stored as plaintext on the user's device; the app has no account system or backend.

Imported backups are checked against a closed schema with numeric, collection and file-size limits. Recipe names and tasting notes are rendered as text. Browser security headers are defined in `security/headers.json`; run `python scripts/sync-security.py` after changing that policy.

## Development checks

```sh
npm audit
npm run security:scan
npm test
```

The targeted source/lockfile/configuration scan requires Python 3.11+. It also rejects files that are tracked despite matching `.gitignore`. Generated reports stay local and are not committed. This scan supplements code review and dependency audits.

The npm database may still list GHSA-gcqx-w48m-w2h4 against the PWA build dependency chain. Its [authoritative CVE record](https://github.com/CVEProject/cvelistV5/blob/main/cves/2026/93xxx/CVE-2026-93753.json) was rejected on 2 November 2026. Review the current upstream record when assessing that warning.

Keep credentials, environment files and exported user backups out of Git. If a credential is ever committed, rotate it; adding an ignore rule does not remove it from existing history.
