import React, { useRef, useState, useEffect } from 'react';
import { Paperclip, Mic, MicOff, Send, Sparkles, AtSign, Users, Terminal, Zap, BarChart2, Bell } from '../common/Icons';

export default function RichInputDock({
  content,
  setContent,
  onSend,
  onFileUpload,
  recording,
  onStartRecording,
  onStopRecording,
  onTriggerAladin,
  users = []
}) {
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  // Mention autocomplete state
  const [mentionQuery, setMentionQuery] = useState(null); // string query or null
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Slash command autocomplete state
  const [slashQuery, setSlashQuery] = useState(null);
  const [selectedSlashIndex, setSelectedSlashIndex] = useState(0);

  // Slash commands registry
  const slashCommands = [
    { id: 'aladin', command: '/aladin ', title: '/aladin <prompt>', desc: 'Ask Aladin AI Copilot directly', type: 'bot' },
    { id: 'poll', command: '/poll ', title: '/poll <question> | <opt1> | <opt2>', desc: 'Create an interactive reaction poll', type: 'poll' },
    { id: 'topic', command: '/topic ', title: '/topic <new_topic>', desc: 'Set or update the channel topic', type: 'command' },
    { id: 'shrug', command: '/shrug ', title: '/shrug <text>', desc: 'Append ¯\\_(ツ)_/¯ to message', type: 'command' },
    { id: 'dnd', command: '/dnd', title: '/dnd', desc: 'Toggle Do Not Disturb mode on/off', type: 'status' }
  ];

  const filteredSlashCommands = slashQuery !== null
    ? slashCommands.filter(c => c.id.toLowerCase().includes(slashQuery.toLowerCase()) || c.title.toLowerCase().includes(slashQuery.toLowerCase()))
    : [];

  // Mention options
  const defaultOptions = [
    { id: 'aladin', type: 'bot', label: 'aladin', title: 'Aladin AI Copilot', desc: 'Ask autonomous assistant' },
    { id: 'channel', type: 'broadcast', label: 'channel', title: '@channel', desc: 'Notify everyone in this channel' },
    { id: 'here', type: 'broadcast', label: 'here', title: '@here', desc: 'Notify online members in this channel' }
  ];

  const userOptions = users.map(u => ({
    id: u._id,
    type: 'user',
    label: (u.displayName || u.email || 'user').toLowerCase().replace(/\s+/g, ''),
    title: u.displayName || u.email,
    desc: u.email
  }));

  const allSuggestions = [...defaultOptions, ...userOptions];

  const filteredSuggestions = mentionQuery !== null
    ? allSuggestions.filter(item =>
        item.label.toLowerCase().includes(mentionQuery.toLowerCase()) ||
        item.title.toLowerCase().includes(mentionQuery.toLowerCase())
      ).slice(0, 7)
    : [];

  useEffect(() => {
    setSelectedIndex(0);
  }, [mentionQuery]);

  useEffect(() => {
    setSelectedSlashIndex(0);
  }, [slashQuery]);

  const detectSlash = (text, cursorPos) => {
    if (text.startsWith('/')) {
      const firstSpace = text.indexOf(' ');
      if (firstSpace === -1 || cursorPos <= firstSpace) {
        const query = text.slice(1, cursorPos);
        setSlashQuery(query);
        return;
      }
    }
    setSlashQuery(null);
  };

  const handleSelectSlash = (item) => {
    setContent(item.command);
    setSlashQuery(null);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(item.command.length, item.command.length);
      }
    }, 0);
  };

  const detectMention = (text, cursorPos) => {
    const textBefore = text.slice(0, cursorPos);
    const lastAt = textBefore.lastIndexOf('@');
    if (lastAt !== -1) {
      // Check that there's no whitespace between @ and cursor
      const query = textBefore.slice(lastAt + 1);
      if (!/\s/.test(query) && (lastAt === 0 || /\s/.test(textBefore[lastAt - 1]))) {
        setMentionQuery(query);
        setMentionStartIndex(lastAt);
        return;
      }
    }
    setMentionQuery(null);
    setMentionStartIndex(-1);
  };

  const handleSelectMention = (item) => {
    if (mentionStartIndex === -1 || !textareaRef.current) return;
    const cursorPos = textareaRef.current.selectionStart;
    const before = content.slice(0, mentionStartIndex);
    const after = content.slice(cursorPos);
    const mentionTag = `@${item.type === 'user' ? item.title : item.label} `;
    const updated = before + mentionTag + after;
    setContent(updated);
    setMentionQuery(null);
    setMentionStartIndex(-1);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const nextPos = before.length + mentionTag.length;
        textareaRef.current.setSelectionRange(nextPos, nextPos);
      }
    }, 0);
  };

  const handleKeyDown = (e) => {
    if (slashQuery !== null && filteredSlashCommands.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSlashIndex(prev => (prev + 1) % filteredSlashCommands.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSlashIndex(prev => (prev - 1 + filteredSlashCommands.length) % filteredSlashCommands.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        handleSelectSlash(filteredSlashCommands[selectedSlashIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setSlashQuery(null);
        return;
      }
    }

    if (mentionQuery !== null && filteredSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredSuggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredSuggestions.length) % filteredSuggestions.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        handleSelectMention(filteredSuggestions[selectedIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMentionQuery(null);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend(e);
    }
  };

  const handleTextareaChange = (e) => {
    const val = e.target.value;
    setContent(val);
    detectMention(val, e.target.selectionStart);
    detectSlash(val, e.target.selectionStart);

    // Auto-expand textarea up to max-height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 130)}px`;
    }
  };

  return (
    <div className="rich-input-dock-container" style={{ position: 'relative' }}>
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={onFileUpload}
      />

      {/* Mention Autocomplete Popover */}
      {mentionQuery !== null && filteredSuggestions.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: 'calc(100% + 8px)',
          left: 16,
          width: 320,
          background: '#0F172A',
          border: '1px solid rgba(0, 240, 255, 0.25)',
          borderRadius: 10,
          boxShadow: '0 12px 30px rgba(0, 0, 0, 0.6), 0 0 15px rgba(0, 240, 255, 0.1)',
          overflow: 'hidden',
          zIndex: 100
        }}>
          <div style={{
            padding: '6px 12px',
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#64748B',
            background: 'rgba(255, 255, 255, 0.02)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
          }}>
            Mentions matching "@{mentionQuery}"
          </div>

          <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {filteredSuggestions.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectMention(item)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 12px',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(0, 240, 255, 0.12)' : 'transparent',
                    borderLeft: isSelected ? '3px solid #00F0FF' : '3px solid transparent',
                    transition: 'background 0.15s ease'
                  }}
                >
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: item.type === 'bot' ? '50%' : 6,
                    background: item.type === 'bot' ? 'linear-gradient(135deg, #8B5CF6, #06B6D4)' : (item.type === 'broadcast' ? '#3B82F6' : '#1E293B'),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    flexShrink: 0
                  }}>
                    {item.type === 'bot' ? <Sparkles size={14} /> : (item.type === 'broadcast' ? <Users size={14} /> : <AtSign size={14} />)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#F8FAFC', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: 11, color: '#94A3B8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Slash Commands Autocomplete Popover */}
      {slashQuery !== null && filteredSlashCommands.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: 'calc(100% + 8px)',
          left: 16,
          width: 340,
          background: '#0F172A',
          border: '1px solid rgba(139, 92, 246, 0.35)',
          borderRadius: 10,
          boxShadow: '0 12px 30px rgba(0, 0, 0, 0.6), 0 0 15px rgba(139, 92, 246, 0.15)',
          overflow: 'hidden',
          zIndex: 100
        }}>
          <div style={{
            padding: '6px 12px',
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#A78BFA',
            background: 'rgba(255, 255, 255, 0.02)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
          }}>
            Slash Commands matching "/{slashQuery}"
          </div>

          <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {filteredSlashCommands.map((item, idx) => {
              const isSelected = idx === selectedSlashIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectSlash(item)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 12px',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
                    borderLeft: isSelected ? '3px solid #8B5CF6' : '3px solid transparent',
                    transition: 'background 0.15s ease'
                  }}
                >
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: item.type === 'bot' ? 'linear-gradient(135deg, #8B5CF6, #06B6D4)' : (item.type === 'poll' ? '#3B82F6' : '#1E293B'),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    flexShrink: 0
                  }}>
                    {item.type === 'bot' ? <Sparkles size={14} /> : (item.type === 'poll' ? <BarChart2 size={14} /> : (item.type === 'status' ? <Bell size={14} /> : <Terminal size={14} />))}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#F8FAFC', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: 11, color: '#94A3B8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="rich-input-wrapper">
        <textarea
          ref={textareaRef}
          className="rich-textarea"
          placeholder="Message, /slash command, or @aladin... (Enter to send, Shift+Enter for newline)"
          value={content}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          rows={1}
        />

        <div className="rich-dock-actions">
          <div className="rich-dock-left-tools">
            <button
              type="button"
              className="dock-icon-btn"
              title="Attach File or Document"
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
            >
              <Paperclip size={18} />
            </button>

            <button
              type="button"
              className={`dock-icon-btn ${recording ? 'recording' : ''}`}
              title={recording ? 'Stop Recording Voice Note' : 'Record Voice Note'}
              onClick={recording ? onStopRecording : onStartRecording}
            >
              {recording ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            <button
              type="button"
              className="dock-icon-btn"
              title="Insert @aladin Copilot Prompt"
              onClick={onTriggerAladin}
              style={{ color: '#8B5CF6' }}
            >
              <Sparkles size={17} />
            </button>
          </div>

          <div className="rich-dock-right-tools">
            <button
              type="button"
              className="send-msg-btn"
              title="Send Message"
              disabled={!content.trim() && !recording}
              onClick={onSend}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

