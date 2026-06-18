import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, FolderOpen, CheckSquare, Users,
  Bell, BarChart2, Settings, LogOut, Zap,
  ChevronLeft, Menu, Github,
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projects', icon: FolderOpen, label: 'Projects' },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/team', icon: Users, label: 'Team' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
  { to: '/analytics', icon: BarChart2, label: 'Analytics' },
  { to: '/github-dashboard', icon: Github, label: 'Git Dashboard' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar({ open, setOpen }) {
  const { user, logout } = useAuth();

  const w = open ? 220 : 56;

  return (
    <aside
      style={{
        width: w,
        minWidth: w,
        height: '100vh',
        background: '#16191F',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        overflowX: 'hidden',
        transition: 'width 280ms cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      {/* TOP */}
      <div style={{
        padding: '0 10px',
        height: 56,
        borderBottom: '1px solid #232F3E',
        display: 'flex',
        alignItems: 'center',
        justifyContent: open ? 'space-between' : 'center',
      }}>
        {open && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 30,
              height: 30,
              background: '#FF9900',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Zap size={16} color="#16191F" />
            </div>

            <div>
              <div style={{ color: '#FFF', fontSize: 13, fontWeight: 700 }}>
                silvora
              </div>
              <div style={{ color: '#5F6B7A', fontSize: 10 }}>
                Dashboard
              </div>
            </div>
          </div>
        )}

        <button
          onClick={() => setOpen(prev => !prev)}
          style={{
            width: 36,
            height: 36,
            borderRadius: 6,
            background: '#232F3E',
            border: '1px solid rgba(255,255,255,0.08)',
            cursor: 'pointer',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#FF9900';
            e.currentTarget.style.color = '#16191F';
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#232F3E';
            e.currentTarget.style.color = '#fff';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {open ? <ChevronLeft size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* NAV */}
      <nav style={{ flex: 1, padding: 10 }}>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              justifyContent: open ? 'flex-start' : 'center',
              gap: open ? 10 : 0,
              padding: open ? '8px 12px' : '8px 0',
              marginBottom: 4,
              borderRadius: 4,
              textDecoration: 'none',
              color: isActive ? '#FFFFFF' : '#5F6B7A',
              background: isActive ? '#232F3E' : 'transparent',
              transition: 'all 0.2s ease',
            })}

            onMouseEnter={(e) => {
              if (!e.currentTarget.classList.contains('active')) {
                e.currentTarget.style.color = '#FFFFFF';
                e.currentTarget.style.background = '#232F3E';
              }
            }}

            onMouseLeave={(e) => {
              if (!e.currentTarget.classList.contains('active')) {
                e.currentTarget.style.color = '#5F6B7A';
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            <Icon size={16} />
            {open && label}
          </NavLink>
        ))}
      </nav>

      {/* FOOTER */}
      <div style={{ borderTop: '1px solid #232F3E', padding: 10 }}>
        <button
          onClick={logout}
          style={{
            width: '100%',
            display: 'flex',
            justifyContent: open ? 'flex-start' : 'center',
            gap: open ? 10 : 0,
            padding: 8,
            background: 'transparent',
            border: 'none',
            color: '#5F6B7A',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#D13212';
            e.currentTarget.style.color = '#fff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#5F6B7A';
          }}
        >
          <LogOut size={16} />
          {open && 'Sign Out'}
        </button>
      </div>
    </aside>
  );
}