# Sentry-GitHub Sync Tool - Documentație

## Prezentare Generală

Un instrument automatizat de sincronizare care importează erorile/problemele din Sentry în GitHub Issues. Rulează ca GitHub Action și creează probleme GitHub detaliate cu context complet din Sentry.

---

## Caracteristici

- **Sincronizare Automată**: Rulează zilnic prin GitHub Actions
- **Declanșare Manuală**: Poate fi declanșat manual cu opțiunea force sync
- **Deduplicare**: Sari peste problemele deja sincronizate
- **Detalii Rich**: Context complet al erorii incluzând stack traces, info utilizator, breadcrumbs
- **Fără Dependențe**: Folosește API-ul `fetch` integrat în Node.js (fără pachete npm)
- **Rate Limiting**: Gestionează limitele API GitHub/Sentry cu logică de retry
- **Concurență**: Procesează multiple probleme în paralel

---

## Structura Proiectului

```
sentry/
├── sync-sentry.js              # Scriptul principal Node.js
├── package.json                 # Metadate proiect
├── .gitignore                  # Reguli pentru gitignore
├── DEMO.md                     # Documentația în engleză
├── DEMO-RO.md                  # Documentația în română
└── .github/
    ├── workflows/
    │   └── sentry-sync.yml    # Workflow GitHub Actions
    └── ISSUE_TEMPLATE/
        └── sentry-bug.md      # Șablon GitHub Issue
```

---

## Arhitectură

### Cum Funcționează

```
┌─────────────────────┐
│  GitHub Action      │
│  Pornește (sync.js) │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Preia Probleme    │
│  Nerezolvate       │
│  din Sentry        │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Verifică          │──Da──► Sari dacă e deja sincronizat
│  Problemele        │
│  GitHub Existente  │
└─────────┬───────────┘
          │ Nu
          ▼
┌─────────────────────┐
│  Pentru Fiecare:   │
│  - Preia Detalii   │ (Paralel)
│  - Preia Ultimul  │
│    Eveniment       │
│  - Extrage Date    │
│  - Creează Issue  │
│    GitHub          │
└─────────────────────┘
```

### Integrare API

#### Sentry API
- **URL de Bază**: `https://sentry.io/api/0/organizations/{org}`
- **Endpoint-uri Folosite**:
  - `/issues/?project={id}&query=is:unresolved` - Lista problemelor nerezolvate
  - `/issues/{id}/` - Detalii complete problemă (count, date, etc.)
  - `/issues/{id}/events/latest/` - Ultimul eveniment (stack trace, breadcrumbs)
- **Autentificare**: Token Bearer prin header-ul `Authorization`
- **Rate Limits**: Gestionat cu logică de retry

#### GitHub API
- **URL de Bază**: `https://api.github.com`
- **Endpoint-uri Folosite**:
  - `/repos/{owner}/{repo}/issues` - Creează issue nou
  - `/repos/{owner}/{repo}/issues?state=all` - Lista tuturor issue-urilor (pentru deduplicare)
- **Autentificare**: Token Bearer prin header-ul `Authorization`
- **Rate Limits**: Gestionat cu retry și backoff

### Fluxul Datelor

1. **Preia Problemele**: Interoghează Sentry pentru problemele nerezolvate din proiect
2. **Deduplicare**: Verifică issue-urile GitHub existente pentru markeri Sentry ID
3. **Procesare Paralelă**: Preia detaliile problemei + datele evenimentului simultan
4. **Extrage Datele**: Parsează stack traces, context utilizator, breadcrumbs, tags
5. **Creează Issue**: POST la GitHub cu șablonul formatat

---

## Funcții de Extragere Date

| Funcție | Date Extrase |
|---------|--------------|
| `extractStackTrace()` | Tip eroare, valoare, locații fișiere, nume funcții |
| `extractTags()` | Tag-uri Sentry în format tabelar |
| `extractRequest()` | URL, metodă HTTP, referer |
| `extractUserContext()` | IP, email, ID utilizator, locație |
| `extractEnvironment()` | Nume și versiune browser |
| `extractOS()` | Informații sistem de operare |
| `extractBreadcrumbs()` | Click-uri UI, cereri fetch/XHR, navigație |
| `extractRelease()` | Versiune release aplicație |
| `extractURL()` | Tag URL |
| `extractIP()` | Adresa IP utilizator |

---

## Șablon Issue

Fiecare issue GitHub sincronizat include:

### Header
- **Titlu**: `[Sentry] {titlu eroare} [ID:{id_problemă}]`
- **Etichete**: `sentry`, `bug`

