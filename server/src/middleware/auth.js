const jwt = require('jsonwebtoken');
const User = require('../models/User');
const multer = require('multer');

// Example: Increase limit to 10 MB (10 * 1024 * 1024 bytes)
const upload = multer({
  storage: multer.memoryStorage(), // or diskStorage
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
});


// ─── Verify JWT ───────────────────────────────────────────────────────────────
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ error: 'User not found. Token invalid.' });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: 'Account has been deactivated.' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid token.' });
  }
};

// ─── Role Guard ───────────────────────────────────────────────────────────────
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}`,
      });
    }
    next();
  };
};

// ─── JWT Generation Utility ───────────────────────────────────────────────────
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// ─── Optional Auth (attach user if token present, don't block guests) ────────
const optionalProtect = async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return next(); // Guest – continue without user
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (user && user.isActive) req.user = user;
  } catch {
    // Invalid / expired token – just continue as guest
  }
  next();
};

module.exports = {upload, protect, authorize, generateToken, optionalProtect };
