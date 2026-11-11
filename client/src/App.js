import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';

// Design System & Styles
import './styles/design-system.css';
import './styles/layout.css';
import './styles/components.css';
import './App.css';

// Layout Components
import WorkspaceRail from './components/layout/WorkspaceRail';
import Sidebar from './components/layout/Sidebar';
import InspectorPane from './components/layout/InspectorPane';

// Chat Components
import ChatHeader from './components/chat/ChatHeader';
import MessageTimeline from './components/chat/MessageTimeline';
import SuggestionChips from './components/chat/SuggestionChips';
import TypingIndicator from './components/chat/TypingIndicator';
import RichInputDock from './components/chat/RichInputDock';

// Call & Modal Components
import FloatingCallDock from './components/call/FloatingCallDock';
import IncomingCallToast from './components/call/IncomingCallToast';
import CreateChannelModal from './components/modals/CreateChannelModal';
import UserProfileModal from './components/modals/UserProfileModal';

// Admin Dashboard
import AdminDashboard from './AdminDashboard';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

// Global Resilient Socket.IO Connection
const socket = io(BACKEND_URL, {
  withCredentials: true,
  autoConnect: true,
  transports: ['websocket', 'polling']
});

// Modern Auth View (Sign In & Sign Up)
function AuthScreen({
  authMode,
  setAuthMode,
  loginForm,
  setLoginForm,
  registerForm,
  setRegisterForm,
  handleLogin,
  handleRegister,
  error
}) {
  const handleXIDLogin = () => {
    window.location.href = `${BACKEND_URL}/api/auth/xid/login`;
  };

  return (
    <div className="auth-canvas">
      <div className="auth-card">
        {/* Branding */}
        <div className="auth-branding">
          <div className="auth-logo-badge">
            <img src="/logo192.png" alt="Kuchoo" className="auth-logo-img" />
          </div>
          <h1 className="auth-title">Kuchoo Enterprise</h1>
          <p className="auth-subtitle">Tier-1 Real-time Collaboration Suite for XCorp</p>
        </div>

        {/* Primary SSO Button */}
        <div style={{ width: '100%', marginBottom: 18 }}>
          <button
            type="button"
            className="auth-xid-btn"
            onClick={handleXIDLogin}
          >
            <span style={{ fontSize: 18 }}>⚡</span>
            <span>Sign in with Xcorp ID</span>
          </button>

          <div className="auth-divider-row">
            <span>─── OR CONTINUE WITH LOCAL ID ───</span>
          </div>
        </div>

        {error && <div className="auth-error-banner">{error}</div>}

        {authMode === 'login' ? (
          <form onSubmit={handleLogin} className="auth-form-body">
            <div className="auth-input-group">
              <label className="auth-input-label">Email Address</label>
              <input
                required
                type="email"
                placeholder="name@xcorp.mywire.org"
                className="auth-input-field"
                value={loginForm.email}
                onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>

            <div className="auth-input-group">
              <label className="auth-input-label">Password</label>
              <input
                required
                type="password"
                placeholder="••••••••"
                className="auth-input-field"
                value={loginForm.password}
                onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
              />
            </div>

            <button type="submit" className="auth-submit-btn">
              Sign In
            </button>

            <div className="auth-switch-text">
              Don't have a local account?{' '}
              <button
                type="button"
                className="auth-switch-btn"
                onClick={() => setAuthMode('signup')}
              >
                Create one
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="auth-form-body">
            <div className="auth-input-group">
              <label className="auth-input-label">Full Name</label>
              <input
                required
                placeholder="e.g. Alex Mercer"
                className="auth-input-field"
                value={registerForm.displayName}
                onChange={e => setRegisterForm(f => ({ ...f, displayName: e.target.value }))}
              />
            </div>

            <div className="auth-input-group">
              <label className="auth-input-label">Email Address</label>
              <input
                required
                type="email"
                placeholder="name@xcorp.mywire.org"
                className="auth-input-field"
                value={registerForm.email}
                onChange={e => setRegisterForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>

            <div className="auth-input-group">
              <label className="auth-input-label">Password</label>
              <input
                required
                type="password"
                placeholder="••••••••"
                className="auth-input-field"
                value={registerForm.password}
                onChange={e => setRegisterForm(f => ({ ...f, password: e.target.value }))}
              />
            </div>

            <button type="submit" className="auth-submit-btn">
              Create Account
            </button>

            <div className="auth-switch-text">
              Already have an account?{' '}
              <button
                type="button"
                className="auth-switch-btn"
                onClick={() => setAuthMode('login')}
              >
                Sign In
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// Main Continuous 3-Pane Workspace
function Workspace({
  user,
  users,
  groups,
  activeTarget,
  setActiveTarget,
  messages,
  content,
  setContent,
  handleSend,
  handleFileUpload,
  recording,
  startRecording,
  stopRecording,
  userStatus,
  handleCreateGroup,
  handleProfileUpdate,
  handleLogout,
  startCall,
  callIncoming,
  answerCall,
  endCall,
  callUserId,
  localStream,
  remoteStream,
  messagesEndRef
}) {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState('chats');
  const [inspectorOpen, setInspectorOpen] = useState(window.innerWidth > 1024);
  const [createChannelOpen, setCreateChannelOpen] = useState(false);
  const [userProfileOpen, setUserProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const isAdmin = Boolean(user?.isAdmin || (user?.roles && (user.roles.includes('admin') || user.roles.includes('xadmin'))));

  // Automatically select first channel or user if none selected
  useEffect(() => {
    if (!activeTarget) {
      if (groups && groups.length > 0) {
        setActiveTarget({ type: 'group', id: groups[0]._id, name: groups[0].name, group: groups[0] });
      } else if (users && users.length > 0) {
        const firstUser = users.find(u => u._id !== user._id);
        if (firstUser) {
          setActiveTarget({ type: 'user', id: firstUser._id, name: firstUser.displayName, user: firstUser });
        }
      }
    }
  }, [groups, users, activeTarget, setActiveTarget, user]);

  const handleSelectAladin = () => {
    setActiveTarget({ type: 'aladin', id: 'aladin', name: 'Aladin AI Copilot' });
  };

  const sharedFiles = messages.filter(m => m.fileUrl);

  return (
    <div className="kuchoo-workspace">
      {/* 1. Workspace Rail (64px) */}
      <WorkspaceRail
        user={user}
        activeView={activeView}
        setActiveView={setActiveView}
        onOpenProfile={() => setUserProfileOpen(true)}
        onOpenAdmin={() => navigate('/admin')}
        isAdmin={isAdmin}
        onSelectAladin={handleSelectAladin}
      />

      {/* 2. Sidebar (280px) */}
      <Sidebar
        user={user}
        users={users}
        groups={groups}
        activeTarget={activeTarget}
        onSelectTarget={target => setActiveTarget(target)}
        userStatus={userStatus}
        onOpenCreateGroup={() => setCreateChannelOpen(true)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* 3. Main Center Stage (ChatCanvas) */}
      <main className="workspace-canvas" role="region" aria-label="Conversation Stage">
        {activeTarget && (
          <ChatHeader
            activeTarget={activeTarget}
            userStatus={userStatus}
            onStartAudioCall={userId => startCall(userId, false)}
            onStartVideoCall={userId => startCall(userId, true)}
            onToggleInspector={() => setInspectorOpen(v => !v)}
            inspectorOpen={inspectorOpen}
          />
        )}

        {/* Suggestion Chips */}
        {activeTarget?.type === 'aladin' && (
          <SuggestionChips onSelectChip={prompt => setContent(prompt)} />
        )}

        {/* Message Stream */}
        <MessageTimeline
          messages={messages}
          currentUserId={user?._id}
          allUsers={users}
          messagesEndRef={messagesEndRef}
          activeTarget={activeTarget}
        />

        {/* Typing Indicator */}
        <TypingIndicator />

        {/* Rich Input Composer Dock */}
        <RichInputDock
          content={content}
          setContent={setContent}
          onSend={handleSend}
          onFileUpload={handleFileUpload}
          recording={recording}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
          onTriggerAladin={() => setContent(c => c ? `${c} @aladin ` : '@aladin ')}
        />
      </main>

      {/* 4. Collapsible Inspector Pane (280px) */}
      {inspectorOpen && activeTarget && (
        <InspectorPane
          activeTarget={activeTarget}
          userStatus={userStatus}
          allUsers={users}
          onClose={() => setInspectorOpen(false)}
          onStartAudioCall={userId => startCall(userId, false)}
          onStartVideoCall={userId => startCall(userId, true)}
          sharedFiles={sharedFiles}
        />
      )}

      {/* 5. Floating Picture-in-Picture Call Dock */}
      {callUserId && (
        <FloatingCallDock
          callUserId={callUserId}
          allUsers={users}
          localStream={localStream}
          remoteStream={remoteStream}
          onEndCall={endCall}
        />
      )}

      {/* 6. Incoming Call Toast */}
      {callIncoming && (
        <IncomingCallToast
          callerId={callIncoming.from}
          allUsers={users}
          onAnswer={answerCall}
          onDecline={endCall}
        />
      )}

      {/* Modals */}
      <CreateChannelModal
        isOpen={createChannelOpen}
        onClose={() => setCreateChannelOpen(false)}
        onCreate={handleCreateGroup}
        users={users.filter(u => u._id !== user._id)}
      />

      <UserProfileModal
        isOpen={userProfileOpen}
        onClose={() => setUserProfileOpen(false)}
        user={user}
        onUpdateProfile={handleProfileUpdate}
        onLogout={handleLogout}
      />
    </div>
  );
}

// Master Application Root
function App() {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeTarget, setActiveTarget] = useState(null); // { type, id, name }
  const [content, setContent] = useState('');
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup'
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ email: '', password: '', displayName: '' });
  const [error, setError] = useState('');
  const [userStatus, setUserStatus] = useState({});
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);

  // WebRTC Call States
  const [callUserId, setCallUserId] = useState(null);
  const [callIncoming, setCallIncoming] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);

  const messagesEndRef = useRef(null);

  const [rtcConfig, setRtcConfig] = useState({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:blitz.xcorp.mywire.org:3478' }
    ]
  });

  // Fetch WebRTC Blitz Configuration
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/webrtc/config`, { credentials: 'include' })
      .then(res => res.json())
      .then(cfg => {
        if (cfg && cfg.iceServers) setRtcConfig(cfg);
      })
      .catch(() => {});
  }, []);

  // Fetch Current User on Mount
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/user`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data && !data.error && data._id) {
          setUser(data);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch Directory & Channels when User Authenticates
  useEffect(() => {
    if (user) {
      fetch(`${BACKEND_URL}/api/users`, { credentials: 'include' })
        .then(res => res.json())
        .then(data => { if (Array.isArray(data)) setUsers(data); })
        .catch(() => {});

      fetch(`${BACKEND_URL}/api/groups`, { credentials: 'include' })
        .then(res => res.json())
        .then(data => { if (Array.isArray(data)) setGroups(data); })
        .catch(() => {});

      socket.emit('user_online', user._id);
    }
    return () => {
      if (user) socket.emit('user_offline', user._id);
    };
  }, [user]);

  // Load Messages When Active Target Changes
  useEffect(() => {
    if (user && activeTarget) {
      const targetId = activeTarget.id;
      // If target is Aladin copilot, use 'aladin' as target
      fetch(`${BACKEND_URL}/api/messages/${user._id}/${targetId}`, { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setMessages(data);
        })
        .catch(() => {});

      // Join room for this target (user ID or group ID)
      socket.emit('join', targetId);
      socket.emit('join', user._id);
    }
  }, [user, activeTarget]);

  // Socket.IO Listeners
  useEffect(() => {
    const handleReceiveMessage = (msg) => {
      // Append if relevant to current view
      setMessages(prev => [...prev, msg]);
    };

    const handleUserStatus = ({ userId, online }) => {
      setUserStatus(prev => ({ ...prev, [userId]: online }));
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('user_status', handleUserStatus);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('user_status', handleUserStatus);
    };
  }, []);

  // Auto-scroll timeline on new message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // WebRTC Call Listeners
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

  // Send Message Handler
  const handleSend = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!content.trim() || !activeTarget || !user) return;
    const toId = activeTarget.id;
    socket.emit('send_message', {
      from: user._id,
      to: toId,
      content: content.trim()
    });
    setContent('');
  };

  // Auth Handlers
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

  const handleLogout = async () => {
    await fetch(`${BACKEND_URL}/api/logout`, {
      method: 'POST',
      credentials: 'include'
    });
    setUser(null);
    setActiveTarget(null);
    setMessages([]);
  };

  const handleProfileUpdate = async ({ displayName, password }) => {
    const res = await fetch(`${BACKEND_URL}/api/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ displayName, password })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    setUser(data);
  };

  const handleCreateGroup = async ({ name, members }) => {
    const res = await fetch(`${BACKEND_URL}/api/groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name, members })
    });
    const newGroup = await res.json();
    setGroups(prev => [...prev, newGroup]);
    setActiveTarget({ type: 'group', id: newGroup._id, name: newGroup.name, group: newGroup });
  };

  const handleFileUpload = async (e) => {
    if (!e.target.files || !e.target.files[0] || !activeTarget || !user) return;
    const formData = new FormData();
    formData.append('file', e.target.files[0]);
    const res = await fetch(`${BACKEND_URL}/api/upload`, {
      method: 'POST',
      credentials: 'include',
      body: formData
    });
    const data = await res.json();
    if (data.url) {
      socket.emit('send_message', {
        from: user._id,
        to: activeTarget.id,
        content: '',
        fileUrl: data.url
      });
    }
  };

  const handleVoiceUpload = async (blob) => {
    if (!activeTarget || !user) return;
    const formData = new FormData();
    formData.append('voice', blob);
    const res = await fetch(`${BACKEND_URL}/api/voice`, {
      method: 'POST',
      credentials: 'include',
      body: formData
    });
    const data = await res.json();
    if (data.url) {
      socket.emit('send_message', {
        from: user._id,
        to: activeTarget.id,
        content: '',
        voiceUrl: data.url
      });
    }
  };

  const startRecording = async () => {
    try {
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
    } catch (err) {
      console.warn('Microphone permission not granted:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && recording) {
      mediaRecorder.stop();
    }
  };

  // WebRTC Call Initiation
  const startCall = async (targetUserId, withVideo = true) => {
    try {
      setCallUserId(targetUserId);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: withVideo });
      setLocalStream(stream);
      const pc = new window.RTCPeerConnection(rtcConfig);
      setPeerConnection(pc);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.onicecandidate = (e) => {
        if (e.candidate) socket.emit('ice_candidate', { to: targetUserId, candidate: e.candidate });
      };
      pc.ontrack = (e) => {
        setRemoteStream(e.streams[0]);
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('call_offer', { to: targetUserId, offer });
    } catch (err) {
      console.error('Call initiation error:', err);
    }
  };

  const answerCall = async () => {
    if (!callIncoming) return;
    try {
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
    } catch (err) {
      console.error('Answer call error:', err);
    }
  };

  const endCall = () => {
    if (peerConnection) peerConnection.close();
    if (localStream) localStream.getTracks().forEach(t => t.stop());
    setPeerConnection(null);
    setLocalStream(null);
    setRemoteStream(null);
    setCallUserId(null);
    setCallIncoming(null);
  };

  return (
    <Router>
      <Routes>
        <Route path="/admin" element={<AdminDashboard user={user} />} />
        <Route
          path="*"
          element={
            !user ? (
              <AuthScreen
                authMode={authMode}
                setAuthMode={setAuthMode}
                loginForm={loginForm}
                setLoginForm={setLoginForm}
                registerForm={registerForm}
                setRegisterForm={setRegisterForm}
                handleLogin={handleLogin}
                handleRegister={handleRegister}
                error={error}
              />
            ) : (
              <Workspace
                user={user}
                users={users}
                groups={groups}
                activeTarget={activeTarget}
                setActiveTarget={setActiveTarget}
                messages={messages}
                content={content}
                setContent={setContent}
                handleSend={handleSend}
                handleFileUpload={handleFileUpload}
                recording={recording}
                startRecording={startRecording}
                stopRecording={stopRecording}
                userStatus={userStatus}
                handleCreateGroup={handleCreateGroup}
                handleProfileUpdate={handleProfileUpdate}
                handleLogout={handleLogout}
                startCall={startCall}
                callIncoming={callIncoming}
                answerCall={answerCall}
                endCall={endCall}
                callUserId={callUserId}
                localStream={localStream}
                remoteStream={remoteStream}
                messagesEndRef={messagesEndRef}
              />
            )
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
