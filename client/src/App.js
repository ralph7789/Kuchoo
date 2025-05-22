import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import './App.css';
import AdminDashboard from './AdminDashboard';
import Header from './Header';

// IMPORTANT: Replace this with your actual local IP address
const BACKEND_URL = 'http://192.168.173.236:5000';
const socket = io(BACKEND_URL, { withCredentials: true });

function ProfileAndSelection({
  user, users, groups, groupName, setGroupName, groupMembers, setGroupMembers, handleCreateGroup, setShowProfile, showProfile, profileForm, setProfileForm, handleProfileUpdate, error, handleLogout, to, setTo, userStatus, setSelectedGroup, selectedGroup, setPage
}) {
  const navigate = useNavigate();
  return (
    <div className="selection-bg">
      <header className="App-header glass-card">
        <div className="branding">
          <img src="/logo192.png" alt="Kuchu Logo" className="logo" />
          <h1>Kuchu</h1>
        </div>
        <button className="profile-btn" onClick={() => setShowProfile(v => !v)}>Edit Profile</button>
        {showProfile && (
          <form onSubmit={handleProfileUpdate} className="profile-form">
            <input placeholder="Display Name" value={profileForm.displayName} onChange={e => setProfileForm(f => ({ ...f, displayName: e.target.value }))} />
            <input type="password" placeholder="New Password" value={profileForm.password} onChange={e => setProfileForm(f => ({ ...f, password: e.target.value }))} />
            <button type="submit">Update</button>
          </form>
        )}
        {error && <div className="error-msg">{error}</div>}
        <button className="logout-btn" onClick={handleLogout}>Logout</button>
        <div className="select-section">
          <div className="select-card">
            <label>Chat with:</label>
            <select value={to} onChange={e => setTo(e.target.value)}>
              <option value="">Select user</option>
              {(Array.isArray(users) ? users.filter(u => u._id !== user._id) : []).map(u => (
                <option key={u._id} value={u._id}>
                  {u.displayName} ({u.email}) {userStatus[u._id] ? '🟢' : '⚪'}
                </option>
              ))}
            </select>
            {to && (
              <button className="go-btn" onClick={() => { setPage('chat'); navigate('/chat'); }}>Go to Chat</button>
            )}
          </div>
          <div className="select-card">
            <label>Or select group:</label>
            <select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)}>
              <option value="">Select group</option>
              {(Array.isArray(groups) ? groups : []).map(g => (
                <option key={g._id} value={g._id}>{g.name}</option>
              ))}
            </select>
            {selectedGroup && (
              <button className="go-btn" onClick={() => { setPage('chat'); navigate('/chat'); }}>Go to Group Chat</button>
            )}
          </div>
        </div>
        <form onSubmit={handleCreateGroup} className="group-form">
          <input placeholder="Group Name" value={groupName} onChange={e => setGroupName(e.target.value)} />
          <select multiple value={groupMembers} onChange={e => setGroupMembers(Array.from(e.target.selectedOptions, o => o.value))}>
            {(Array.isArray(users) ? users : []).map(u => (
              <option key={u._id} value={u._id}>{u.displayName}</option>
            ))}
          </select>
          <button type="submit">Create Group</button>
        </form>
      </header>
    </div>
  );
}

function ChatPage(props) {
  const { users, to, groups, selectedGroup, setPage, startCall, callIncoming, answerCall, endCall, callUserId, localStream, remoteStream, messages, user, messagesEndRef, handleSend, content, setContent, handleFileUpload, recording, startRecording, stopRecording } = props;
  const navigate = useNavigate();
  return (
    <div className="chat-bg">
      <header className="App-header chat-glass">
        <div className="branding">
          <img src="/logo192.png" alt="Kuchu Logo" className="logo" />
          <h1>Kuchu</h1>
        </div>
        <button className="back-btn" onClick={() => { setPage('select'); navigate('/'); }}>← Back</button>
        {to && (
          <div className="chat-header-info">
            <span>Chatting with: <b>{users.find(u => u._id === to)?.displayName || to}</b></span>
            <button className="call-btn" onClick={() => startCall(to)}>Call</button>
          </div>
        )}
        {selectedGroup && (
          <div className="chat-header-info">
            <span>Group: <b>{groups.find(g => g._id === selectedGroup)?.name || selectedGroup}</b></span>
          </div>
        )}
        {callIncoming && (
          <div className="call-incoming">
            Incoming call from user {callIncoming.from}
            <button onClick={answerCall}>Answer</button>
            <button onClick={endCall}>Decline</button>
          </div>
        )}
        {callUserId && (
          <div className="call-active">
            <div>In call with user {callUserId}</div>
            <button onClick={endCall}>End Call</button>
            <div className="video-row">
              {localStream && <video autoPlay muted playsInline ref={el => { if (el) el.srcObject = localStream; }} className="video-local" />}
              {remoteStream && <video autoPlay playsInline ref={el => { if (el) el.srcObject = remoteStream; }} className="video-remote" />}
            </div>
          </div>
        )}
        <div className="chat-box chat-modern">
          {messages.map((msg, idx) => (
            <div key={idx} className={msg.from === user._id ? 'my-message modern' : 'their-message modern'}>
              <b>{msg.from === user._id ? 'Me' : 'Them'}:</b> {msg.content}
              {msg.fileUrl && <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer">📎</a>}
              {msg.voiceUrl && <audio controls src={msg.voiceUrl}></audio>}
              <span className="msg-meta">{new Date(msg.timestamp).toLocaleTimeString()}</span>
              {msg.read && <span className="msg-read">✓✓</span>}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={handleSend} className="chat-form chat-form-modern">
          <input
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Type a message..."
            autoFocus
          />
          <input type="file" onChange={handleFileUpload} />
          <button type="submit">Send</button>
        </form>
        <div className="voice-row">
          {!recording ? (
            <button className="voice-btn" onClick={startRecording}>🎤 Record Voice</button>
          ) : (
            <button className="voice-btn" onClick={stopRecording}>⏹ Stop Recording</button>
          )}
        </div>
      </header>
    </div>
  );
}

function SignInPage({ loginForm, setLoginForm, handleLogin, error, goToSignUp }) {
  return (
    <div className="App">
      <Header />
      <header className="App-header glass-card">
        <form onSubmit={handleLogin} className="auth-form">
          <h2>Login</h2>
          <input required type="email" placeholder="Email" value={loginForm.email} onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))} />
          <input required type="password" placeholder="Password" value={loginForm.password} onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))} />
          <button type="submit">Login</button>
        </form>
        <button className="go-btn" onClick={goToSignUp}>Sign Up</button>
        {error && <div className="error-msg">{error}</div>}
      </header>
    </div>
  );
}

