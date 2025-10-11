// ===================================================================
// AUTHENTICATION CONTROLLER
// Handles local and social authentication logic
// ===================================================================

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { sendVerificationEmail } = require('../utils/emailService');

// ===================================================================
// HELPER: Generate JWT Token
// ===================================================================
function generateToken(userId) {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
}

// ===================================================================
// LOCAL REGISTRATION (Email/Password)
// ===================================================================
exports.register = async (req, res) => {
    try {
        const { fullName, email, password } = req.body;
        
        // Validate input
        if (!fullName || !email || !password) {
            return res.status(400).json({ message: 'ارجع اكمل الحقول' });
        }

        // Check if user already exists
        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) {
            // If user registered via Google/social but has no password, allow adding password
            if (existing.provider !== 'local' && !existing.passwordHash) {
                console.log(`🔗 Adding local password to ${existing.provider} user: ${existing.email}`);
                const passwordHash = await bcrypt.hash(password, 12);
                existing.passwordHash = passwordHash;
                existing.emailConfirmed = true; // Auto-confirm since social was already confirmed
                await existing.save();
                
                return res.status(200).json({ 
                    message: 'تم إضافة كلمة المرور للحساب بنجاح. يمكنك الآن تسجيل الدخول بالطريقتين.',
                    accountLinked: true
                });
            }
            return res.status(409).json({ message: 'البريد الإلكتروني مستخدم مسبقًا' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);
        
        // Generate email confirmation token
        const confirmToken = crypto.randomBytes(20).toString('hex');
        const confirmExpires = Date.now() + 24 * 3600 * 1000; // 24 hours

        // Create new user
        const user = new User({
            fullName,
            email: email.toLowerCase(),
            passwordHash,
            provider: 'local', // Local authentication
            emailConfirmed: false, // Requires manual confirmation
            emailConfirmToken: confirmToken,
            emailConfirmExpires: confirmExpires
        });

        await user.save();
        console.log("✅ New local user saved:", user.email);

        // Generate confirmation URL
        const confirmUrl = `${req.protocol}://${req.get('host')}/auth/confirm/confirm_page.html?token=${confirmToken}&email=${encodeURIComponent(user.email)}`;
        console.log('📧 Confirmation URL:', confirmUrl);

        // Send verification email via Brevo
        const emailResult = await sendVerificationEmail(user.email, user.fullName, confirmUrl);
        
        if (!emailResult.success) {
            console.error('⚠️ Failed to send verification email:', emailResult.error);
            // Don't fail registration if email fails - user can resend
        }

        res.status(201).json({ 
            message: 'Account created successfully. Verification email sent to your inbox.',
            email: user.email,
            emailSent: emailResult.success
        });
    } catch (err) {
        console.error('❌ Registration error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// ===================================================================
// LOCAL LOGIN (Email/Password)
// ===================================================================
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log("📩 Login attempt:", email);

        // Find user
        const user = await User.findOne({ email: email.trim().toLowerCase() });
        
        if (!user) {
            return res.status(401).json({ message: 'لا يوجد مستخدم بهذا البريد الإلكتروني' });
        }

        // Check if user has a password (allow login even if provider is Google)
        if (!user.passwordHash) {
            return res.status(401).json({ 
                message: `هذا الحساب مسجل عبر ${user.provider} وليس لديه كلمة مرور. يرجى استخدام ${user.provider} أو إنشاء كلمة مرور أولاً.` 
            });
        }

        // Check email confirmation
        if (!user.emailConfirmed) {
            return res.status(403).json({ message: 'يجب تأكيد البريد الإلكتروني قبل تسجيل الدخول.' });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        
        if (!isMatch) {
            return res.status(401).json({ message: 'كلمة المرور غير صحيحة' });
        }

        // Generate JWT token
        const token = generateToken(user._id);
        
        // Set cookie
        res.cookie('token', token, { 
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        console.log("✅ Login successful:", user.email);
        res.json({ 
            message: 'تم تسجيل الدخول بنجاح',
            redirect: '/pricing-page' // Frontend should redirect here
        });
    } catch (err) {
        console.error("❌ Login error:", err);
        res.status(500).json({ message: 'خطأ في الخادم' });
    }
};

// ===================================================================
// EMAIL CONFIRMATION
// ===================================================================
exports.confirmEmail = async (req, res) => {
    try {
        const { email, token } = req.body;
        
        if (!email || !token) {
            return res.status(400).json({ message: 'Missing email or token' });
        }

        // Find user with matching token
        const user = await User.findOne({ 
            email: email.toLowerCase(), 
            emailConfirmToken: token 
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid token or email' });
        }

        // Check token expiration
        if (user.emailConfirmExpires && Date.now() > user.emailConfirmExpires) {
            return res.status(400).json({ message: 'Token expired' });
        }

        // Confirm email
        user.emailConfirmed = true;
        user.emailConfirmToken = undefined;
        user.emailConfirmExpires = undefined;
        await user.save();

        console.log("✅ Email confirmed:", user.email);
        res.json({ message: 'Email confirmed successfully' });
    } catch (err) {
        console.error('❌ Email confirmation error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// ===================================================================
// RESEND EMAIL CONFIRMATION
// ===================================================================
exports.resendConfirmation = async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        // Find user
        const user = await User.findOne({ email: email.toLowerCase() });
        
        if (!user) {
            return res.status(404).json({ message: 'No user found with this email address' });
        }

        // Check if already confirmed
        if (user.emailConfirmed) {
            return res.status(400).json({ message: 'Email already verified' });
        }

        // Check if user is local provider
        if (user.provider !== 'local') {
            return res.status(400).json({ message: 'This account does not require email verification' });
        }

        // Generate new token if expired or missing
        if (!user.emailConfirmToken || !user.emailConfirmExpires || Date.now() > user.emailConfirmExpires) {
            user.emailConfirmToken = crypto.randomBytes(20).toString('hex');
            user.emailConfirmExpires = Date.now() + 24 * 3600 * 1000; // 24 hours
            await user.save();
        }

        // Generate confirmation URL
        const confirmUrl = `${req.protocol}://${req.get('host')}/auth/confirm/confirm_page.html?token=${user.emailConfirmToken}&email=${encodeURIComponent(user.email)}`;
        
        // Send verification email
        const emailResult = await sendVerificationEmail(user.email, user.fullName, confirmUrl);
        
        if (!emailResult.success) {
            console.error('⚠️ Failed to resend verification email:', emailResult.error);
            return res.status(500).json({ 
                message: 'Failed to send verification email. Please try again later.',
                error: emailResult.error 
            });
        }

        console.log('✅ Verification email resent to:', user.email);
        res.json({ 
            message: 'Verification email sent successfully. Please check your inbox.',
            email: user.email
        });
    } catch (err) {
        console.error('❌ Resend confirmation error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// ===================================================================
// LOGOUT
// ===================================================================
exports.logout = (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'تم تسجيل الخروج بنجاح' });
};

// ===================================================================
// SOCIAL AUTH CALLBACK HANDLER
// Called after successful OAuth authentication
// Redirects to /pricing-page after successful login
// ===================================================================
exports.socialAuthCallback = async (req, res) => {
    try {
        // User is attached to req.user by passport
        if (!req.user) {
            console.error('❌ No user in social auth callback');
            return res.redirect('/login?error=authentication_failed');
        }

        const user = req.user;
        console.log(`✅ Social auth callback for: ${user.email} (${user.provider})`);

        // Generate JWT token
        const token = generateToken(user._id);
        
        // Set cookie
        res.cookie('token', token, { 
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        // Redirect to pricing page after successful login
        res.redirect('/pricing-page');
    } catch (err) {
        console.error('❌ Social auth callback error:', err);
        res.redirect('/login?error=server_error');
    }
};

// ===================================================================
// USER UPGRADE (Demo endpoint for testing paid features)
// ===================================================================
exports.upgradeUser = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'غير مسموح' });
        }

        req.user.type = 'pay';
        await req.user.save();
        
        console.log(`✅ User upgraded to paid: ${req.user.email}`);
        res.json({ message: 'تم تفعيل الخطة المدفوعة' });
    } catch (err) {
        console.error('❌ User upgrade error:', err);
        res.status(500).json({ message: 'خطأ في الخادم' });
    }
};
