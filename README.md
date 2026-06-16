# GitHub Repository Dashboard

A single-file GitHub dashboard that displays issues, pull requests, commits, milestones, and CI workflow runs for any repository — directly in your browser using the GitHub REST API.

---

## Features

- **Metric cards** — at-a-glance counts for open issues, open PRs, and CI pass rate
- **Issues panel** — status dots, assignee, and open/closed filtering
- **Pull requests panel** — open, merged, and closed state
- **Milestones panel** — progress bars and due dates
- **Commits panel** — author, message, and relative time
- **Workflow runs panel** — CI pass/fail per branch
- **Filter chips** — toggle between All / Open / Closed across panels
- **Auto-refresh** *(Phase 4)* — polls every 60 seconds via `setInterval`
- **Label filters** *(Phase 4)* — filter by bug, feature, priority
- **Commit chart** *(Phase 4)* — commits per day / week visualization

---

## Prerequisites

- A GitHub account with access to the target repository
- A GitHub Personal Access Token (PAT) with the following scopes:
  - `repo` — read repository data (issues, PRs, commits, milestones)
  - `workflow` — read workflow run data

---

## Implementation Plan

### Phase 1 — Setup

**1. Create a GitHub PAT**

1. Go to **GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)**
2. Click **Generate new token**
3. Select scopes: `repo` and `workflow`
4. Copy the generated token — you will not see it again

**2. Create `index.html`**

The entire dashboard lives in a single HTML file. No build step, no framework, no dependencies to install.

```
project/
└── index.html
```

**3. PAT input form**

On page load, display a form that asks for:
- GitHub owner/org name
- Repository name
- Personal Access Token

Store the PAT in `sessionStorage` so it persists across page refreshes within the same browser session but is cleared when the tab is closed.

```javascript
// Save on form submit
sessionStorage.setItem('gh_token', token);
sessionStorage.setItem('gh_owner', owner);
sessionStorage.setItem('gh_repo',  repo);

// Read on load
const token = sessionStorage.getItem('gh_token');
```

---

### Phase 2 — GitHub API Integration

**Helper function**

Create a single `gh(path)` helper that attaches the auth header and handles errors for every request:

```javascript
async function gh(path) {
  const token = sessionStorage.getItem('gh_token');
  const owner = sessionStorage.getItem('gh_owner');
  const repo  = sessionStorage.getItem('gh_repo');

  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
    },
  });

  if (!res.ok) throw new Error(`GitHub API error ${res.status}: ${path}`);
  return res.json();
}
```

**5 API endpoints**

| Data | Endpoint |
|------|----------|
| Issues | `/issues?state=all&per_page=50` |
| Pull requests | `/pulls?state=all&per_page=50` |
| Commits | `/commits?per_page=30` |
| Milestones | `/milestones?state=all` |
| Workflow runs | `/actions/runs?per_page=30` |

**Parallel fetch with `Promise.all`**

Fetch all endpoints simultaneously instead of sequentially to minimise load time:

```javascript
async function loadDashboard() {
  const [issues, pulls, commits, milestones, runs] = await Promise.all([
    gh('/issues?state=all&per_page=50'),
    gh('/pulls?state=all&per_page=50'),
    gh('/commits?per_page=30'),
    gh('/milestones?state=all'),
    gh('/actions/runs?per_page=30').then(d => d.workflow_runs),
  ]);

  renderAll({ issues, pulls, commits, milestones, runs });
}
```

---

### Phase 3 — Dashboard UI

**Metric cards**

```html
<div class="metrics">
  <div class="card">Open Issues <span id="count-issues">—</span></div>
  <div class="card">Open PRs    <span id="count-prs">—</span></div>
  <div class="card">CI Pass %   <span id="count-ci">—</span></div>
</div>
```

**Issues panel**

Each row shows a coloured status dot (green = open, red = closed), the issue title, and the assignee avatar.

**PRs panel**

Colour-code by state: open (green), merged (purple), closed (red).

**Milestones panel**

Render a `<progress>` bar using `milestone.closed_issues / (milestone.open_issues + milestone.closed_issues)` and display the due date if set.

**Commits panel**

Show the commit author, short message (first 72 characters), and a human-readable relative time (e.g. "3 hours ago").

```javascript
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr);
  const mins = Math.floor(diff / 60000);
  if (mins < 60)  return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
}
```

**Workflow runs panel**

Group runs by branch and show a ✅ / ❌ badge for the latest run on each branch.

**Filter chips**

Add `All | Open | Closed` toggle buttons. On click, re-render the issues and PRs panels using the already-fetched data — no extra API call needed.

```javascript
let activeFilter = 'all';

document.querySelectorAll('.chip').forEach(btn => {
  btn.addEventListener('click', () => {
    activeFilter = btn.dataset.filter;
    renderIssues(cachedIssues);
    renderPRs(cachedPulls);
  });
});
```

---

### Phase 4 — Enhancements *(optional)*

These can be added after the core dashboard is working.

**Auto-refresh every 60 seconds**

```javascript
setInterval(loadDashboard, 60_000);
```

**Label filters**

Add a second row of filter chips for common labels: `bug`, `feature`, `priority`. Filter the issues panel client-side using the `labels` array returned by the API.

**Commit chart**

Group commits by date and render a simple SVG bar chart (no library required) or use Chart.js from a CDN:

```html
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
```

**Embed in a portal**

Drop the dashboard into any existing page:

```html
<!-- As an iframe -->
<iframe src="./github-dashboard/index.html" width="100%" height="800"></iframe>

<!-- Or as a web component / React component wrapping the same fetch logic -->
```

---

## Complete File Structure

```
project/
└── index.html          ← entire dashboard (HTML + CSS + JS, single file)
```

No `package.json`, no bundler, no server required. Open `index.html` directly in a browser or serve it from any static host (GitHub Pages, Netlify, Vercel, an S3 bucket, etc.).

---

## Security Notes

- The PAT is stored in `sessionStorage`, which is tab-scoped and cleared on close. It is **never** written to `localStorage`, cookies, or sent to any server other than `api.github.com`.
- Use a PAT with the **minimum required scopes** (`repo` + `workflow`).
- For team use, consider a read-only fine-grained PAT scoped to a single repository.
- Do **not** commit a PAT to source control.

---

## Rate Limits

The GitHub REST API allows **5,000 authenticated requests per hour**. With 5 endpoints plus auto-refresh every 60 seconds, the dashboard uses roughly **300 requests/hour** — well within the limit for a single user. For team dashboards with many concurrent users, consider a lightweight proxy that caches responses.

---

## Quick Start

1. Clone or download this repository.
2. Open `index.html` in your browser.
3. Enter your GitHub owner, repository name, and PAT in the setup form.
4. The dashboard loads immediately with live data.

---

## License

MIT
