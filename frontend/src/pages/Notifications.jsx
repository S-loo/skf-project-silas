import React, { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';
import { Bell, CheckCircle, AlertTriangle, Info, Clock, Check } from 'lucide-react';

const TYPE_CONFIG = {
  deadline:   { icon: Clock,         color: '#D13212', bg: '#FDECEA' },
  assignment: { icon: Bell,          color: '#0972D3', bg: '#EEF4FB' },
  alert:      { icon: AlertTriangle, color: '#E88A00', bg: '#FFF3CD' },
  info:       { icon: Info,          color: '#5F6B7A', bg: '#F8FAFC' },
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    dataService.notifications.list().then(res => setNotifications(res.data)).finally(() => setLoading(false));
  }, []);

  const markRead = async (id) => {
    await dataService.notifications.markRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.is_read);
    await Promise.all(unread.map(n => dataService.notifications.markRead(n.id)));
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read;
    if (filter === 'read') return n.is_read;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300 }}><div className="spinner" style={{ width:32, height:32 }}/></div>;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* Toolbar */}
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ display:'flex', gap:4 }}>
          {['all','unread','read'].map(f => (
            <button key={f} onClick={()=>setFilter(f)} className={`btn ${filter===f?'btn-primary':'btn-secondary'} btn-sm`}>
              {f.charAt(0).toUpperCase()+f.slice(1)}
              {f==='unread' && unreadCount>0 && <span style={{ marginLeft:4 }}>({unreadCount})</span>}
            </button>
          ))}
        </div>
        {unreadCount > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={markAllRead} style={{ marginLeft:'auto' }}>
            <Check size={13}/> Mark all read
          </button>
        )}
      </div>

      {/* List */}
      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        {filtered.length === 0 ? (
          <div className="empty-state" style={{ padding:48 }}>
            <Bell size={40}/>
            <h3>No notifications</h3>
            <p>You're all caught up!</p>
          </div>
        ) : filtered.map(n => {
          const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.info;
          const Icon = cfg.icon;
          return (
            <div key={n.id} style={{
              display:'flex', alignItems:'flex-start', gap:14, padding:'14px 20px',
              borderBottom:'1px solid #F0F3F4',
              background: n.is_read ? '#FFFFFF' : '#FAFBFF',
              opacity: n.is_read ? 0.75 : 1,
            }}>
              <div style={{ width:36, height:36, borderRadius:6, background:cfg.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Icon size={17} color={cfg.color}/>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                  <span style={{ fontSize:13, fontWeight:700, color:'#16191F' }}>{n.title}</span>
                  {!n.is_read && <span style={{ width:7, height:7, borderRadius:'50%', background:'#0972D3', flexShrink:0 }}/>}
                </div>
                <div style={{ fontSize:12, color:'#5F6B7A', lineHeight:1.5 }}>{n.message}</div>
                <div style={{ fontSize:11, color:'#5F6B7A', marginTop:5 }}>{new Date(n.created_at).toLocaleString()}</div>
              </div>
              {!n.is_read && (
                <button className="btn btn-ghost btn-sm" onClick={()=>markRead(n.id)} title="Mark as read">
                  <CheckCircle size={14}/>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
