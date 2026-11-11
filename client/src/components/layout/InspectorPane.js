import React from 'react';
import { X, Phone, Video, Shield, FileText } from '../common/Icons';

export default function InspectorPane({
  activeTarget,
  userStatus = {},
  allUsers = [],
  onClose,
  onStartAudioCall,
  onStartVideoCall,
  sharedFiles = []
}) {
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
      <div className="sidebar-header">
        <span style={{ fontSize: 14, fontWeight: 700 }}>Details</span>
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
                const mem = allUsers.find(u => u._id === memberId);
                const memOnline = Boolean(userStatus[memberId]);
                return (
                  <div key={memberId} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#F8FAFC' }}>
                    <span className={`sidebar-presence-indicator ${memOnline ? 'online' : 'offline'}`} />
                    <span>{mem?.displayName || memberId}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
      </div>
    </aside>
  );
}
