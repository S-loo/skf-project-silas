import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dataService } from '../services/dataService';
import { Plus, Search, FolderOpen, X, Calendar, Users } from 'lucide-react';

const STATUSES = ['planning','active','suspended','completed','archived'];
const PRIORITIES = ['low','medium','high','critical'];

function badgeClass(val) {
  const map = {
    planning:'badge-planning', active:'badge-active', suspended:'badge-suspended',
    completed:'badge-completed', archived:'badge-archived',
    low:'badge-low', medium:'badge-medium', high:'badge-high', critical:'badge-critical',
  };
  return 'badge ' + (map[val] || 'badge-medium');
}

function CreateProjectModal({ onClose, onCreated, teamMembers }) {
  const [form, setForm] = useState({
    name:'', description:'', start_date:'', deadline:'',
    priority:'medium', status:'planning', team_members:[]
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name || !form.start_date || !form.deadline) {
      setError('Name, start date, and deadline are required.');
      return;
    }
    setSaving(true);
    try {
      const res = await dataService.projects.create(form);
      onCreated(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create project.');
    } finally {
      setSaving(false);
    }
  };

  const toggleMember = (id) => {
    setForm(f => ({
      ...f,
      team_members: f.team_members.includes(id)
        ? f.team_members.filter(m => m !== id)
        : [...f.team_members, id]
    }));
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-header">
          <div className="modal-title">Create New Project</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        {error && (
          <div style={{ background:'#FDECEA', border:'1px solid #F5C6C0', borderRadius:4, padding:'8px 12px', color:'#D13212', fontSize:12, marginBottom:14 }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <label className="form-label">Project Name *</label>
            <input className="form-input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Hospital Management System" />
          </div>
          <div>
            <label className="form-label">Description</label>
            <textarea className="form-input" rows={3} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Project overview..." style={{ resize:'vertical' }} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label className="form-label">Start Date *</label>
              <input type="date" className="form-input" value={form.start_date} onChange={e=>setForm(f=>({...f,start_date:e.target.value}))} />
            </div>
            <div>
              <label className="form-label">Deadline *</label>
              <input type="date" className="form-input" value={form.deadline} onChange={e=>setForm(f=>({...f,deadline:e.target.value}))} />
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label className="form-label">Priority</label>
              <select className="form-input form-select" value={form.priority} onChange={e=>setForm(f=>({...f,priority:e.target.value}))}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Status</label>
              <select className="form-input form-select" value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
              </select>
            </div>
          </div>
          {teamMembers.length > 0 && (
            <div>
              <label className="form-label">Assign Team Members</label>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:4 }}>
                {teamMembers.map(m => {
                  const name = m.user ? `${m.user.first_name} ${m.user.last_name}` : 'Member';
                  const selected = form.team_members.includes(m.id);
                  return (
                    <button key={m.id} type="button" onClick={()=>toggleMember(m.id)}
                      style={{
                        padding:'4px 10px', borderRadius:4, fontSize:12, cursor:'pointer',
                        border: selected ? '1px solid #FF9900' : '1px solid #D5DBDB',
                        background: selected ? '#FFF0D4' : '#FFFFFF',
                        color: selected ? '#E88A00' : '#5F6B7A',
                        fontWeight: selected ? 600 : 400,
                      }}>
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:4 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner" style={{ width:14, height:14 }} /> : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Projects() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const canCreate = ['admin', 'project_manager'].includes(user?.role);

  const loadProjects = async () => {
    const params = {};
    if (search) params.search = search;
    if (filterStatus) params.status = filterStatus;
    if (filterPriority) params.priority = filterPriority;
    const res = await dataService.projects.list(params);
    setProjects(res.data);
  };

  useEffect(() => {
    Promise.all([dataService.projects.list(), dataService.team.list()])
      .then(([pRes, tRes]) => {
        setProjects(pRes.data);
        setTeamMembers(tRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const t = setTimeout(loadProjects, 300);
    return () => clearTimeout(t);
  }, [search, filterStatus, filterPriority]);

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300 }}>
      <div className="spinner" style={{ width:32, height:32 }} />
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* Toolbar */}
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ position:'relative', flex:1, maxWidth:340 }}>
          <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#5F6B7A' }} />
          <input
            className="form-input"
            style={{ paddingLeft:32 }}
            placeholder="Search projects..."
            value={search}
            onChange={e=>setSearch(e.target.value)}
          />
        </div>
        <select className="form-input form-select" style={{ width:140 }} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUSES.map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
        </select>
        <select className="form-input form-select" style={{ width:140 }} value={filterPriority} onChange={e=>setFilterPriority(e.target.value)}>
          <option value="">All Priorities</option>
          {PRIORITIES.map(p=><option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
        </select>
        {canCreate && (
          <button className="btn btn-primary" onClick={()=>setShowCreate(true)}>
            <Plus size={15} /> New Project
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        {projects.length === 0 ? (
          <div className="empty-state" style={{ padding:48 }}>
            <FolderOpen size={40} />
            <h3>No projects found</h3>
            <p>Create your first project to get started.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Project Name</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Progress</th>
                <th>Team</th>
                <th>Deadline</th>
              </tr>
            </thead>
            <tbody>
              {projects.map(p => (
                <tr key={p.id} onClick={()=>navigate(`/projects/${p.id}`)} style={{ cursor:'pointer' }}>
                  <td>
                    <div style={{ fontWeight:600, color:'#16191F' }}>{p.name}</div>
                    {p.description && (
                      <div style={{ fontSize:11, color:'#5F6B7A', marginTop:2 }}>
                        {p.description.slice(0, 60)}{p.description.length > 60 ? '…' : ''}
                      </div>
                    )}
                  </td>
                  <td><span className={badgeClass(p.status)}>{p.status}</span></td>
                  <td><span className={badgeClass(p.priority)}>{p.priority}</span></td>
                  <td style={{ minWidth:120 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div className="progress-bar-track" style={{ flex:1 }}>
                        <div className="progress-bar-fill" style={{ width:`${p.progress}%` }} />
                      </div>
                      <span style={{ fontSize:11, fontWeight:600, color:'#5F6B7A', minWidth:28 }}>{p.progress}%</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                      <Users size={13} color="#5F6B7A" />
                      <span style={{ fontSize:12, color:'#5F6B7A' }}>{p.team_members?.length || 0}</span>
                    </div>
                  </td>
                  <td style={{ fontSize:12, color: new Date(p.deadline) < new Date() ? '#D13212' : '#5F6B7A' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                      <Calendar size={13} />
                      {new Date(p.deadline).toLocaleDateString()}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && (
        <CreateProjectModal
          teamMembers={teamMembers}
          onClose={()=>setShowCreate(false)}
          onCreated={p=>setProjects(prev=>[p, ...prev])}
        />
      )}
    </div>
  );
}
