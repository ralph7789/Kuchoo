import React from 'react';
import { Search, Plus, Hash, Sparkles, Shield } from '../common/Icons';

export default function Sidebar({
  user,
  users = [],
  groups = [],
  activeTarget, // { type: 'user' | 'group' | 'aladin', id: string }
  onSelectTarget,
  userStatus = {},
  onOpenCreateGroup,
  searchQuery,
  setSearchQuery,
  unreadCounts = {}
}) {
  const filteredUsers = (Array.isArray(users) ? users : [])
    .filter(u => u._id !== user?._id)
    .filter(u => 
      u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const filteredGroups = (Array.isArray(groups) ? groups : [])
    .filter(g => g.name?.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <aside className="workspace-sidebar" aria-label="Channels and Direct Messages">
      {/* Workspace Header */}
      <div className="sidebar-header">
        <div className="sidebar-workspace-title">
          <span>Kuchoo Team</span>
          <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(0, 240, 255, 0.15)', color: '#00F0FF', fontWeight: 700 }}>
            PRO
          </span>
        </div>
      </div>

      {/* Search Input */}
      <div className="sidebar-search-box">
        <div className="sidebar-search-input-wrapper">
          <Search size={15} className="sidebar-search-icon" />
          <input
            type="text"
            className="sidebar-search-input"
            placeholder="Search channels & members... (⌘K)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="sidebar-content-scroll">
        {/* AI Copilot Section */}
        <div className="sidebar-section" style={{ marginTop: 4 }}>
          <div
            className={`sidebar-nav-item ${activeTarget?.type === 'aladin' ? 'active' : ''}`}
            onClick={() => onSelectTarget({ type: 'aladin', id: 'aladin', name: 'Aladin AI Copilot' })}
            style={{ borderLeft: '2px solid #8B5CF6' }}
          >
            <Sparkles size={16} color="#8B5CF6" />
            <span className="sidebar-item-label" style={{ fontWeight: 600 }}>Aladin AI Copilot</span>
            <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: 'rgba(139, 92, 246, 0.2)', color: '#A78BFA', fontWeight: 700 }}>
              AI
            </span>
          </div>
        </div>

        {/* Channels Section */}
        <div className="sidebar-section">
          <div className="sidebar-section-header">
            <span>Channels ({groups.length})</span>
            <button
              className="sidebar-add-btn"
              title="Create New Channel"
              onClick={onOpenCreateGroup}
            >
              <Plus size={15} />
            </button>
          </div>

          {filteredGroups.map(group => {
            const isActive = activeTarget?.type === 'group' && activeTarget?.id === group._id;
            const unread = unreadCounts[group._id] || 0;
            return (
              <div
                key={group._id}
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => onSelectTarget({ type: 'group', id: group._id, name: group.name, group })}
              >
                <Hash size={16} color={isActive ? '#00F0FF' : '#94A3B8'} />
                <span className="sidebar-item-label">{group.name}</span>
                {unread > 0 && <span className="sidebar-unread-pill">{unread}</span>}
              </div>
            );
          })}

          {filteredGroups.length === 0 && (
            <div style={{ padding: '8px 12px', fontSize: 12, color: '#64748B' }}>
              No channels found
            </div>
          )}
        </div>

        {/* Direct Messages Section */}
        <div className="sidebar-section">
          <div className="sidebar-section-header">
            <span>Direct Messages ({filteredUsers.length})</span>
          </div>

          {filteredUsers.map(u => {
            const isOnline = Boolean(userStatus[u._id]);
            const isActive = activeTarget?.type === 'user' && activeTarget?.id === u._id;
            const isTargetAdmin = Boolean(u.isAdmin || (u.roles && (u.roles.includes('admin') || u.roles.includes('xadmin'))));
            const unread = unreadCounts[u._id] || 0;

            return (
              <div
                key={u._id}
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => onSelectTarget({ type: 'user', id: u._id, name: u.displayName, user: u })}
              >
                <span className={`sidebar-presence-indicator ${isOnline ? 'online' : 'offline'}`} />
                <span className="sidebar-item-label">{u.displayName}</span>
                {isTargetAdmin && (
                  <span title="XAdmin" style={{ display: 'inline-flex', color: '#10B981' }}>
                    <Shield size={13} />
                  </span>
                )}
                {unread > 0 && <span className="sidebar-unread-pill">{unread}</span>}
              </div>
            );
          })}

          {filteredUsers.length === 0 && (
            <div style={{ padding: '8px 12px', fontSize: 12, color: '#64748B' }}>
              No team members found
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
