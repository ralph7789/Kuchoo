import React from 'react';
import { MessageSquare, Sparkles, Zap, ShieldCheck } from '../common/Icons';

export default function WorkspaceRail({
  user,
  activeView,
  setActiveView,
  onOpenProfile,
  onOpenAdmin,
  isAdmin,
  onSelectAladin
}) {
  const initials = user?.displayName
    ? user.displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'U';

  return (
    <nav className="workspace-rail" aria-label="Workspace Navigation">
      <div className="rail-top-group">
        {/* App Logo */}
        <div 
          className="rail-brand-icon" 
          title="Kuchoo Enterprise Collaboration"
          onClick={() => setActiveView('chats')}
        >
          <img src="/logo192.png" alt="Kuchoo" className="rail-brand-logo" />
        </div>

        <div className="rail-divider" />

        {/* Primary View Switchers */}
        <button
          className={`rail-item ${activeView === 'chats' ? 'active' : ''}`}
          title="Conversations & Channels"
          onClick={() => setActiveView('chats')}
        >
          <MessageSquare size={20} />
        </button>

        <button
          className={`rail-item ${activeView === 'aladin' ? 'active' : ''}`}
          title="Aladin Autonomous Intelligence Copilot"
          onClick={() => {
            setActiveView('aladin');
            if (onSelectAladin) onSelectAladin();
          }}
        >
          <Sparkles size={20} color="#8B5CF6" />
        </button>

        {/* XCorp Suite Portal Launcher */}
        <a
          href="https://xcorp.mywire.org"
          target="_blank"
          rel="noopener noreferrer"
          className="rail-item"
          title="Open XCorp Suite Portal"
        >
          <Zap size={20} color="#00F0FF" />
        </a>

        {/* Admin Console Shortcut */}
        {isAdmin && (
          <button
            className="rail-item"
            title="XAdmin Console"
            onClick={onOpenAdmin}
            style={{ color: '#10B981' }}
          >
            <ShieldCheck size={20} />
          </button>
        )}
      </div>

      <div className="rail-bottom-group">
        {/* User Avatar & Profile Trigger */}
        <button
          className="rail-avatar-btn"
          title={`${user?.displayName || 'User'} (${user?.email}) - Click to manage profile`}
          onClick={onOpenProfile}
        >
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.displayName} className="rail-avatar-img" />
          ) : (
            <div className="rail-avatar-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1E293B', color: '#F8FAFC', fontWeight: '700', fontSize: '13px' }}>
              {initials}
            </div>
          )}
          <span className="rail-presence-dot" />
        </button>
      </div>
    </nav>
  );
}
