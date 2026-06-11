import React, { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';
import { CheckSquare, AlertTriangle, Clock } from 'lucide-react';

const STATUSES = ['not_started','in_progress','under_review','completed'];
const STATUS_LABELS = { not_started:'Not Started', in_progress:'In Progress', under_review:'Under Review', completed:'Completed' };
const STATUS_COLORS = { not_started:'#5F6B7A', in_progress:'#FF9900', under_review:'#0972D3', completed:'#1D8102' };

export default function Tasks() {
  const [allTasks, setAllTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterProject, setFilterProject] = useState('');

  useEffect(() => {
    dataService.projects.list().then(async res => {
      setProjects(res.data);
      const taskResults = await Promise.all(res.data.map(p => dataService.tasks.listByProject(p.id)));
      setAllTasks(taskResults.flatMap(r => r.data));
    }).finally(() => setLoading(false));
  }, []);

  const handleStatusChange = async (task, newStatus) => {
    const res = await dataService.tasks.update(task.id, { status: newStatus });
    setAllTasks(prev => prev.map(t => t.id === task.id ? res.data : t));
  };

  const filtered = allTasks.filter(t => {
    if (filterStatus && t.status !== filterStatus) return false;
    if (filterProject && t.project?.id !== filterProject) return false;
    return true;
  });

  const grouped = STATUSES.reduce((acc, s) => {
    acc[s] = filtered.filter(t => t.status === s);
    return acc;
  }, {});

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300 }}><div className="spinner" style={{ width:32, height:32 }}/></div>;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* Filters */}
      <div style={{ display:'flex', gap:10 }}>
        <select className="form-input form-select" style={{ width:160 }} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUSES.map(s=><option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        <select className="form-input form-select" style={{ width:220 }} value={filterProject} onChange={e=>setFilterProject(e.target.value)}>
          <option value="">All Projects</option>
          {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div style={{ marginLeft:'auto', fontSize:13, color:'#5F6B7A', display:'flex', alignItems:'center', gap:6 }}>
          <AlertTriangle size={14} color="#D13212"/>
          <span style={{ color:'#D13212', fontWeight:600 }}>
            {allTasks.filter(t=>t.status!=='completed'&&new Date(t.due_date)<new Date()).length}
          </span> overdue
        </div>
      </div>

      {/* Kanban columns */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, alignItems:'start' }}>
        {STATUSES.map(s => (
          <div key={s}>
            <div style={{
              display:'flex', alignItems:'center', justifyContent:'space-between',
              marginBottom:10, padding:'8px 10px',
              background:'#FFFFFF', border:'1px solid #D5DBDB', borderRadius:4,
              borderTop:`3px solid ${STATUS_COLORS[s]}`,
            }}>
              <span style={{ fontSize:12, fontWeight:700, color:'#16191F' }}>{STATUS_LABELS[s]}</span>
              <span style={{
                fontSize:11, fontWeight:700,
                background: STATUS_COLORS[s]+'18', color:STATUS_COLORS[s],
                borderRadius:10, padding:'1px 7px',
              }}>{grouped[s].length}</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {grouped[s].length === 0 && (
                <div style={{ background:'#F8FAFC', border:'1px dashed #D5DBDB', borderRadius:4, padding:'20px 12px', textAlign:'center', color:'#5F6B7A', fontSize:12 }}>
                  No tasks
                </div>
              )}
              {grouped[s].map(task => {
                const isOverdue = task.status !== 'completed' && new Date(task.due_date) < new Date();
                return (
                  <div key={task.id} style={{
                    background:'#FFFFFF', border:`1px solid ${isOverdue?'#F5C6C0':'#D5DBDB'}`,
                    borderRadius:4, padding:'12px 12px',
                    borderLeft:`3px solid ${isOverdue?'#D13212':STATUS_COLORS[s]}`,
                  }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'#16191F', marginBottom:6 }}>{task.title}</div>
                    <div style={{ fontSize:11, color:'#5F6B7A', marginBottom:8 }}>
                      <span style={{ fontWeight:500, color:'#16191F' }}>{task.project?.name}</span>
                    </div>
                    {task.assigned_to && (
                      <div style={{ fontSize:11, color:'#5F6B7A', marginBottom:8 }}>
                        👤 {task.assigned_to.user?.first_name} {task.assigned_to.user?.last_name}
                      </div>
                    )}
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color: isOverdue?'#D13212':'#5F6B7A' }}>
                        <Clock size={11}/>
                        {new Date(task.due_date).toLocaleDateString()}
                        {isOverdue && ' · OVERDUE'}
                      </div>
                      <select
                        className="form-input form-select"
                        style={{ width:120, padding:'3px 24px 3px 6px', fontSize:11 }}
                        value={task.status}
                        onChange={e=>handleStatusChange(task, e.target.value)}
                      >
                        {STATUSES.map(st=><option key={st} value={st}>{STATUS_LABELS[st]}</option>)}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
