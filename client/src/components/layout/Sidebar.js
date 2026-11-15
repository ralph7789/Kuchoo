import React, { useState, useEffect } from 'react';
import { Search, Plus, Hash, Sparkles, Shield, MessageSquare, Lock, ChevronDown, ChevronRight, Star } from '../common/Icons';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

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
  unreadCounts = {},
  starredIds = [],
  onToggleStar
}) {
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Section collapse states
  const [channelsCollapsed, setChannelsCollapsed] = useState(false);
  const [dmsCollapsed, setDmsCollapsed] = useState(false);
  const [starredCollapsed, setStarredCollapsed] = useState(false);

  // Debounced Universal Message Search (Slack/Teams parity)
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      setSearchLoading(true);
      fetch(`${BACKEND_URL}/api/search?q=${encodeURIComponent(searchQuery.trim())}`, { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setSearchResults(data);
        })
        .catch(err => console.error('Sidebar search error:', err))
        .finally(() => setSearchLoading(false));
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredUsers = (Array.isArray(users) ? users : [])
    .filter(u => u._id !== user?._id)
    .filter(u => 
      u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const filteredGroups = (Array.isArray(groups) ? groups : [])
    .filter(g => g.name?.toLowerCase().includes(searchQuery.toLowerCase()));

  // Filter Starred channels and DMs
  const starredGroups = filteredGroups.filter(g => starredIds.includes(g._id));
  const starredUsers = filteredUsers.filter(u => starredIds.includes(u._id));
  const hasStarred = starredGroups.length > 0 || starredUsers.length > 0;

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

      {/* Universal Search Input */}
      <div className="sidebar-search-box">
        <div className="sidebar-search-input-wrapper">
          <Search size={15} className="sidebar-search-icon" />
          <input
            type="text"
            className="sidebar-search-input"
            placeholder="Search channels, members & messages... (⌘K)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="sidebar-content-scroll">
        {/* Message Search Results Section */}
        {searchQuery.trim().length >= 2 && (
          <div className="sidebar-section">
            <div className="sidebar-section-header">
              <span>Messages Matching ({searchResults.length})</span>
            </div>
            {searchLoading ? (
              <div style={{ padding: '8px 12px', fontSize: 12, color: '#94A3B8' }}>Searching...</div>
            ) : searchResults.length === 0 ? (
              <div style={{ padding: '8px 12px', fontSize: 12, color: '#64748B' }}>No message matches found</div>
            ) : (
              searchResults.map(msg => (
                <div
                  key={msg._id}
                  className="sidebar-nav-item"
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '6px 12px', gap: 2 }}
                  onClick={() => {
                    const matchedGroup = groups.find(g => g._id === msg.to);
                    if (matchedGroup) {
                      onSelectTarget({ type: 'group', id: matchedGroup._id, name: matchedGroup.name, group: matchedGroup });
                    } else {
                      const matchedUser = users.find(u => u._id === msg.to || u._id === msg.from);
                      if (matchedUser) {
                        onSelectTarget({ type: 'user', id: matchedUser._id, name: matchedUser.displayName, user: matchedUser });
                      }
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
                    <MessageSquare size={13} color="#00F0FF" />
                    <span style={{ fontSize: 11, color: '#94A3B8' }}>
                      {new Date(msg.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#F8FAFC', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                    {msg.content || '[Attachment]'}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

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

        {/* Starred Favorites Section (Slack/Teams Parity) */}
        {hasStarred && (
          <div className="sidebar-section">
            <div
              className="sidebar-section-header"
              style={{ cursor: 'pointer', userSelect: 'none' }}
              onClick={() => setStarredCollapsed(!starredCollapsed)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {starredCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                <Star size={13} color="#F59E0B" fill="#F59E0B" />
                <span>Starred ({starredGroups.length + starredUsers.length})</span>
              </div>
            </div>

            {!starredCollapsed && (
              <>
                {starredGroups.map(group => {
                  const isActive = activeTarget?.type === 'group' && activeTarget?.id === group._id;
                  const isPrivate = group.isPrivate || group.isPublic === false;
                  const unread = unreadCounts[group._id] || 0;
                  return (
                    <div
                      key={`starred-${group._id}`}
                      className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                      onClick={() => onSelectTarget({ type: 'group', id: group._id, name: group.name, group })}
                    >
                      {isPrivate ? (
                        <Lock size={15} color={isActive ? '#00F0FF' : '#F59E0B'} />
                      ) : (
                        <Hash size={16} color={isActive ? '#00F0FF' : '#94A3B8'} />
                      )}
                      <span className="sidebar-item-label">{group.name}</span>
                      {unread > 0 && <span className="sidebar-unread-pill">{unread}</span>}
                    </div>
                  );
                })}

                {starredUsers.map(u => {
                  const isOnline = Boolean(userStatus[u._id]);
                  const isActive = activeTarget?.type === 'user' && activeTarget?.id === u._id;
                  const unread = unreadCounts[u._id] || 0;
                  return (
                    <div
                      key={`starred-${u._id}`}
                      className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                      onClick={() => onSelectTarget({ type: 'user', id: u._id, name: u.displayName, user: u })}
                    >
                      <span className={`sidebar-presence-indicator ${isOnline ? 'online' : 'offline'}`} />
                      <span className="sidebar-item-label">{u.displayName}</span>
                      {unread > 0 && <span className="sidebar-unread-pill">{unread}</span>}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {/* Channels Section */}
        <div className="sidebar-section">
          <div className="sidebar-section-header">
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', userSelect: 'none', flex: 1 }}
              onClick={() => setChannelsCollapsed(!channelsCollapsed)}
            >
              {channelsCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
              <span>Channels ({groups.length})</span>
            </div>
            <button
              className="sidebar-add-btn"
              title="Create New Channel"
              onClick={onOpenCreateGroup}
            >
              <Plus size={15} />
            </button>
          </div>

          {!channelsCollapsed && (
            <>
              {filteredGroups.map(group => {
                const isActive = activeTarget?.type === 'group' && activeTarget?.id === group._id;
                const isPrivate = group.isPrivate || group.isPublic === false;
                const unread = unreadCounts[group._id] || 0;
                return (
                  <div
                    key={group._id}
                    className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => onSelectTarget({ type: 'group', id: group._id, name: group.name, group })}
                  >
                    {isPrivate ? (
                      <Lock size={15} color={isActive ? '#00F0FF' : '#F59E0B'} />
                    ) : (
                      <Hash size={16} color={isActive ? '#00F0FF' : '#94A3B8'} />
                    )}
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
            </>
          )}
        </div>

        {/* Direct Messages Section */}
        <div className="sidebar-section">
          <div
            className="sidebar-section-header"
            style={{ cursor: 'pointer', userSelect: 'none' }}
            onClick={() => setDmsCollapsed(!dmsCollapsed)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {dmsCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
              <span>Direct Messages ({filteredUsers.length})</span>
            </div>
          </div>

          {!dmsCollapsed && (
            <>
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
            </>
          )}
        </div>
      </div>
    </aside>
  );
}

