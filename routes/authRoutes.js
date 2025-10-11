// ===================================================================
// AUTHENTICATION ROUTES
// Handles all authentication endpoints (local + social)
// ===================================================================

const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const authController = require('../controllers/authController');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ===================================================================
// MIDDLEWARE: Verify JWT Token
// ===================================================================
const verifyToken = async (req, res, next) => {
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
        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};

// ===================================================================
// LOCAL AUTHENTICATION ROUTES
// ===================================================================

// Register new user with email/password
router.post('/register', authController.register);

// Login with email/password
router.post('/login', authController.login);

// Confirm email address
router.post('/confirm', authController.confirmEmail);

// Resend confirmation email
router.post('/resend-confirm', authController.resendConfirmation);

// Logout
router.post('/logout', authController.logout);

// Upgrade user to paid (protected route)
router.post('/upgrade', verifyToken, authController.upgradeUser);

// ===================================================================
// GOOGLE OAUTH ROUTES
// ===================================================================

// Initiate Google OAuth flow
router.get('/google', 
    passport.authenticate('google', { 
        scope: ['profile', 'email'],
        session: false 
    })
);

// Google OAuth callback
router.get('/google/callback', 
    passport.authenticate('google', { 
        failureRedirect: '/login?error=google_auth_failed',
        session: false 
    }),
    authController.socialAuthCallback
);

// ===================================================================
// FACEBOOK OAUTH ROUTES
// ===================================================================

// Initiate Facebook OAuth flow
router.get('/facebook',
    passport.authenticate('facebook', { 
        scope: ['email'],
        session: false 
    })
);

// Facebook OAuth callback
router.get('/facebook/callback',
    passport.authenticate('facebook', { 
        failureRedirect: '/login?error=facebook_auth_failed',
        session: false 
    }),
    authController.socialAuthCallback
);

// ===================================================================
// APPLE OAUTH ROUTES
// ===================================================================

// Initiate Apple OAuth flow
router.get('/apple',
    passport.authenticate('apple', { 
        scope: ['email', 'name'],
        session: false 
    })
);

// Apple OAuth callback
router.post('/apple/callback',
    passport.authenticate('apple', { 
        failureRedirect: '/login?error=apple_auth_failed',
        session: false 
    }),
    authController.socialAuthCallback
);

// ===================================================================
// VK (VKONTAKTE) OAUTH ROUTES
// ===================================================================

// Initiate VK OAuth flow
router.get('/vk',
    passport.authenticate('vkontakte', { 
        scope: ['email'],
        session: false 
    })
);

// VK OAuth callback
router.get('/vk/callback',
    passport.authenticate('vkontakte', { 
        failureRedirect: '/login?error=vk_auth_failed',
        session: false 
    }),
    authController.socialAuthCallback
);

module.exports = router;
