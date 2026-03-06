const fs = require('fs');
const path = require('path');

const SENTRY_ORG = 'sebastian-boga';
const SENTRY_PROJECT = '4509440197263440';
const SENTRY_TOKEN = process.env.SENTRY_TOKEN;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // GitHub token

const STATE_FILE = path.join(__dirname, '.github', 'sentry-sync-state.json');
const TEMPLATE_FILE = path.join(__dirname, '.github', 'ISSUE_TEMPLATE', 'sentry-bug.md');
const API_BASE = `https://sentry.io/api/0/organizations/${SENTRY_ORG}`;
const GITHUB_REPO = process.env.GITHUB_REPO || 'Theodor Ivascu/sentry';

async function fetchSentry(endpoint) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'Authorization': `Bearer ${SENTRY_TOKEN}` }
  });
  if (!res.ok) throw new Error(`Sentry API error: ${res.status}`);
  return res.json();
}

async function fetchGitHub(endpoint, method = 'GET', body = null) {
  const opts = {
    method,
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    }
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`https://api.github.com${endpoint}`, opts);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API error: ${res.status} - ${text}`);
  }
  return res.json();
}

function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  }
  return { last_sync: null, synced_issues: {} };
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function extractStackTrace(event) {
  const entries = event.entries || [];
  for (const entry of entries) {
    if (entry.type === 'exception' && entry.data?.values) {
      const exc = entry.data.values[0];
      if (exc.stacktrace?.frames) {
        const allFrames = exc.stacktrace.frames;
        
        let result = '';
        if (exc.type && exc.value) {
          result += `${exc.type}: ${exc.value}\n\n`;
        }
        
        result += allFrames
          .map(f => {
            const filename = f.filename ? f.filename.split('/').pop() : '?';
            const func = f.function || 'anonymous';
            return `  at ${func} (${filename}:${f.lineNo || '?'})`;
          })
          .join('\n');
        
        return result;
      }
    }
  }
  return 'No stack trace available';
}

function extractTags(event) {
  const tags = event.tags || [];
  if (tags.length === 0) return '_No tags_';
  const tagMap = {};
  for (const t of tags) {
    tagMap[t.key] = t.value;
  }
  const rows = Object.entries(tagMap).map(([k, v]) => `| ${k} | ${v} |`).join('\n');
  return '| Tag | Value |\n|---|---|\n' + rows;
}

function extractRequest(event) {
  const entries = event.entries || [];
  for (const entry of entries) {
    if (entry.type === 'request') {
      const req = entry.data;
      let result = '';
      if (req.url) result += `**URL:** ${req.url}\n`;
      if (req.method) result += `**Method:** ${req.method}\n`;
      if (req.headers) {
        const referer = req.headers.find(h => h[0] === 'Referer');
        if (referer) result += `**Referer:** ${referer[1]}\n`;
      }
      return result || '-';
    }
  }
  return '-';
}

function extractUserContext(event) {
  const user = event.user || {};
  if (!user.ip_address && !user.email && !user.id && !user.geo?.city) return '_No user context_';
  
  const rows = [];
  if (user.ip_address) rows.push(`| **IP** | ${user.ip_address} |`);
  if (user.email) rows.push(`| **Email** | ${user.email} |`);
  if (user.id) rows.push(`| **User ID** | ${user.id} |`);
  if (user.geo?.city) rows.push(`| **City** | ${user.geo.city} |`);
  if (user.geo?.country_code) rows.push(`| **Country** | ${user.geo.country_code} |`);
  
  return rows.length > 0 ? '| Field | Value |\n|---|---|\n' + rows.join('\n') : '_No user context_';
}

function extractEnvironment(event) {
  const contexts = event.contexts || {};
  const browser = contexts.browser || {};
  const os = contexts.os || {};
  
  let result = '';
  if (browser.name) result += `${browser.name} ${browser.version}`;
  else result += '-';
  return result;
}

function extractOS(event) {
  const contexts = event.contexts || {};
  const os = contexts.os || {};
  return os.name && os.version ? `${os.name} ${os.version}` : '-';
}

function extractBreadcrumbs(event) {
  const entries = event.entries || [];
  for (const entry of entries) {
    if (entry.type === 'breadcrumbs' && entry.data?.values) {
      const crumbs = entry.data.values
        .filter(c => c.category === 'ui.click' || c.category === 'fetch' || c.category === 'http' || c.category === 'navigation' || c.category === 'ui.input')
        .slice(-100)
        .map(c => {
          const timestamp = c.timestamp ? c.timestamp.split('T')[1].split('.')[0] : '';
          
          if (c.category === 'fetch' || c.category === 'http') {
            const method = c.data?.method || 'GET';
            const url = c.data?.url || c.message || '-';
            const status = c.data?.status_code || '-';
            return `- [${timestamp}] [${c.category}] ${method} ${url} [${status}]`;
          }
          
          const msg = c.message || c.type || '';
          return `- [${timestamp}] [${c.category}] ${msg.substring(0, 150)}`;
        })
        .join('\n');
      return crumbs || '-';
    }
  }
  return '-';
}

function extractRelease(event) {
  return event.release?.version || event.release?.shortVersion || '-';
}

function extractURL(event) {
  const tags = event.tags || [];
  const urlTag = tags.find(t => t.key === 'url');
  return urlTag?.value || '-';
}

function extractIP(event) {
  return event.user?.ip_address || '-';
}

function extractLocation(event) {
  const geo = event.user?.geo || {};
  if (geo.city || geo.region || geo.country_code) {
    return [geo.city, geo.region, geo.country_code].filter(Boolean).join(', ');
  }
  return '-';
}

function createIssueBody(issue, event) {
  let template = fs.readFileSync(TEMPLATE_FILE, 'utf8');
  
  const title = issue.title.split('\n')[0];
  const summary = issue.metadata?.value || issue.metadata?.type || 'No description';
  
  template = template.replaceAll('{{TITLE}}', title);
  template = template.replaceAll('{{SUMMARY}}', summary);
  template = template.replaceAll('{{STEPS_TO_REPRODUCE}}', 'See stack trace and Sentry issue for details');
  template = template.replaceAll('{{LEVEL}}', issue.level || 'error');
  template = template.replaceAll('{{PRIORITY}}', issue.priority || '-');
  template = template.replaceAll('{{ISSUE_TYPE}}', issue.issueType || issue.type || '-');
  template = template.replaceAll('{{ISSUE_CATEGORY}}', issue.issueCategory || '-');
  template = template.replaceAll('{{ID}}', issue.id);
  template = template.replaceAll('{{SHORT_ID}}', issue.shortId || '-');
  template = template.replaceAll('{{COUNT}}', issue.count || '1');
  template = template.replaceAll('{{USER_COUNT}}', issue.userCount || '0');
  template = template.replaceAll('{{FIRST_SEEN}}', issue.firstSeen);
  template = template.replaceAll('{{LAST_SEEN}}', issue.lastSeen);
  template = template.replaceAll('{{CULPRIT}}', issue.culprit || '-');
  template = template.replaceAll('{{STATUS}}', issue.status || 'unresolved');
  template = template.replaceAll('{{PROJECT_NAME}}', issue.project?.name || '-');
  template = template.replaceAll('{{PROJECT_SLUG}}', issue.project?.slug || '-');
  template = template.replaceAll('{{PLATFORM}}', issue.platform || '-');
  template = template.replaceAll('{{SENTRY_URL}}', issue.permalink || `https://sentry.io/organizations/${SENTRY_ORG}/issues/${issue.id}/`);
  
  template = template.replaceAll('{{ERROR_TYPE}}', issue.metadata?.type || '-');
  template = template.replaceAll('{{ERROR_VALUE}}', issue.metadata?.value || '-');
  template = template.replaceAll('{{FILENAME}}', issue.metadata?.filename || '-');
  template = template.replaceAll('{{FUNCTION}}', issue.metadata?.function || '-');
  
  template = template.replaceAll('{{USER_CONTEXT}}', extractUserContext(event));
  template = template.replaceAll('{{BROWSER}}', extractEnvironment(event));
  template = template.replaceAll('{{OS}}', extractOS(event));
  template = template.replaceAll('{{RELEASE}}', extractRelease(event));
  template = template.replaceAll('{{URL}}', extractURL(event));
  template = template.replaceAll('{{IP_ADDRESS}}', extractIP(event));
  template = template.replaceAll('{{LOCATION}}', extractLocation(event));
  
  const breadcrumbs = extractBreadcrumbs(event);
  const breadcrumbCount = (event.entries?.find(e => e.type === 'breadcrumbs')?.data?.values?.length) || 0;
  template = template.replaceAll('{{TAGS}}', extractTags(event));
  template = template.replaceAll('{{BREADCRUMB_COUNT}}', breadcrumbCount);
  template = template.replaceAll('{{BREADCRUMBS}}', breadcrumbs);
  template = template.replaceAll('{{STACK_TRACE}}', extractStackTrace(event));
  template = template.replaceAll('{{REQUEST}}', extractRequest(event));
  
  return template;
}

