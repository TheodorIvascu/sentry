# Cum pune scriptul datele în template?

## Simplu: replaceAll()

Scriptul folosește o metodă simplă: **înlocuiește placeholderii** cu datele reale.

---

## Step by Step

### 1. Template-ul (șablonul)

În `.github/ISSUE_TEMPLATE/sentry-bug.md` ai placeholders:

```markdown
### Summary
{{SUMMARY}}

### Severity
| Field | Value |
| **Level** | {{LEVEL}} |
| **Priority** | {{PRIORITY}} |
```

### 2. Scriptul preia datele din Sentry API

```javascript
// Se conectează la Sentry API
const issue = await fetchSentry(`/issues/${id}/`);
const event = await fetchSentry(`/issues/${id}/events/latest/`);
```

Asta returnează un obiect mare cu toate datele:

```javascript
{
  id: "48265252",
  title: "TypeError: Failed to fetch",
  level: "error",
  priority: "high",
  count: "58",
  firstSeen: "2025-06-27T13:43:03Z",
  metadata: {
    type: "TypeError",
    value: "Failed to fetch",
    filename: "utils/fetchData.js"
  },
  // ... și multe altele
}
```

### 3. Funcțiile de extract

Apoi, scriptul "extrage" fiecare câmp:

```javascript
// Extrage nivelul
issue.level  // → "error"

// Extrage priority
issue.priority  // → "high"

// Extrage metadata
issue.metadata?.type  // → "TypeError"
issue.metadata?.value  // → "Failed to fetch"
```

### 4. Înlocuiește în template

```javascript
// Pentru fiecare placeholder, înlocuiește cu valoarea reală

template = template.replaceAll('{{SUMMARY}}', summary);
template = template.replaceAll('{{LEVEL}}', issue.level);
template = template.replaceAll('{{PRIORITY}}', issue.priority);
template = template.replaceAll('{{COUNT}}', issue.count);
template = template.replaceAll('{{FIRST_SEEN}}', formatDate(issue.firstSeen));
// ... și tot așa
```

### 5. Rezultatul

După replace, template-ul devine:

```markdown
### Summary
TypeError: Failed to fetch

### Severity
| Field | Value |
| **Level** | error |
| **Priority** | high |
```

---

## Diagrama simplă

```
Sentry API                    Script                   GitHub Template
─────────────                ──────                   ──────────────

{                             
  "level": "error",   ──────▶  replaceAll()     ──▶  {{LEVEL}}
  "priority": "high"        {{LEVEL}} = error           error
  "count": "58"             replaceAll()          
}                         {{COUNT}} = 58             {{COUNT}}
                                               
                                               
                              {{SUMMARY}}             {{SUMMARY}}
```

---

## Codul simplificat

```javascript
// 1. Preia datele din Sentry
const issue = await fetchSentry('/issues/48265252/');
const event = await fetchSentry('/issues/48265252/events/latest/');

// 2. Citește template-ul
let template = fs.readFileSync('sentry-bug.md', 'utf8');

// 3. Înlocuiește fiecare placeholder
template = template.replaceAll('{{LEVEL}}', issue.level);
template = template.replaceAll('{{PRIORITY}}', issue.priority);
template = template.replaceAll('{{COUNT}}', issue.count);
template = template.replaceAll('{{SUMMARY}}', issue.metadata?.value);
template = template.replaceAll('{{STACK_TRACE}}', extractStackTrace(event));

// 4. Creează issue în GitHub
await fetchGitHub('/repos/owner/repo/issues', 'POST', {
  body: template
});
```

---

## Cam atât!

**Simplu:**
1. Ia datele din Sentry API
2. Citește template-ul
3. Înlocuiește `{{PLACEHOLDER}}` cu valoarea reală
4. Trimite la GitHub

Nu trebuie altceva - doar string replacement.
