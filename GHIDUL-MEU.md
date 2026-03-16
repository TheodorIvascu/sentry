# Ghidul Meu - Sentry to GitHub Sync

## Ce face?

**Simplu:** Preia erorile din Sentry și le pune ca issue-uri în GitHub.

---

## Cum să rulezi?

### 1. Local (pe calculatorul tău)

```bash
# În folderul proiectului
npm install

# Rulează sincronizarea
SENTRY_TOKEN=xxx GITHUB_TOKEN=xxx node sync-sentry.js
```

### 2. Automat (GitHub Actions)

Merge singur în fiecare zi la 6 AM UTC.
Sau îl rulezi manual din GitHub → Actions → Sentry Sync → Run Workflow

---

## Variabile de mediu

| Variabilă | Ce e | Cum o iei |
|-----------|------|-----------|
| `SENTRY_TOKEN` | Token Sentry | Sentry → Settings → API → Create Token |
| `GITHUB_TOKEN` | Token GitHub | GitHub → Settings → Developer Settings → Personal Access Token |

---

## Comenzi utile

```bash
# Preview (vede ce ar crea, dar nu face nimic)
node sync-sentry.js --dry-run

# Sincronizează tot (ignorând ce e deja creat)
FORCE_SYNC=true node sync-sentry.js

# Cu opțiuni personalizate
node sync-sentry.js --org nume-org --project 12345 --repo owner/repo
```

---

## Ce creează în GitHub?

Pentru fiecare eroare din Sentry, creează un issue cu:
- Titlu + ID Sentry
- Severity (level, priority, type)
- Info Sentry (ID, count, first seen, etc.)
- Detalii eroare (type, value, filename, function)
- Context utilizator (IP, city, country)
- Environment (browser, OS, release)
- Tags
- Breadcrumbs (ultimele acțiuni)
- Stack trace
- Request info

---

## Ca să schimbi ceva?

### Sentry Organization / Project
Deschide `sync-sentry.js` și modifici:
```javascript
const SENTRY_ORG = 'sebastian-baga';
const SENTRY_PROJECT = '4509440197263440';
```

### GitHub Repository
```javascript
const GITHUB_REPO = 'Theodor Ivascu/sentry';
```

### Template (cum arată issue-ul)
Modifici `.github/ISSUE_TEMPLATE/sentry-bug.md`

---

## Probleme comune

1. **Rate limit** - Așteaptă un pic și încearcă iar
2. **Erori la token** - Verifică că token-urile sunt corecte
3. **Nu creează nimic** - Verifică că ai erori nerezolvate în Sentry

---

## Workflow (GitHub Actions)

E deja configurat în `.github/workflows/sentry-sync.yml`

- Rulează zilnic la 6 AM UTC
- Rulează la push pe main
- Poți rula manual

---

## Dependențe

- Node.js >= 18
- Atât! Nu trebuie să instalezi nimic altceva.

---

## Cam atât! 

E simplu: rulezi scriptul → creează issue-uri în GitHub.
