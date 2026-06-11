import React, { useState, useEffect } from 'react';
import { Bell, Search, ChevronDown, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { dataService } from '../services/dataService';
import { useNavigate } from 'react-router-dom';

export default function Header({ pageTitle }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    dataService.notifications.list()
      .then(res => {
        const unread = res.data.filter(n => !n.is_read).length;
        setUnreadCount(unread);
      })
      .catch(() => {});
  }, []);

  return (
    <header style={{
      height: 56,
      background: '#FFFFFF',
      borderBottom: '1px solid #D5DBDB',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>
      {/* Page title */}
      <h1 style={{ fontSize: 16, fontWeight: 700, color: '#16191F', margin: 0 }}>
        {pageTitle}
      </h1>

      {/* Right actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Notifications bell */}
        <button
          onClick={() => navigate('/notifications')}
          style={{
            position: 'relative',
            background: 'none',
            border: '1px solid #D5DBDB',
            borderRadius: 4,
            width: 34, height: 34,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            color: '#5F6B7A',
          }}
        >
          <Bell size={16} />
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute',
              top: -4, right: -4,
              background: '#D13212',
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              borderRadius: '50%',
              width: 16, height: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* User info */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '5px 10px',
          border: '1px solid #D5DBDB',
          borderRadius: 4,
          cursor: 'pointer',
          fontSize: 13,
          color: '#16191F',
        }}>
          <div style={{
            width: 24, height: 24,
            background: '#FF9900',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11,
            fontWeight: 700,
            color: '#16191F',
          }}>
            {user?.first_name?.[0]}{user?.last_name?.[0]}
          </div>
          <span style={{ fontWeight: 500 }}>
            {user?.first_name} {user?.last_name}
          </span>
          <ChevronDown size={14} color="#5F6B7A" />
        </div>
      </div>
    </header>
  );
}
