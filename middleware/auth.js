// ===================================================================
// AUTHENTICATION MIDDLEWARE
// Protects routes and verifies user authentication
// ===================================================================

const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware to ensure user is authenticated
 * Redirects to /login if not authenticated
 */
async function ensureAuth(req, res, next) {
    try {
        const token = req.cookies.token;
        
        if (!token) {
            return res.redirect('/login');
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        const user = await User.findById(decoded.id);
        
        if (!user) {
            res.clearCookie('token');
            return res.redirect('/login');
        }
        
        // Block banned users
        if (user.type === 'Baned') {
            res.clearCookie('token');
            return res.status(403).send('Account banned. Contact support.');
        }
        
        // Block users who haven't confirmed email (local auth only)
        if (user.provider === 'local' && !user.emailConfirmed) {
            res.clearCookie('token');
            return res.redirect(`/auth/confirm/confirm_page.html?email=${encodeURIComponent(user.email)}`);
        }
        
        req.user = user;
        next();
    } catch (err) {
        res.clearCookie('token');
        return res.redirect('/login');
    }
}

/**
 * Middleware to check if user is authenticated via Passport
 * Used for routes that use Passport session
 */
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}

/**
 * Middleware to ensure user has paid access
 */
function requirePaid(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated' });
    }
    
    if (req.user.type !== 'pay') {
        return res.status(403).json({ message: 'This feature requires a paid subscription' });
    }
    
    next();
}

/**
 * Middleware to verify JWT token for API routes
 * Returns JSON error instead of redirecting
 */
async function verifyToken(req, res, next) {
    try {
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        const user = await User.findById(decoded.id);
        
        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }
        
        // Block banned users
        if (user.type === 'Baned') {
            res.clearCookie('token');
            return res.status(403).json({ message: 'Account banned' });
        }
        
        // Block unconfirmed local users
        if (user.provider === 'local' && !user.emailConfirmed) {
            res.clearCookie('token');
            return res.status(403).json({ message: 'Email not confirmed' });
        }
        
        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Invalid token' });
    }
}

module.exports = {
    ensureAuth,
    isAuthenticated,
    requirePaid,
    verifyToken
};