function SignUpPage({ registerForm, setRegisterForm, handleRegister, goToSignIn }) {
  return (
    <div className="App">
      <Header />
      <header className="App-header glass-card">
        <form onSubmit={handleRegister} className="auth-form">
          <h2>Register</h2>
          <input required placeholder="Display Name" value={registerForm.displayName} onChange={e => setRegisterForm(f => ({ ...f, displayName: e.target.value }))} />
          <input required type="email" placeholder="Email" value={registerForm.email} onChange={e => setRegisterForm(f => ({ ...f, email: e.target.value }))} />
          <input required type="password" placeholder="Password" value={registerForm.password} onChange={e => setRegisterForm(f => ({ ...f, password: e.target.value }))} />
          <button type="submit">Register</button>
        </form>
        <button className="back-btn" onClick={goToSignIn}>Back to Login</button>
      </header>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [to, setTo] = useState('');
  const [content, setContent] = useState('');
  const [registerForm, setRegisterForm] = useState({ email: '', password: '', displayName: '' });
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);
  const [showProfile, setShowProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ displayName: '', password: '' });
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [groups, setGroups] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [groupMembers, setGroupMembers] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [userStatus, setUserStatus] = useState({});
  const [callUserId, setCallUserId] = useState(null);
  const [callIncoming, setCallIncoming] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [authPage, setAuthPage] = useState('login'); // 'login' or 'signup'

  const rtcConfig = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/user`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setUser(data);
        }
      });
  }, []);

  useEffect(() => {
    if (user) {
      fetch(`${BACKEND_URL}/api/users`, { credentials: 'include' })
        .then(res => res.json())
        .then(setUsers);
      fetch(`${BACKEND_URL}/api/groups`, { credentials: 'include' })
        .then(res => res.json())
        .then(setGroups);
      socket.emit('user_online', user._id);
    }
    return () => {
      if (user) socket.emit('user_offline', user._id);
    };
  }, [user]);

  useEffect(() => {
    if (user && to) {
      fetch(`${BACKEND_URL}/api/messages/${user._id}/${to}`, { credentials: 'include' })
        .then(res => res.json())
        .then(setMessages);
      socket.emit('join', user._id);
    }
  }, [user, to]);

  useEffect(() => {
    socket.on('receive_message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });
    return () => socket.off('receive_message');
  }, []);

  useEffect(() => {
    socket.on('user_status', ({ userId, online }) => {
      setUserStatus(prev => ({ ...prev, [userId]: online }));
    });
    return () => socket.off('user_status');
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    socket.on('call_offer', async ({ from, offer }) => {
      setCallIncoming({ from, offer });
    });
    socket.on('call_answer', async ({ answer }) => {
      if (peerConnection) await peerConnection.setRemoteDescription(answer);
    });
    socket.on('ice_candidate', async ({ candidate }) => {
      if (peerConnection && candidate) await peerConnection.addIceCandidate(candidate);
    });
    return () => {
      socket.off('call_offer');
      socket.off('call_answer');
      socket.off('ice_candidate');
    };
  }, [peerConnection]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!content.trim() || !to) return;
    socket.emit('send_message', { from: user._id, to, content });
    setContent('');
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    const res = await fetch(`${BACKEND_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(registerForm)
    });
    const data = await res.json();
    if (data.error) setError(data.error);
    else setUser(data);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    const res = await fetch(`${BACKEND_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(loginForm)
    });
    const data = await res.json();
    if (data.error) setError(data.error);
    else setUser(data);
  };

  const handleLogout = async () => {
    await fetch(`${BACKEND_URL}/api/logout`, {
      method: 'POST',
      credentials: 'include'
    });
    setUser(null);
    setTo('');
    setMessages([]);
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    const res = await fetch(`${BACKEND_URL}/api/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(profileForm)
    });
    const data = await res.json();
    if (data.error) setError(data.error);
    else setUser(data);
    setShowProfile(false);
  };

  const handleFileUpload = async (e) => {
    const formData = new FormData();
    formData.append('file', e.target.files[0]);
    await fetch(`${BACKEND_URL}/api/upload`, {
      method: 'POST',
      credentials: 'include',
      body: formData
    });
  };

  const handleVoiceUpload = async (blob) => {
    const formData = new FormData();
    formData.append('voice', blob);
    const res = await fetch(`${BACKEND_URL}/api/voice`, {
      method: 'POST',
      credentials: 'include',
      body: formData
    });
    const data = await res.json();
    socket.emit('send_message', { from: user._id, to, content: '', voiceUrl: data.url });
  };

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new window.MediaRecorder(stream);
    setMediaRecorder(recorder);
    setRecording(true);
    let chunks = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      handleVoiceUpload(blob);
      setRecording(false);
    };
    recorder.start();
  };

  const stopRecording = () => {
    if (mediaRecorder) mediaRecorder.stop();
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    const res = await fetch(`${BACKEND_URL}/api/groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name: groupName, members: groupMembers })
    });
    const data = await res.json();
    setGroups(g => [...g, data]);
    setGroupName('');
    setGroupMembers([]);
  };

  const startCall = async (userId) => {
    setCallUserId(userId);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    setLocalStream(stream);
    const pc = new window.RTCPeerConnection(rtcConfig);
    setPeerConnection(pc);
    stream.getTracks().forEach(track => pc.addTrack(track, stream));
    pc.onicecandidate = (e) => {
      if (e.candidate) socket.emit('ice_candidate', { to: userId, candidate: e.candidate });
    };
    pc.ontrack = (e) => {
      setRemoteStream(e.streams[0]);
    };
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('call_offer', { to: userId, offer });
  };

  const answerCall = async () => {
    if (!callIncoming) return;
    setCallUserId(callIncoming.from);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    setLocalStream(stream);
    const pc = new window.RTCPeerConnection(rtcConfig);
    setPeerConnection(pc);
    stream.getTracks().forEach(track => pc.addTrack(track, stream));
    pc.onicecandidate = (e) => {
      if (e.candidate) socket.emit('ice_candidate', { to: callIncoming.from, candidate: e.candidate });
    };
    pc.ontrack = (e) => {
      setRemoteStream(e.streams[0]);
    };
    await pc.setRemoteDescription(callIncoming.offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit('call_answer', { to: callIncoming.from, answer });
    setCallIncoming(null);
  };

  const endCall = () => {
    if (peerConnection) peerConnection.close();
    setPeerConnection(null);
    setLocalStream(null);
    setRemoteStream(null);
    setCallUserId(null);
    setCallIncoming(null);
  };

  return (
    <Router>
      <Routes>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/" element={
          !user ? (
            authPage === 'login' ? (
              <SignInPage
                loginForm={loginForm}
                setLoginForm={setLoginForm}
                handleLogin={handleLogin}
                error={error}
                goToSignUp={() => setAuthPage('signup')}
              />
            ) : (
              <SignUpPage
                registerForm={registerForm}
                setRegisterForm={setRegisterForm}
                handleRegister={async (e) => {
                  await handleRegister(e);
                  setAuthPage('login');
                }}
                goToSignIn={() => setAuthPage('login')}
              />
            )
          ) : (
            <ProfileAndSelection
              user={user}
              users={users}
              groups={groups}
              groupName={groupName}
              setGroupName={setGroupName}
              groupMembers={groupMembers}
              setGroupMembers={setGroupMembers}
              handleCreateGroup={handleCreateGroup}
              setShowProfile={setShowProfile}
              showProfile={showProfile}
              profileForm={profileForm}
              setProfileForm={setProfileForm}
              handleProfileUpdate={handleProfileUpdate}
              error={error}
              handleLogout={handleLogout}
              to={to}
              setTo={setTo}
              userStatus={userStatus}
              setSelectedGroup={setSelectedGroup}
              selectedGroup={selectedGroup}
              setPage={() => {}}
            />
          )
        } />
        <Route path="/chat" element={
          <ChatPage
            users={users}
            to={to}
            groups={groups}
            selectedGroup={selectedGroup}
            setPage={() => {}}
            startCall={startCall}
            callIncoming={callIncoming}
            answerCall={answerCall}
            endCall={endCall}
            callUserId={callUserId}
            localStream={localStream}
            remoteStream={remoteStream}
            messages={messages}
            user={user}
            messagesEndRef={messagesEndRef}
            handleSend={handleSend}
            content={content}
            setContent={setContent}
            handleFileUpload={handleFileUpload}
            recording={recording}
            startRecording={startRecording}
            stopRecording={stopRecording}
          />
        } />
      </Routes>
    </Router>
  );
}

export default App;
