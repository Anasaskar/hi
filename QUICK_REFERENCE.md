# Quick Reference: Auth & i18n

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set environment variables
cp .env.example .env
# Edit .env with your values

# 3. Run migration (if you have existing users)
npm run migrate:provider

# 4. Start server
npm start
```

## 🔑 Environment Variables

```bash
# Required for Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# Required for security
JWT_SECRET=your-random-secret-key
SESSION_SECRET=your-session-secret

# Database
MONGO_URI=mongodb://localhost:27017/virtufit

# Optional
NODE_ENV=development
PORT=3000
```

## 📍 Key Endpoints

### Authentication
- `POST /api/auth/register` - Register with email/password
- `POST /api/auth/login` - Login with email/password
- `GET /api/auth/google` - Login with Google
- `GET /logout` - Logout and redirect to home

### Language
- `GET /set-lang/en` - Switch to English
- `GET /set-lang/ar` - Switch to Arabic

### Protected Routes
- `GET /dashboard` - Requires paid subscription
- `GET /api/user/info` - Get current user info

## 🔄 How It Works

### Redirection Logic
```
Local Login → /pricing-page
Google Login → /pricing-page
Logout → /
Unauthorized → /login
```

### Provider Linking
When user logs in with Google using email that already exists:
1. ✅ Updates existing user's `provider` to `'google'`
2. ✅ Adds `providerId` from Google
3. ❌ Does NOT create duplicate account

### Language Detection
1. Check `lang` cookie (highest priority)
2. Check `Accept-Language` header
3. Fallback to English

## 🧪 Quick Test

```bash
# Test language detection
curl -H "Accept-Language: ar" http://localhost:3000/ -c cookies.txt

# Test login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"pass"}' \
  -c cookies.txt

# Test logout
curl http://localhost:3000/logout -b cookies.txt -L
```

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Google OAuth not working | Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env` |
| Redirect URI mismatch | Add callback URL to Google Cloud Console |
| Session not persisting | Ensure `SESSION_SECRET` is set |
| Language always English | Check i18n middleware is applied in server.js |
| Migration fails | Verify MongoDB is running and `MONGO_URI` is correct |

## 📚 Full Documentation

- **Complete Guide**: See `AUTH_I18N_IMPLEMENTATION.md`
- **Test Cases**: See `TEST_PLAN.md`
- **Commit Info**: See `COMMIT_MESSAGE.md`
- **PR Details**: See `PR_DESCRIPTION.md`

## 🎯 Common Tasks

### Add New Language
1. Create `locales/fr.json` (or other language code)
2. Add `'fr'` to `locales` array in `middleware/i18n.js`
3. Add `'fr'` to `supportedLangs` in `/set-lang/:lang` route

### Change Redirect After Login
Edit `controllers/authController.js`:
```javascript
// Change this line in login() and socialAuthCallback()
redirect: '/pricing-page'  // Change to your desired route
```

### Protect New Route
```javascript
const { ensureAuth, requirePaid } = require('./middleware/auth');

// Requires login
app.get('/my-route', ensureAuth, (req, res) => {
  // req.user is available
});

// Requires paid subscription
app.get('/premium-route', ensureAuth, requirePaid, (req, res) => {
  // Only paid users can access
});
```

### Access User Data in Route
```javascript
app.get('/profile', ensureAuth, (req, res) => {
  console.log(req.user.email);       // User's email
  console.log(req.user.provider);    // 'local' or 'google'
  console.log(req.user.type);        // 'pay' or 'unpay'
  console.log(req.user.fullName);    // User's name
});
```

### Use Translations in Templates
```javascript
// Access in route handler
app.get('/my-page', (req, res) => {
  const lang = res.locals.lang;              // 'en' or 'ar'
  const welcomeText = res.locals.t('welcome'); // Translated string
  
  res.render('page', { lang, welcomeText });
});
```

## 🔒 Security Best Practices

✅ **DO**:
- Use HTTPS in production (`NODE_ENV=production`)
- Keep `JWT_SECRET` and `SESSION_SECRET` random and secret
- Rotate secrets periodically
- Set strong `GOOGLE_CLIENT_SECRET`

❌ **DON'T**:
- Commit `.env` file to git
- Share secrets in public repos
- Use default secrets in production
- Store passwords in plain text

## 📊 Database Queries

```javascript
// Find user by email
db.users.findOne({ email: "user@example.com" })

// Check user's provider
db.users.findOne(
  { email: "user@example.com" },
  { provider: 1, providerId: 1 }
)

// Count users by provider
db.users.countDocuments({ provider: 'local' })
db.users.countDocuments({ provider: 'google' })

// Find users without provider (need migration)
db.users.find({ provider: { $exists: false } })
```

## 🎨 Navigation States

**Logged Out:**
- See: Login, Sign Up buttons
- Can access: Home, Pricing, Contact, Login, Register
- Cannot access: Dashboard, protected API routes

**Logged In (Unpaid):**
- See: Logout button
- Can access: Home, Pricing, Contact
- Cannot access: Dashboard, try-on features

**Logged In (Paid):**
- See: Logout button
- Can access: Everything including Dashboard

## 💡 Tips

- Run migration after pulling changes: `npm run migrate:provider`
- Check server logs for confirmation URLs (local auth)
- Use `npm run dev` for auto-reload during development
- Test OAuth with real Google account (test mode works differently)
- Language cookie expires in 1 year (can change in code)
- JWT tokens expire in 7 days (can change in code)

---

**Need more details?** See `AUTH_I18N_IMPLEMENTATION.md`
