# ✅ Setup Checklist - Social Authentication

Follow these steps in order to get your social authentication system running.

---

## 📋 Pre-Flight Checklist

### ☑️ Step 1: Verify Installation
Run the verification script:
```bash
npm run test:auth
```

This will check:
- ✅ All required files are in place
- ✅ Dependencies are installed
- ✅ User model is updated
- ✅ Frontend files have social buttons

**Expected output:** All checks should pass

---

### ☑️ Step 2: Create Environment File

```bash
# Copy the template
cp .env.example .env
```

**Minimum required variables:**
```env
JWT_SECRET=your-secure-random-key-here
SESSION_SECRET=your-session-secret-here
MONGO_URI=mongodb://localhost:27017/virtufit
```

To generate secure secrets:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

### ☑️ Step 3: Configure OAuth Providers (Optional)

You can configure **any or all** of these providers. Each one you configure will work independently.

#### 🔵 Google OAuth (Recommended - Easiest)

**Time needed:** 5 minutes

1. Go to: https://console.cloud.google.com/
2. Create project → APIs & Services → Credentials
3. Create OAuth 2.0 Client ID
4. Add redirect URI: `http://localhost:3000/api/auth/google/callback`
5. Copy credentials to `.env`:

```env
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
```

#### 🔵 Facebook Login

**Time needed:** 7 minutes

1. Go to: https://developers.facebook.com/
2. Create App → Add Facebook Login product
3. Settings → Basic → Copy App ID and Secret
4. Facebook Login Settings → Add redirect URI: `http://localhost:3000/api/auth/facebook/callback`
5. Add to `.env`:

```env
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
FACEBOOK_CALLBACK_URL=http://localhost:3000/api/auth/facebook/callback
```

#### 🍎 Apple Sign In

**Time needed:** 15-20 minutes
**Requires:** Apple Developer Account ($99/year)

1. Go to: https://developer.apple.com/
2. Certificates, Identifiers & Profiles → Create Services ID
3. Enable Sign in with Apple
4. Create Key for Sign in with Apple
5. Download `.p8` private key file
6. Add to `.env`:

```env
APPLE_CLIENT_ID=your.apple.service.id
APPLE_TEAM_ID=your-apple-team-id
APPLE_KEY_ID=your-apple-key-id
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
Your private key content here
-----END PRIVATE KEY-----"
APPLE_CALLBACK_URL=http://localhost:3000/api/auth/apple/callback
```

**Note:** Apple requires HTTPS in production

#### 🔵 VK (VKontakte)

**Time needed:** 5 minutes

1. Go to: https://vk.com/apps?act=manage
2. Create standalone application
3. Settings → Copy Application ID and Secure Key
4. Add redirect URI: `http://localhost:3000/api/auth/vk/callback`
5. Add to `.env`:

```env
VK_APP_ID=your-vk-app-id
VK_APP_SECRET=your-vk-app-secret
VK_CALLBACK_URL=http://localhost:3000/api/auth/vk/callback
```

---

## 🚀 Launch

### ☑️ Step 4: Start MongoDB

Make sure MongoDB is running:

```bash
# If using local MongoDB
mongod

# If using MongoDB Atlas, ensure MONGO_URI points to your cluster
```

---

### ☑️ Step 5: Start the Server

```bash
# Production mode
npm start

# Development mode (with auto-reload)
npm run dev
```

**Expected output:**
```
✅ MongoDB connected
✅ Google OAuth strategy configured
✅ Facebook OAuth strategy configured
(or warnings if not configured)
🚀 Server running at http://localhost:3000
```

---

### ☑️ Step 6: Test the System

1. **Open browser:** http://localhost:3000/login

2. **Verify UI:**
   - ✅ Email/password form visible
   - ✅ Divider: "Or login using"
   - ✅ Social login buttons displayed
   - ✅ Buttons have proper icons and colors

3. **Test Local Auth:**
   - Register a new account at `/register`
   - Check email confirmation flow
   - Login with credentials

4. **Test Social Auth:**
   - Click a configured OAuth provider button
   - Authorize the app
   - Should redirect to `/dashboard`
   - Check MongoDB - user created with `emailConfirmed: true`

---

## 🧪 Testing Checklist

### Local Authentication
- [ ] Can register new account
- [ ] Email confirmation required
- [ ] Cannot login before email confirmation
- [ ] Can confirm email with token
- [ ] Can login after confirmation
- [ ] JWT cookie is set
- [ ] Redirected to dashboard

### Social Authentication (for each configured provider)
- [ ] Social button is visible
- [ ] Clicking button starts OAuth flow
- [ ] Can authorize on provider's page
- [ ] Redirected back to app
- [ ] User created in database
- [ ] `emailConfirmed` is `true`
- [ ] `provider` field is set correctly
- [ ] JWT cookie is set
- [ ] Redirected to dashboard

### Account Linking
- [ ] Register locally with email
- [ ] Login with social using same email
- [ ] Account is linked (same user record)
- [ ] Can login with either method

---

## 📊 Database Verification

Check your MongoDB database:

```javascript
// Connect to MongoDB shell
use virtufit

// View users
db.users.find().pretty()

// Check a social user
db.users.findOne({ provider: 'google' })

// Verify fields
// Should have:
// - provider: 'google' | 'facebook' | 'apple' | 'vk' | 'local'
// - providerId: (social provider's user ID)
// - emailConfirmed: true (for social) or false (for local)
// - passwordHash: (only for local users)
```

---

## 🐛 Troubleshooting

### Server won't start
- [ ] Check MongoDB is running
- [ ] Verify `.env` file exists
- [ ] Check for syntax errors: `npm run test:auth`

### OAuth redirect errors
- [ ] Verify callback URLs match exactly
- [ ] Check protocol (http vs https)
- [ ] Ensure no trailing slashes
- [ ] Verify credentials are correct

### Social button doesn't work
- [ ] Check browser console for errors
- [ ] Verify OAuth provider is configured in `.env`
- [ ] Check server logs for detailed errors
- [ ] Ensure provider app is not in test mode

### User not created
- [ ] Check server logs
- [ ] Verify MongoDB connection
- [ ] Check if email already exists
- [ ] Review passport callback errors

---

## ✅ Success Criteria

Your setup is complete when:

1. ✅ Server starts without errors
2. ✅ At least one OAuth provider configured
3. ✅ Social buttons visible on login/register pages
4. ✅ Can login with email/password
5. ✅ Can login with at least one social provider
6. ✅ Users created in MongoDB with correct fields
7. ✅ JWT authentication works for both methods

---

## 📚 Next Steps

After successful setup:

1. **Customize UI:** Edit `/auth/login/social-auth.css`
2. **Add more providers:** Follow steps above for additional OAuth
3. **Production deployment:** Update callback URLs to HTTPS
4. **Email service:** Integrate email sending for confirmations
5. **User profile:** Add more fields to User model

---

## 🆘 Need Help?

- **Quick Reference:** `QUICK_START.md`
- **Full Documentation:** `AUTH_README.md`
- **Troubleshooting:** `AUTH_README.md` → Troubleshooting section
- **Test Setup:** Run `npm run test:auth`

---

**Good luck! 🚀**
