import React, { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

const PIE_COLORS = ['#D5DBDB','#FF9900','#0972D3','#1D8102'];

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dataService.analytics.overview().then(res => setData(res.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300 }}><div className="spinner" style={{ width:32, height:32 }}/></div>;
  if (!data) return <div style={{ color:'#D13212', padding:24 }}>Failed to load analytics.</div>;

  const { widgets, project_progress, task_distribution, team_workloads, recent_activities } = data;

  const completionRate = widgets.total_projects > 0
    ? Math.round((widgets.completed_projects / widgets.total_projects) * 100) : 0;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      {/* KPI summary row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
        {[
          { label:'Project Completion Rate', value:`${completionRate}%`, color:'#1D8102' },
          { label:'Active Projects', value:widgets.active_projects, color:'#FF9900' },
          { label:'Overdue Tasks', value:widgets.overdue_tasks, color:'#D13212' },
          { label:'Upcoming Deadlines', value:widgets.upcoming_deadlines, color:'#0972D3' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card" style={{ padding:'16px 20px', borderTop:`3px solid ${color}` }}>
            <div style={{ fontSize:24, fontWeight:700, color, marginBottom:4 }}>{value}</div>
            <div style={{ fontSize:11, color:'#5F6B7A', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:16 }}>
        <div className="card">
          <div style={{ fontSize:13, fontWeight:700, color:'#16191F', marginBottom:16 }}>Project Progress Overview</div>
          {project_progress.length === 0
            ? <div className="empty-state"><p>No projects yet.</p></div>
            : <ResponsiveContainer width="100%" height={260}>
                <BarChart data={project_progress} margin={{ top:0, right:10, left:-20, bottom:40 }}>
                  <XAxis dataKey="name" tick={{ fontSize:10 }} tickLine={false} angle={-20} textAnchor="end" interval={0}/>
                  <YAxis domain={[0,100]} tick={{ fontSize:11 }} tickLine={false} axisLine={false}/>
                  <Tooltip formatter={v=>[`${v}%`,'Progress']} contentStyle={{ fontSize:12, border:'1px solid #D5DBDB', borderRadius:4 }}/>
                  <Bar dataKey="progress" fill="#FF9900" radius={[3,3,0,0]} maxBarSize={50}/>
                </BarChart>
              </ResponsiveContainer>
          }
        </div>
        <div className="card">
          <div style={{ fontSize:13, fontWeight:700, color:'#16191F', marginBottom:16 }}>Task Status Distribution</div>
          {task_distribution.every(d=>d.value===0)
            ? <div className="empty-state"><p>No tasks yet.</p></div>
            : <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={task_distribution} cx="50%" cy="42%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                    {task_distribution.map((e,i) => <Cell key={e.name} fill={PIE_COLORS[i % PIE_COLORS.length]}/>)}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize:11 }}/>
                  <Tooltip contentStyle={{ fontSize:12, border:'1px solid #D5DBDB', borderRadius:4 }}/>
                </PieChart>
              </ResponsiveContainer>
          }
        </div>
      </div>

      {/* Team productivity */}
      <div className="card">
        <div style={{ fontSize:13, fontWeight:700, color:'#16191F', marginBottom:16 }}>Team Productivity (Active Task Workload)</div>
        {team_workloads.length === 0
          ? <div className="empty-state"><p>No team members.</p></div>
          : <ResponsiveContainer width="100%" height={200}>
              <BarChart data={team_workloads} layout="vertical" margin={{ top:0, right:30, left:80, bottom:0 }}>
                <XAxis type="number" tick={{ fontSize:11 }} tickLine={false} axisLine={false}/>
                <YAxis dataKey="name" type="category" tick={{ fontSize:11 }} tickLine={false} width={80}/>
                <Tooltip contentStyle={{ fontSize:12, border:'1px solid #D5DBDB', borderRadius:4 }}/>
                <Bar dataKey="workload" fill="#0972D3" radius={[0,3,3,0]} maxBarSize={22}/>
              </BarChart>
            </ResponsiveContainer>
        }
      </div>

      {/* Activity log */}
      <div className="card" style={{ padding:0 }}>
        <div style={{ padding:'14px 20px', borderBottom:'1px solid #D5DBDB', fontSize:14, fontWeight:700, color:'#16191F' }}>
          Activity Log
        </div>
        {recent_activities.length === 0
          ? <div className="empty-state" style={{ padding:40 }}><p>No activity recorded yet.</p></div>
          : recent_activities.map(a => (
            <div key={a.id} style={{ display:'flex', gap:14, padding:'12px 20px', borderBottom:'1px solid #F0F3F4' }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'#FF9900', marginTop:5, flexShrink:0 }}/>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'#16191F' }}>{a.action.replace(/_/g,' ')}</div>
                <div style={{ fontSize:11, color:'#5F6B7A', marginTop:2 }}>
                  {a.user} · {new Date(a.created_at).toLocaleString()}
                </div>
                {a.details && <div style={{ fontSize:12, color:'#5F6B7A', marginTop:3 }}>{a.details}</div>}
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
}
