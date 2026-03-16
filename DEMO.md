# Sentry-GitHub Sync Tool - Documentation

## Overview

An automated synchronization tool that imports Sentry errors/issues into GitHub Issues. Runs as a GitHub Action and creates detailed GitHub issues with full error context from Sentry.

---

## Features

- **Automatic Sync**: Runs daily via GitHub Actions scheduler
- **Manual Trigger**: Can be triggered manually with optional force sync
- **Deduplication**: Skips already synced issues
- **Rich Issue Details**: Full error context including stack traces, user info, breadcrumbs
- **No Dependencies**: Uses built-in Node.js `fetch` API (no npm packages needed)
- **Rate Limiting**: Handles GitHub/Sentry API rate limits with retry logic
- **Concurrency**: Processes multiple issues in parallel

---

## Project Structure

```
sentry/
├── sync-sentry.js              # Main Node.js sync script
├── package.json                 # Project metadata
├── .gitignore                  # Git ignore rules
├── DEMO.md                     # This documentation
└── .github/
    ├── workflows/
    │   └── sentry-sync.yml    # GitHub Actions workflow
    └── ISSUE_TEMPLATE/
        └── sentry-bug.md      # GitHub Issue template
```

---

## Architecture

### How It Works

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
│  - Get Full Issue   │ (Parallel)
│  - Get Latest Event │
│  - Extract Details  │
│  - Create GitHub    │
│    Issue            │
└─────────────────────┘
```

### API Integration

#### Sentry API
- **Base URL**: `https://sentry.io/api/0/organizations/{org}`
- **Endpoints Used**:
  - `/issues/?project={id}&query=is:unresolved` - List unresolved issues
  - `/issues/{id}/` - Get full issue details (count, dates, etc.)
  - `/issues/{id}/events/latest/` - Get latest event (stack trace, breadcrumbs)
- **Authentication**: Bearer token via `Authorization` header
- **Rate Limits**: Handled with retry logic

#### GitHub API
- **Base URL**: `https://api.github.com`
- **Endpoints Used**:
  - `/repos/{owner}/{repo}/issues` - Create new issue
  - `/repos/{owner}/{repo}/issues?state=all` - List all issues (for deduplication)
- **Authentication**: Bearer token via `Authorization` header
- **Rate Limits**: Handled with retry and backoff

### Data Flow

1. **Fetch Issues**: Query Sentry for unresolved issues in the project
2. **Deduplicate**: Check existing GitHub issues for Sentry ID markers
3. **Parallel Processing**: Fetch issue details + event data concurrently
4. **Extract Data**: Parse stack traces, user context, breadcrumbs, tags
5. **Create Issue**: POST to GitHub with formatted template

---

## Data Extraction Functions

| Function | Data Extracted |
|----------|----------------|
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

---

## Issue Template

Each synced GitHub issue includes:

### Header
- **Title**: `[Sentry] {error title} [ID:{issue_id}]`
- **Labels**: `sentry`, `bug`

### Body Sections
1. **Summary**: Error title/description
2. **Steps to Reproduce**: Generic placeholder
3. **Severity**: Level, Priority, Type, Category
4. **Sentry Info**: ID, Short ID, Count, User Count, First/Last Seen, Culprit, Status, Project, Platform, Link
5. **Error Details**: Type, Value, Filename, Function
6. **User Context**: IP, Email, User ID, City, Country
7. **Environment**: Browser, OS, Release, URL, IP, Location
8. **Tags**: All Sentry tags in table format
9. **Breadcrumbs**: Last 100 user actions (filtered by category)
10. **Stack Trace**: Full error stack trace
11. **Request**: HTTP request details (URL, Method, Referer)

---

## Configuration

### Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `SENTRY_TOKEN` | Yes | Sentry API token | - |
| `GITHUB_TOKEN` | Yes | GitHub API token | - |
| `SENTRY_ORG` | No | Sentry organization | `sebastian-boga` |
| `SENTRY_PROJECT` | No | Sentry project ID | `4509440197263440` |
| `GITHUB_REPO` | No | Target repository | `Theodor Ivascu/sentry` |
| `FORCE_SYNC` | No | Sync all issues | `false` |
| `CONCURRENCY_LIMIT` | No | Max parallel requests | `5` |
| `BREADCRUMB_CATEGORIES` | No | Breadcrumb filter | `ui.click,fetch,http,navigation,ui.input` |

### Command Line Options

```bash
node sync-sentry.js [options]

Options:
  -d, --dry-run           Preview without creating issues
  -f, --force-sync        Sync all issues ignoring existing
  -o, --org <name>        Sentry organization
  -p, --project <id>      Sentry project ID
  -r, --repo <owner/repo> GitHub repository
  -h, --help              Show help
```

### Script Constants

```javascript
const SENTRY_ORG = 'sebastian-boga';
const SENTRY_PROJECT = '4509440197263440';
const GITHUB_REPO = 'Theodor Ivascu/sentry';
```

---

## GitHub Actions Workflow

```yaml
name: Sentry to GitHub Issues Sync

on:
  schedule:
    - cron: '0 6 * * *'  # Daily at 6AM UTC
  workflow_dispatch:
    inputs:
      force_sync:
        description: 'Force sync all issues'
        required: false
        default: false
        type: boolean
  push:
    branches:
      - main

jobs:
  sync:
    runs-on: ubuntu-latest
    permissions:
      issues: write
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: '24'
      - run: npm install
      - run: node sync-sentry.js
        env:
          SENTRY_TOKEN: ${{ secrets.SENTRY_TOKEN }}
          GITHUB_TOKEN: ${{ github.token }}
          GITHUB_REPO: ${{ github.repository }}
```

---

## Running Locally

```bash
# Install dependencies
npm install

# Basic sync
SENTRY_TOKEN=xxx GITHUB_TOKEN=xxx node sync-sentry.js

# Force sync all (ignore existing)
FORCE_SYNC=true SENTRY_TOKEN=xxx GITHUB_TOKEN=xxx node sync-sentry.js

# Dry run (preview)
node sync-sentry.js --dry-run

# With custom org/project/repo
node sync-sentry.js --org my-org --project 12345 --repo owner/repo
```

---

## Dependencies

- **Node.js**: >= 18 (GitHub Actions uses v24)
- **No external packages**: Uses built-in `fetch` API

---

## Summary

This tool bridges Sentry error tracking with GitHub issue management. Errors captured by Sentry automatically become detailed GitHub issues with:
- Full stack traces
- User context (IP, location)
- Environment details (browser, OS, device)
- Breadcrumb trails showing user actions
- Tags and request information

This makes it easier for developers to track and resolve issues directly from their GitHub workflow.
