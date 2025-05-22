/**
 * ===================== IMPORTANT =====================
 * Do NOT run `npm start` in the client folder when using this backend server.
 * Only run `npm run build` in the client folder to generate the React build.
 * Then start the backend (node server.js or npm start in root).
 * The backend will serve the frontend at http://localhost:5000.
 * If you want to use the React dev server (for hot reload),
 * run it on port 3000 and set up a proxy in client/package.json.
 * =====================================================
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const session = require('express-session');
const cors = require('cors');
const { Server } = require('socket.io');
const multer = require('multer');
const path = require('path');
const MongoStore = require('connect-mongo');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    credentials: true
  }
});

// MongoDB connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/messenger')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// User schema
const userSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  password: String,
  displayName: String,
  online: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

// Message schema
const messageSchema = new mongoose.Schema({
  from: String,
  to: String, // for group: groupId, for direct: userId
  content: String,
  timestamp: { type: Date, default: Date.now },
  read: { type: Boolean, default: false },
  fileUrl: String, // for file/image
  voiceUrl: String, // for voice message
  group: { type: Boolean, default: false }
});
const Message = mongoose.model('Message', messageSchema);

// Group schema
const groupSchema = new mongoose.Schema({
  name: String,
  members: [String], // userIds
  createdBy: String,
  createdAt: { type: Date, default: Date.now }
});
const Group = mongoose.model('Group', groupSchema);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS setup for Render (allow same-origin and local dev)
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://tkxs6mj1-3000.inc1.devtunnels.ms',
    'https://tkxs6mj1-5000.inc1.devtunnels.ms',
    process.env.CORS_ORIGIN || undefined // for Render production
  ].filter(Boolean),
  credentials: true
}));

// Use MongoDB for session storage in production
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI || 'mongodb://localhost:27017/messenger',
    collectionName: 'sessions',
    ttl: 24 * 60 * 60 // 1 day
  }),
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// File upload setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Register route
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    console.log('Register attempt:', { email, displayName });
    if (!email || !password || !displayName) {
      console.warn('Register error: Missing fields');
      return res.status(400).json({ error: 'All fields are required' });
    }
    const existing = await User.findOne({ email });
    if (existing) {
      console.warn('Register error: Email already registered:', email);
      return res.status(400).json({ error: 'Email already registered' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ email, password: hashed, displayName });
    req.session.userId = user._id;
    console.log('User registered:', user._id);
    res.json({ _id: user._id, email: user.email, displayName: user.displayName });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// Admin: Create user (for admin portal)
app.post('/api/users', requireAuth, async (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    console.log('Admin create user:', { email, displayName });
    if (!email || !password || !displayName) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ email, password: hashed, displayName });
    res.json({ _id: user._id, email: user.email, displayName: user.displayName });
  } catch (err) {
    console.error('Admin create user error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// Login route
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: 'Invalid credentials' });
    req.session.userId = user._id;
    res.json({ _id: user._id, email: user.email, displayName: user.displayName });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// Logout route
app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

// Auth middleware
function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  next();
}

// Get current user
app.get('/api/user', requireAuth, async (req, res) => {
  const user = await User.findById(req.session.userId);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  res.json(user);
});

// Get all users (for chat list)
app.get('/api/users', requireAuth, async (req, res) => {
  const users = await User.find({ _id: { $ne: req.session.userId } }, 'displayName email _id');
  res.json(users);
});

// Get messages between two users
app.get('/api/messages/:user1/:user2', requireAuth, async (req, res) => {
  const { user1, user2 } = req.params;
  const messages = await Message.find({
    $or: [
      { from: user1, to: user2 },
      { from: user2, to: user1 }
    ]
  }).sort('timestamp');
  res.json(messages);
});

// Profile update route
app.post('/api/profile', requireAuth, async (req, res) => {
  const { displayName, password } = req.body;
  const update = {};
  if (displayName) update.displayName = displayName;
  if (password) update.password = await bcrypt.hash(password, 10);
  const user = await User.findByIdAndUpdate(req.session.userId, update, { new: true });
  res.json(user);
});

// File/image upload route
app.post('/api/upload', requireAuth, upload.single('file'), (req, res) => {
  res.json({ url: `/uploads/${req.file.filename}` });
});

// Voice upload route
app.post('/api/voice', requireAuth, upload.single('voice'), (req, res) => {
  res.json({ url: `/uploads/${req.file.filename}` });
});

// Mark message as read
app.post('/api/messages/:id/read', requireAuth, async (req, res) => {
  const msg = await Message.findByIdAndUpdate(req.params.id, { read: true }, { new: true });
  res.json(msg);
});

// Group chat endpoints
app.post('/api/groups', requireAuth, async (req, res) => {
  const { name, members } = req.body;
  const group = await Group.create({ name, members, createdBy: req.session.userId });
  res.json(group);
});

app.get('/api/groups', requireAuth, async (req, res) => {
  const groups = await Group.find({ members: req.session.userId });
  res.json(groups);
});

// --- API: Delete user by ID ---
app.delete('/api/users/:id', requireAuth, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// --- API: Delete group by ID ---
app.delete('/api/groups/:id', requireAuth, async (req, res) => {
  try {
    await Group.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete group' });
  }
});

// Socket.IO for real-time chat
io.on('connection', (socket) => {
  socket.on('join', (userId) => {
    socket.join(userId);
  });

  socket.on('send_message', async (data) => {
    const { from, to, content } = data;
    const message = await Message.create({ from, to, content });
    io.to(to).to(from).emit('receive_message', message);
  });

  socket.on('user_online', async (userId) => {
    await User.findByIdAndUpdate(userId, { online: true, lastSeen: new Date() });
    socket.broadcast.emit('user_status', { userId, online: true });
  });

  socket.on('user_offline', async (userId) => {
    await User.findByIdAndUpdate(userId, { online: false, lastSeen: new Date() });
    socket.broadcast.emit('user_status', { userId, online: false });
  });

  // --- SOCKET.IO SIGNALING FOR CALLS ---
  socket.on('call_offer', ({ to, offer }) => {
    socket.to(to).emit('call_offer', { from: socket.id, offer });
  });
  socket.on('call_answer', ({ to, answer }) => {
    socket.to(to).emit('call_answer', { answer });
  });
  socket.on('ice_candidate', ({ to, candidate }) => {
    socket.to(to).emit('ice_candidate', { candidate });
  });
});

// Serve React static files (after all API routes)
const clientBuildPath = path.join(__dirname, 'client', 'build');
console.log('Serving React build from:', clientBuildPath);
app.use(express.static(clientBuildPath));
app.get(/^\/((?!api|uploads).)*$/, (req, res) => {
  const indexPath = path.join(clientBuildPath, 'index.html');
  const fs = require('fs');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    console.error('Build not found at:', indexPath);
    res.status(404).send('Build not found. Please run "npm run build" in the client folder and ensure the build output is deployed.');
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
