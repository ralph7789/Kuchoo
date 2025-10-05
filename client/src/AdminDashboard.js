import React, { useEffect, useState } from 'react';
import './AdminDashboard.css';
import Header from './Header';
import Grid from './components/DataGrid';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newUser, setNewUser] = useState({ email: '', password: '', displayName: '' });

  useEffect(() => {
    fetchAllUsers();
  }, []);

  async function fetchAllUsers() {
    setLoading(true);
    try {
      const usersRes = await fetch(`${BACKEND_URL}/api/users`, { credentials: 'include' });
      const usersData = await usersRes.json();
      if (usersData.error) throw new Error(usersData.error);

      const formattedUsers = usersData.map(user => ({
        id: user._id,
        name: user.displayName,
        email: user.email,
      }));

      setUsers(Array.isArray(formattedUsers) ? formattedUsers : []);
    } catch (e) {
      setError(e.message || 'Failed to fetch data');
    }
    setLoading(false);
  }

  async function handleAddUser(e) {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`${BACKEND_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newUser)
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setNewUser({ email: '', password: '', displayName: '' });
        fetchAllUsers();
      }
    } catch (err) {
      setError('Failed to add user');
    }
  }

  return (
    <div className="admin-dashboard">
      <Header />
      <h1>Admin Dashboard</h1>
      {error && <div className="error-msg">{error}</div>}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
          <section>
            <h2>Users</h2>
            <form onSubmit={handleAddUser} className="admin-form">
              <input required placeholder="Email" value={newUser.email} onChange={e => setNewUser(u => ({ ...u, email: e.target.value }))} />
              <input required placeholder="Password" value={newUser.password} onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))} />
              <input required placeholder="Display Name" value={newUser.displayName} onChange={e => setNewUser(u => ({ ...u, displayName: e.target.value }))} />
              <button type="submit">Add User</button>
            </form>
            <div style={{ marginTop: '20px' }}>
              <Grid data={users} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}