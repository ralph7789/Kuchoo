import React, { useEffect, useState } from 'react';
import './AdminDashboard.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newUser, setNewUser] = useState({ email: '', password: '', displayName: '' });
  const [editUser, setEditUser] = useState(null);
  const [newGroup, setNewGroup] = useState({ name: '', members: '' });

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const usersRes = await fetch(`${BACKEND_URL}/api/users`, { credentials: 'include' });
      const usersData = await usersRes.json();
      setUsers(Array.isArray(usersData) ? usersData : []);
      const groupsRes = await fetch(`${BACKEND_URL}/api/groups`, { credentials: 'include' });
      const groupsData = await groupsRes.json();
      setGroups(Array.isArray(groupsData) ? groupsData : []);
    } catch (e) {
      setError('Failed to fetch data');
    }
    setLoading(false);
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
      <h1>Admin Dashboard</h1>
      {error && <div className="error-msg">{error}</div>}
      {loading ? <div>Loading...</div> : (
        <>
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
                <tr><th>Email</th><th>Display Name</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id}>
                    <td>{u.email}</td>
                    <td>{u.displayName}</td>
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
          <section>
            <h2>Groups</h2>
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
        </>
      )}
    </div>
  );
}
