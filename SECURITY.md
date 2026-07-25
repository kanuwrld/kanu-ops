# Security Policy

## Supported version

Security fixes are applied to the latest commit on `main`.

## Reporting a vulnerability

Use
[GitHub Private Vulnerability Reporting](https://github.com/kanuwrld/kanu-ops/security/advisories/new).
Do not disclose suspected vulnerabilities in a public issue.

## Current security boundary

Kanu Ops is a single-user portfolio application. It has no authentication and
must not be exposed as a public multi-user service in its current form.

Local notes and project data are stored in SQLite. Database files, environment
files and Vercel metadata are ignored by Git.

## Controls

- Zod validation on mutation endpoints;
- parameterized SQLite queries;
- restrictive browser response headers (CSP, HSTS, frame and MIME protections);
- GitHub secret scanning and push protection;
- Dependabot alerts and automated security updates;
- CI checks for lint, TypeScript, production build and runtime dependencies.
