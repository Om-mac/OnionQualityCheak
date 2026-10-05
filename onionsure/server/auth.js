/**
 * OnionSure — Authentication & role-based access.
 * JWT-based, with explicit roles matching the spec login matrix.
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('./config');
const db = require('./db');

const ROLES = ['procurement_officer', 'fpo', 'farmer', 'buyer', 'admin'];

function signToken(user) {
  if (!config.jwtSecret) {
    throw new Error('JWT_SECRET must be configured');
  }
  return jwt.sign(
    { sub: user.id, role: user.role, name: user.name, username: user.username },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch (e) {
    return null;
  }
}

/**
 * Express middleware: requires a valid JWT. Optionally restrict to roles.
 */
function requireAuth(...roles) {
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    const payload = token && verifyToken(token);
    if (!payload) return res.status(401).json({ error: 'Authentication required' });
    // Resolve the full user record from the DB so role-scoped fields (farmerId,
    // fpoId, buyerId, centerId) are available for data filtering downstream.
    const fullUser = db.find('users', (u) => u.id === payload.sub);
    if (!fullUser) return res.status(401).json({ error: 'Authentication required' });
    req.user = fullUser;
    if (roles.length && !roles.includes(fullUser.role)) {
      return res.status(403).json({ error: 'Insufficient permissions for this role' });
    }
    next();
  };
}

async function createUser({ username, password, role, name, email, centerId, fpoId, farmerId, buyerId }) {
  const dbObj = db.get();
  if (dbObj.users.find((u) => u.username === username)) {
    throw new Error('Username already exists');
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id: db.id('usr'),
    username,
    passwordHash,
    role,
    name: name || username,
    email: email || null,
    centerId: centerId || null,
    fpoId: fpoId || null,
    farmerId: farmerId || null,
    buyerId: buyerId || null,
    createdAt: db.nowISO(),
  };
  dbObj.users.push(user);
  db.persist();
  return user;
}

async function authenticate(username, password) {
  const normalizedUsername = typeof username === 'string' ? username.trim() : '';
  const suppliedPassword = typeof password === 'string' ? password : '';
  const user = db.find('users', (u) => u.username === normalizedUsername);
  // Always perform a bcrypt comparison, including for unknown usernames, to
  // reduce username-enumeration timing differences.
  const hash = user?.passwordHash || '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
  const ok = await bcrypt.compare(suppliedPassword, hash);
  if (!ok) return null;
  return user;
}

module.exports = {
  ROLES,
  signToken,
  verifyToken,
  requireAuth,
  createUser,
  authenticate,
};
