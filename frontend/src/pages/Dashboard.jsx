import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dataService } from '../services/dataService';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  FolderOpen, Activity, CheckCircle, AlertTriangle,
  Clock, TrendingUp, Users, FileText
} from 'lucide-react';

const STATUS_COLORS = {
  'Not Started': '#D5DBDB',
  'In Progress': '#FF9900',
  'Under Review': '#0972D3',
  'Completed': '#1D8102',
};

function StatCard({ icon: Icon, value, label, color, onClick }) {
  return (
    <div
      className="stat-card"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default', minWidth: 0 }}
    >
      <div className="stat-icon" style={{ background: color + '18', flexShrink: 0 }}>
        <Icon size={20} color={color} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="stat-value" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {value}
        </div>
        <div
          className="stat-label"
          style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 11 }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    dataService.analytics.overview()
      .then(res => setData(res.data))
      .catch(() => setError('Failed to load dashboard data.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  );
  if (error) return <div style={{ color: '#D13212', padding: 24 }}>{error}</div>;

  const { widgets, deadlines, team_workloads, project_progress, task_distribution, recent_activities } = data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>

      {/* ── Stat widgets ─────────────────────────────────────────────────────── */}
      {/* auto-fit: cards wrap to 2–3 per row on tablet, 1–2 on mobile */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 14,
      }}>
        <StatCard icon={FolderOpen} value={widgets.total_projects} label="Total Projects" color="#0972D3" onClick={() => navigate('/projects')} />
        <StatCard icon={Activity} value={widgets.active_projects} label="Active Projects" color="#FF9900" onClick={() => navigate('/projects')} />
        <StatCard icon={CheckCircle} value={widgets.completed_projects} label="Completed" color="#1D8102" />
        <StatCard icon={AlertTriangle} value={widgets.overdue_tasks} label="Overdue Tasks" color="#D13212" onClick={() => navigate('/tasks')} />
        <StatCard icon={Clock} value={widgets.upcoming_deadlines} label="Upcoming Deadlines" color="#5F6B7A" />
      </div>

      {/* ── Charts row ───────────────────────────────────────────────────────── */}
      {/* Stacks to single column below ~640 px */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 16,
        minWidth: 0,
      }}>
        {/* Project progress bar chart */}
        <div className="card" style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#16191F', marginBottom: 16 }}>
            Project Progress Overview
          </div>
          {project_progress.length === 0 ? (
            <div className="empty-state"><TrendingUp size={32} /><p>No projects yet.</p></div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={project_progress} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  /* truncate long project names on the axis */
                  tickFormatter={v => v.length > 10 ? v.slice(0, 10) + '…' : v}
                />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={v => [`${v}%`, 'Progress']}
                  contentStyle={{ fontSize: 12, border: '1px solid #D5DBDB', borderRadius: 4 }}
                />
                <Bar dataKey="progress" fill="#FF9900" radius={[3, 3, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Task distribution pie chart */}
        <div className="card" style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#16191F', marginBottom: 16 }}>
            Task Status Distribution
          </div>
          {task_distribution.every(d => d.value === 0) ? (
            <div className="empty-state"><FileText size={32} /><p>No tasks yet.</p></div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={task_distribution}
                  cx="50%" cy="45%"
                  innerRadius={50} outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {task_distribution.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#D5DBDB'} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12, border: '1px solid #D5DBDB', borderRadius: 4 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Bottom row: Activity + Deadlines + Workload ───────────────────────── */}
      {/* Each card has a minmin of 220px; they wrap on smaller screens */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16,
        minWidth: 0,
        alignItems: 'start',
      }}>

        {/* Recent Activity */}
        <div className="card" style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#16191F', marginBottom: 14 }}>Recent Activity</div>
          {recent_activities.length === 0 ? (
            <div className="empty-state"><Activity size={28} /><p>No activity yet.</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recent_activities.slice(0, 7).map(a => (
                <div key={a.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', minWidth: 0 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: '#FF990018', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Activity size={13} color="#FF9900" />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontSize: 12, fontWeight: 600, color: '#16191F',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {a.action.replace(/_/g, ' ')}
                    </div>
                    <div style={{
                      fontSize: 11, color: '#5F6B7A',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {a.user} · {new Date(a.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Deadlines */}
        <div className="card" style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#16191F', marginBottom: 14 }}>Upcoming Deadlines</div>
          {deadlines.length === 0 ? (
            <div className="empty-state"><Clock size={28} /><p>No upcoming deadlines.</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {deadlines.map(d => (
                <div key={d.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  gap: 8,
                  padding: '8px 10px', background: '#F8FAFC', borderRadius: 4,
                  border: '1px solid #D5DBDB',
                  minWidth: 0,
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontSize: 12, fontWeight: 600, color: '#16191F',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {d.name}
                    </div>
                    <div style={{
                      fontSize: 11, color: '#5F6B7A', textTransform: 'capitalize',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {d.type}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 700, flexShrink: 0,
                    color: d.days_left <= 3 ? '#D13212' : d.days_left <= 7 ? '#E88A00' : '#1D8102',
                  }}>
                    {d.days_left === 0 ? 'Today' : `${d.days_left}d`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Team Workload */}
        <div className="card" style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#16191F', marginBottom: 14 }}>Team Workload</div>
          {team_workloads.length === 0 ? (
            <div className="empty-state"><Users size={28} /><p>No team members.</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {team_workloads.slice(0, 6).map((m, i) => (
                <div key={i} style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, gap: 8, minWidth: 0 }}>
                    <span style={{
                      fontSize: 12, fontWeight: 500, color: '#16191F',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
                    }}>
                      {m.name}
                    </span>
                    <span style={{ fontSize: 11, color: '#5F6B7A', flexShrink: 0 }}>
                      {m.workload} tasks
                    </span>
                  </div>
                  <div className="progress-bar-track">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${Math.min((m.workload / 10) * 100, 100)}%`,
                        background: m.workload > 7 ? '#D13212' : m.workload > 4 ? '#FF9900' : '#1D8102',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}