async function createGitHubIssue(issue, event) {
  const titleWithoutNewline = issue.title.split('\n')[0];
  const issueTitle = `[Sentry] ${titleWithoutNewline} [ID:${issue.id}]`;
  const body = createIssueBody(issue, event);
  
  const issueData = {
    title: issueTitle,
    body,
    labels: ['sentry', 'bug']
  };
  
  const result = await fetchGitHub(`/repos/${GITHUB_REPO}/issues`, 'POST', issueData);
  return result.number;
}

async function syncIssues() {
  if (!SENTRY_TOKEN) {
    console.error('SENTRY_TOKEN is required');
    process.exit(1);
  }
  if (!GITHUB_TOKEN) {
    console.error('GITHUB_TOKEN is required');
    process.exit(1);
  }
  
  console.log('Fetching unresolved Sentry issues...');
  const issues = await fetchSentry(`/issues/?project=${SENTRY_PROJECT}&query=is:unresolved`);
  
  console.log(`Found ${issues.length} unresolved issues`);
  
  console.log('Checking for existing GitHub issues...');
  const existingIssues = await fetchGitHub(`/repos/${GITHUB_REPO}/issues?state=all&per_page=100`);
  const existingSentryIds = new Set();
  for (const issue of existingIssues) {
    const match = issue.title.match(/\[Sentry\]\s*.*\[ID:(\d+)\]/);
    if (match) {
      existingSentryIds.add(match[1]);
    }
  }
  console.log(`Found ${existingSentryIds.size} existing synced issues`);
  
  const newIssues = issues.filter(issue => !existingSentryIds.has(issue.id));
  
  console.log(`New issues to sync: ${newIssues.length}`);
  
  let created = 0;
  let errors = 0;
  
  for (const issue of newIssues) {
    try {
      console.log(`Syncing issue ${issue.id}: ${issue.title}`);
      
      const event = await fetchSentry(`/issues/${issue.id}/events/latest/`);
      const issueNumber = await createGitHubIssue(issue, event);
      
      created++;
      console.log(`  -> Created GitHub issue #${issueNumber}`);
    } catch (err) {
      console.error(`  -> Error: ${err.message}`);
      errors++;
    }
  }
  
  console.log(`\nSync complete:`);
  console.log(`- Created: ${created}`);
  console.log(`- Errors: ${errors}`);
}

syncIssues().catch(console.error);