### Secțiuni Body
1. **Rezumat**: Titlu/descriere eroare
2. **Pași pentru Reproducere**: Placeholder generic
3. **Severitate**: Level, Priority, Type, Category
4. **Informații Sentry**: ID, Short ID, Count, User Count, First/Last Seen, Culprit, Status, Project, Platform, Link
5. **Detalii Eroare**: Type, Value, Filename, Function
6. **Context Utilizator**: IP, Email, User ID, City, Country
7. **Mediu**: Browser, OS, Release, URL, IP, Locație
8. **Tag-uri**: Toate tag-urile Sentry în format tabelar
9. **Breadcrumbs**: Ultimele 100 acțiuni utilizator (filtrate pe categorie)
10. **Stack Trace**: Stack trace complet al erorii
11. **Cerere HTTP**: Detalii cerere HTTP (URL, Method, Referer)

---

## Configurare

### Variabile de Mediu

| Variabilă | Necesar | Descriere | Implicit |
|-----------|---------|-----------|----------|
| `SENTRY_TOKEN` | Da | Token API Sentry | - |
| `GITHUB_TOKEN` | Da | Token API GitHub | - |
| `SENTRY_ORG` | Nu | Organizația Sentry | `sebastian-boga` |
| `SENTRY_PROJECT` | Nu | ID-ul proiectului Sentry | `4509440197263440` |
| `GITHUB_REPO` | Nu | Repository-ul țintă | `Theodor Ivascu/sentry` |
| `FORCE_SYNC` | Nu | Sincronizează toate problemele | `false` |
| `CONCURRENCY_LIMIT` | Nu | Cereri paralele max | `5` |
| `BREADCRUMB_CATEGORIES` | Nu | Filtru breadcrumbs | `ui.click,fetch,http,navigation,ui.input` |

### Opțiuni Linie de Comandă

```bash
node sync-sentry.js [opțiuni]

Opțiuni:
  -d, --dry-run           Previzualizare fără creare issue-uri
  -f, --force-sync        Sincronizează toate problemele ignorând existente
  -o, --org <nume>        Organizația Sentry
  -p, --project <id>      ID-ul proiectului Sentry
  -r, --repo <owner/repo> Repository-ul GitHub
  -h, --help              Afișează ajutor
```

### Constante în Script

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
    - cron: '0 6 * * *'  # Zilnic la 6AM UTC
  workflow_dispatch:
    inputs:
      force_sync:
        description: 'Forțează sincronizarea tuturor problemelor'
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

## Rulare Locală

```bash
# Instalează dependențele
npm install

# Sincronizare de bază
SENTRY_TOKEN=xxx GITHUB_TOKEN=xxx node sync-sentry.js

# Forțează sincronizarea tuturor
FORCE_SYNC=true SENTRY_TOKEN=xxx GITHUB_TOKEN=xxx node sync-sentry.js

# Mod preview (dry run)
node sync-sentry.js --dry-run

# Cu org/project/repo personalizate
node sync-sentry.js --org org-mea --project 12345 --repo owner/repo
```

---

## Dependențe

- **Node.js**: >= 18 (GitHub Actions folosește v24)
- **Fără pachete externe**: Folosește API-ul `fetch` integrat

---

## Rezumat

Acest instrument face legătura între urmărirea erorilor Sentry și managementul problemelor GitHub. Erorile capturate de Sentry devin automat issue-uri GitHub detaliate cu:
- Stack traces complete
- Context utilizator (IP, locație)
- Detalii mediu (browser, OS, dispozitiv)
- Breadcrumb trails arătând acțiunile utilizatorului
- Tag-uri și informații despre cereri

Acest lucru face mai ușor pentru dezvoltatori să urmărească și să rezolve problemele direct din fluxul lor de lucru GitHub.

---

## Configurare pentru Proiectul Tău

Pentru a folosi acest tool pentru proiectul tău:

1. **Fork** acest repository
2. **Setează** variabilele de mediu în GitHub Actions secrets:
   - `SENTRY_TOKEN` - Token-ul tău Sentry API
3. **Modifică** constantele în `sync-sentry.js`:
   - `SENTRY_ORG` - Organizația ta Sentry
   - `SENTRY_PROJECT` - ID-ul proiectului tău
   - `GITHUB_REPO` - Repository-ul tău (sau lasă implicit)
4. **Rulează** workflow-ul manual sau așteaptă sincronizarea automată

---

## License

MIT
