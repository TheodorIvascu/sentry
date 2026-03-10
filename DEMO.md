# Sentry-GitHub Sync Tool - Documentation

## Overview

This is an automated synchronization tool that imports Sentry error/issues into GitHub Issues. It runs as a GitHub Action and creates detailed GitHub issues with full error context from Sentry.

---

## Project Structure

```
sentry/
├── sync-sentry.js              # Main Node.js sync script
├── package.json                 # Project dependencies
├── .gitignore                  # Git ignore rules
└── .github/
    ├── workflows/
    │   └── sentry-sync.yml     # GitHub Actions workflow
    └── ISSUE_TEMPLATE/
        └── sentry-bug.md       # GitHub Issue template
```

---

## How It Works

### 1. Workflow Trigger

The sync runs automatically via GitHub Actions:
- **Scheduled**: Daily at 6:00 AM UTC
- **Manual**: Can be triggered via workflow_dispatch
- **On Push**: Runs when changes are pushed to main branch

### 2. Sync Process Flow

```
┌─────────────────────┐
│  GitHub Action      │
│  Starts (sync.js)   │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Fetch Unresolved   │
│  Sentry Issues      │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Check Existing     │──Yes──► Skip if already synced
│  GitHub Issues     │
└─────────┬───────────┘
          │ No
          ▼
┌─────────────────────┐
│  For Each Issue:    │
│  - Get Latest Event │
│  - Extract Details  │
│  - Create GitHub    │
│    Issue            │
└─────────────────────┘
```

### 3. Data Extraction

The script extracts comprehensive information from Sentry events:

| Extraction Function | Data Extracted |
|---------------------|----------------|
| `extractStackTrace()` | Error type, value, file locations, function names |
| `extractTags()` | Sentry tags in table format |
| `extractRequest()` | URL, HTTP method, referrer |
| `extractUserContext()` | IP, email, user ID, location |
| `extractEnvironment()` | Browser name and version |
| `extractOS()` | Operating system info |
| `extractBreadcrumbs()` | UI clicks, fetch/XHR requests, navigation |
| `extractRelease()` | App release version |
| `extractURL()` | URL tag |
| `extractIP()` | User IP address |

### 4. Issue Creation

Each synced issue includes:
- **Title**: `[Sentry] {error title} [ID:{issue_id}]`
- **Labels**: `sentry`, `bug`
- **Body**: Full issue details from the template

---

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SENTRY_TOKEN` | Yes | Sentry API authentication token |
| `GITHUB_TOKEN` | Yes | GitHub token (provided by GitHub Actions) |
| `GITHUB_REPO` | No | Target repository (format: `owner/repo`) |
| `FORCE_SYNC` | No | If `true`, syncs all issues ignoring existing ones |

### Script Constants (sync-sentry.js)

```javascript
const SENTRY_ORG = 'sebastian-baga';       // Sentry organization
const SENTRY_PROJECT = '4509440197263440'; // Sentry project ID
const GITHUB_REPO = process.env.GITHUB_REPO || 'Theodor Ivascu/sentry';
```

---

## Issue Template Fields

The GitHub issue template (`sentry-bug.md`) includes:

### Summary Section
- Error summary/title

### Severity Info
- Level (error, warning, etc.)
- Priority
- Issue Type
- Category

### Sentry Info
- Issue ID, Short ID
- Count, User Count
- First Seen, Last Seen
- Culprit, Status
- Project Name, Platform
- Link to Sentry

### Error Details
- Error Type, Value
- Filename, Function

### User Context
- IP Address, Email, User ID
- City, Country

### Environment
- Browser, OS
- Release, URL
- IP, Location

### Additional Data
- Tags (table format)
- Breadcrumbs (last 100)
- Stack Trace
- HTTP Request details

---

## GitHub Actions Workflow

```yaml
# Triggers
on:
  schedule:
    - cron: '0 6 * * *'  # Daily at 6AM UTC
  workflow_dispatch:      # Manual trigger
  push:
    branches:
      - main

# Permissions
permissions:
  issues: write
  contents: write
```

---

## Running Locally

```bash
# Install dependencies
npm install

# Run sync
SENTRY_TOKEN=your_token GITHUB_TOKEN=your_token node sync-sentry.js

# Force sync all issues
FORCE_SYNC=true SENTRY_TOKEN=your_token GITHUB_TOKEN=your_token node sync-sentry.js
```

---

## Cleanup Performed

The following unused code was removed:
- `loadState()` function (never called)
- `saveState()` function (never called)
- `STATE_FILE` constant (unused)
- `sentry-sync-state.json` file (unused)
- Updated `.gitignore` with proper entries

---

## Dependencies

- **Node.js**: >= 18
- **No external npm packages** - Uses built-in `fetch` API (Node 18+)

---

## Summary

This tool provides a seamless bridge between Sentry error tracking and GitHub issue management. When errors occur in your application, they are automatically captured by Sentry, and this sync tool creates detailed GitHub issues with full context including stack traces, user information, environment details, and breadcrumb trails - making it easier for developers to track and resolve issues directly from their GitHub workflow.
