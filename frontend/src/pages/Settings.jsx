import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const DEV_QUOTES = [
  { text: "First, solve the problem. Then, write the code.", author: "John Johnson" },
  { text: "Clean code always looks like it was written by someone who cares.", author: "Robert C. Martin" },
  { text: "Make it work, make it right, make it fast.", author: "Kent Beck" },
  { text: "The best error message is the one that never shows up.", author: "Thomas Fuchs" },
  { text: "Code is like humour. When you have to explain it, it's bad.", author: "Cory House" },
  { text: "Simplicity is the soul of efficiency.", author: "Austin Freeman" },
  { text: "Any fool can write code that a computer can understand. Good programmers write code that humans can understand.", author: "Martin Fowler" },
  { text: "It's not a bug — it's an undocumented feature.", author: "Anonymous" },
];

const ROLE_META = {
  admin: { label: 'Administrator', color: '#D13212', bg: 'rgba(209,50,18,0.08)', bar: '#D13212' },
  project_manager: { label: 'Project Manager', color: '#0972D3', bg: 'rgba(9,114,211,0.08)', bar: '#0972D3' },
  developer: { label: 'Developer', color: '#1D8102', bg: 'rgba(29,129,2,0.08)', bar: '#1D8102' },
  viewer: { label: 'Viewer', color: '#5F6B7A', bg: 'rgba(95,107,122,0.1)', bar: '#5F6B7A' },
};

export default function Settings() {
  const { user } = useAuth();
  const [quoteIdx, setQuoteIdx] = useState(() => Math.floor(Math.random() * DEV_QUOTES.length));
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setQuoteIdx(i => (i + 1) % DEV_QUOTES.length);
        setFading(false);
      }, 400);
    }, 8000);
    return () => clearInterval(id);
  }, []);

  const role = user?.role || 'developer';
  const meta = ROLE_META[role] || ROLE_META.developer;
  const initials = `${user?.first_name?.charAt(0) ?? ''}${user?.last_name?.charAt(0) ?? ''}`;
  const quote = DEV_QUOTES[quoteIdx];

  const roleLevel = {
    admin: 'L4 — Root',
    project_manager: 'L3 — Lead',
    developer: 'L2 — Build',
    viewer: 'L1 — Read',
  };

  const stats = [
    { label: 'Session', value: 'Active' },
    { label: 'Role Level', value: roleLevel[role] ?? 'L2 — Build' },
    { label: 'Status', value: 'Authenticated' },
  ];

  const infoRows = [
    { label: 'User ID', value: user?.id },
    { label: 'Email', value: user?.email },
    { label: 'Role', value: meta.label.toUpperCase() },
    {
      label: 'Member Since',
      value: user?.created_at
        ? new Date(user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : 'N/A',
    },
  ];

  return (
    <div className="w-full max-w-full space-y-5 overflow-hidden">

      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-[#16191F] uppercase tracking-wider">Settings</h1>
        <p className="text-xs text-[#5F6B7A] font-semibold">Your session profile and workspace identity.</p>
      </div>

      {/* Session card */}
      <div className="bg-white border border-[#D5DBDB] rounded shadow-sm overflow-hidden">
        <div className="h-1 w-full" style={{ backgroundColor: meta.bar }} />

        <div className="p-4 sm:p-6 space-y-4">

          {/* Avatar + name */}
          <div className="flex items-start gap-3 sm:gap-4 min-w-0">
            {/* Avatar — fixed size, never shrinks */}
            <div
              className="w-12 h-12 sm:w-14 sm:h-14 rounded flex items-center justify-center font-black text-lg sm:text-xl select-none shrink-0"
              style={{ backgroundColor: '#16191F', color: meta.color, border: `2px solid ${meta.color}40` }}
            >
              {initials}
            </div>

            {/* Name / email / badge — takes remaining width, clips safely */}
            <div className="min-w-0 flex-1">
              <p className="text-sm sm:text-base font-extrabold text-[#16191F] leading-tight break-words">
                {user?.first_name} {user?.last_name}
              </p>
              {/* email: break on any char so long addresses don't overflow */}
              <p
                className="text-xs text-[#5F6B7A] font-semibold mt-0.5"
                style={{ wordBreak: 'break-all', overflowWrap: 'anywhere' }}
              >
                {user?.email}
              </p>
              <span
                className="mt-1.5 inline-block text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded"
                style={{ color: meta.color, backgroundColor: meta.bg }}
              >
                {meta.label}
              </span>
            </div>
          </div>

          <div className="border-t border-[#D5DBDB]" />

          {/* Info rows */}
          <div className="divide-y divide-[#F0F3F4]">
            {infoRows.map(row => (
              <div key={row.label} className="flex items-start justify-between gap-3 py-2.5 min-w-0">
                {/* Label — fixed width so it never wraps oddly */}
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#5F6B7A] shrink-0 whitespace-nowrap">
                  {row.label}
                </span>
                {/* Value — break long strings (IDs, emails) instead of overflowing */}
                <span
                  className="min-w-0 text-xs font-semibold text-[#16191F] font-mono text-right"
                  style={{ wordBreak: 'break-all', overflowWrap: 'anywhere' }}
                  title={row.value}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-[#D5DBDB]" />

          {/* Stat pills — auto-fit so they never overflow on tiny screens */}
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))' }}
          >
            {stats.map(s => (
              <div
                key={s.label}
                className="bg-[#F8FAFC] border border-[#D5DBDB] rounded p-2 sm:p-3 text-center overflow-hidden"
              >
                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#5F6B7A] truncate">
                  {s.label}
                </p>
                <p className="text-[10px] sm:text-xs font-extrabold text-[#16191F] mt-1 truncate">
                  {s.value}
                </p>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* Developer quote card */}
      <div
        className="border rounded p-4 sm:p-5 space-y-3 overflow-hidden"
        style={{ backgroundColor: '#16191F', borderColor: '#232F3E' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[#FF9900] font-mono text-sm font-black select-none shrink-0">{'> _'}</span>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#5F6B7A] truncate">Dev Wisdom</span>
        </div>

        <div style={{ opacity: fading ? 0 : 1, transition: 'opacity 400ms' }}>
          {/* Quote text — break long words so they don't overflow */}
          <p
            className="text-xs sm:text-sm font-semibold leading-relaxed italic"
            style={{ color: '#E8EDF2', overflowWrap: 'break-word', wordBreak: 'break-word' }}
          >
            "{quote.text}"
          </p>
          <p className="text-[10px] font-bold uppercase tracking-wider mt-2 truncate" style={{ color: meta.color }}>
            — {quote.author}
          </p>
        </div>

        {/* Dot nav */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {DEV_QUOTES.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setFading(true);
                setTimeout(() => { setQuoteIdx(i); setFading(false); }, 300);
              }}
              className="rounded-full transition-all duration-200 shrink-0"
              style={{
                width: i === quoteIdx ? 16 : 6,
                height: 6,
                backgroundColor: i === quoteIdx ? meta.color : '#2D3748',
              }}
              aria-label={`Quote ${i + 1}`}
            />
          ))}
        </div>
      </div>

    </div>
  );
}