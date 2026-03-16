# Sentry to GitHub Issues Sync

Automated synchronization tool that imports Sentry errors into GitHub Issues.

---

## English

### Overview

This tool automatically fetches unresolved Sentry issues and creates detailed GitHub Issues with full error context including stack traces, user information, environment details, and breadcrumb trails.

### Features

- Automatic sync via GitHub Actions (daily at 6AM UTC)
- Manual trigger support
- Deduplication (skips already synced issues)
- Full error context: stack traces, breadcrumbs, user info
- No external dependencies (uses built-in Node.js fetch)
- Rate limiting with retry logic
- Parallel processing

### Quick Start

```bash
# Install dependencies
npm install

# Run sync
SENTRY_TOKEN=your_sentry_token GITHUB_TOKEN=your_github_token node sync-sentry.js

# Force sync all (ignore existing)
FORCE_SYNC=true SENTRY_TOKEN=xxx GITHUB_TOKEN=xxx node sync-sentry.js
```

### Configuration

**Environment Variables:**

| Variable | Required | Description |
|----------|----------|-------------|
| `SENTRY_TOKEN` | Yes | Sentry API token |
| `GITHUB_TOKEN` | Yes | GitHub API token |
| `SENTRY_ORG` | No | Sentry organization (default: sebastian-boga) |
| `SENTRY_PROJECT` | No | Sentry project ID |
| `GITHUB_REPO` | No | Target repository (owner/repo) |
| `FORCE_SYNC` | No | Sync all issues ignoring existing |

**Command Line Options:**

```bash
-d, --dry-run           Preview without creating issues
-f, --force-sync        Sync all issues
-o, --org <name>        Sentry organization
-p, --project <id>      Sentry project ID  
-r, --repo <owner/repo> GitHub repository
-h, --help              Show help
```

### Project Structure

```
sentry/
├── sync-sentry.js              # Main script
├── package.json
├── .gitignore
└── .github/
    ├── workflows/
    │   └── sentry-sync.yml    # GitHub Actions
    └── ISSUE_TEMPLATE/
        └── sentry-bug.md      # Issue template
```

### GitHub Actions

The workflow runs:
- Daily at 6:00 AM UTC
- On push to main
- Manually via workflow_dispatch

### Dependencies

- Node.js >= 18
- No npm packages required (uses built-in fetch)

---

## Română

### Prezentare Generală

Acest instrument sincronizează automat erorile din Sentry în GitHub Issues cu context complet: stack traces, informații despre utilizator, detalii despre mediu și breadcrumb trails.

### Caracteristici

- Sincronizare automată via GitHub Actions (zilnic la 6AM UTC)
- Suport pentru declanșare manuală
- Deduplicare (sare peste problemele deja sincronizate)
- Context complet al erorii: stack traces, breadcrumbs, info utilizator
- Fără dependențe externe (folosește fetch-ul Node.js integrat)
- Rate limiting cu retry logic
- Procesare paralelă

### Utilizare Rapidă

```bash
# Instalează dependențele
npm install

# Rulează sincronizarea
SENTRY_TOKEN=token_sentry GITHUB_TOKEN=token_github node sync-sentry.js
```

### Configurare

**Variabile de Mediu:**

| Variabilă | Necesar | Descriere |
|-----------|---------|-----------|
| `SENTRY_TOKEN` | Da | Token API Sentry |
| `GITHUB_TOKEN` | Da | Token API GitHub |
| `SENTRY_ORG` | Nu | Organizația Sentry |
| `SENTRY_PROJECT` | Nu | ID-ul proiectului Sentry |
| `GITHUB_REPO` | Nu | Repository-ul țintă |
| `FORCE_SYNC` | Nu | Sincronizează toate |

**Opțiuni Linie de Comandă:**

```bash
-d, --dry-run           Previzualizare
-f, --force-sync        Sincronizează toate
-o, --org <nume>        Organizația Sentry
-p, --project <id>      ID-ul proiectului
-r, --repo <owner/repo> Repository GitHub
-h, --help              Ajutor
```

### Structura Proiectului

```
sentry/
├── sync-sentry.js              # Scriptul principal
├── package.json
├── .gitignore
└── .github/
    ├── workflows/
    │   └── sentry-sync.yml    # GitHub Actions
    └── ISSUE_TEMPLATE/
        └── sentry-bug.md      # Șablon Issue
```

### GitHub Actions

Workflow-ul rulează:
- Zilnic la 6:00 AM UTC
- La push pe main
- Manual via workflow_dispatch

### Dependențe

- Node.js >= 18
- Fără pachete npm necesare
