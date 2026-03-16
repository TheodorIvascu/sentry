# Cum funcționează totul?

## 1. Ce este Sentry?

**Sentry** = un serviciu care colectează erorile din aplicația ta.

Când utilizatorii folosesc aplicația ta și apare o eroare:
1. Sentry o prinde automat
2. O salvează cu detalii (stack trace, user info, etc.)
3. Tu o vezi în dashboard-ul Sentry

**Practic:** Îți arată ce erori au utilizatorii, unde au apărut, când, cine a fost afectat.

---

## 2. Ce face scriptul nostru?

Scriptul `sync-sentry.js` face următorul lucru:

### Flow-ul complet:

```
1. Se conectează la Sentry API
   ↓
2. Preia toate erorile nerezolvate din proiect
   ↓
3. Verifică care erori sunt deja în GitHub (deduplicare)
   ↓
4. Pentru fiecare eroare nouă:
   a) Preia detaliile complete din Sentry
   b) Creează un issue nou în GitHub
   c)cu toate informațiile
```

### Ce preia din Sentry?

- **Titlu** - ce eroare e
- **Stack trace** - codul care a generat eroarea
- **User info** - IP, locație
- **Environment** - browser, OS, device
- **Breadcrumbs** - ce a făcut utilizatorul înainte de eroare
- **Tags** - info extra
- **Request** - ce pagină, ce referer

---

## 3. Cum se integrează în GitHub?

### Structura:

```
repo/
├── sync-sentry.js              ← Scriptul principal
├── .github/
│   ├── workflows/
│   │   └── sentry-sync.yml   ← GitHub Action
│   └── ISSUE_TEMPLATE/
│       └── sentry-bug.md     ← Template pentru issue
```

### Ce face GitHub Action?

Workflow-ul (`sentry-sync.yml`) automatizează totul:

1. **Rulează zilnic** - la 6 AM UTC (cron job)
2. **Sau la push** - când dai push pe main
3. **Sau manual** - din GitHub → Actions → Run

Când rulează:
```bash
node sync-sentry.js
```

→ Creează issue-uri în GitHub automat!

---

## 4. Cum să explici la oameni?

### Explicație scurtă (30 secunde):

> "Avem un tool care preia erorile din Sentry (unde se colectează erorile aplicației) și le pune automat ca issue-uri în GitHub. Astfel echipa vede toate problemele într-un singur loc - GitHub - fără să verifice Sentry manual."

### Explicație medie (1 minut):

> "Când utilizatorii au erori în aplicație, Sentry le prinde și le salvează. Noi avem un script care rulează zilnic (prin GitHub Actions), preia toate erorile nerezolvate și le creează ca issue-uri în GitHub. Fiecare issue conține stack trace-ul complet, informații despre utilizator (IP, locație), ce a făcut utilizatorul înainte de eroare (breadcrumbs), și alte detalii. Astfel dezvoltatorii văd totul direct în GitHub."

### Explicație lungă (cu detalii):

> "Arhitectura e simplă:
> 
> 1. **Sentry** - colectează erori din frontend/backend. Când apare o eroare, Sentry o prinde și o stochează cu context (stack trace, user info, breadcrumbs, etc.)
> 
> 2. **Scriptul sync-sentry.js** - un Node.js script care:
>    - Se conectează la Sentry API
>    - Preia erorile nerezolvate
>    - Verifică care sunt deja în GitHub (să nu creeze duplicat)
>    - Pentru fiecare eroare nouă, creează un issue cu template
> 
> 3. **GitHub Actions** - automatizează scriptul:
>    - Rulează zilnic la 6 AM UTC
>    - Sau la fiecare push pe main
>    - Sau manual când vrei
> 
> 4. **Template** - definește cum arată issue-ul în GitHub (tabele cu severity, stack trace, breadcrumbs, etc.)
> 
> Beneficiu: echipa nu trebuie să verifice Sentry manual, vede totul în GitHub."

---

## 5. Diagrama

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Utilizator │────▶│  Aplicație  │────▶│   Sentry    │
│  are eroare │     │   are bug   │     │ prinde eroarea
└─────────────┘     └─────────────┘     └──────┬──────┘
                                              │
                                              ▼
                                    ┌─────────────────┐
                                    │  GitHub Actions │
                                    │   rulează sync  │
                                    └────────┬────────┘
                                             │
                                             ▼
                                    ┌─────────────────┐
                                    │ sync-sentry.js  │
                                    │ preia erorile   │
                                    └────────┬────────┘
                                             │
                                             ▼
                                    ┌─────────────────┐
                                    │   GitHub Issues│
                                    │ creează issue  │
                                    └─────────────────┘
```

---

## 6. Ce primești în GitHub?

Pentru fiecare eroare, un issue cu:

```markdown
### Summary
TypeError: Failed to fetch

### Severity
| Field | Value |
|-------|-------|
| Level | error |
| Priority | high |

### Sentry Info
| Field | Value |
|-------|-------|
| Count | 58 |
| First Seen | 6/27/2025 |

### Stack Trace
TypeError: Failed to fetch
  at companyNumber (fetchData.js:37)

### Breadcrumbs
[12:47:17] [fetch] GET /api/data [500]
[12:47:20] [ui.click] button.submit
```

---

## 7. Cam atât!

**Simplu:** 
- Sentry = unde se duc erorile
- Scriptul = le ia de acolo și le pune în GitHub
- GitHub Actions = automatizează procesul

**Rezultat:** Echipă vede toate erorile în GitHub, nu trebuie să verifice Sentry.
