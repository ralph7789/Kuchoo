import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';
import Header from './Header';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

export default function AdminDashboard({ user }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'groups' | 'audit'
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newUser, setNewUser] = useState({ email: '', password: '', displayName: '' });
  const [editUser, setEditUser] = useState(null);
  const [newGroup, setNewGroup] = useState({ name: '', members: '' });

  // Audit Logs State (Milestone 6)
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditCursor, setAuditCursor] = useState(null);
  const [auditHasMore, setAuditHasMore] = useState(false);
  const [loadingAudit, setLoadingAudit] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    if (activeTab === 'audit' && auditLogs.length === 0) {
      fetchAuditLogs();
    }
  }, [activeTab]);

  async function fetchAll() {
    setLoading(true);
    try {
      const usersRes = await fetch(`${BACKEND_URL}/api/users`, { credentials: 'include' });
      const usersData = await usersRes.json();
      if (usersData.error) throw new Error(usersData.error);
      setUsers(Array.isArray(usersData) ? usersData : []);
      const groupsRes = await fetch(`${BACKEND_URL}/api/groups`, { credentials: 'include' });
      const groupsData = await groupsRes.json();
      if (groupsData.error) throw new Error(groupsData.error);
      setGroups(Array.isArray(groupsData) ? groupsData : []);
    } catch (e) {
      setError(e.message || 'Failed to fetch data');
    }
    setLoading(false);
  }

  async function fetchAuditLogs(cursor = null) {
    setLoadingAudit(true);
    try {
      const url = cursor
        ? `${BACKEND_URL}/api/admin/audit-logs?cursor=${encodeURIComponent(cursor)}&limit=25`
        : `${BACKEND_URL}/api/admin/audit-logs?limit=25`;
      const res = await fetch(url, { credentials: 'include' });
      const data = await res.json();
      if (data.items) {
        if (cursor) {
          setAuditLogs(prev => [...prev, ...data.items]);
        } else {
          setAuditLogs(data.items);
        }
        setAuditCursor(data.nextCursor);
        setAuditHasMore(data.hasMore);
      }
    } catch (e) {
      console.error('Failed to fetch audit logs:', e);
    }
    setLoadingAudit(false);
  }

  async function handleAddUser(e) {
    e.preventDefault();
    setError('');
    const res = await fetch(`${BACKEND_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(newUser)
    });
    const data = await res.json();
    if (data.error) setError(data.error);
    else {
      setNewUser({ email: '', password: '', displayName: '' });
      fetchAll();
    }
  }

  async function handleEditUser(e) {
    e.preventDefault();
    setError('');
    const res = await fetch(`${BACKEND_URL}/api/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(editUser)
    });
    const data = await res.json();
    if (data.error) setError(data.error);
    else {
      setEditUser(null);
      fetchAll();
    }
  }

  async function handleDeleteUser(id) {
    if (!window.confirm('Delete this user?')) return;
    await fetch(`${BACKEND_URL}/api/users/${id}`, { method: 'DELETE', credentials: 'include' });
    fetchAll();
  }

  async function handleAddGroup(e) {
    e.preventDefault();
    setError('');
    const res = await fetch(`${BACKEND_URL}/api/groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        name: newGroup.name,
        members: newGroup.members.split(',').map(m => m.trim())
      })
    });
    const data = await res.json();
    if (data.error) setError(data.error);
    else {
      setNewGroup({ name: '', members: '' });
      fetchAll();
    }
  }

  async function handleDeleteGroup(id) {
    if (!window.confirm('Delete this group?')) return;
    await fetch(`${BACKEND_URL}/api/groups/${id}`, { method: 'DELETE', credentials: 'include' });
    fetchAll();
  }

  return (
    <div className="admin-dashboard">
      <Header />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1>Admin Dashboard</h1>
        <button 
          onClick={() => navigate('/')} 
          style={{ padding: '8px 16px', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
        >
          ← Back to Messenger
        </button>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: 10 }}>
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          style={{
            padding: '8px 16px',
            background: activeTab === 'users' ? '#4f8cff' : 'transparent',
            color: activeTab === 'users' ? '#fff' : '#4b5563',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          Users ({users.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('groups')}
          style={{
            padding: '8px 16px',
            background: activeTab === 'groups' ? '#4f8cff' : 'transparent',
            color: activeTab === 'groups' ? '#fff' : '#4b5563',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          Channels & Groups ({groups.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          style={{
            padding: '8px 16px',
            background: activeTab === 'audit' ? '#4f8cff' : 'transparent',
            color: activeTab === 'audit' ? '#fff' : '#4b5563',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          Audit Ledger ({auditLogs.length})
        </button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {loading ? <div>Loading...</div> : (
        <>
          {activeTab === 'users' && (
            <section>
              <h2>Users</h2>
              <form onSubmit={handleAddUser} className="admin-form">
                <input required placeholder="Email" value={newUser.email} onChange={e => setNewUser(u => ({ ...u, email: e.target.value }))} />
                <input required placeholder="Password" value={newUser.password} onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))} />
                <input required placeholder="Display Name" value={newUser.displayName} onChange={e => setNewUser(u => ({ ...u, displayName: e.target.value }))} />
                <button type="submit">Add User</button>
              </form>
              <table className="admin-table">
                <thead>
                  <tr><th>Email</th><th>Display Name</th><th>Role / XID</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u._id}>
                      <td>{u.email}</td>
                      <td>{u.displayName}</td>
                      <td>
                        <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, background: u.isAdmin ? '#10B981' : '#374151', color: '#fff' }}>
                          {u.isAdmin ? 'XAdmin' : (u.roles ? u.roles.join(', ') : 'User')}
                        </span>
                        {u.xidId && <span style={{ marginLeft: 6, fontSize: 11, color: '#00F0FF' }}>⚡ XID</span>}
                      </td>
                      <td>
                        <button onClick={() => setEditUser(u)}>Edit</button>
                        <button onClick={() => handleDeleteUser(u._id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {editUser && (
                <form onSubmit={handleEditUser} className="admin-form">
                  <input value={editUser.email} onChange={e => setEditUser(u => ({ ...u, email: e.target.value }))} />
                  <input value={editUser.displayName} onChange={e => setEditUser(u => ({ ...u, displayName: e.target.value }))} />
                  <input type="password" placeholder="New Password (optional)" onChange={e => setEditUser(u => ({ ...u, password: e.target.value }))} />
                  <button type="submit">Save</button>
                  <button type="button" onClick={() => setEditUser(null)}>Cancel</button>
                </form>
              )}
            </section>
          )}

          {activeTab === 'groups' && (
            <section>
              <h2>Groups & Channels</h2>
              <form onSubmit={handleAddGroup} className="admin-form">
                <input required placeholder="Group Name" value={newGroup.name} onChange={e => setNewGroup(g => ({ ...g, name: e.target.value }))} />
                <input placeholder="Member IDs (comma separated)" value={newGroup.members} onChange={e => setNewGroup(g => ({ ...g, members: e.target.value }))} />
                <button type="submit">Add Group</button>
              </form>
              <table className="admin-table">
                <thead>
                  <tr><th>Name</th><th>Members</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {groups.map(g => (
                    <tr key={g._id}>
                      <td>{g.name}</td>
                      <td>{g.members.length}</td>
                      <td>
                        <button onClick={() => handleDeleteGroup(g._id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {activeTab === 'audit' && (
            <section>
              <h2>Enterprise Security & Compliance Audit Log</h2>
              <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 16 }}>
                Chronological, immutable audit ledger tracking security events, role changes, webhook lifecycles, and data governance actions.
              </p>

              {loadingAudit && auditLogs.length === 0 ? (
                <div>Loading audit ledger...</div>
              ) : auditLogs.length === 0 ? (
                <div style={{ color: '#6b7280' }}>No security events recorded yet.</div>
              ) : (
                <>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>Action</th>
                        <th>Target</th>
                        <th>Actor / IP</th>
                        <th>Metadata</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map(log => {
                        const isDanger = log.action.includes('DELETED') || log.action.includes('KICKED');
                        const isSuccess = log.action.includes('CREATED') || log.action.includes('JOINED');
                        const badgeBg = isDanger ? '#EF4444' : (isSuccess ? '#10B981' : '#3B82F6');
                        return (
                          <tr key={log._id}>
                            <td style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>
                              {new Date(log.timestamp).toLocaleString()}
                            </td>
                            <td>
                              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: badgeBg, color: '#fff' }}>
                                {log.action}
                              </span>
                            </td>
                            <td style={{ fontSize: 13 }}>
                              <strong>{log.targetType}</strong>
                              {log.targetId && <span style={{ marginLeft: 6, fontSize: 11, color: '#9ca3af' }}>({String(log.targetId).slice(-6)})</span>}
                            </td>
                            <td style={{ fontSize: 12 }}>
                              <div>{log.userId?.displayName || log.userId?.email || 'System'}</div>
                              <div style={{ color: '#9ca3af', fontSize: 10 }}>{log.ipAddress}</div>
                            </td>
                            <td style={{ fontSize: 11, fontFamily: 'monospace', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {log.metadata ? JSON.stringify(log.metadata) : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {auditHasMore && (
                    <div style={{ textAlign: 'center', marginTop: 12 }}>
                      <button
                        onClick={() => fetchAuditLogs(auditCursor)}
                        disabled={loadingAudit}
                        style={{
                          background: '#4f8cff',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 6,
                          padding: '8px 20px',
                          cursor: 'pointer',
                          fontWeight: 600
                        }}
                      >
                        {loadingAudit ? 'Loading...' : 'Load More Logs'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
