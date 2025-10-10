# Authentication & Internationalization Implementation Guide

## Overview

This document describes the complete authentication and internationalization (i18n) system implemented in the VirtuFit application. The system supports both local (email/password) and Google OAuth authentication with automatic account linking, plus multi-language support with automatic language detection.

---

## 🔐 Authentication System

### Supported Authentication Methods

1. **Local Authentication** (Email/Password)
   - Traditional registration with email confirmation
   - Password hashing with bcrypt (12 rounds)
   - JWT-based session management (7-day tokens)

2. **Google OAuth 2.0**
   - Single sign-on with Google accounts
   - Automatic account linking with existing local accounts
   - No duplicate accounts created

### User Schema

The `User` model includes the following authentication-related fields:

```javascript
{
  fullName: String,           // User's full name
  email: String,              // Email (unique, lowercase)
  passwordHash: String,       // Optional (not used for social logins)
  provider: String,           // 'local' or 'google'
  providerId: String,         // Social provider's user ID
  emailConfirmed: Boolean,    // Email verification status
  type: String,               // 'pay', 'unpay', or 'Baned'
  createdAt: Date,
  orders: Array               // Try-on order history
}
```

### Account Linking Logic

**When a user authenticates with Google:**

1. System checks if email already exists in database
2. If exists with `provider: 'local'`:
   - Updates `provider` to `'google'`
   - Sets `providerId` to Google's user ID
   - Auto-confirms email (`emailConfirmed: true`)
   - **Does NOT create duplicate account**
3. If email doesn't exist:
   - Creates new user with `provider: 'google'`
   - Auto-confirms email

This prevents duplicate accounts and allows users to switch authentication methods seamlessly.

### Authentication Flow

#### Local Login Flow
```
User → POST /api/auth/login → Verify email/password → Generate JWT → Set cookie → Redirect to /pricing-page
```

#### Google OAuth Flow
```
User → GET /api/auth/google → Google consent screen → Google callback → Find/link account → Generate JWT → Set cookie → Redirect to /pricing-page
```

### Protected Routes

Routes are protected using middleware from `middleware/auth.js`:

- **`ensureAuth(req, res, next)`**: Redirects unauthenticated users to `/login`
- **`verifyToken(req, res, next)`**: Returns JSON error for API routes
- **`requirePaid(req, res, next)`**: Ensures user has paid subscription

### Logout

**Endpoint:** `GET /logout`

**Behavior:**
- Clears JWT token cookie
- Destroys Passport session
- Redirects to home page (`/`)

---

## 🌍 Internationalization (i18n)

### Language Support

Supported languages:
- **English (en)** - Default fallback
- **Arabic (ar)**

### Language Detection Strategy

Priority order:
1. **Cookie** (`lang`) - User's previously selected language
2. **Accept-Language Header** - Browser/OS language preference
3. **Fallback** - English (`en`)

### Translation Files

Located in `locales/` directory:
- `en.json` - English translations
- `ar.json` - Arabic translations

Example structure:
```json
{
  "welcome": "Welcome",
  "auth": {
    "login": "Login",
    "logout": "Logout",
    "signup": "Sign Up"
  }
}
```

### Usage in Views

i18n exposes translation functions via `res.locals`:

```javascript
// In templates/views
res.locals.lang    // Current language code (e.g., 'en', 'ar')
res.locals.t       // Translation function
res.locals.__      // Alternative translation function

// Example usage
const greeting = res.locals.t('welcome');
const loginText = res.locals.t('auth.login');
```

### Language Switching

**Endpoint:** `GET /set-lang/:lang`

**Parameters:**
- `:lang` - Language code (`en` or `ar`)

**Behavior:**
- Sets `lang` cookie (expires in 1 year)
- Redirects back to previous page or home

**Example:**
```html
<a href="/set-lang/en">English</a>
<a href="/set-lang/ar">العربية</a>
```

---

## 🚀 Setup Instructions

### 1. Environment Variables

Add these to your `.env` file:

```bash
# Database
MONGO_URI=mongodb://localhost:27017/virtufit

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-this

# Session Secret (for Passport)
SESSION_SECRET=your-session-secret-key

# Google OAuth Credentials
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# Node Environment
NODE_ENV=development
```

### 2. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Google+ API**
4. Go to **Credentials** → Create credentials → **OAuth 2.0 Client ID**
5. Configure consent screen
6. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/google/callback` (development)
   - `https://yourdomain.com/api/auth/google/callback` (production)
7. Copy **Client ID** and **Client Secret** to `.env`

### 3. Run Migration Script

For existing users without `provider` field:

```bash
node scripts/migrate-provider.js
```

This will:
- Set `provider: 'local'` for users with passwords
- Set `provider: 'google'` for users with `providerId`
- Display summary of user providers

### 4. Start Server

```bash
npm start
# or for development with auto-reload
npm run dev
```

---

## 🧪 Testing

### Manual Test Cases

#### Test Case 1: Local Login
1. Register new user at `/register`
2. Confirm email (check console for confirmation link)
3. Login at `/login`
4. Verify redirect to `/pricing-page`
5. Verify JWT cookie is set

#### Test Case 2: Google Login (New User)
1. Navigate to `/login`
2. Click "Login with Google"
3. Complete Google authentication
4. Verify new user created in database with `provider: 'google'`
5. Verify redirect to `/pricing-page`

