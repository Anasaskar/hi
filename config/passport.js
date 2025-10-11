// ===================================================================
// PASSPORT CONFIGURATION FOR SOCIAL AUTHENTICATION
// Supports Google, Facebook, Apple, and VK OAuth strategies
// ===================================================================

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const AppleStrategy = require('passport-apple').Strategy;
const VKontakteStrategy = require('passport-vkontakte').Strategy;
const bcrypt = require('bcrypt');
const User = require('../models/User');

// ===================================================================
// SERIALIZE & DESERIALIZE USER
// Required for session management (not heavily used since we use JWT)
// ===================================================================
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

// ===================================================================
// HELPER FUNCTION: Find or Create User from Social Profile
// This handles user creation/login for all social providers
// ACCOUNT LINKING: If email exists with 'local' provider, links to social provider
// ===================================================================
async function findOrCreateSocialUser(profile, provider, done) {
    try {
        console.log(`🔍 Processing ${provider} authentication for:`, profile.emails?.[0]?.value);

        // Extract email from profile
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
        
        if (!email) {
            return done(new Error('No email provided by ' + provider), null);
        }

        // Check if user exists with this email
        let user = await User.findOne({ email: email.toLowerCase() });

        if (user) {
            // User exists - check provider and link account if needed
            console.log(`✅ Existing user found: ${user.email} (current provider: ${user.provider})`);
            
            // If user registered with local auth, link to social provider
            if (user.provider === 'local' || user.provider !== provider) {
                console.log(`🔗 Linking/updating ${provider} account for user ${user.email}`);
                user.provider = provider;
                user.providerId = profile.id;
                user.emailConfirmed = true; // Auto-confirm when linking social
                
                // Update profile info from social provider if available
                if (profile.displayName && !user.fullName) {
                    user.fullName = profile.displayName;
                } else if (profile.name && !user.fullName) {
                    user.fullName = `${profile.name.givenName || ''} ${profile.name.familyName || ''}`.trim();
                }
                
                await user.save();
                console.log(`✅ Account linked to ${provider}`);
            }
            
            return done(null, user);
        }

        // Create new user for social login
        console.log(`🆕 Creating new user for ${provider} login`);
        
        // Extract full name from profile
        let fullName = profile.displayName || 'User';
        if (!fullName && profile.name) {
            fullName = `${profile.name.givenName || ''} ${profile.name.familyName || ''}`.trim();
        }

        user = new User({
            fullName: fullName,
            email: email.toLowerCase(),
            provider: provider,
            providerId: profile.id,
            emailConfirmed: true, // Social logins are auto-confirmed
            passwordHash: undefined // No password for social logins
        });

        await user.save();
        console.log(`✅ New ${provider} user created:`, user.email);
        
        return done(null, user);
    } catch (err) {
        console.error(`❌ Error in ${provider} authentication:`, err);
        return done(err, null);
    }
}

// ===================================================================
// LOCAL STRATEGY (Email/Password)
// ===================================================================
passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
}, async (email, password, done) => {
    try {
        const user = await User.findOne({ email: email.toLowerCase() });
        
        if (!user) {
            return done(null, false, { message: 'No user with that email' });
        }
        
        // Check if user has a password (allow login even if provider is not 'local')
        if (!user.passwordHash) {
            return done(null, false, { 
                message: `This account is registered with ${user.provider} and has no password. Please use ${user.provider} to login or set a password first.` 
            });
        }
        
        // Verify password
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return done(null, false, { message: 'Incorrect password' });
        }
        
        // Check email confirmation
        if (!user.emailConfirmed) {
            return done(null, false, { message: 'Please confirm your email before logging in' });
        }
        
        return done(null, user);
    } catch (err) {
        return done(err);
    }
}));
console.log('✅ Local (email/password) strategy configured');

// ===================================================================
// GOOGLE OAUTH STRATEGY
// ===================================================================
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
        scope: ['profile', 'email']
    }, async (accessToken, refreshToken, profile, done) => {
        await findOrCreateSocialUser(profile, 'google', done);
    }));
    console.log('✅ Google OAuth strategy configured');
} else {
    console.log('⚠️  Google OAuth not configured - missing credentials');
}

// ===================================================================
// FACEBOOK OAUTH STRATEGY
// ===================================================================
if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    passport.use(new FacebookStrategy({
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL: process.env.FACEBOOK_CALLBACK_URL || '/api/auth/facebook/callback',
        profileFields: ['id', 'displayName', 'emails', 'name']
    }, async (accessToken, refreshToken, profile, done) => {
        await findOrCreateSocialUser(profile, 'facebook', done);
    }));
    console.log('✅ Facebook OAuth strategy configured');
} else {
    console.log('⚠️  Facebook OAuth not configured - missing credentials');
}

// ===================================================================
// APPLE OAUTH STRATEGY
// ===================================================================
if (process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID) {
    passport.use(new AppleStrategy({
        clientID: process.env.APPLE_CLIENT_ID,
        teamID: process.env.APPLE_TEAM_ID,
        keyID: process.env.APPLE_KEY_ID,
        privateKeyString: process.env.APPLE_PRIVATE_KEY || '',
        callbackURL: process.env.APPLE_CALLBACK_URL || '/api/auth/apple/callback',
        scope: ['email', 'name']
    }, async (accessToken, refreshToken, idToken, profile, done) => {
        await findOrCreateSocialUser(profile, 'apple', done);
    }));
    console.log('✅ Apple OAuth strategy configured');
} else {
    console.log('⚠️  Apple OAuth not configured - missing credentials');
}

// ===================================================================
// VK (VKONTAKTE) OAUTH STRATEGY
// ===================================================================
if (process.env.VK_APP_ID && process.env.VK_APP_SECRET) {
    passport.use(new VKontakteStrategy({
        clientID: process.env.VK_APP_ID,
        clientSecret: process.env.VK_APP_SECRET,
        callbackURL: process.env.VK_CALLBACK_URL || '/api/auth/vk/callback',
        scope: ['email'],
        profileFields: ['email', 'name']
    }, async (accessToken, refreshToken, params, profile, done) => {
        await findOrCreateSocialUser(profile, 'vk', done);
    }));
    console.log('✅ VK OAuth strategy configured');
} else {
    console.log('⚠️  VK OAuth not configured - missing credentials');
}

module.exports = passport;
