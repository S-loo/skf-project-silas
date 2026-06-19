import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { dataService } from '../services/dataService';
import {
  Send, Reply, Edit2, Trash2, X, Check, MessageSquare, Bot, AtSign
} from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────────────────────────
function initials(user) {
  if (!user) return '?';
  return `${user.first_name?.charAt(0) ?? ''}${user.last_name?.charAt(0) ?? ''}`.toUpperCase();
}

function relativeTime(isoStr) {
  if (!isoStr) return '';
  const diff = Math.floor((Date.now() - new Date(isoStr)) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(isoStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

const ACCENT_COLORS = [
  '#E88A00', '#0972D3', '#1D8102', '#D13212', '#7B61FF', '#00A0A0', '#E45992'
];
function authorColor(name = '') {
  let hash = 0;
  for (const c of name) hash = c.charCodeAt(0) + ((hash << 5) - hash);
  return ACCENT_COLORS[Math.abs(hash) % ACCENT_COLORS.length];
}

// Render markdown-lite: **bold** and @mention highlights
function renderMessage(msg, teamMembers = []) {
  const parts = msg.split(/(\*\*[^*]+\*\*|@\w[\w.]*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('@')) {
      return (
        <span key={i} className="text-orange-500 font-semibold cursor-pointer hover:underline">
          {part}
        </span>
      );
    }
    return part;
  });
}

// ── Mention popup ─────────────────────────────────────────────────────────────
function MentionPopover({ members, query, onSelect, visible }) {
  if (!visible || !members.length) return null;
  const filtered = members.filter(m =>
    m.user && `${m.user.first_name} ${m.user.last_name}`.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 6);
  if (!filtered.length) return null;
  return (
    <div className="absolute bottom-full mb-2 left-0 z-50 bg-white border border-[#D5DBDB] rounded-lg shadow-xl w-52 overflow-hidden">
      <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#5F6B7A] border-b border-[#F0F3F4]">
        Mention a member
      </div>
      {filtered.map(m => {
        const name = `${m.user.first_name} ${m.user.last_name}`;
        const color = authorColor(name);
        return (
          <button
            key={m.id}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#F8FAFC] text-left transition-colors"
            onMouseDown={(e) => { e.preventDefault(); onSelect(name); }}
          >
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-black shrink-0"
              style={{ background: color }}
            >
              {initials(m.user)}
            </span>
            <span className="text-sm font-semibold text-[#16191F] truncate">{name}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Single comment bubble ─────────────────────────────────────────────────────
function CommentBubble({ comment, currentUser, teamMembers, onReply, onEdit, onDelete, isReply = false }) {
  const isSystem = comment.is_system;
  const isOwnComment = comment.author?.id === currentUser?.id;

  if (isSystem) {
    return (
      <div className="flex items-start gap-2 py-1.5 px-2 my-0.5 group">
        <div className="w-6 h-6 rounded-full bg-[#232F3E] flex items-center justify-center shrink-0 mt-0.5">
          <Bot size={11} className="text-[#FF9900]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] text-[#5F6B7A] leading-relaxed">
            {renderMessage(comment.message, teamMembers)}
          </div>
          <div className="text-[10px] text-[#A0A8B4] mt-0.5">{relativeTime(comment.created_at)}</div>
        </div>
      </div>
    );
  }

  const authorName = comment.author
    ? `${comment.author.first_name} ${comment.author.last_name}`
    : 'Unknown';
  const color = authorColor(authorName);

  return (
    <div className={`flex items-start gap-3 group py-1 ${isReply ? 'pl-10' : ''}`}>
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0 shadow-sm"
        style={{ background: color }}
      >
        {initials(comment.author)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-[13px] font-bold text-[#16191F]">{authorName}</span>
          <span className="text-[10px] text-[#A0A8B4]">{relativeTime(comment.created_at)}</span>
          {comment.updated_at && comment.updated_at !== comment.created_at && (
            <span className="text-[10px] italic text-[#B0BAC4]">(edited)</span>
          )}
        </div>

        {/* Message bubble */}
        <div className="bg-[#F8FAFC] border border-[#E8ECEF] rounded-xl rounded-tl-sm px-3 py-2 text-[13px] text-[#16191F] leading-relaxed max-w-xl">
          {renderMessage(comment.message, teamMembers)}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onReply(comment)}
            className="flex items-center gap-1 text-[11px] text-[#5F6B7A] hover:text-[#FF9900] transition-colors"
          >
            <Reply size={11} /> Reply
          </button>
          {isOwnComment && (
            <>
              <button
                onClick={() => onEdit(comment)}
                className="flex items-center gap-1 text-[11px] text-[#5F6B7A] hover:text-[#0972D3] transition-colors"
              >
                <Edit2 size={11} /> Edit
              </button>
              <button
                onClick={() => onDelete(comment.id)}
                className="flex items-center gap-1 text-[11px] text-[#5F6B7A] hover:text-[#D13212] transition-colors"
              >
                <Trash2 size={11} /> Delete
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Discussion component ─────────────────────────────────────────────────
export default function ProjectDiscussion({ projectId, teamMembers = [] }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState(null);      // { id, authorName }
  const [editingId, setEditingId] = useState(null);  // comment id being edited
  const [editMsg, setEditMsg] = useState('');
  const [error, setError] = useState('');

  // @mention state
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMention, setShowMention] = useState(false);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const pollingRef = useRef(null);

  // ── Fetch comments ──────────────────────────────────────────────────────────
  const fetchComments = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await dataService.comments.list(projectId);
      setComments(res.data);
    } catch (e) {
      if (!silent) setError('Failed to load comments.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchComments();
    // Poll every 4 seconds for real-time updates
    pollingRef.current = setInterval(() => fetchComments(true), 4000);
    return () => clearInterval(pollingRef.current);
  }, [fetchComments]);

  // Scroll to bottom when new comments arrive
  useEffect(() => {
    if (!loading) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments.length, loading]);

  // ── Handle input for @mentions ──────────────────────────────────────────────
  const handleInput = (e) => {
    const val = e.target.value;
    setMessage(val);

    const cursorPos = e.target.selectionStart;
    const textBefore = val.slice(0, cursorPos);
    const mentionMatch = textBefore.match(/@([\w.]*)$/);
    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      setShowMention(true);
    } else {
      setShowMention(false);
    }
  };

  const handleMentionSelect = (name) => {
    // Replace the @query with @FullName
    const cursorPos = inputRef.current?.selectionStart ?? message.length;
    const textBefore = message.slice(0, cursorPos);
    const replaced = textBefore.replace(/@[\w.]*$/, `@${name} `);
    const newVal = replaced + message.slice(cursorPos);
    setMessage(newVal);
    setShowMention(false);
    inputRef.current?.focus();
  };

  // ── Send comment ─────────────────────────────────────────────────────────────
  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setError('');
    try {
      const payload = { message: trimmed };
      if (replyTo) payload.parent_id = replyTo.id;
      const res = await dataService.comments.create(projectId, payload);
      setComments(prev => [...prev, res.data]);
      setMessage('');
      setReplyTo(null);
    } catch {
      setError('Failed to post comment.');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (showMention) return; // let mention handle enter
      handleSend();
    }
    if (e.key === 'Escape') {
      setReplyTo(null);
      setShowMention(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await dataService.comments.delete(id);
      setComments(prev => prev.filter(c => c.id !== id && c.parent_id !== id));
    } catch {
      setError('Failed to delete comment.');
    }
  };

  // ── Edit ──────────────────────────────────────────────────────────────────────
  const startEdit = (comment) => {
    setEditingId(comment.id);
    setEditMsg(comment.message);
  };

  const submitEdit = async (id) => {
    if (!editMsg.trim()) return;
    try {
      const res = await dataService.comments.update(id, { message: editMsg.trim() });
      setComments(prev => prev.map(c => c.id === id ? res.data : c));
      setEditingId(null);
    } catch {
      setError('Failed to update comment.');
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  // Build a threaded map: root comments + their replies
  const rootComments = comments.filter(c => !c.parent_id);
  const repliesMap = {};
  comments.filter(c => c.parent_id).forEach(c => {
    if (!repliesMap[c.parent_id]) repliesMap[c.parent_id] = [];
    repliesMap[c.parent_id].push(c);
  });

  if (loading) {
    return (
      <div className="flex flex-col gap-3 p-6 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[#D5DBDB] shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-[#D5DBDB] rounded w-32" />
              <div className="h-10 bg-[#F0F3F4] rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[420px]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#D5DBDB]">
        <div className="flex items-center gap-2">
          <MessageSquare size={15} className="text-[#FF9900]" />
          <span className="text-[13px] font-bold text-[#16191F]">Discussion</span>
          <span className="text-[11px] bg-[#F0F3F4] text-[#5F6B7A] px-2 py-0.5 rounded-full font-semibold">
            {comments.filter(c => !c.is_system).length} messages
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#1D8102] animate-pulse" />
          <span className="text-[10px] text-[#5F6B7A] font-medium">Live</span>
        </div>
      </div>

      {/* Comments list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-0.5">
        {comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-[#5F6B7A]">
            <div className="w-14 h-14 rounded-full bg-[#F0F3F4] flex items-center justify-center">
              <MessageSquare size={22} className="text-[#D5DBDB]" />
            </div>
            <p className="text-[14px] font-semibold text-[#16191F]">No messages yet</p>
            <p className="text-[12px] text-center">Start the conversation — your team is listening.</p>
          </div>
        ) : (
          rootComments.map(comment => (
            <div key={comment.id}>
              {/* Root comment or edit view */}
              {editingId === comment.id ? (
                <div className="flex items-start gap-3 py-1">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0"
                    style={{ background: authorColor(`${comment.author?.first_name} ${comment.author?.last_name}`) }}
                  >
                    {initials(comment.author)}
                  </div>
                  <div className="flex-1 flex gap-2">
                    <textarea
                      className="flex-1 bg-[#F8FAFC] border border-[#0972D3] rounded-xl px-3 py-2 text-[13px] text-[#16191F] outline-none resize-none"
                      rows={2}
                      value={editMsg}
                      onChange={e => setEditMsg(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitEdit(comment.id); } if (e.key === 'Escape') setEditingId(null); }}
                      autoFocus
                    />
                    <div className="flex flex-col gap-1">
                      <button onClick={() => submitEdit(comment.id)} className="p-1.5 rounded-lg bg-[#1D8102] text-white hover:bg-[#186A01] transition-colors"><Check size={13} /></button>
                      <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg bg-[#F0F3F4] text-[#5F6B7A] hover:bg-[#D5DBDB] transition-colors"><X size={13} /></button>
                    </div>
                  </div>
                </div>
              ) : (
                <CommentBubble
                  comment={comment}
                  currentUser={user}
                  teamMembers={teamMembers}
                  onReply={(c) => {
                    const authorName = c.author ? `${c.author.first_name} ${c.author.last_name}` : 'Unknown';
                    setReplyTo({ id: c.id, authorName });
                    inputRef.current?.focus();
                  }}
                  onEdit={startEdit}
                  onDelete={handleDelete}
                />
              )}

              {/* Replies */}
              {(repliesMap[comment.id] || []).map(reply => (
                editingId === reply.id ? (
                  <div key={reply.id} className="flex items-start gap-3 py-1 pl-11">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0"
                      style={{ background: authorColor(`${reply.author?.first_name} ${reply.author?.last_name}`) }}
                    >
                      {initials(reply.author)}
                    </div>
                    <div className="flex-1 flex gap-2">
                      <textarea
                        className="flex-1 bg-[#F8FAFC] border border-[#0972D3] rounded-xl px-3 py-2 text-[13px] text-[#16191F] outline-none resize-none"
                        rows={2}
                        value={editMsg}
                        onChange={e => setEditMsg(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitEdit(reply.id); } if (e.key === 'Escape') setEditingId(null); }}
                        autoFocus
                      />
                      <div className="flex flex-col gap-1">
                        <button onClick={() => submitEdit(reply.id)} className="p-1.5 rounded-lg bg-[#1D8102] text-white hover:bg-[#186A01] transition-colors"><Check size={13} /></button>
                        <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg bg-[#F0F3F4] text-[#5F6B7A] hover:bg-[#D5DBDB] transition-colors"><X size={13} /></button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <CommentBubble
                    key={reply.id}
                    comment={reply}
                    currentUser={user}
                    teamMembers={teamMembers}
                    onReply={(c) => {
                      const authorName = c.author ? `${c.author.first_name} ${c.author.last_name}` : 'Unknown';
                      setReplyTo({ id: comment.id, authorName });
                      inputRef.current?.focus();
                    }}
                    onEdit={startEdit}
                    onDelete={handleDelete}
                    isReply
                  />
                )
              ))}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mb-2 px-3 py-2 bg-[#FDECEA] border border-[#F5C6C0] rounded-lg text-[12px] text-[#D13212] flex items-center justify-between">
          {error}
          <button onClick={() => setError('')}><X size={12} /></button>
        </div>
      )}

      {/* Reply banner */}
      {replyTo && (
        <div className="mx-4 mb-1 px-3 py-1.5 bg-[#FFF0D4] border border-[#FFD080] rounded-lg flex items-center justify-between">
          <span className="text-[12px] text-[#E88A00] font-semibold">
            <Reply size={11} className="inline mr-1" />
            Replying to <strong>{replyTo.authorName}</strong>
          </span>
          <button onClick={() => setReplyTo(null)} className="text-[#E88A00] hover:text-[#C87000]">
            <X size={13} />
          </button>
        </div>
      )}

      {/* Input box */}
      <div className="px-4 py-3 border-t border-[#D5DBDB] bg-white">
        <div className="relative flex items-end gap-2">
          {/* Current user avatar */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0 mb-0.5"
            style={{ background: authorColor(`${user?.first_name} ${user?.last_name}`) }}
          >
            {initials(user)}
          </div>

          <div className="relative flex-1">
            {/* Mention popover */}
            <MentionPopover
              members={teamMembers}
              query={mentionQuery}
              onSelect={handleMentionSelect}
              visible={showMention}
            />

            <textarea
              ref={inputRef}
              className="w-full bg-[#F8FAFC] border border-[#D5DBDB] focus:border-[#FF9900] focus:ring-2 focus:ring-[#FF990022] rounded-2xl px-4 py-2.5 pr-12 text-[13px] text-[#16191F] placeholder-[#A0A8B4] outline-none resize-none transition-all"
              placeholder={replyTo ? `Reply to ${replyTo.authorName}…` : "Write a message… (type @ to mention someone)"}
              rows={1}
              style={{ minHeight: 40, maxHeight: 120 }}
              value={message}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
            />

            {/* Mention hint icon */}
            <button
              className="absolute right-3 bottom-2.5 text-[#A0A8B4] hover:text-[#FF9900] transition-colors"
              tabIndex={-1}
              onClick={() => { setMessage(m => m + '@'); inputRef.current?.focus(); }}
            >
              <AtSign size={15} />
            </button>
          </div>

          <button
            onClick={handleSend}
            disabled={!message.trim() || sending}
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mb-0.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: message.trim() ? '#FF9900' : '#F0F3F4' }}
          >
            {sending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send size={14} className={message.trim() ? 'text-white' : 'text-[#A0A8B4]'} />
            )}
          </button>
        </div>

        <div className="mt-1 ml-10 text-[10px] text-[#A0A8B4]">
          Press <kbd className="px-1 py-0.5 bg-[#F0F3F4] border border-[#D5DBDB] rounded text-[9px]">Enter</kbd> to send · <kbd className="px-1 py-0.5 bg-[#F0F3F4] border border-[#D5DBDB] rounded text-[9px]">Shift+Enter</kbd> for new line
        </div>
      </div>
    </div>
  );
}
