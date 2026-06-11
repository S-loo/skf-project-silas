import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dataService } from '../services/dataService';
import { ArrowLeft, Edit2, Trash2, Plus, X, MessageSquare } from 'lucide-react';

const TASK_STATUSES = ['not_started','in_progress','under_review','completed'];
const PRIORITIES = ['low','medium','high','critical'];
const PROJECT_STATUSES = ['planning','active','suspended','completed','archived'];

function TaskModal({ onClose, onSaved, projectId, teamMembers, existing }) {
  const isEdit = !!existing;
  const [form, setForm] = useState({
    title: existing?.title || '', description: existing?.description || '',
    assigned_to: existing?.assigned_to?.id || '',
    due_date: existing?.due_date ? existing.due_date.slice(0,10) : '',
    status: existing?.status || 'not_started',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.due_date) { setError('Title and due date required.'); return; }
    setSaving(true);
    try {
      const payload = isEdit ? form : { ...form, project: projectId };
      const res = isEdit ? await dataService.tasks.update(existing.id, payload) : await dataService.tasks.create(payload);
      onSaved(res.data, isEdit);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save task.');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-header">
          <div className="modal-title">{isEdit ? 'Edit Task' : 'Add Task'}</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16}/></button>
        </div>
        {error && <div style={{ background:'#FDECEA', border:'1px solid #F5C6C0', borderRadius:4, padding:'8px 12px', color:'#D13212', fontSize:12, marginBottom:12 }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div><label className="form-label">Task Title *</label>
            <input className="form-input" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Task title..." />
          </div>
          <div><label className="form-label">Description</label>
            <textarea className="form-input" rows={2} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} style={{ resize:'vertical' }} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div><label className="form-label">Assign To</label>
              <select className="form-input form-select" value={form.assigned_to} onChange={e=>setForm(f=>({...f,assigned_to:e.target.value}))}>
                <option value="">Unassigned</option>
                {teamMembers.map(m => <option key={m.id} value={m.id}>{m.user ? `${m.user.first_name} ${m.user.last_name}` : 'Member'}</option>)}
              </select>
            </div>
            <div><label className="form-label">Due Date *</label>
              <input type="date" className="form-input" value={form.due_date} onChange={e=>setForm(f=>({...f,due_date:e.target.value}))} />
            </div>
          </div>
          {isEdit && (
            <div><label className="form-label">Status</label>
              <select className="form-input form-select" value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                {TASK_STATUSES.map(s=><option key={s} value={s}>{s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
              </select>
            </div>
          )}
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner" style={{ width:14, height:14 }}/> : isEdit ? 'Save Changes' : 'Add Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProjectDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [expandedTask, setExpandedTask] = useState(null);
  const [comment, setComment] = useState('');
  const [editingProject, setEditingProject] = useState(false);
  const [projectForm, setProjectForm] = useState({});
  const [savingProject, setSavingProject] = useState(false);

  const canManage = ['admin','project_manager'].includes(user?.role);

  useEffect(() => {
    Promise.all([dataService.projects.get(id), dataService.tasks.listByProject(id), dataService.team.list()])
      .then(([pRes, tRes, mRes]) => { setProject(pRes.data); setTasks(tRes.data); setTeamMembers(mRes.data); })
      .finally(() => setLoading(false));
  }, [id]);

  const refreshProject = () => dataService.projects.get(id).then(r => setProject(r.data));

  const handleTaskSaved = (task, isEdit) => {
    setTasks(prev => isEdit ? prev.map(t => t.id === task.id ? task : t) : [task, ...prev]);
    refreshProject();
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    await dataService.tasks.delete(taskId);
    setTasks(prev => prev.filter(t => t.id !== taskId));
    refreshProject();
  };

  const handleStatusChange = async (task, newStatus) => {
    const res = await dataService.tasks.update(task.id, { status: newStatus });
    setTasks(prev => prev.map(t => t.id === task.id ? res.data : t));
    refreshProject();
  };

  const submitComment = async (task) => {
    if (!comment.trim()) return;
    const res = await dataService.tasks.addComment(task.id, comment.trim());
    setTasks(prev => prev.map(t => t.id === res.data.id ? res.data : t));
    setComment('');
  };

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300 }}><div className="spinner" style={{ width:32, height:32 }}/></div>;
  if (!project) return <div style={{ color:'#D13212', padding:24 }}>Project not found.</div>;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button className="btn btn-ghost btn-sm" onClick={()=>navigate('/projects')}><ArrowLeft size={15}/> Back</button>
          <div>
            <h2 style={{ margin:0, fontSize:18, fontWeight:700, color:'#16191F' }}>{project.name}</h2>
            <div style={{ display:'flex', gap:6, marginTop:4 }}>
              <span className={`badge badge-${project.status}`}>{project.status}</span>
              <span className={`badge badge-${project.priority}`}>{project.priority}</span>
            </div>
          </div>
        </div>
        {canManage && (
          <div style={{ display:'flex', gap:8 }}>
            <button className="btn btn-secondary btn-sm" onClick={()=>{ setProjectForm({ name:project.name, description:project.description, status:project.status, priority:project.priority, deadline:project.deadline?.slice(0,10), start_date:project.start_date?.slice(0,10) }); setEditingProject(true); }}>
              <Edit2 size={13}/> Edit
            </button>
            <button className="btn btn-danger btn-sm" onClick={async()=>{ if(window.confirm('Delete project?')){ await dataService.projects.delete(id); navigate('/projects'); }}}>
              <Trash2 size={13}/> Delete
            </button>
          </div>
        )}
      </div>

      {/* Meta */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
        {[
          { label:'Progress', value:`${project.progress}%`, sub: <div className="progress-bar-track" style={{ marginTop:6 }}><div className="progress-bar-fill" style={{ width:`${project.progress}%` }}/></div> },
          { label:'Tasks', value:tasks.length, sub:`${tasks.filter(t=>t.status==='completed').length} completed` },
          { label:'Deadline', value:new Date(project.deadline).toLocaleDateString(), sub:`${Math.ceil((new Date(project.deadline)-new Date())/(864e5))} days left`, danger: new Date(project.deadline)<new Date() },
          { label:'Team', value:project.team_members?.length||0, sub:'members assigned' },
        ].map(({ label, value, sub, danger }) => (
          <div key={label} className="card" style={{ padding:'14px 16px' }}>
            <div style={{ fontSize:11, color:'#5F6B7A', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em' }}>{label}</div>
            <div style={{ fontSize:22, fontWeight:700, color: danger?'#D13212':'#16191F', margin:'6px 0 2px' }}>{value}</div>
            <div style={{ fontSize:11, color:'#5F6B7A' }}>{sub}</div>
          </div>
        ))}
      </div>

      {project.description && <div className="card"><div style={{ fontSize:12, fontWeight:700, color:'#5F6B7A', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.04em' }}>Description</div><div style={{ fontSize:13, color:'#16191F', lineHeight:1.6 }}>{project.description}</div></div>}

      {/* Tasks */}
      <div className="card" style={{ padding:0 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px', borderBottom:'1px solid #D5DBDB' }}>
          <div style={{ fontSize:14, fontWeight:700, color:'#16191F' }}>Tasks ({tasks.length})</div>
          <button className="btn btn-primary btn-sm" onClick={()=>setShowTaskModal(true)}><Plus size={13}/> Add Task</button>
        </div>
        {tasks.length === 0 ? (
          <div className="empty-state" style={{ padding:40 }}><div style={{ fontSize:32 }}>✓</div><h3>No tasks yet</h3><p>Add tasks to start tracking progress.</p></div>
        ) : tasks.map(task => {
          const isOverdue = task.status !== 'completed' && new Date(task.due_date) < new Date();
          const isExpanded = expandedTask === task.id;
          return (
            <div key={task.id} style={{ borderBottom:'1px solid #F0F3F4' }}>
              <div style={{ padding:'12px 20px', display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                    <span style={{ fontSize:13, fontWeight:600, color:'#16191F' }}>{task.title}</span>
                    <span className={`badge badge-${task.status}`}>{task.status.replace(/_/g,' ')}</span>
                    {isOverdue && <span style={{ fontSize:10, color:'#D13212', fontWeight:700 }}>OVERDUE</span>}
                  </div>
                  {task.assigned_to && <div style={{ fontSize:11, color:'#5F6B7A', marginTop:2 }}>
                    {task.assigned_to.user?.first_name} {task.assigned_to.user?.last_name} · Due {new Date(task.due_date).toLocaleDateString()}
                  </div>}
                </div>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <select className="form-input form-select" style={{ width:140, padding:'4px 28px 4px 8px', fontSize:12 }} value={task.status} onChange={e=>handleStatusChange(task, e.target.value)} onClick={e=>e.stopPropagation()}>
                    {TASK_STATUSES.map(s=><option key={s} value={s}>{s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
                  </select>
                  <button className="btn btn-ghost btn-sm" onClick={()=>setExpandedTask(isExpanded?null:task.id)}><MessageSquare size={13}/> {task.comments?.length||0}</button>
                  <button className="btn btn-ghost btn-sm" onClick={()=>setEditingTask(task)}><Edit2 size={13}/></button>
                  <button className="btn btn-ghost btn-sm" style={{ color:'#D13212' }} onClick={()=>handleDeleteTask(task.id)}><Trash2 size={13}/></button>
                </div>
              </div>
              {isExpanded && (
                <div style={{ padding:'12px 20px 16px', background:'#F8FAFC', borderTop:'1px solid #F0F3F4' }}>
                  {task.description && <p style={{ fontSize:12, color:'#5F6B7A', margin:'0 0 12px' }}>{task.description}</p>}
                  <div style={{ fontSize:12, fontWeight:700, color:'#5F6B7A', marginBottom:8, textTransform:'uppercase' }}>Comments</div>
                  {(task.comments||[]).map((c,i)=>(
                    <div key={i} style={{ background:'#fff', borderRadius:4, padding:'8px 10px', border:'1px solid #D5DBDB', marginBottom:6 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                        <span style={{ fontSize:12, fontWeight:600 }}>{c.author}</span>
                        <span style={{ fontSize:11, color:'#5F6B7A' }}>{new Date(c.created_at).toLocaleDateString()}</span>
                      </div>
                      <div style={{ fontSize:12, color:'#5F6B7A' }}>{c.comment}</div>
                    </div>
                  ))}
                  <div style={{ display:'flex', gap:8, marginTop:8 }}>
                    <input className="form-input" style={{ flex:1 }} placeholder="Add a comment..." value={comment} onChange={e=>setComment(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submitComment(task)} />
                    <button className="btn btn-primary btn-sm" onClick={()=>submitComment(task)} disabled={!comment.trim()}>Post</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showTaskModal && <TaskModal projectId={id} teamMembers={teamMembers} onClose={()=>setShowTaskModal(false)} onSaved={handleTaskSaved} />}
      {editingTask && <TaskModal existing={editingTask} projectId={id} teamMembers={teamMembers} onClose={()=>setEditingTask(null)} onSaved={handleTaskSaved} />}

      {editingProject && (
        <div className="modal-overlay"><div className="modal-box">
          <div className="modal-header"><div className="modal-title">Edit Project</div><button className="btn btn-ghost btn-sm" onClick={()=>setEditingProject(false)}><X size={16}/></button></div>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div><label className="form-label">Name</label><input className="form-input" value={projectForm.name||''} onChange={e=>setProjectForm(f=>({...f,name:e.target.value}))}/></div>
            <div><label className="form-label">Description</label><textarea className="form-input" rows={3} value={projectForm.description||''} onChange={e=>setProjectForm(f=>({...f,description:e.target.value}))} style={{ resize:'vertical' }}/></div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div><label className="form-label">Status</label>
                <select className="form-input form-select" value={projectForm.status||''} onChange={e=>setProjectForm(f=>({...f,status:e.target.value}))}>
                  {PROJECT_STATUSES.map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                </select></div>
              <div><label className="form-label">Priority</label>
                <select className="form-input form-select" value={projectForm.priority||''} onChange={e=>setProjectForm(f=>({...f,priority:e.target.value}))}>
                  {PRIORITIES.map(p=><option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
                </select></div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div><label className="form-label">Start Date</label><input type="date" className="form-input" value={projectForm.start_date||''} onChange={e=>setProjectForm(f=>({...f,start_date:e.target.value}))}/></div>
              <div><label className="form-label">Deadline</label><input type="date" className="form-input" value={projectForm.deadline||''} onChange={e=>setProjectForm(f=>({...f,deadline:e.target.value}))}/></div>
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button className="btn btn-secondary" onClick={()=>setEditingProject(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={async()=>{ setSavingProject(true); const res=await dataService.projects.update(id,projectForm); setProject(res.data); setEditingProject(false); setSavingProject(false); }} disabled={savingProject}>
                {savingProject ? <span className="spinner" style={{ width:14, height:14 }}/> : 'Save Changes'}
              </button>
            </div>
          </div>
        </div></div>
      )}
    </div>
  );
}
