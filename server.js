/**
 * Kuchoo Enterprise Messenger Server
 * Xcorp Suite Integration (XID SSO, Blitz WebRTC, XLLM Aladin Bot, Sentinel Gateway)
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
const fs = require('fs');
const MongoStore = require('connect-mongo');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Load Mongoose models
const User = require('./models/User');
const Group = require('./models/Group');
const Message = require('./models/Message');
const Webhook = require('./models/Webhook');
const AuditLog = require('./models/AuditLog');


const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);

// Configuration & Secrets
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/kuchoo';
const JWT_SECRET = process.env.JWT_SECRET || '16f8c0ef4a5d391b26034086c628469d3f9f497f08163ab9b40137092f2909ef';
const XID_ISSUER = process.env.XID_ISSUER_URL || 'https://xid.xcorp.mywire.org';
const XID_INTERNAL_URL = process.env.XID_INTERNAL_URL || 'http://xcorp-xid:10000';
const XID_CLIENT_ID = process.env.XID_CLIENT_ID || 'c8a412f9-kuchoo-chat-client';
const XID_CLIENT_SECRET = process.env.XID_CLIENT_SECRET || 'xid_chat_pRKluChwBN99BI';
const XDB_TOKEN = process.env.XDB_TOKEN || 'super_secret_test_key';
const XLLM_URL = process.env.XLLM_BASE_URL || 'http://xcorp-xllm:10000';
const XLLM_API_KEY = process.env.XLLM_API_KEY || 'xllm_9bab7d8d917d41638ba35e2026ffe9ab0429d10517a444e7bfd0f458eb2bb8e8';

// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err.message));

// Configure Socket.IO
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => callback(null, true),
    credentials: true
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Allowed CORS origins for XCorp Suite
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  'https://kuchoo.xcorp.mywire.org',
  'https://kuchoo.xcorp.ddnsfree.com',
  'https://kuchoo.xcorp.freeddns.org',
  'https://kuchoo.xcorp.kozow.com',
  'https://chat.xcorp.mywire.org',
  'https://chat.xcorp.ddnsfree.com',
  'https://chat.xcorp.freeddns.org',
  'https://chat.xcorp.kozow.com',
  'https://xcorp.mywire.org',
  'https://xid.xcorp.mywire.org',
  'https://sentinel.xcorp.mywire.org',
  'https://blitz.xcorp.mywire.org',
  process.env.CORS_ORIGIN
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.xcorp.mywire.org') || origin.endsWith('.ddnsfree.com')) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true
}));

// Session storage backed by MongoDB
app.use(session({
  secret: process.env.SESSION_SECRET || 'kuchoo-xcorp-secret-2026',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: MONGO_URI,
    collectionName: 'sessions',
    ttl: 7 * 24 * 60 * 60 // 7 days
  }),
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`)
});
const upload = multer({ storage });

// Serve static uploads
app.use('/uploads', express.static(uploadDir));

// ==========================================
// User Resolution & Auto-Provisioning Helper
// ==========================================
async function findOrCreateXIDUser({ xidId, email, displayName, roles = ['user'], isAdmin = false, avatarUrl = '' }) {
  let user = null;
  if (xidId) {
    user = await User.findOne({ xidId });
  }
  if (!user && email) {
    user = await User.findOne({ email });
    if (user && xidId && !user.xidId) {
      user.xidId = xidId;
      if (displayName) user.displayName = displayName;
      if (avatarUrl) user.avatarUrl = avatarUrl;
      if (roles && roles.length) user.roles = roles;
      if (isAdmin !== undefined) user.isAdmin = isAdmin;
      await user.save();
    }
  }
  if (!user) {
    user = await User.create({
      email: email || `${xidId || Date.now()}@xcorp.mywire.org`,
      displayName: displayName || (email ? email.split('@')[0] : 'XCorp User'),
      xidId: xidId || undefined,
      avatarUrl: avatarUrl || '',
      roles: roles || ['user'],
      isAdmin: isAdmin || roles.includes('admin') || roles.includes('xadmin'),
      online: true,
      lastSeen: new Date()
    });
  } else {
    let changed = false;
    if (isAdmin && !user.isAdmin) { user.isAdmin = true; changed = true; }
    if (roles.includes('admin') && !user.roles.includes('admin')) { user.roles.push('admin'); changed = true; }
    if (roles.includes('xadmin') && !user.roles.includes('xadmin')) { user.roles.push('xadmin'); changed = true; }
    if (changed) await user.save();
  }
  return user;
}

// ==========================================
// Authentication & Authorization Middleware
// ==========================================
async function requireAuth(req, res, next) {
  try {
    // 1. Check Sentinel Gateway / Ingress trusted headers
    const sentinelUser = req.headers['x-auth-user'];
    if (sentinelUser) {
      const rolesHeader = req.headers['x-auth-roles'] || 'user';
      const roles = rolesHeader.split(',').map(r => r.trim());
      const isAdmin = req.headers['x-auth-xadmin'] === 'true' || roles.includes('admin') || roles.includes('xadmin');
      const user = await findOrCreateXIDUser({
        xidId: sentinelUser,
        email: sentinelUser.includes('@') ? sentinelUser : `${sentinelUser}@xcorp.mywire.org`,
        displayName: sentinelUser.split('@')[0],
        roles,
        isAdmin
      });
      req.user = user;
      req.session.userId = user._id;
      return next();
    }

    // 2. Check Bearer Token
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      if (token === XDB_TOKEN) {
        let sysUser = await User.findOne({ email: 'system@xcorp.internal' });
        if (!sysUser) {
          sysUser = await User.create({
            email: 'system@xcorp.internal',
            displayName: 'Xcorp System',
            isAdmin: true,
            roles: ['admin', 'xadmin']
          });
        }
        req.user = sysUser;
        req.session.userId = sysUser._id;
        return next();
      }

      // Try JWT verification
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await findOrCreateXIDUser({
          xidId: decoded.sub || decoded.id,
          email: decoded.email,
          displayName: decoded.name || decoded.displayName || (decoded.email ? decoded.email.split('@')[0] : 'XCorp User'),
          roles: decoded.roles || ['user'],
          isAdmin: decoded.isAdmin || (decoded.roles && (decoded.roles.includes('admin') || decoded.roles.includes('xadmin')))
        });
        req.user = user;
        req.session.userId = user._id;
        return next();
      } catch (jwtErr) {
        const raw = jwt.decode(token);
        if (raw && (raw.sub || raw.email)) {
          const user = await findOrCreateXIDUser({
            xidId: raw.sub || raw.id,
            email: raw.email,
            displayName: raw.name || raw.displayName || (raw.email ? raw.email.split('@')[0] : 'XCorp User'),
            roles: raw.roles || ['user'],
            isAdmin: raw.isAdmin || (raw.roles && (raw.roles.includes('admin') || raw.roles.includes('xadmin')))
          });
          req.user = user;
          req.session.userId = user._id;
          return next();
        }
      }
    }

    // 3. Check Session Cookie
    if (req.session && req.session.userId) {
      const user = await User.findById(req.session.userId);
      if (user) {
        req.user = user;
        return next();
      }
    }

    return res.status(401).json({ error: 'Not authenticated' });
  } catch (err) {
    console.error('requireAuth error:', err);
    return res.status(500).json({ error: 'Internal auth error' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  const isAdmin = req.user.isAdmin || (req.user.roles && (req.user.roles.includes('admin') || req.user.roles.includes('xadmin')));
  if (!isAdmin) return res.status(403).json({ error: 'Forbidden: Admin access required' });
  next();
}

// ==========================================
// Health & Diagnostic Endpoints
// ==========================================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'xcorp-kuchoo',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// WebRTC Blitz ICE Relay configuration
app.get('/api/webrtc/config', (req, res) => {
  res.json({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:blitz.xcorp.mywire.org:3478' }
    ]
  });
});

// ==========================================
// XID SSO OAuth2 & OpenID Connect Endpoints (PKCE S256 & Dual Ingestion)
// ==========================================
// Bounded in-memory PKCE state cache for cross-origin SSO resilience (10-minute TTL)
const pkceStateCache = new Map();
const PKCE_STATE_TTL_MS = 10 * 60 * 1000;

function cleanPkceStateCache() {
  const now = Date.now();
  for (const [key, val] of pkceStateCache.entries()) {
    if (now - val.createdAt > PKCE_STATE_TTL_MS) {
      pkceStateCache.delete(key);
    }
  }
}

app.get('/api/auth/xid/login', (req, res) => {
  cleanPkceStateCache();
  const host = req.get('host') || 'chat.xcorp.mywire.org';
  const proto = req.get('x-forwarded-proto') || (req.secure ? 'https' : 'http');
  const redirectUri = `${proto}://${host}/api/auth/xid/callback`;

  // Generate cryptographically secure state, nonce, and PKCE S256 parameters
  const state = crypto.randomBytes(16).toString('hex');
  const nonce = crypto.randomBytes(16).toString('hex');
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

  // Store in session and fallback cache
  if (req.session) {
    req.session.xidState = state;
    req.session.xidNonce = nonce;
    req.session.xidVerifier = codeVerifier;
  }
  pkceStateCache.set(state, { verifier: codeVerifier, nonce, createdAt: Date.now() });

  const params = new URLSearchParams({
    client_id: XID_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid profile email',
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256'
  });

  const authUrl = `${XID_ISSUER}/oauth/authorize?${params.toString()}`;

  if (req.session) {
    req.session.save((err) => {
      if (err) console.error('[XID SSO] Error saving session before redirect:', err);
      res.redirect(authUrl);
    });
  } else {
    res.redirect(authUrl);
  }
});

app.get('/api/auth/xid/callback', async (req, res) => {
  cleanPkceStateCache();
  const { code, token, auth_token, access_token, state, error, error_description } = req.query;
  const host = req.get('host') || 'chat.xcorp.mywire.org';
  const proto = req.get('x-forwarded-proto') || (req.secure ? 'https' : 'http');
  const redirectUri = `${proto}://${host}/api/auth/xid/callback`;

  if (error) {
    console.error(`[XID SSO] Provider error: ${error} - ${error_description || ''}`);
    return res.redirect(`/?error=${encodeURIComponent(error)}&detail=${encodeURIComponent(error_description || '')}`);
  }

  if (!code && !token && !auth_token && !access_token) {
    console.warn('[XID SSO] Callback received with neither code nor token. Query:', req.query);
    return res.redirect('/?error=missing_auth_code');
  }

  try {
    // Helper to provision user and commit session
    const completeAuthentication = async (profile) => {
      const user = await findOrCreateXIDUser({
        xidId: profile.sub || profile.id,
        email: profile.email,
        displayName: profile.name || profile.displayName || profile.preferred_username || (profile.email ? profile.email.split('@')[0] : 'XCorp User'),
        avatarUrl: profile.avatarUrl || profile.picture || profile.avatar || '',
        roles: profile.roles || ['user'],
        isAdmin: (profile.roles && (profile.roles.includes('admin') || profile.roles.includes('xadmin'))) || profile.isAdmin === true
      });
      req.session.userId = user._id;
      return new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error('[XID SSO] Failed to save session:', err);
            return reject(err);
          }
          resolve(user);
        });
      });
    };

    // Branch 1: Direct Token Ingestion (Fallback / Pre-authenticated SSO from XID)
    const directToken = token || auth_token || access_token;
    if (directToken && !code) {
      console.log('[XID SSO] Resolving user via direct token parameter');
      const userinfoEndpoints = [
        `${XID_INTERNAL_URL}/oauth2/userinfo`,
        `${XID_ISSUER}/oauth2/userinfo`,
        `${XID_INTERNAL_URL}/oauth/userinfo`,
        `${XID_ISSUER}/oauth/userinfo`,
        `${XID_INTERNAL_URL}/api/identity/me`
      ];

      let profile = null;
      for (const endpoint of userinfoEndpoints) {
        try {
          const userRes = await fetch(endpoint, {
            headers: { Authorization: `Bearer ${directToken}` },
            signal: AbortSignal.timeout(4000)
          });
          if (userRes.ok) {
            profile = await userRes.json();
            break;
          }
        } catch (_) {}
      }

      if (!profile) {
        const decoded = jwt.decode(directToken);
        if (decoded && (decoded.email || decoded.sub)) {
          profile = {
            sub: decoded.sub || decoded.id,
            email: decoded.email,
            name: decoded.name || decoded.displayName,
            roles: decoded.roles,
            isAdmin: decoded.isAdmin
          };
        }
      }

      if (profile && (profile.sub || profile.id || profile.email)) {
        if (state) pkceStateCache.delete(state);
        await completeAuthentication(profile);
        return res.redirect('/');
      }
    }

    // Branch 2: Standard OAuth2/OIDC Authorization Code Exchange with PKCE S256
    if (code) {
      let codeVerifier = req.session ? req.session.xidVerifier : null;
      if (!codeVerifier && state && pkceStateCache.has(state)) {
        codeVerifier = pkceStateCache.get(state).verifier;
      }

      const tokenEndpoints = [
        `${XID_INTERNAL_URL}/oauth2/token`,
        `${XID_ISSUER}/oauth2/token`,
        `${XID_INTERNAL_URL}/oauth/token`,
        `${XID_ISSUER}/oauth/token`
      ];

      let tokenData = null;
      const bodyParams = {
        grant_type: 'authorization_code',
        code,
        client_id: XID_CLIENT_ID,
        client_secret: XID_CLIENT_SECRET,
        redirect_uri: redirectUri
      };
      if (codeVerifier) {
        bodyParams.code_verifier = codeVerifier;
      }

      for (const endpoint of tokenEndpoints) {
        try {
          const tokenRes = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(bodyParams),
            signal: AbortSignal.timeout(5000)
          });

          if (tokenRes.ok) {
            tokenData = await tokenRes.json();
            break;
          } else {
            const errText = await tokenRes.text().catch(() => '');
            console.warn(`[XID SSO] Token exchange at ${endpoint} returned status ${tokenRes.status}: ${errText}`);
          }
        } catch (fetchErr) {
          console.warn(`[XID SSO] Failed token exchange at ${endpoint}: ${fetchErr.message}`);
        }
      }

      if (tokenData && (tokenData.access_token || tokenData.id_token)) {
        let profile = null;
        if (tokenData.access_token) {
          const userinfoEndpoints = [
            `${XID_INTERNAL_URL}/oauth2/userinfo`,
            `${XID_ISSUER}/oauth2/userinfo`,
            `${XID_INTERNAL_URL}/oauth/userinfo`,
            `${XID_ISSUER}/oauth/userinfo`,
            `${XID_INTERNAL_URL}/api/identity/me`
          ];
          for (const uEndpoint of userinfoEndpoints) {
            try {
              const userRes = await fetch(uEndpoint, {
                headers: { Authorization: `Bearer ${tokenData.access_token}` },
                signal: AbortSignal.timeout(4000)
              });
              if (userRes.ok) {
                profile = await userRes.json();
                break;
              }
            } catch (_) {}
          }
        }

        if (!profile && tokenData.id_token) {
          const idClaims = jwt.decode(tokenData.id_token);
          if (idClaims && (idClaims.email || idClaims.sub)) {
            profile = {
              sub: idClaims.sub || idClaims.id,
              email: idClaims.email,
              name: idClaims.name || idClaims.displayName,
              roles: idClaims.roles,
              isAdmin: idClaims.isAdmin
            };
          }
        }

        if (profile && (profile.sub || profile.id || profile.email)) {
          if (state) pkceStateCache.delete(state);
          await completeAuthentication(profile);
          return res.redirect('/');
        }
      }

      // Fallback: decode code directly if Sentinel/XID passes signed claims in code
      const decoded = jwt.decode(code);
      if (decoded && (decoded.email || decoded.sub)) {
        if (state) pkceStateCache.delete(state);
        await completeAuthentication({
          sub: decoded.sub || decoded.id,
          email: decoded.email,
          name: decoded.name || decoded.displayName,
          roles: decoded.roles,
          isAdmin: decoded.isAdmin
        });
        return res.redirect('/');
      }
    }

    if (state) pkceStateCache.delete(state);
    return res.redirect('/?error=auth_exchange_failed');
  } catch (err) {
    console.error('[XID SSO] Fatal callback error:', err);
    if (state) pkceStateCache.delete(state);
    return res.redirect('/?error=auth_internal_error');
  }
});

// ==========================================
// Authentication Routes (Local Credentials)
// ==========================================
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    if (!email || !password || !displayName) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ email, password: hashed, displayName });
    req.session.userId = user._id;
    res.json({ _id: user._id, email: user.email, displayName: user.displayName, isAdmin: user.isAdmin });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    if (!user.password) return res.status(400).json({ error: 'Please sign in using Xcorp ID' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: 'Invalid credentials' });
    req.session.userId = user._id;
    res.json({ _id: user._id, email: user.email, displayName: user.displayName, isAdmin: user.isAdmin, roles: user.roles });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

// ==========================================
// User Profile & Directory APIs
// ==========================================
app.get('/api/user', requireAuth, async (req, res) => {
  res.json(req.user);
});

app.get('/api/users', requireAuth, async (req, res) => {
  const users = await User.find({ _id: { $ne: req.user._id } }, 'displayName email _id roles isAdmin online lastSeen');
  res.json(users);
});

app.post('/api/profile', requireAuth, async (req, res) => {
  try {
    const { displayName, password, customStatus, dnd } = req.body;
    const update = {};
    if (displayName) update.displayName = displayName.trim();
    if (password) update.password = await bcrypt.hash(password, 10);
    if (customStatus !== undefined) update.customStatus = customStatus;
    if (dnd !== undefined) update.dnd = Boolean(dnd);

    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true });
    // Broadcast status change to real-time subscribers
    io.emit('user_status_updated', {
      userId: user._id,
      displayName: user.displayName,
      customStatus: user.customStatus,
      dnd: user.dnd
    });
    res.json(user);
  } catch (err) {
    sendProblem(res, 500, 'Internal Server Error', err.message);
  }
});

// Activity Tray: Mentions & Alerts Feed (Slack/Teams parity)
app.get('/api/activity/mentions', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const escapedName = user.displayName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const userGroups = await Group.find({
      $or: [
        { members: user._id },
        { createdBy: user._id }
      ]
    }).select('_id');
    const groupIds = userGroups.map(g => g._id.toString());

    const mentionRegex = new RegExp(`@(${escapedName}|channel|here)`, 'i');

    const query = {
      isDeleted: { $ne: true },
      $or: [
        { to: user._id.toString() }, // direct messages
        { to: { $in: groupIds }, content: { $regex: mentionRegex } },
        { content: { $regex: new RegExp(`@${escapedName}`, 'i') } }
      ]
    };

    const mentions = await Message.find(query)
      .sort({ timestamp: -1 })
      .limit(50);

    res.json(mentions);
  } catch (err) {
    sendProblem(res, 500, 'Internal Server Error', err.message);
  }
});

// ==========================================
// Messaging & Upload APIs
// ==========================================
function sendProblem(res, status, title, detail) {
  return res.status(status).contentType('application/problem+json').json({
    type: 'about:blank',
    title,
    status,
    detail,
    instance: res.req ? res.req.originalUrl : undefined
  });
}

// Enterprise Persistent Audit Logging Helper
async function recordAuditLog(req, action, targetType, targetId, metadata = {}) {
  try {
    const rawIp = req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || '127.0.0.1';
    const ipAddress = Array.isArray(rawIp) ? rawIp[0] : (typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : '127.0.0.1');
    const userId = req?.user?._id || null;
    await AuditLog.create({
      userId,
      action,
      targetType,
      targetId: targetId ? targetId.toString() : null,
      metadata,
      ipAddress
    });
  } catch (err) {
    console.error('AuditLog recording error:', err.message);
  }
}

// Main conversation timeline (excludes nested thread replies for clean Slack/Teams view)
app.get('/api/messages/:user1/:user2', requireAuth, async (req, res) => {
  try {
    const { user1, user2 } = req.params;
    const isGroup = await Group.exists({ _id: user2 }).catch(() => false);

    // Private channel access enforcement
    if (isGroup) {
      const groupDoc = await Group.findById(user2).select('isPrivate isPublic members createdBy allowedRoles');
      if (groupDoc && (groupDoc.isPrivate || groupDoc.isPublic === false)) {
        const userIdStr = req.user._id.toString();
        const hasAccess = req.user.isAdmin ||
          groupDoc.createdBy?.toString() === userIdStr ||
          (Array.isArray(groupDoc.members) && groupDoc.members.some(m => m.toString() === userIdStr));
        if (!hasAccess) {
          return sendProblem(res, 403, 'Forbidden', 'Access denied to private channel.', 'PRIVATE_CHANNEL_RESTRICTED');
        }
      }
    }

    const rootCondition = {
      $or: [{ parentId: null }, { parentId: { $exists: false } }]
    };
    const query = isGroup
      ? { to: user2, ...rootCondition }
      : {
          $and: [
            rootCondition,
            {
              $or: [
                { from: user1, to: user2 },
                { from: user2, to: user1 }
              ]
            }
          ]
        };
    const messages = await Message.find(query).sort('timestamp');
    res.json(messages);
  } catch (err) {
    sendProblem(res, 500, 'Internal Server Error', err.message);
  }
});

// Thread replies API (Slack/Teams side-panel parity)
app.get('/api/messages/:id/threads', requireAuth, async (req, res) => {
  try {
    const parent = await Message.findById(req.params.id);
    if (!parent) return sendProblem(res, 404, 'Not Found', 'Parent message not found');
    const replies = await Message.find({ parentId: req.params.id }).sort('timestamp');
    res.json({ parent, replies });
  } catch (err) {
    sendProblem(res, 500, 'Internal Server Error', err.message);
  }
});

app.post('/api/messages/:id/threads', requireAuth, async (req, res) => {
  try {
    const { content, fileUrl, voiceUrl } = req.body;
    if (!content && !fileUrl && !voiceUrl) {
      return sendProblem(res, 400, 'Bad Request', 'Reply content or attachment is required');
    }
    const parent = await Message.findById(req.params.id);
    if (!parent) return sendProblem(res, 404, 'Not Found', 'Parent message not found');

    const reply = await Message.create({
      from: req.user._id.toString(),
      to: parent.to,
      content: content || '',
      fileUrl: fileUrl || null,
      voiceUrl: voiceUrl || null,
      parentId: parent._id,
      group: parent.group
    });

    parent.replyCount = (parent.replyCount || 0) + 1;
    parent.lastReplyAt = new Date();
    await parent.save();

    io.to(parent.to).to(req.user._id.toString()).emit('thread_reply', { parentId: parent._id, reply });
    io.to(parent.to).to(req.user._id.toString()).emit('message_updated', parent);

    if (content && (content.toLowerCase().startsWith('@aladin') || content.toLowerCase().includes('@aladin'))) {
      handleAladinBotReply(parent.to, content, req.user._id.toString(), parent._id);
    }

    res.status(201).json(reply);
  } catch (err) {
    sendProblem(res, 500, 'Internal Server Error', err.message);
  }
});

// Emoji reaction toggle endpoint
app.post('/api/messages/:id/reactions', requireAuth, async (req, res) => {
  try {
    const { emoji } = req.body;
    if (!emoji || typeof emoji !== 'string') {
      return sendProblem(res, 400, 'Bad Request', 'Emoji symbol is required');
    }
    const message = await Message.findById(req.params.id);
    if (!message) return sendProblem(res, 404, 'Not Found', 'Message not found');

    const userId = req.user._id.toString();
    if (!Array.isArray(message.reactions)) message.reactions = [];
    const existing = message.reactions.find(r => r.emoji === emoji);

    if (existing) {
      const idx = existing.users.indexOf(userId);
      if (idx > -1) {
        existing.users.splice(idx, 1);
        if (existing.users.length === 0) {
          message.reactions = message.reactions.filter(r => r.emoji !== emoji);
        }
      } else {
        existing.users.push(userId);
      }
    } else {
      message.reactions.push({ emoji, users: [userId] });
    }

    await message.save();
    io.to(message.to).to(message.from).emit('message_reaction', {
      messageId: message._id,
      reactions: message.reactions
    });
    res.json({ messageId: message._id, reactions: message.reactions });
  } catch (err) {
    sendProblem(res, 500, 'Internal Server Error', err.message);
  }
});

// Message Edit endpoint
app.patch('/api/messages/:id', requireAuth, async (req, res) => {
  try {
    const { content } = req.body;
    if (typeof content !== 'string' || !content.trim()) {
      return sendProblem(res, 400, 'Bad Request', 'Valid content string required');
    }
    const message = await Message.findById(req.params.id);
    if (!message) return sendProblem(res, 404, 'Not Found', 'Message not found');

    const isAuthor = message.from === req.user._id.toString();
    const isAdmin = req.user.isAdmin || req.user.roles?.includes('admin');
    if (!isAuthor && !isAdmin) {
      return sendProblem(res, 403, 'Forbidden', 'Not authorized to edit this message');
    }

    message.content = content.trim();
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    await recordAuditLog(req, 'MESSAGE_EDITED', 'Message', message._id, { to: message.to });

    io.to(message.to).to(message.from).emit('message_updated', message);
    res.json(message);
  } catch (err) {
    sendProblem(res, 500, 'Internal Server Error', err.message);
  }
});

// Message Soft-Delete endpoint (preserves audit integrity)
app.delete('/api/messages/:id', requireAuth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return sendProblem(res, 404, 'Not Found', 'Message not found');

    const isAuthor = message.from === req.user._id.toString();
    const isAdmin = req.user.isAdmin || req.user.roles?.includes('admin');
    if (!isAuthor && !isAdmin) {
      return sendProblem(res, 403, 'Forbidden', 'Not authorized to delete this message');
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    message.content = 'This message was deleted';
    message.fileUrl = null;
    message.voiceUrl = null;
    await message.save();

    await recordAuditLog(req, 'MESSAGE_DELETED', 'Message', message._id, { to: message.to });

    io.to(message.to).to(message.from).emit('message_deleted', {
      messageId: message._id,
      to: message.to,
      isDeleted: true
    });
    res.json({ success: true, messageId: message._id });
  } catch (err) {
    sendProblem(res, 500, 'Internal Server Error', err.message);
  }
});

// Pinned Message toggle endpoint
app.post('/api/messages/:id/pin', requireAuth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return sendProblem(res, 404, 'Not Found', 'Message not found');

    message.isPinned = !message.isPinned;
    if (message.isPinned) {
      message.pinnedBy = req.user.displayName || req.user.email;
      message.pinnedAt = new Date();
    } else {
      message.pinnedBy = null;
      message.pinnedAt = null;
    }
    await message.save();

    io.to(message.to).to(message.from).emit('message_pinned', {
      messageId: message._id,
      isPinned: message.isPinned,
      pinnedBy: message.pinnedBy,
      pinnedAt: message.pinnedAt
    });
    res.json(message);
  } catch (err) {
    sendProblem(res, 500, 'Internal Server Error', err.message);
  }
});

// Fetch Pinned Messages for conversation
app.get('/api/pins/:targetId', requireAuth, async (req, res) => {
  try {
    const pins = await Message.find({
      to: req.params.targetId,
      isPinned: true,
      isDeleted: { $ne: true }
    }).sort({ pinnedAt: -1 });
    res.json(pins);
  } catch (err) {
    sendProblem(res, 500, 'Internal Server Error', err.message);
  }
});

// Universal Full-Text Search endpoint (Slack/Teams parity)
app.get('/api/search', requireAuth, async (req, res) => {
  try {
    const { q, targetId } = req.query;
    if (!q || typeof q !== 'string' || !q.trim()) {
      return res.json([]);
    }
    const cleanQuery = q.trim();
    const filter = {
      isDeleted: { $ne: true },
      $or: [
        { content: { $regex: cleanQuery, $options: 'i' } },
        { fileUrl: { $regex: cleanQuery, $options: 'i' } }
      ]
    };
    if (targetId) filter.to = targetId;

    const matches = await Message.find(filter)
      .sort({ timestamp: -1 })
      .limit(30);
    res.json(matches);
  } catch (err) {
    sendProblem(res, 500, 'Internal Server Error', err.message);
  }
});

app.post('/api/upload', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) return sendProblem(res, 400, 'Bad Request', 'No file uploaded');
  res.json({ url: `/uploads/${req.file.filename}` });
});

app.post('/api/voice', requireAuth, upload.single('voice'), (req, res) => {
  if (!req.file) return sendProblem(res, 400, 'Bad Request', 'No audio recorded');
  res.json({ url: `/uploads/${req.file.filename}` });
});

app.post('/api/messages/:id/read', requireAuth, async (req, res) => {
  const msg = await Message.findByIdAndUpdate(req.params.id, { read: true }, { new: true });
  res.json(msg);
});

// ==========================================
// Group & Channel APIs (Slack/Teams Parity)
// ==========================================
app.post('/api/groups', requireAuth, async (req, res) => {
  try {
    const { name, topic = '', description = '', isPrivate = false, members = [] } = req.body;
    if (!name || !name.trim()) {
      return sendProblem(res, 400, 'Bad Request', 'Channel name is required', 'MISSING_CHANNEL_NAME');
    }
    const memberSet = new Set(members.map(m => m.toString()));
    memberSet.add(req.user._id.toString());
    const group = await Group.create({
      name: name.trim().toLowerCase().replace(/\s+/g, '-'),
      topic: topic.trim(),
      description: description.trim(),
      isPrivate: Boolean(isPrivate),
      isPublic: !Boolean(isPrivate),
      members: Array.from(memberSet),
      moderators: [req.user._id],
      createdBy: req.user._id
    });
    await recordAuditLog(req, 'CHANNEL_CREATED', 'Group', group._id, { name: group.name, isPrivate: group.isPrivate });
    res.json(group);
  } catch (err) {
    sendProblem(res, 500, 'Internal Server Error', err.message);
  }
});

app.get('/api/groups', requireAuth, async (req, res) => {
  try {
    const query = req.user.isAdmin
      ? {}
      : {
          $or: [
            { isPrivate: false },
            { isPublic: true },
            { members: req.user._id },
            { createdBy: req.user._id }
          ]
        };
    const groups = await Group.find(query).populate('members', 'displayName email avatar').sort('name');
    res.json(groups);
  } catch (err) {
    sendProblem(res, 500, 'Internal Server Error', err.message);
  }
});

app.patch('/api/groups/:id', requireAuth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return sendProblem(res, 404, 'Not Found', 'Channel not found', 'CHANNEL_NOT_FOUND');

    const userIdStr = req.user._id.toString();
    const isMod = req.user.isAdmin ||
      group.createdBy?.toString() === userIdStr ||
      (Array.isArray(group.moderators) && group.moderators.some(m => m.toString() === userIdStr));

    if (!isMod) {
      return sendProblem(res, 403, 'Forbidden', 'Only moderators or channel creator can modify channel settings', 'NOT_MODERATOR');
    }

    const { name, topic, description, isPrivate } = req.body;
    if (name !== undefined) group.name = name.trim().toLowerCase().replace(/\s+/g, '-');
    if (topic !== undefined) group.topic = topic.trim();
    if (description !== undefined) group.description = description.trim();
    if (isPrivate !== undefined) {
      group.isPrivate = Boolean(isPrivate);
      group.isPublic = !Boolean(isPrivate);
    }

    await group.save();
    await recordAuditLog(req, 'CHANNEL_UPDATED', 'Group', group._id, { name: group.name, topic: group.topic, isPrivate: group.isPrivate });
    res.json(group);
  } catch (err) {
    sendProblem(res, 500, 'Internal Server Error', err.message);
  }
});

app.post('/api/groups/:id/members', requireAuth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return sendProblem(res, 404, 'Not Found', 'Channel not found', 'CHANNEL_NOT_FOUND');

    const userIdStr = req.user._id.toString();
    const isPrivateChannel = group.isPrivate || group.isPublic === false;
    if (isPrivateChannel) {
      const isMod = req.user.isAdmin ||
        group.createdBy?.toString() === userIdStr ||
        (Array.isArray(group.moderators) && group.moderators.some(m => m.toString() === userIdStr));
      if (!isMod) {
        return sendProblem(res, 403, 'Forbidden', 'Only moderators can invite members to private channels', 'NOT_MODERATOR');
      }
    }

    const { userId } = req.body;
    if (!userId) return sendProblem(res, 400, 'Bad Request', 'userId is required', 'MISSING_USER_ID');

    if (!group.members.some(m => m.toString() === userId.toString())) {
      group.members.push(userId);
      await group.save();
      await recordAuditLog(req, 'MEMBER_JOINED', 'Group', group._id, { addedUserId: userId });
    }
    const updated = await Group.findById(group._id).populate('members', 'displayName email avatar');
    res.json(updated);
  } catch (err) {
    sendProblem(res, 500, 'Internal Server Error', err.message);
  }
});

app.delete('/api/groups/:id/members/:userId', requireAuth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return sendProblem(res, 404, 'Not Found', 'Channel not found', 'CHANNEL_NOT_FOUND');

    const currentUserIdStr = req.user._id.toString();
    const targetUserIdStr = req.params.userId.toString();

    const isSelf = currentUserIdStr === targetUserIdStr;
    const isMod = req.user.isAdmin ||
      group.createdBy?.toString() === currentUserIdStr ||
      (Array.isArray(group.moderators) && group.moderators.some(m => m.toString() === currentUserIdStr));

    if (!isSelf && !isMod) {
      return sendProblem(res, 403, 'Forbidden', 'Insufficient permissions to remove member', 'NOT_AUTHORIZED');
    }

    group.members = group.members.filter(m => m.toString() !== targetUserIdStr);
    group.moderators = group.moderators.filter(m => m.toString() !== targetUserIdStr);
    await group.save();
    await recordAuditLog(req, 'MEMBER_KICKED', 'Group', group._id, { removedUserId: targetUserIdStr });
    res.json({ success: true, groupId: group._id, removedUserId: targetUserIdStr });
  } catch (err) {
    sendProblem(res, 500, 'Internal Server Error', err.message);
  }
});

// ==========================================
// Admin APIs (Protected by requireAdmin)
// ==========================================
app.post('/api/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { email, password, displayName, roles, isAdmin } = req.body;
    if (!email || !displayName) {
      return res.status(400).json({ error: 'Email and displayName required' });
    }
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already registered' });
    const hashed = password ? await bcrypt.hash(password, 10) : undefined;
    const user = await User.create({ email, password: hashed, displayName, roles: roles || ['user'], isAdmin: Boolean(isAdmin) });
    await recordAuditLog(req, 'USER_CREATED', 'User', user._id, { email: user.email, roles: user.roles });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create user', details: err.message });
  }
});

app.delete('/api/users/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (deletedUser) {
      await recordAuditLog(req, 'USER_DELETED', 'User', req.params.id, { email: deletedUser.email });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

app.delete('/api/groups/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const deletedGroup = await Group.findByIdAndDelete(req.params.id);
    if (deletedGroup) {
      await recordAuditLog(req, 'CHANNEL_DELETED', 'Group', req.params.id, { name: deletedGroup.name });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete group' });
  }
});

app.patch('/api/users/:id/roles', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { roles, isAdmin } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return sendProblem(res, 404, 'Not Found', 'User not found');
    if (Array.isArray(roles)) user.roles = roles;
    if (isAdmin !== undefined) user.isAdmin = Boolean(isAdmin);
    await user.save();
    await recordAuditLog(req, 'ROLE_CHANGED', 'User', user._id, { roles: user.roles, isAdmin: user.isAdmin });
    res.json({ success: true, user: { _id: user._id, email: user.email, roles: user.roles, isAdmin: user.isAdmin } });
  } catch (err) {
    sendProblem(res, 500, 'Internal Server Error', err.message);
  }
});

// Production Keyset / Cursor Paginated Audit Log Endpoint
app.get('/api/admin/audit-logs', requireAuth, requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 25, 100);
    const { cursor, action } = req.query;

    const query = {};
    if (action) {
      query.action = action;
    }
    if (cursor) {
      query.timestamp = { $lt: new Date(cursor) };
    }

    const logs = await AuditLog.find(query)
      .sort({ timestamp: -1, _id: -1 })
      .limit(limit + 1)
      .populate('userId', 'displayName email')
      .lean();

    const hasMore = logs.length > limit;
    const items = hasMore ? logs.slice(0, limit) : logs;
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].timestamp.toISOString() : null;

    res.json({
      items,
      nextCursor,
      hasMore
    });
  } catch (err) {
    sendProblem(res, 500, 'Internal Server Error', err.message);
  }
});

// ==========================================
// Webhook & Integration Endpoints (Slack/Teams Parity)
// ==========================================
app.post('/api/channels/:id/webhooks', requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return sendProblem(res, 400, 'Bad Request', 'Webhook name is required');
    }
    const group = await Group.findById(req.params.id);
    if (!group) {
      return sendProblem(res, 404, 'Not Found', 'Channel not found');
    }
    const userIdStr = req.user._id.toString();
    const isMemberOrMod = group.createdBy?.toString() === userIdStr ||
      (Array.isArray(group.members) && group.members.some(m => m.toString() === userIdStr)) ||
      req.user.isAdmin;
    if (!isMemberOrMod) {
      return sendProblem(res, 403, 'Forbidden', 'Only channel members or admins can create webhooks');
    }

    const webhook = await Webhook.create({
      channelId: group._id,
      name: name.trim(),
      createdBy: req.user._id
    });

    await recordAuditLog(req, 'WEBHOOK_CREATED', 'Webhook', webhook._id, { channelId: group._id, name: webhook.name });

    res.status(201).json({
      _id: webhook._id,
      channelId: webhook.channelId,
      name: webhook.name,
      token: webhook.token,
      webhookUrl: `/api/webhooks/${webhook.token}`,
      createdAt: webhook.createdAt
    });
  } catch (err) {
    sendProblem(res, 500, 'Internal Server Error', err.message);
  }
});

app.get('/api/channels/:id/webhooks', requireAuth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return sendProblem(res, 404, 'Not Found', 'Channel not found');
    }
    const userIdStr = req.user._id.toString();
    const isMember = group.createdBy?.toString() === userIdStr ||
      (Array.isArray(group.members) && group.members.some(m => m.toString() === userIdStr)) ||
      req.user.isAdmin;
    if (!isMember) {
      return sendProblem(res, 403, 'Forbidden', 'Access denied to channel webhooks');
    }

    const webhooks = await Webhook.find({ channelId: group._id, isActive: true })
      .select('_id name token createdAt createdBy channelId')
      .sort({ createdAt: -1 });

    const formatted = webhooks.map(w => ({
      _id: w._id,
      channelId: w.channelId,
      name: w.name,
      token: w.token,
      webhookUrl: `/api/webhooks/${w.token}`,
      createdAt: w.createdAt,
      createdBy: w.createdBy
    }));
    res.json(formatted);
  } catch (err) {
    sendProblem(res, 500, 'Internal Server Error', err.message);
  }
});

app.delete('/api/webhooks/:id', requireAuth, async (req, res) => {
  try {
    const webhook = await Webhook.findById(req.params.id);
    if (!webhook || !webhook.isActive) {
      return sendProblem(res, 404, 'Not Found', 'Webhook not found');
    }
    const group = await Group.findById(webhook.channelId);
    const userIdStr = req.user._id.toString();
    const canDelete = webhook.createdBy?.toString() === userIdStr ||
      group?.createdBy?.toString() === userIdStr ||
      (group?.moderators && group.moderators.some(m => m.toString() === userIdStr)) ||
      req.user.isAdmin;
    if (!canDelete) {
      return sendProblem(res, 403, 'Forbidden', 'Cannot delete this webhook');
    }
    webhook.isActive = false;
    await webhook.save();

    await recordAuditLog(req, 'WEBHOOK_DELETED', 'Webhook', webhook._id, { channelId: webhook.channelId });

    res.json({ success: true, id: webhook._id });
  } catch (err) {
    sendProblem(res, 500, 'Internal Server Error', err.message);
  }
});

// Public incoming webhook ingestion endpoint
app.post('/api/webhooks/:token', async (req, res) => {
  try {
    const webhook = await Webhook.findOne({ token: req.params.token, isActive: true });
    if (!webhook) {
      return sendProblem(res, 404, 'Not Found', 'Webhook not found or disabled');
    }

    const { text, content, username } = req.body || {};
    const messageContent = text || content;
    if (!messageContent || typeof messageContent !== 'string' || !messageContent.trim()) {
      return sendProblem(res, 400, 'Bad Request', 'Message text or content is required');
    }

    // Resolve or create Webhook bot user
    let webhookUser = await User.findOne({ email: 'webhook@kuchoo.internal' });
    if (!webhookUser) {
      webhookUser = await User.create({
        email: 'webhook@kuchoo.internal',
        displayName: 'Webhook Bot',
        roles: ['bot'],
        online: true
      });
    }

    const senderDisplayName = username?.trim() || webhook.name;
    const finalContent = `🤖 **[${senderDisplayName}]**: ${messageContent.trim()}`;

    const message = await Message.create({
      from: webhookUser._id.toString(),
      to: webhook.channelId.toString(),
      content: finalContent
    });

    io.to(webhook.channelId.toString()).emit('receive_message', message);

    res.status(201).json({ success: true, messageId: message._id, channelId: webhook.channelId });
  } catch (err) {
    sendProblem(res, 500, 'Internal Server Error', err.message);
  }
});

// ==========================================
// Aladin AI Copilot Bot Helper
// ==========================================
async function handleAladinBotReply(roomOrTo, promptText, senderId, parentId = null) {
  try {
    let aladinUser = await User.findOne({ email: 'aladin@xcorp.internal' });
    if (!aladinUser) {
      aladinUser = await User.create({
        email: 'aladin@xcorp.internal',
        displayName: 'Aladin AI',
        roles: ['ai_assistant', 'admin'],
        isAdmin: true,
        online: true
      });
    }

    const cleanPrompt = promptText.replace(/@aladin/gi, '').trim() || 'Hello!';
    const response = await fetch(`${XLLM_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${XLLM_API_KEY}`
      },
      body: JSON.stringify({
        model: 'aladin-default',
        messages: [
          {
            role: 'system',
            content: 'You are Aladin AI, the autonomous intelligence for Xcorp Suite. Keep your answers crisp, helpful, and technically sharp for team collaboration.'
          },
          { role: 'user', content: cleanPrompt }
        ],
        max_tokens: 350
      })
    });

    if (response.ok) {
      const data = await response.json();
      const aiReply = data.choices?.[0]?.message?.content || 'I am operational and ready to assist.';
      const aiMessage = await Message.create({
        from: aladinUser._id.toString(),
        to: roomOrTo,
        content: `🤖 **Aladin AI**: ${aiReply}`,
        parentId: parentId || null
      });

      if (parentId) {
        const parent = await Message.findById(parentId);
        if (parent) {
          parent.replyCount = (parent.replyCount || 0) + 1;
          parent.lastReplyAt = new Date();
          await parent.save();
          io.to(roomOrTo).to(senderId).emit('thread_reply', { parentId, reply: aiMessage });
          io.to(roomOrTo).to(senderId).emit('message_updated', parent);
        }
      } else {
        io.to(roomOrTo).to(senderId).emit('receive_message', aiMessage);
      }
    }
  } catch (err) {
    console.warn('Aladin bot execution error:', err.message);
  }
}

// ==========================================
// Socket.IO Handshake Auth & Real-Time Events
// ==========================================
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    const sentinelUser = socket.handshake.headers['x-auth-user'];
    let user = null;

    if (sentinelUser) {
      const rolesHeader = socket.handshake.headers['x-auth-roles'] || 'user';
      const roles = rolesHeader.split(',').map(r => r.trim());
      const isAdmin = socket.handshake.headers['x-auth-xadmin'] === 'true' || roles.includes('admin') || roles.includes('xadmin');
      user = await findOrCreateXIDUser({
        xidId: sentinelUser,
        email: sentinelUser.includes('@') ? sentinelUser : `${sentinelUser}@xcorp.mywire.org`,
        displayName: sentinelUser.split('@')[0],
        roles,
        isAdmin
      });
    } else if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        user = await findOrCreateXIDUser({
          xidId: decoded.sub || decoded.id,
          email: decoded.email,
          displayName: decoded.name || decoded.displayName || (decoded.email ? decoded.email.split('@')[0] : 'XCorp User'),
          roles: decoded.roles || ['user'],
          isAdmin: decoded.isAdmin || (decoded.roles && (decoded.roles.includes('admin') || decoded.roles.includes('xadmin')))
        });
      } catch {
        const raw = jwt.decode(token);
        if (raw && (raw.sub || raw.email)) {
          user = await findOrCreateXIDUser({
            xidId: raw.sub,
            email: raw.email,
            displayName: raw.name || raw.displayName,
            roles: raw.roles || ['user']
          });
        }
      }
    }

    if (user) {
      socket.user = user;
      socket.userId = user._id.toString();
    }
    next();
  } catch (err) {
    console.warn('Socket handshake authentication bypassed:', err.message);
    next();
  }
});

// In-Memory Huddle Roster (Slack Huddles parity)
const activeHuddles = new Map();

io.on('connection', (socket) => {
  socket.on('join', (userId) => {
    socket.join(userId);
  });

  socket.on('send_message', async (data) => {
    let { from, to, content, fileUrl, voiceUrl, parentId } = data;

    // Enforce private channel membership check if target is a channel
    const destinationId = parentId ? (await Message.findById(parentId).select('to'))?.to : to;
    if (destinationId) {
      const destGroup = await Group.findById(destinationId).select('isPrivate isPublic members createdBy').catch(() => null);
      if (destGroup && (destGroup.isPrivate || destGroup.isPublic === false)) {
        const fromStr = from ? from.toString() : '';
        const isMember = destGroup.createdBy?.toString() === fromStr ||
          (Array.isArray(destGroup.members) && destGroup.members.some(m => m.toString() === fromStr));
        if (!isMember) {
          socket.emit('error_message', { message: 'You are not a member of this private channel.' });
          return;
        }
      }
    }

    // Slash command processing
    if (content && typeof content === 'string' && content.startsWith('/')) {
      const slashMatch = content.match(/^\/([a-zA-Z0-9_-]+)(?:\s+(.*))?$/s);
      if (slashMatch) {
        const cmd = slashMatch[1].toLowerCase();
        const args = (slashMatch[2] || '').trim();

        if (cmd === 'shrug') {
          content = args ? `${args} ¯\\_(ツ)_/¯` : '¯\\_(ツ)_/¯';
        } else if (cmd === 'topic') {
          const targetChannelId = parentId ? (await Message.findById(parentId).select('to'))?.to : to;
          if (targetChannelId) {
            const group = await Group.findById(targetChannelId);
            if (group) {
              const senderUser = await User.findById(from).select('displayName email');
              group.topic = args;
              await group.save();
              const senderName = senderUser?.displayName || senderUser?.email || 'A member';
              const sysMsg = await Message.create({
                from: from || 'system',
                to: targetChannelId,
                content: `📢 **${senderName}** set the channel topic: *${args || 'None'}*`
              });
              io.to(targetChannelId).to(from).emit('receive_message', sysMsg);
              io.to(targetChannelId).to(from).emit('channel_updated', group);
              return;
            }
          }
        } else if (cmd === 'poll') {
          const targetRoom = parentId ? (await Message.findById(parentId).select('to'))?.to : to;
          const parts = args.split('|').map(s => s.trim()).filter(Boolean);
          const question = parts[0] || 'Poll';
          const options = parts.slice(1).length > 0 ? parts.slice(1) : ['Yes', 'No'];
          const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

          let pollContent = `📊 **POLL: ${question}**\n\n`;
          options.forEach((opt, idx) => {
            const emoji = numberEmojis[idx] || `${idx + 1}.`;
            pollContent += `${emoji} ${opt}\n`;
          });
          pollContent += `\n*React below to cast your vote!*`;

          const initialReactions = options.slice(0, 10).map((_, idx) => ({
            emoji: numberEmojis[idx],
            users: []
          }));

          if (parentId) {
            const parent = await Message.findById(parentId);
            if (parent) {
              const reply = await Message.create({
                from,
                to: targetRoom,
                content: pollContent,
                reactions: initialReactions,
                parentId: parent._id,
                group: parent.group
              });
              parent.replyCount = (parent.replyCount || 0) + 1;
              parent.lastReplyAt = new Date();
              await parent.save();
              io.to(targetRoom).to(from).emit('thread_reply', { parentId: parent._id, reply });
              io.to(targetRoom).to(from).emit('message_updated', parent);
            }
          } else {
            const pollMessage = await Message.create({
              from,
              to: targetRoom,
              content: pollContent,
              reactions: initialReactions
            });
            io.to(targetRoom).to(from).emit('receive_message', pollMessage);
          }
          return;
        } else if (cmd === 'dnd') {
          const user = await User.findById(from);
          if (user) {
            user.dnd = !user.dnd;
            await user.save();
            io.emit('user_status_updated', {
              userId: user._id,
              customStatus: user.customStatus,
              dnd: user.dnd
            });
            socket.emit('receive_message', {
              _id: 'sys_' + Date.now(),
              from: 'system',
              to: from,
              content: `🔕 Do Not Disturb mode is now **${user.dnd ? 'ENABLED' : 'DISABLED'}**.`
            });
            return;
          }
        } else if (cmd === 'aladin') {
          const targetRoom = parentId ? (await Message.findById(parentId).select('to'))?.to : to;
          const userMsg = await Message.create({
            from,
            to: targetRoom,
            content: args || 'Hello Aladin',
            parentId: parentId || null
          });
          if (parentId) {
            const parent = await Message.findById(parentId);
            if (parent) {
              parent.replyCount = (parent.replyCount || 0) + 1;
              parent.lastReplyAt = new Date();
              await parent.save();
              io.to(targetRoom).to(from).emit('thread_reply', { parentId: parent._id, reply: userMsg });
              io.to(targetRoom).to(from).emit('message_updated', parent);
            }
          } else {
            io.to(targetRoom).to(from).emit('receive_message', userMsg);
          }
          handleAladinBotReply(targetRoom, args || 'Hello', from, parentId);
          return;
        }
      }
    }

    async function processMentions(messageDoc, text, senderId) {
      if (!text || typeof text !== 'string') return;
      const mentionMatches = text.match(/@([\w.-]+)/g);
      if (!mentionMatches || mentionMatches.length === 0) return;

      const names = mentionMatches.map(m => m.slice(1).toLowerCase());
      const allUsers = await User.find({}).select('_id displayName email dnd');
      for (const u of allUsers) {
        if (u._id.toString() === senderId.toString()) continue;
        const matchesUser = names.includes(u.displayName.toLowerCase()) || names.includes(u.email.toLowerCase());
        const isBroadcast = names.includes('channel') || names.includes('here');
        if ((matchesUser || isBroadcast) && !u.dnd) {
          io.to(u._id.toString()).emit('user_mention', {
            message: messageDoc,
            mentionedBy: senderId,
            type: isBroadcast ? 'broadcast' : 'direct'
          });
        }
      }
    }

    if (parentId) {
      const parent = await Message.findById(parentId);
      if (parent) {
        const reply = await Message.create({
          from,
          to: parent.to,
          content: content || '',
          fileUrl: fileUrl || null,
          voiceUrl: voiceUrl || null,
          parentId: parent._id,
          group: parent.group
        });
        parent.replyCount = (parent.replyCount || 0) + 1;
        parent.lastReplyAt = new Date();
        await parent.save();

        io.to(parent.to).to(from).emit('thread_reply', { parentId: parent._id, reply });
        io.to(parent.to).to(from).emit('message_updated', parent);

        processMentions(reply, content, from);

        if (content && (content.toLowerCase().startsWith('@aladin') || content.toLowerCase().includes('@aladin'))) {
          handleAladinBotReply(parent.to, content, from, parent._id);
        }
      }
    } else {
      const message = await Message.create({ from, to, content, fileUrl, voiceUrl });
      io.to(to).to(from).emit('receive_message', message);

      processMentions(message, content, from);

      // Aladin AI Assistant copilot hook
      if (content && (content.toLowerCase().startsWith('@aladin') || content.toLowerCase().includes('@aladin'))) {
        handleAladinBotReply(to, content, from);
      }
    }
  });

  socket.on('message_reaction', async ({ messageId, emoji, from }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message || !emoji) return;
      if (!Array.isArray(message.reactions)) message.reactions = [];
      let existingReaction = message.reactions.find(r => r.emoji === emoji);

      if (existingReaction) {
        const idx = existingReaction.users.indexOf(from);
        if (idx > -1) {
          existingReaction.users.splice(idx, 1);
          if (existingReaction.users.length === 0) {
            message.reactions = message.reactions.filter(r => r.emoji !== emoji);
          }
        } else {
          existingReaction.users.push(from);
        }
      } else {
        message.reactions.push({ emoji, users: [from] });
      }

      await message.save();
      io.to(message.to).to(message.from).emit('message_reaction', {
        messageId: message._id,
        reactions: message.reactions
      });
    } catch (e) {
      console.warn('Socket message_reaction error:', e.message);
    }
  });

  socket.on('edit_message', async ({ messageId, content, from }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message || !content) return;
      if (message.from !== from) return; // author check

      message.content = content.trim();
      message.isEdited = true;
      message.editedAt = new Date();
      await message.save();

      io.to(message.to).to(message.from).emit('message_updated', message);
    } catch (e) {
      console.warn('Socket edit_message error:', e.message);
    }
  });

  socket.on('delete_message', async ({ messageId, from }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) return;
      if (message.from !== from) return;

      message.isDeleted = true;
      message.deletedAt = new Date();
      message.content = 'This message was deleted';
      message.fileUrl = null;
      message.voiceUrl = null;
      await message.save();

      io.to(message.to).to(message.from).emit('message_deleted', {
        messageId: message._id,
        to: message.to,
        isDeleted: true
      });
    } catch (e) {
      console.warn('Socket delete_message error:', e.message);
    }
  });

  socket.on('user_online', async (userId) => {
    if (userId) {
      await User.findByIdAndUpdate(userId, { online: true, lastSeen: new Date() });
      socket.broadcast.emit('user_status', { userId, online: true });
    }
  });

  socket.on('user_offline', async (userId) => {
    if (userId) {
      await User.findByIdAndUpdate(userId, { online: false, lastSeen: new Date() });
      socket.broadcast.emit('user_status', { userId, online: false });
    }
  });

  // ==========================================
  // WebRTC Audio/Video & Slack Huddle Signaling
  // ==========================================
  socket.on('call_offer', ({ to, offer }) => {
    socket.to(to).emit('call_offer', { from: socket.id, offer });
  });
  socket.on('call_answer', ({ to, answer }) => {
    socket.to(to).emit('call_answer', { answer });
  });
  socket.on('ice_candidate', ({ to, candidate }) => {
    socket.to(to).emit('ice_candidate', { candidate });
  });

  // Channel Huddle Group WebRTC Signaling (Slack/Teams parity)
  socket.on('huddle_join', ({ channelId, user }) => {
    socket.join(`huddle_${channelId}`);
    if (!activeHuddles.has(channelId)) {
      activeHuddles.set(channelId, new Map());
    }
    const huddleMap = activeHuddles.get(channelId);
    huddleMap.set(socket.id, {
      socketId: socket.id,
      userId: user?._id,
      displayName: user?.displayName || 'Teammate',
      avatar: user?.avatar,
      sharingScreen: false
    });

    const participants = Array.from(huddleMap.values());
    io.to(`huddle_${channelId}`).emit('huddle_roster', { channelId, participants });
    io.to(channelId).emit('huddle_active_state', { channelId, activeCount: participants.length });
  });

  socket.on('huddle_leave', ({ channelId }) => {
    socket.leave(`huddle_${channelId}`);
    if (activeHuddles.has(channelId)) {
      const huddleMap = activeHuddles.get(channelId);
      huddleMap.delete(socket.id);
      const participants = Array.from(huddleMap.values());
      io.to(`huddle_${channelId}`).emit('huddle_roster', { channelId, participants });
      io.to(channelId).emit('huddle_active_state', { channelId, activeCount: participants.length });
      if (huddleMap.size === 0) activeHuddles.delete(channelId);
    }
  });

  socket.on('huddle_signal', ({ toSocketId, signal, fromUser }) => {
    io.to(toSocketId).emit('huddle_signal', { fromSocketId: socket.id, signal, fromUser });
  });

  socket.on('huddle_screen_share', ({ channelId, sharing }) => {
    if (activeHuddles.has(channelId)) {
      const huddleMap = activeHuddles.get(channelId);
      if (huddleMap.has(socket.id)) {
        huddleMap.get(socket.id).sharingScreen = Boolean(sharing);
        io.to(`huddle_${channelId}`).emit('huddle_roster', { channelId, participants: Array.from(huddleMap.values()) });
      }
    }
  });

  socket.on('disconnect', () => {
    for (const [channelId, huddleMap] of activeHuddles.entries()) {
      if (huddleMap.has(socket.id)) {
        huddleMap.delete(socket.id);
        const participants = Array.from(huddleMap.values());
        io.to(`huddle_${channelId}`).emit('huddle_roster', { channelId, participants });
        io.to(channelId).emit('huddle_active_state', { channelId, activeCount: participants.length });
        if (huddleMap.size === 0) activeHuddles.delete(channelId);
      }
    }
  });
});

// Huddle Status REST API
app.get('/api/huddles/:channelId', requireAuth, (req, res) => {
  const huddleMap = activeHuddles.get(req.params.channelId);
  res.json({
    channelId: req.params.channelId,
    active: Boolean(huddleMap && huddleMap.size > 0),
    participants: huddleMap ? Array.from(huddleMap.values()) : []
  });
});

// ==========================================
// Static Assets & Client SPA Fallback
// ==========================================
const clientBuildPath = path.join(__dirname, 'client', 'build');
app.use(express.static(clientBuildPath));

app.get(/^\/((?!api|uploads).)*$/, (req, res) => {
  const indexPath = path.join(clientBuildPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Kuchoo | Xcorp Suite</title><style>body{background:#060910;color:#00F0FF;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}</style></head>
        <body>
          <div style="text-align:center;">
            <h1>Kuchoo Backend Operational</h1>
            <p style="color:#94A3B8;">Frontend build being staged from Azure VM NVMe.</p>
          </div>
        </body>
      </html>
    `);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Kuchoo Server operational on port ${PORT}`);
});
