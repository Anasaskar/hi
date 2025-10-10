# 🔐 Complete Authentication System Documentation

## Overview

This project now includes a **modular, production-ready authentication system** supporting:
- ✅ **Email/Password** registration and login
- ✅ **Social OAuth** with Google, Facebook, Apple, and VK
- ✅ **JWT-based** authentication
- ✅ **Email confirmation** for local registrations
- ✅ **Automatic email verification** for social logins

---

## 📁 Project Structure

```
/auth/
  /login/
    - login_page.html       # Login page with social buttons
    - login.js              # Login form handler
    - login_page_style.css  # Login page styles
    - social-auth.css       # Social button styles
  /signup/
    - register_page.html    # Registration page with social buttons
    - register.js           # Registration form handler
    - register_page_style.css
  /confirm/
    - confirm_page.html     # Email confirmation page

/config/
  - passport.js             # Passport OAuth strategies configuration

/controllers/
  - authController.js       # Authentication business logic

/routes/
  - authRoutes.js           # All authentication endpoints

/models/
  - User.js                 # Updated User schema with social auth fields

.env.example                # Environment variables template
server.js                   # Main server file (updated)
```

---

## 🚀 Getting Started

### 1. Install Dependencies

```bash
npm install
```

New packages added:
- `passport` - Authentication middleware
- `passport-google-oauth20` - Google OAuth strategy
- `passport-facebook` - Facebook OAuth strategy
- `passport-apple` - Apple OAuth strategy
- `passport-vkontakte` - VK OAuth strategy
- `express-session` - Session management

### 2. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Then fill in your OAuth credentials. See the [OAuth Setup](#oauth-setup) section below.

### 3. Run the Server

```bash
npm start
# or for development:
npm run dev
```

---

## 🔑 OAuth Setup Guide

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure consent screen if prompted
6. Select **Web application** as application type
7. Add authorized redirect URI: `http://localhost:3000/api/auth/google/callback`
8. Copy **Client ID** and **Client Secret** to `.env`

### Facebook OAuth

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app or select existing
3. Add **Facebook Login** product
4. Go to **Settings** → **Basic**
5. Copy **App ID** and **App Secret** to `.env`
6. In Facebook Login settings, add Valid OAuth Redirect URI: `http://localhost:3000/api/auth/facebook/callback`

### Apple OAuth