#### Test Case 3: Google Login (Account Linking)
1. Create local account with email test@example.com
2. Logout
3. Login with Google using same email (test@example.com)
4. Verify:
   - User's `provider` updated from `'local'` to `'google'`
   - `providerId` added
   - `emailConfirmed` set to `true`
   - **No duplicate user created**

#### Test Case 4: Language Detection
1. Clear cookies
2. Set browser language to Arabic
3. Visit home page
4. Verify Arabic language detected
5. Click language switcher
6. Verify cookie persists language choice

#### Test Case 5: Logout
1. Login as any user
2. Navigate to `/logout`
3. Verify redirect to `/`
4. Verify cookie cleared
5. Verify cannot access protected routes

---

## 📋 API Endpoints

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register with email/password | No |
| POST | `/api/auth/login` | Login with email/password | No |
| POST | `/api/auth/confirm` | Confirm email address | No |
| POST | `/api/auth/logout` | Logout user | Yes |
| GET | `/api/auth/google` | Initiate Google OAuth | No |
| GET | `/api/auth/google/callback` | Google OAuth callback | No |
| POST | `/api/auth/upgrade` | Upgrade to paid | Yes |

### Language

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/set-lang/:lang` | Switch language | No |

### Protected Routes

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/dashboard` | User dashboard | Yes (Paid) |
| GET | `/api/user/info` | Get user info | Yes |
| GET | `/api/models` | Get available models | Yes (Paid) |
| GET | `/api/orders` | Get user orders | Yes (Paid) |
| POST | `/api/tryon/process` | Process try-on | Yes (Paid) |

---

## 🔧 Navigation & UX Rules

### Public Routes (Always Accessible)
- `/` - Home page
- `/pricing-page` - Pricing page
- `/contact-page` - Contact page
- `/login` - Login page
- `/register` - Registration page

### Navigation Behavior

**Logged-out users:**
- See "Login" and "Sign Up" buttons in navbar
- Mobile: Login button inside slide-down menu

**Logged-in users:**
- See "Logout" button in navbar
- Can still access home page (`/`)
- Redirected to `/pricing-page` after login

### Mobile Menu

Login button is integrated into the mobile slide-down menu (as per existing design).

---

## 🛡️ Security Features

1. **Password Hashing**: bcrypt with 12 salt rounds
2. **JWT Tokens**: HttpOnly cookies, 7-day expiration
3. **Session Security**: Secure cookies in production (HTTPS only)
4. **Provider Validation**: Prevents login with wrong provider
5. **Email Confirmation**: Required for local accounts
6. **Banned User Blocking**: Automatic blocking of banned users

---

## 📁 File Structure

```
├── config/
│   └── passport.js              # Passport strategies (local, Google)
├── controllers/
│   └── authController.js        # Auth logic (login, register, callbacks)
├── middleware/
│   ├── auth.js                  # Auth middleware (ensureAuth, verifyToken)
│   └── i18n.js                  # i18n middleware (language detection)
├── models/
│   └── User.js                  # User schema with provider field
├── routes/
│   └── authRoutes.js           # Auth routes (/login, /google, etc.)
├── scripts/
│   └── migrate-provider.js     # Migration script for existing users
├── locales/
│   ├── en.json                 # English translations
│   └── ar.json                 # Arabic translations
└── server.js                   # Main server file
```

---

## 🔄 Redirect Logic Summary

| Action | Success → | Failure → |
|--------|-----------|-----------|
| Local login | `/pricing-page` | Stay on `/login` with error |
| Google login | `/pricing-page` | `/login?error=google_auth_failed` |
| Logout | `/` | N/A |
| Unauthorized access | N/A | `/login` |

---

## 📝 Commit Message

```
feat: implement auth system with Google OAuth & i18n support

- Add Google OAuth 2.0 with automatic account linking
- Implement i18n with Accept-Language detection and cookie persistence
- Add /logout route clearing session and redirecting to home
- Fix corrupted /set-lang route in server.js
- Add session middleware for Passport
- Update User schema with provider field validation
- Create migration script for existing users
- Redirect to /pricing-page after successful login
- Keep home page (/) public for all users
- Add comprehensive documentation and test plan

Provider linking ensures no duplicate accounts when users
switch between local and Google authentication methods.
Language detection prioritizes cookie > Accept-Language > en.
```

---

## 🆘 Troubleshooting

### Google OAuth Not Working

**Error:** `Google OAuth not configured`

**Solution:** Ensure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in `.env`

### Redirect URI Mismatch

**Error:** `redirect_uri_mismatch`

**Solution:** Add callback URL to Google Cloud Console authorized redirect URIs

### Session Not Persisting

**Issue:** User logged out immediately after login

**Solution:** Check `SESSION_SECRET` is set and session middleware is configured

### Language Not Detected

**Issue:** Always defaults to English

**Solution:** Ensure i18n middleware is applied (`app.use(detectLanguage)`)

### Migration Script Fails

**Error:** Cannot connect to MongoDB

**Solution:** Check `MONGO_URI` in `.env` and ensure MongoDB is running

---

## 📞 Support

For issues or questions, please check:
- Server logs for detailed error messages
- Browser console for frontend errors
- MongoDB connection status
- Environment variables configuration

---

**Last Updated:** 2025-10-10
**Version:** 1.0.0
