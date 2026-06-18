import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import {
  Github, ArrowRight, GitBranch, RefreshCw, LogOut,
  AlertCircle, GitPullRequest, Milestone, CheckCircle2,
  Calendar, Search, MessageSquare, ExternalLink,
  PlayCircle, GitCommit, Info
} from 'lucide-react';
import './GitHubDashboard.css';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr);
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export default function GitHubDashboard() {
  // Credentials state
  const [credentials, setCredentials] = useState(() => {
    const token = sessionStorage.getItem('gh_token');
    const owner = sessionStorage.getItem('gh_owner');
    const repo = sessionStorage.getItem('gh_repo');
    if (token && owner && repo) {
      return { token, owner, repo };
    }
    return null;
  });

  // Inputs
  const [ownerInput, setOwnerInput] = useState('');
  const [repoInput, setRepoInput] = useState('');
  const [patInput, setPatInput] = useState('');

  // Data & loading states
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);
  const [status, setStatus] = useState({ text: 'Disconnected', type: 'warning' });

  // Filters & Search
  const [issueFilter, setIssueFilter] = useState('all');
  const [issueSearch, setIssueSearch] = useState('');
  const [prFilter, setPrFilter] = useState('all');
  const [prSearch, setPrSearch] = useState('');

  // Toast notifications
  const [toast, setToast] = useState({ show: false, message: '' });

  const showToast = (msg) => {
    setToast({ show: true, message: msg });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 4000);
  };

  // Fetch API helper
  const ghFetch = async (path, creds) => {
    const response = await fetch(`https://api.github.com/repos/${creds.owner}/${creds.repo}${path}`, {
      headers: {
        'Authorization': `Bearer ${creds.token}`,
        'Accept': 'application/vnd.github+json'
      }
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Access denied. Please check your token scopes or rate limits.');
      }
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }
    return response.json();
  };

  const loadData = async (creds, isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setStatus({ text: 'Refreshing...', type: 'warning' });

    try {
      const [issues, pulls, commits, milestones, runsData] = await Promise.all([
        ghFetch('/issues?state=all&per_page=100', creds),
        ghFetch('/pulls?state=all&per_page=100', creds),
        ghFetch('/commits?per_page=50', creds),
        ghFetch('/milestones?state=all', creds),
        ghFetch('/actions/runs?per_page=50', creds).then(d => d.workflow_runs || [])
      ]);

      // Filter out PRs from the issues endpoint response
      const cleanIssues = issues.filter(item => !item.pull_request);

      setData({
        issues: cleanIssues,
        pulls,
        commits,
        milestones,
        runs: runsData
      });

      setStatus({ text: 'Connected', type: 'success' });
      showToast(isRefresh ? 'Dashboard updated.' : 'Connected successfully.');
    } catch (err) {
      console.error(err);
      setStatus({ text: 'Error', type: 'danger' });
      showToast(`Failed to load: ${err.message}`);

      if (err.message.includes('denied') || err.message.includes('scopes')) {
        setTimeout(() => {
          handleDisconnect();
        }, 2500);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Trigger load on mount if credentials exist
  useEffect(() => {
    if (credentials) {
      loadData(credentials);
    }
  }, [credentials]);

  // Auto-refresh interval
  useEffect(() => {
    if (!credentials) return;
    const interval = setInterval(() => {
      loadData(credentials, true);
    }, 60000);
    return () => clearInterval(interval);
  }, [credentials]);

  // Form submit
  const handleConnect = (e) => {
    e.preventDefault();
    const cleanOwner = ownerInput.replace(/\s+/g, '');
    const cleanRepo = repoInput.replace(/\s+/g, '');
    const cleanToken = patInput.trim();

    if (!cleanOwner || !cleanRepo || !cleanToken) {
      showToast('All fields are required.');
      return;
    }

    sessionStorage.setItem('gh_token', cleanToken);
    sessionStorage.setItem('gh_owner', cleanOwner);
    sessionStorage.setItem('gh_repo', cleanRepo);

    const creds = { token: cleanToken, owner: cleanOwner, repo: cleanRepo };
    setCredentials(creds);
  };

  const handleDisconnect = () => {
    sessionStorage.removeItem('gh_token');
    sessionStorage.removeItem('gh_owner');
    sessionStorage.removeItem('gh_repo');
    setCredentials(null);
    setData(null);
    setStatus({ text: 'Disconnected', type: 'warning' });
    showToast('Disconnected.');
  };

  // Compute stats
  const metrics = useMemo(() => {
    if (!data) return { openIssues: 0, openPrs: 0, activeMilestones: 0, passRate: 100 };
    const openIssues = data.issues.filter(i => i.state === 'open').length;
    const openPrs = data.pulls.filter(p => p.state === 'open').length;
    const activeMilestones = data.milestones.filter(m => m.state === 'open').length;

    const completedRuns = data.runs.filter(r => r.status === 'completed');
    let passRate = 100;
    if (completedRuns.length > 0) {
      const successfulRuns = completedRuns.filter(r => r.conclusion === 'success');
      passRate = Math.round((successfulRuns.length / completedRuns.length) * 100);
    }

    return { openIssues, openPrs, activeMilestones, passRate };
  }, [data]);

  // Compute daily commit counts for last 14 days
  const chartData = useMemo(() => {
    if (!data || !data.commits) return [];
    const days = [];
    const counts = {};

    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayLabel = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      days.push(dayLabel);
      counts[dayLabel] = 0;
    }

    data.commits.forEach(commit => {
      if (commit.commit && commit.commit.author) {
        const date = new Date(commit.commit.author.date);
        const dayLabel = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        if (dayLabel in counts) {
          counts[dayLabel]++;
        }
      }
    });

    return days.map(day => ({
      name: day,
      Commits: counts[day]
    }));
  }, [data]);

  // Filters Lists
  const filteredIssues = useMemo(() => {
    if (!data || !data.issues) return [];
    let list = data.issues;

    if (issueFilter === 'open') list = list.filter(i => i.state === 'open');
    else if (issueFilter === 'closed') list = list.filter(i => i.state === 'closed');

    if (issueSearch) {
      const q = issueSearch.toLowerCase();
      list = list.filter(i => i.title.toLowerCase().includes(q) || i.number.toString().includes(q));
    }
    return list;
  }, [data, issueFilter, issueSearch]);

  const filteredPRs = useMemo(() => {
    if (!data || !data.pulls) return [];
    let list = data.pulls;

    if (prFilter === 'open') list = list.filter(p => p.state === 'open');
    else if (prFilter === 'closed') list = list.filter(p => p.state === 'closed' && !p.merged_at);
    else if (prFilter === 'merged') list = list.filter(p => p.merged_at);

    if (prSearch) {
      const q = prSearch.toLowerCase();
      list = list.filter(p => p.title.toLowerCase().includes(q) || p.number.toString().includes(q));
    }
    return list;
  }, [data, prFilter, prSearch]);

  // Deduplicate and get latest 5 workflows
  const workflows = useMemo(() => {
    if (!data || !data.runs) return [];
    const map = new Map();
    data.runs.forEach(run => {
      const key = `${run.name}-${run.head_branch}`;
      if (!map.has(key)) {
        map.set(key, run);
      }
    });
    return Array.from(map.values()).slice(0, 5);
  }, [data]);

  return (
    <div className="ghd">
      {/* Setup screen */}
      {!credentials && (
        <div className="ghd-setup">
          <div className="ghd-card">
            <div className="ghd-logo">
              <Github size={32} />
            </div>
            <h2>Connect Repository</h2>
            <p>Configure your GitHub repository details and Personal Access Token (PAT) to load the dashboard.</p>

            <form onSubmit={handleConnect}>
              <div className="ghd-fg">
                <label>GitHub Owner / Organization</label>
                <input
                  type="text"
                  placeholder="e.g. S-loo"
                  value={ownerInput}
                  onChange={(e) => setOwnerInput(e.target.value)}
                  required
                />
              </div>
              <div className="ghd-fg">
                <label>Repository Name</label>
                <input
                  type="text"
                  placeholder="e.g. skf-project-silas"
                  value={repoInput}
                  onChange={(e) => setRepoInput(e.target.value)}
                  required
                />
              </div>
              <div className="ghd-fg">
                <label>Personal Access Token (PAT)</label>
                <input
                  type="password"
                  placeholder="ghp_..."
                  value={patInput}
                  onChange={(e) => setPatInput(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="ghd-sbtn">
                Connect Repository
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Main dashboard content */}
      {credentials && (
        <>
          <div className="ghd-header">
            <div className="ghd-hinfo">
              <div className="ghd-hibadge">
                <GitBranch size={20} />
              </div>
              <div>
                <div className="ghd-htitle">
                  <span>{credentials.owner}</span> / <span>{credentials.repo}</span>
                  <span className={`ghd-sbadge ${status.type}`}>{status.text}</span>
                </div>
                <div className="ghd-hsub">Real-time repository health and activity metrics</div>
              </div>
            </div>
            <div className="ghd-hactions">
              <button className="ghd-btn" onClick={() => loadData(credentials, true)}>
                <RefreshCw size={14} className={refreshing ? 'spin-icon animate-spin' : ''} />
                <span>Refresh</span>
              </button>
              <button className="ghd-btn danger" onClick={handleDisconnect}>
                <LogOut size={14} />
                <span>Disconnect</span>
              </button>
            </div>
          </div>

          {/* Metrics row */}
          {loading ? (
            <div className="ghd-metrics">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="ghd-mc accent">
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div className="ghd-skel" style={{ width: '50%', height: 12 }}></div>
                    <div className="ghd-skel" style={{ width: '30%', height: 26 }}></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="ghd-metrics">
              <div className="ghd-mc accent">
                <div>
                  <h3>Open Issues</h3>
                  <div className="ghd-mv">{metrics.openIssues}</div>
                </div>
                <div className="ghd-mib">
                  <AlertCircle size={24} />
                </div>
              </div>
              <div className="ghd-mc success">
                <div>
                  <h3>Open Pull Requests</h3>
                  <div className="ghd-mv">{metrics.openPrs}</div>
                </div>
                <div className="ghd-mib">
                  <GitPullRequest size={24} />
                </div>
              </div>
              <div className="ghd-mc warning">
                <div>
                  <h3>Active Milestones</h3>
                  <div className="ghd-mv">{metrics.activeMilestones}</div>
                </div>
                <div className="ghd-mib">
                  <Milestone size={24} />
                </div>
              </div>
              <div className="ghd-mc danger">
                <div>
                  <h3>CI Success Rate</h3>
                  <div className="ghd-mv">{metrics.passRate}%</div>
                </div>
                <div className="ghd-mib">
                  <CheckCircle2 size={24} />
                </div>
              </div>
            </div>
          )}

          {/* Chart Section */}
          <div className="ghd-panel">
            <div className="ghd-ph">
              <div className="ghd-pt">
                <BarChart size={16} color="#FF9900" />
                Commit Frequency (Last 14 Days)
              </div>
            </div>
            <div style={{ width: '100%', height: 220 }}>
              {loading ? (
                <div className="ghd-skel" style={{ width: '100%', height: '100%' }}></div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#5F6B7A' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#5F6B7A' }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ background: '#FFF', border: '1px solid #D5DBDB', borderRadius: 6, fontSize: 11 }} />
                    <Bar dataKey="Commits" fill="#FF9900" radius={[4, 4, 0, 0]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Grid columns */}
          <div className="ghd-grid">
            {/* Left Col */}
            <div className="ghd-col">
              {/* Issues */}
              <div className="ghd-panel">
                <div className="ghd-ph">
                  <div className="ghd-pt">
                    <AlertCircle size={16} color="#1D8102" />
                    Issues
                  </div>
                  <div className="ghd-search">
                    <Search size={12} className="ghd-sicon" />
                    <input
                      type="text"
                      placeholder="Search issues..."
                      value={issueSearch}
                      onChange={(e) => setIssueSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="ghd-fb">
                  <div className="ghd-chips">
                    {['all', 'open', 'closed'].map(f => (
                      <span
                        key={f}
                        className={`ghd-chip ${issueFilter === f ? 'active' : ''}`}
                        onClick={() => setIssueFilter(f)}
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="ghd-list">
                  {loading ? (
                    [...Array(3)].map((_, i) => (
                      <div key={i} className="ghd-li" style={{ pointerEvents: 'none' }}>
                        <div className="ghd-lm" style={{ width: '100%' }}>
                          <div className="ghd-skel" style={{ width: 16, height: 16, borderRadius: '50%' }}></div>
                          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div className="ghd-skel" style={{ width: '70%', height: 12 }}></div>
                            <div className="ghd-skel" style={{ width: '40%', height: 8 }}></div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : filteredIssues.length === 0 ? (
                    <div className="ghd-empty">
                      <Info size={20} />
                      <p>No issues found.</p>
                    </div>
                  ) : (
                    filteredIssues.map(item => (
                      <a href={item.html_url} target="_blank" rel="noopener noreferrer" className="ghd-li" key={item.id}>
                        <div className="ghd-lm">
                          <span className={`ghd-dot ${item.state}`} />
                          <div>
                            <div className="ghd-li-title">#{item.number} {item.title}</div>
                            <div className="ghd-li-meta">
                              <span>by {item.user?.login}</span>
                              <span>·</span>
                              <span>{item.state === 'open' ? `opened ${timeAgo(item.created_at)}` : `closed ${timeAgo(item.closed_at)}`}</span>
                              {item.comments > 0 && (
                                <span>
                                  · <MessageSquare size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 2 }} /> {item.comments}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="ghd-lr">
                          {item.assignee && (
                            <img src={item.assignee.avatar_url} className="ghd-av" title={item.assignee.login} alt="avatar" />
                          )}
                          <span className={`ghd-badge ${item.state}`}>{item.state}</span>
                        </div>
                      </a>
                    ))
                  )}
                </div>
              </div>

              {/* PRs */}
              <div className="ghd-panel">
                <div className="ghd-ph">
                  <div className="ghd-pt">
                    <GitPullRequest size={16} color="#bc8cff" />
                    Pull Requests
                  </div>
                  <div className="ghd-search">
                    <Search size={12} className="ghd-sicon" />
                    <input
                      type="text"
                      placeholder="Search PRs..."
                      value={prSearch}
                      onChange={(e) => setPrSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="ghd-fb">
                  <div className="ghd-chips">
                    {['all', 'open', 'merged', 'closed'].map(f => (
                      <span
                        key={f}
                        className={`ghd-chip ${prFilter === f ? 'active' : ''}`}
                        onClick={() => setPrFilter(f)}
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="ghd-list">
                  {loading ? (
                    [...Array(3)].map((_, i) => (
                      <div key={i} className="ghd-li" style={{ pointerEvents: 'none' }}>
                        <div className="ghd-lm" style={{ width: '100%' }}>
                          <div className="ghd-skel" style={{ width: 16, height: 16, borderRadius: '50%' }}></div>
                          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div className="ghd-skel" style={{ width: '70%', height: 12 }}></div>
                            <div className="ghd-skel" style={{ width: '40%', height: 8 }}></div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : filteredPRs.length === 0 ? (
                    <div className="ghd-empty">
                      <Info size={20} />
                      <p>No pull requests found.</p>
                    </div>
                  ) : (
                    filteredPRs.map(item => {
                      const stateColor = item.merged_at ? 'merged' : (item.state === 'open' ? 'open' : 'closed');
                      const stateText = item.merged_at ? 'merged' : item.state;
                      return (
                        <a href={item.html_url} target="_blank" rel="noopener noreferrer" className="ghd-li" key={item.id}>
                          <div className="ghd-lm">
                            <span className={`ghd-dot ${stateColor}`} />
                            <div>
                              <div className="ghd-li-title">#{item.number} {item.title}</div>
                              <div className="ghd-li-meta">
                                <span>by {item.user?.login}</span>
                                <span>·</span>
                                <span>{item.merged_at ? `merged ${timeAgo(item.merged_at)}` : `opened ${timeAgo(item.created_at)}`}</span>
                              </div>
                            </div>
                          </div>
                          <div className="ghd-lr">
                            {item.assignee && (
                              <img src={item.assignee.avatar_url} className="ghd-av" title={item.assignee.login} alt="avatar" />
                            )}
                            <span className={`ghd-badge ${stateColor}`}>{stateText}</span>
                          </div>
                        </a>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Right Col */}
            <div className="ghd-col">
              {/* Workflows */}
              <div className="ghd-panel">
                <div className="ghd-ph">
                  <div className="ghd-pt">
                    <PlayCircle size={16} color="#E88A00" />
                    CI/CD Workflows
                  </div>
                </div>
                <div className="ghd-list">
                  {loading ? (
                    [...Array(3)].map((_, i) => (
                      <div key={i} className="ghd-wf">
                        <div className="ghd-skel" style={{ width: 24, height: 24, borderRadius: '50%' }}></div>
                        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <div className="ghd-skel" style={{ width: '60%', height: 12 }}></div>
                          <div className="ghd-skel" style={{ width: '30%', height: 8 }}></div>
                        </div>
                      </div>
                    ))
                  ) : workflows.length === 0 ? (
                    <div className="ghd-empty">
                      <PlayCircle size={20} />
                      <p>No workflows run.</p>
                    </div>
                  ) : (
                    workflows.map(run => {
                      let wStatus = 'in-progress';
                      if (run.status === 'completed') {
                        wStatus = run.conclusion === 'success' ? 'success' : 'failure';
                      }
                      return (
                        <div className="ghd-wf" key={run.id}>
                          <div className="ghd-wfi">
                            <span className={`ghd-wfic ${wStatus}`}>
                              {wStatus === 'success' ? '✓' : wStatus === 'failure' ? '✗' : '●'}
                            </span>
                            <div style={{ minWidth: 0 }}>
                              <div className="ghd-wf-name">{run.name}</div>
                              <div className="ghd-wf-meta">
                                <span>branch: <strong>{run.head_branch}</strong></span>
                                <span> · </span>
                                <span>run #{run.run_number}</span>
                              </div>
                            </div>
                          </div>
                          <a href={run.html_url} target="_blank" rel="noopener noreferrer" className="ghd-sha" title="View Logs">
                            <ExternalLink size={10} />
                          </a>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Milestones */}
              <div className="ghd-panel">
                <div className="ghd-ph">
                  <div className="ghd-pt">
                    <Milestone size={16} color="#FF9900" />
                    Milestones
                  </div>
                </div>
                <div className="ghd-list">
                  {loading ? (
                    [...Array(2)].map((_, i) => (
                      <div key={i} className="ghd-ms">
                        <div className="ghd-skel" style={{ width: '70%', height: 14 }}></div>
                        <div className="ghd-skel" style={{ width: '100%', height: 8 }}></div>
                        <div className="ghd-skel" style={{ width: '40%', height: 8 }}></div>
                      </div>
                    ))
                  ) : data?.milestones?.filter(m => m.state === 'open').length === 0 ? (
                    <div className="ghd-empty">
                      <Milestone size={20} />
                      <p>No active milestones.</p>
                    </div>
                  ) : (
                    data?.milestones?.filter(m => m.state === 'open').slice(0, 4).map(m => {
                      const total = m.open_issues + m.closed_issues;
                      const progress = total > 0 ? Math.round((m.closed_issues / total) * 100) : 0;
                      return (
                        <div className="ghd-ms" key={m.id}>
                          <div className="ghd-ms-row">
                            <div className="ghd-ms-name">{m.title}</div>
                            {m.due_on && (
                              <div className="ghd-ms-due">
                                <Calendar size={10} style={{ display: 'inline', marginRight: 3 }} />
                                {new Date(m.due_on).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                          <div className="progress-bar-container">
                            <div className="ghd-pt-track">
                              <div className="ghd-pt-fill" style={{ width: `${progress}%` }} />
                            </div>
                            <span className="ghd-pct">{progress}%</span>
                          </div>
                          <div className="ghd-ms-stats">
                            <span>{m.open_issues} open</span>
                            <span>·</span>
                            <span>{m.closed_issues} closed</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Commits */}
              <div className="ghd-panel">
                <div className="ghd-ph">
                  <div className="ghd-pt">
                    <GitCommit size={16} color="#5F6B7A" />
                    Recent Commits
                  </div>
                </div>
                <div className="ghd-list">
                  {loading ? (
                    [...Array(3)].map((_, i) => (
                      <div key={i} className="ghd-li" style={{ pointerEvents: 'none' }}>
                        <div className="ghd-lm" style={{ width: '100%' }}>
                          <div className="ghd-skel" style={{ width: 16, height: 16, borderRadius: '50%' }}></div>
                          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div className="ghd-skel" style={{ width: '70%', height: 12 }}></div>
                            <div className="ghd-skel" style={{ width: '40%', height: 8 }}></div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : !data?.commits || data.commits.length === 0 ? (
                    <div className="ghd-empty">
                      <GitCommit size={20} />
                      <p>No commits found.</p>
                    </div>
                  ) : (
                    data.commits.slice(0, 6).map(commit => (
                      <a href={commit.html_url} target="_blank" rel="noopener noreferrer" className="ghd-li" key={commit.sha}>
                        <div className="ghd-lm">
                          {commit.author ? (
                            <img src={commit.author.avatar_url} className="ghd-av" alt="avatar" />
                          ) : (
                            <div className="ghd-skel" style={{ width: 22, height: 22, borderRadius: '50%' }}></div>
                          )}
                          <div style={{ minWidth: 0 }}>
                            <div className="ghd-li-title">{commit.commit?.message?.split('\n')[0]}</div>
                            <div className="ghd-li-meta">
                              <span>by <strong>{commit.commit?.author?.name}</strong></span>
                              <span>·</span>
                              <span>{timeAgo(commit.commit?.author?.date)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="ghd-lr">
                          <span className="ghd-sha">{commit.sha.substring(0, 7)}</span>
                        </div>
                      </a>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Toast popup */}
      <div className={`ghd-toast ${toast.show ? 'show' : ''}`}>
        <span>{toast.message}</span>
      </div>
    </div>
  );
}
