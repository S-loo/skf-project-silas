import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Clock } from 'lucide-react';
import { dataService } from '../services/dataService';

export default function ReminderBanner() {
  const [reminders, setReminders] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    dataService.analytics.overview()
      .then(res => {
        setReminders(res.data.reminders || []);
      })
      .catch(() => {});
  }, []);

  // Rotate through reminders every 5 seconds
  useEffect(() => {
    if (reminders.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIdx(i => (i + 1) % reminders.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [reminders]);

  if (dismissed || reminders.length === 0) return null;

  const current = reminders[currentIdx];
  const isDanger = current.type === 'danger';

  return (
    <div
      className="animate-slide-down"
      style={{
        background: isDanger ? '#FDECEA' : '#FFF3CD',
        borderBottom: `1px solid ${isDanger ? '#F5C6C0' : '#FFEEBA'}`,
        padding: '9px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontSize: 13,
        color: isDanger ? '#D13212' : '#856404',
        fontWeight: 500,
      }}
    >
      {isDanger ? <AlertTriangle size={15} /> : <Clock size={15} />}
      <span style={{ flex: 1 }}>{current.message}</span>
      {reminders.length > 1 && (
        <span style={{ fontSize: 11, color: '#5F6B7A', marginRight: 8 }}>
          {currentIdx + 1} / {reminders.length}
        </span>
      )}
      <button
        onClick={() => setDismissed(true)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', padding: 2 }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