1. Go to [Apple Developer](https://developer.apple.com/)
2. Sign in with your Apple Developer account
3. Go to **Certificates, Identifiers & Profiles**
4. Create a **Services ID**
5. Enable **Sign in with Apple**
6. Configure **Return URLs**: `http://localhost:3000/api/auth/apple/callback`
7. Create a **Key** for Sign in with Apple
8. Download the private key (`.p8` file)
9. Copy the key content to `.env` as `APPLE_PRIVATE_KEY`
10. Add Team ID, Key ID, and Service ID to `.env`

**Note:** Apple OAuth requires HTTPS in production.

### VK (VKontakte) OAuth

1. Go to [VK Apps](https://vk.com/apps?act=manage)
2. Create a new standalone application
3. Go to **Settings**
4. Copy **Application ID** and **Secure Key** to `.env`
5. Add Authorized redirect URI: `http://localhost:3000/api/auth/vk/callback`
6. Set **Platform** to Website

---

## 📡 API Endpoints

### Local Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register with email/password |
| POST | `/api/auth/login` | Login with email/password |
| POST | `/api/auth/confirm` | Confirm email address |
| POST | `/api/auth/logout` | Logout user |
| POST | `/api/auth/upgrade` | Upgrade user to paid (protected) |

### Social Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/google` | Initiate Google OAuth |
| GET | `/api/auth/google/callback` | Google OAuth callback |
| GET | `/api/auth/facebook` | Initiate Facebook OAuth |
| GET | `/api/auth/facebook/callback` | Facebook OAuth callback |
| GET | `/api/auth/apple` | Initiate Apple OAuth |
| POST | `/api/auth/apple/callback` | Apple OAuth callback |
| GET | `/api/auth/vk` | Initiate VK OAuth |
| GET | `/api/auth/vk/callback` | VK OAuth callback |

---

## 🗄️ Database Schema

### User Model Fields

```javascript
{
  fullName: String,           // User's full name
  email: String,              // Email (unique)
  passwordHash: String,       // Hashed password (optional for social logins)
  provider: String,           // 'local', 'google', 'facebook', 'apple', 'vk'
  providerId: String,         // Unique ID from social provider
  type: String,               // 'unpay', 'pay', 'Baned'
  emailConfirmed: Boolean,    // true for social logins, false until verified
  emailConfirmToken: String,  // Token for email confirmation
  emailConfirmExpires: Date,  // Token expiration
  createdAt: Date,            // Account creation date
  orders: []                  // User's try-on orders
}
```

---

## 🎨 Frontend Integration

### Social Login Buttons

Social login buttons are automatically displayed on:
- `/login` - Login page
- `/register` - Registration page

Clicking a social button initiates the OAuth flow:
1. User clicks "Login with Google" (or other provider)
2. Redirected to provider's login page
3. User authorizes the application
4. Redirected back to `/dashboard` with JWT cookie set

### Styling

Social buttons use modern, clean design with:
- Provider brand colors
- SVG icons
- Hover effects
- Responsive grid layout

CSS is located in `/auth/login/social-auth.css`

---

## 🔒 Security Features

### Password Security
- Passwords hashed with **bcrypt** (12 rounds)
- Passwords **not required** for social logins

### JWT Tokens
- Signed with `JWT_SECRET` from environment variables
- 7-day expiration
- HttpOnly cookies for XSS protection

### Email Confirmation
- **Local registrations**: Must confirm email before login
- **Social logins**: Email auto-confirmed (trusted by OAuth provider)

### Session Security
- Express session with secure cookies in production
- CSRF protection recommended for production

---

## 🚦 User Flow

### Local Registration
1. User fills registration form
2. Account created with `emailConfirmed: false`
3. Confirmation token generated (24h expiration)
4. User redirected to confirmation page
5. User confirms email via token
6. `emailConfirmed` set to `true`
7. User can now login

### Social Registration/Login
1. User clicks social login button
2. Redirected to OAuth provider
3. User authorizes application
4. System checks if email exists:
   - **If exists**: Login existing user
   - **If new**: Create account with `emailConfirmed: true`
5. JWT token issued
6. User redirected to dashboard

---

## 🧪 Testing

### Test Local Authentication

```bash
# Register a new user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Test User","email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Test Social Authentication

Simply visit:
- `http://localhost:3000/login` - Click any social button
- `http://localhost:3000/register` - Click any social button

---

## 🐛 Troubleshooting

### Google OAuth "redirect_uri_mismatch"
- Ensure redirect URI in Google Console exactly matches: `http://localhost:3000/api/auth/google/callback`
- Check protocol (http vs https)
- Check port number

### Facebook OAuth "URL Blocked"
- Add callback URL in Facebook App Settings → Facebook Login → Valid OAuth Redirect URIs
- Ensure app is not in development mode restrictions

### Apple OAuth Not Working
- Apple requires HTTPS in production
- Ensure private key is correctly formatted in `.env`
- Check Team ID, Key ID, and Service ID are correct

### VK OAuth Failing
- Ensure application is set to "Standalone"
- Check redirect URI matches exactly
- VK requires email scope to be explicitly requested

### MongoDB Connection Error
- Ensure MongoDB is running
- Check `MONGO_URI` in `.env`
- Verify network access if using MongoDB Atlas

---

## 📝 Important Notes

### Email Confirmation Behavior
- **Local signup**: `emailConfirmed` starts as `false`
- **Social signup**: `emailConfirmed` automatically set to `true`
- Users cannot login until email is confirmed (local only)

### Provider Field
The `provider` field tracks how the user registered:
- `'local'` - Email/password registration
- `'google'` - Google OAuth
- `'facebook'` - Facebook OAuth
- `'apple'` - Apple OAuth
- `'vk'` - VK OAuth

### Account Linking
If a user registers locally and later uses social login with the same email:
- The account is automatically linked
- Provider and providerId are updated
- User can login via either method

---

## 🚀 Production Deployment

### Before Deploying

1. **Update callback URLs**:
   - Change all OAuth callback URLs to use HTTPS and your production domain
   - Example: `https://yourdomain.com/api/auth/google/callback`

2. **Set environment variables**:
   ```
   NODE_ENV=production
   CLIENT_ORIGIN=https://yourdomain.com
   ```

3. **Use strong secrets**:
   ```bash
   # Generate random secrets
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

4. **Enable HTTPS**:
   - Required for Apple OAuth
   - Strongly recommended for all providers
   - Use reverse proxy (nginx) or hosting provider SSL

5. **Update OAuth apps**:
   - Add production URLs to all OAuth provider settings
   - For Facebook: Add domain to App Domains
   - For Apple: Add production domain to Return URLs

---

## 📚 Additional Resources

- [Passport.js Documentation](http://www.passportjs.org/)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Facebook Login](https://developers.facebook.com/docs/facebook-login/)
- [Sign in with Apple](https://developer.apple.com/sign-in-with-apple/)
- [VK OAuth](https://dev.vk.com/api/oauth-api)

---

## 🤝 Support

For issues or questions:
1. Check the troubleshooting section above
2. Verify your .env configuration
3. Check server console logs for detailed error messages
4. Ensure all OAuth credentials are correctly configured

---

**Built with ❤️ using Node.js, Express, Passport.js, and MongoDB**
