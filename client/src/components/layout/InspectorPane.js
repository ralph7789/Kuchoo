import React, { useState, useEffect } from 'react';
import { X, Phone, Video, Shield, FileText, Pin, AtSign, Bell, MessageSquare, Hash, Lock } from '../common/Icons';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

export default function InspectorPane({
  activeTarget,
  userStatus = {},
  allUsers = [],
  onClose,
  onStartAudioCall,
  onStartVideoCall,
  sharedFiles = [],
  pinnedMessages = [],
  onUnpinMessage,
  onSelectTarget
}) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'activity'
  const [mentions, setMentions] = useState([]);
  const [loadingMentions, setLoadingMentions] = useState(false);

  useEffect(() => {
    if (activeTab === 'activity') {
      setLoadingMentions(true);
      fetch(`${BACKEND_URL}/api/activity/mentions`, { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setMentions(data);
        })
        .catch(err => console.error('Failed to load mentions:', err))
        .finally(() => setLoadingMentions(false));
    }
  }, [activeTab]);

  if (!activeTarget) return null;

  const isUser = activeTarget.type === 'user';
  const isGroup = activeTarget.type === 'group';
  const isAladin = activeTarget.type === 'aladin';

  const targetUser = isUser ? activeTarget.user : null;
  const targetGroup = isGroup ? activeTarget.group : null;
  const isOnline = isUser ? Boolean(userStatus[targetUser?._id]) : true;

  const initials = isUser && targetUser?.displayName
    ? targetUser.displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : (isGroup ? '#' : '✨');

  return (
    <aside className="workspace-inspector" aria-label="Details and Inspector Pane">
      {/* Header */}
      <div className="sidebar-header" style={{ padding: '0 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'overview' ? '2px solid #00F0FF' : '2px solid transparent',
              color: activeTab === 'overview' ? '#00F0FF' : '#94A3B8',
              fontSize: 13,
              fontWeight: 700,
              padding: '12px 6px',
              cursor: 'pointer'
            }}
          >
            Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('activity')}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'activity' ? '2px solid #00F0FF' : '2px solid transparent',
              color: activeTab === 'activity' ? '#00F0FF' : '#94A3B8',
              fontSize: 13,
              fontWeight: 700,
              padding: '12px 6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <Bell size={13} />
            <span>Activity</span>
          </button>
        </div>

        <button
          className="modal-close-btn"
          onClick={onClose}
          title="Close details"
          style={{ cursor: 'pointer' }}
        >
          <X size={18} />
        </button>
      </div>

      <div className="sidebar-content-scroll" style={{ padding: '16px' }}>
        {activeTab === 'activity' ? (
          /* Mentions & Alerts Tray (Slack Activity Parity) */
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.06em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <AtSign size={13} color="#00F0FF" />
              <span>Mentions & Reactions ({mentions.length})</span>
            </div>

            {loadingMentions ? (
              <div style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', padding: 20 }}>Loading mentions...</div>
            ) : mentions.length === 0 ? (
              <div style={{ fontSize: 12, color: '#64748B', textAlign: 'center', padding: 24 }}>
                No one has tagged you with @mention yet
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {mentions.map(item => {
                  const sender = allUsers.find(u => u._id === item.from);
                  return (
                    <div
                      key={item._id}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 8,
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease'
                      }}
                      onClick={() => {
                        if (onSelectTarget) {
                          if (item.group) {
                            onSelectTarget({ type: 'group', id: item.to, name: 'Channel' });
                          } else if (sender) {
                            onSelectTarget({ type: 'user', id: sender._id, name: sender.displayName, user: sender });
                          }
                        }
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#00F0FF' }}>
                          {sender?.displayName || item.from}
                        </span>
                        <span style={{ fontSize: 10, color: '#64748B' }}>
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#F8FAFC', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.content || '[File/Audio Attachment]'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Standard Overview Tab */
          <>
            {/* Identity Card */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 20 }}>
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  background: isAladin ? 'linear-gradient(135deg, #8B5CF6, #06B6D4)' : '#1E293B',
                  border: '2px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24,
                  fontWeight: 700,
                  color: '#F8FAFC',
                  marginBottom: 12,
                  boxShadow: isAladin ? '0 0 20px rgba(139, 92, 246, 0.4)' : 'none'
                }}
              >
                {initials}
              </div>

              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#F8FAFC', marginBottom: 4 }}>
                {activeTarget.name}
              </h3>

              {/* Custom Status Display */}
              {isUser && targetUser?.customStatus?.text && (
                <div style={{
                  fontSize: 12,
                  color: '#CBD5E1',
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '3px 10px',
                  borderRadius: 12,
                  marginBottom: 8,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4
                }}>
                  <span>{targetUser.customStatus.emoji}</span>
                  <span>{targetUser.customStatus.text}</span>
                </div>
              )}

              {isUser && (
                <>
                  <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 8 }}>{targetUser?.email}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                    <span style={{
                      fontSize: 11,
                      padding: '2px 8px',
                      borderRadius: 6,
                      background: isOnline ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                      color: isOnline ? '#10B981' : '#94A3B8',
                      fontWeight: 600
                    }}>
                      {isOnline ? '● Online' : '○ Offline'}
                    </span>

                    {(targetUser?.isAdmin || targetUser?.roles?.includes('xadmin') || targetUser?.roles?.includes('admin')) && (
                      <span style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: 6,
                        background: 'rgba(16, 185, 129, 0.2)',
                        color: '#10B981',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3
                      }}>
                        <Shield size={12} /> XAdmin
                      </span>
                    )}

                    {targetUser?.xidId && (
                      <span style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: 6,
                        background: 'rgba(0, 240, 255, 0.15)',
                        color: '#00F0FF',
                        fontWeight: 600
                      }}>
                        ⚡ XID Verified
                      </span>
                    )}
                  </div>
                </>
              )}

              {/* Channel Topic & Description */}
              {isGroup && (
                <div style={{ width: '100%', marginTop: 6, textAlign: 'left', background: 'rgba(255, 255, 255, 0.02)', padding: '10px 12px', borderRadius: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 2 }}>
                    Channel Topic
                  </div>
                  <div style={{ fontSize: 13, color: '#F8FAFC', marginBottom: 8 }}>
                    {targetGroup?.topic || 'No topic set'}
                  </div>
                  {targetGroup?.description && (
                    <>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 2 }}>
                        Description
                      </div>
                      <div style={{ fontSize: 12, color: '#94A3B8' }}>
                        {targetGroup.description}
                      </div>
                    </>
                  )}
                </div>
              )}

              {isAladin && (
                <p style={{ fontSize: 12, color: '#A78BFA', marginTop: 4 }}>
                  XCorp Autonomous Intelligence Copilot connected to XLLM Engine.
                </p>
              )}
            </div>

            {/* Quick Call Controls for DMs */}
            {isUser && (
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 24 }}>
                <button
                  className="header-action-btn header-call-btn"
                  style={{ flex: 1, height: 38, gap: 6, display: 'flex', fontSize: 12, fontWeight: 600 }}
                  onClick={() => onStartAudioCall(targetUser._id)}
                >
                  <Phone size={15} /> Audio Call
                </button>
                <button
                  className="header-action-btn header-call-btn"
                  style={{ flex: 1, height: 38, gap: 6, display: 'flex', fontSize: 12, fontWeight: 600 }}
                  onClick={() => onStartVideoCall(targetUser._id)}
                >
                  <Video size={15} /> Video Call
                </button>
              </div>
            )}

            {/* Group Members List */}
            {isGroup && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.06em', marginBottom: 10 }}>
                  Channel Members ({targetGroup?.members?.length || 0})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(targetGroup?.members || []).map(memberId => {
                    const mem = typeof memberId === 'object' ? memberId : allUsers.find(u => u._id === memberId);
                    const memId = typeof memberId === 'object' ? memberId._id : memberId;
                    const memOnline = Boolean(userStatus[memId]);
                    return (
                      <div key={memId} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#F8FAFC' }}>
                        <span className={`sidebar-presence-indicator ${memOnline ? 'online' : 'offline'}`} />
                        <span>{mem?.displayName || memId}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Pinned Messages (Slack/Teams parity) */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.06em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Pin size={13} color="#00F0FF" />
                <span>Pinned Messages ({pinnedMessages.length})</span>
              </div>
              {pinnedMessages.length === 0 ? (
                <div style={{ fontSize: 12, color: '#64748B' }}>No pinned messages in this conversation</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {pinnedMessages.map((pin) => (
                    <div key={pin._id} className="inspector-pinned-card">
                      <div style={{ fontSize: 11, color: '#94A3B8', display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span>{pin.pinnedBy || 'Member'}</span>
                        <button
                          type="button"
                          className="pinned-unpin-btn"
                          title="Unpin"
                          onClick={() => onUnpinMessage && onUnpinMessage(pin._id)}
                        >
                          Unpin
                        </button>
                      </div>
                      <div style={{ fontSize: 12, color: '#F8FAFC', maxHeight: 48, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {pin.content || '[Attachment]'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Shared Files & Media */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.06em', marginBottom: 10 }}>
                Recent Files ({sharedFiles.length})
              </div>
              {sharedFiles.length === 0 ? (
                <div style={{ fontSize: 12, color: '#64748B' }}>No files shared yet in this conversation</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {sharedFiles.slice(-5).map((f, i) => (
                    <a
                      key={i}
                      href={f.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="file-attachment-card"
                      style={{ padding: '8px 10px', marginTop: 0 }}
                    >
                      <div className="file-icon-box" style={{ width: 28, height: 28 }}>
                        <FileText size={15} />
                      </div>
                      <div className="file-info-col">
                        <div className="file-name-text" style={{ fontSize: 12 }}>
                          {f.fileUrl.split('/').pop()}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </aside>
  );
}

