# 🚀 Quick Start - Email Verification with Brevo

Get your email verification system running in 5 minutes!

## Step 1: Install Dependencies

```bash
npm install
```

All required dependencies are already in `package.json`. No new packages needed!

## Step 2: Start MongoDB

Make sure MongoDB is running on your system:

```bash
# Windows
mongod

# Or if using MongoDB service
net start MongoDB
```

## Step 3: Start the Server

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

You should see:
```
🚀 Server running at http://localhost:3000
 MongoDB connected
```

## Step 4: Test Registration

**Option A: Using Browser**

1. Open http://localhost:3000/register
2. Fill in the registration form:
   - Full Name: Your Name
   - Email: your-email@example.com
   - Password: SecurePassword123
3. Click "Register"
4. Check your email inbox!

**Option B: Using cURL**

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test User",
    "email": "test@example.com",
    "password": "SecurePassword123"
  }'
```

## Step 5: Check Your Email

You should receive an email with:
- Subject: "تأكيد البريد الإلكتروني - CloyAi"
- Professional HTML design
- "Verify Email" button
- 24-hour expiry notice

## Step 6: Click Verification Link

Click the button in the email, or copy the verification URL to your browser.

Your email will be confirmed automatically!

## Step 7: Login

Now you can login:

**Using Browser:**
1. Go to http://localhost:3000/login
2. Enter email and password
3. Click "Login"
4. You're in! 🎉

**Using cURL:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePassword123"
  }'
```

## ✅ That's It!

Your email verification system is now fully functional with Brevo!

## 🔍 Verify It Works

Check your server console logs. You should see:

```
✅ New local user saved: test@example.com
📧 Confirmation URL: http://localhost:3000/auth/confirm/...
✅ Verification email sent successfully to: test@example.com
📧 Brevo Message ID: <some-id>
✅ Email confirmed: test@example.com
✅ Login successful: test@example.com
```

## 📊 Check Database

```javascript
// MongoDB shell
use virtufit
db.users.findOne({ email: "test@example.com" })

// Should show:
// emailConfirmed: true ✅
```

## 🎯 What's Working

✅ User registration with email/password  
✅ Automatic verification email via Brevo  
✅ Beautiful HTML email template  
✅ Email verification with secure tokens  
✅ Login blocked until email verified  
✅ Login works after verification  
✅ Resend email functionality  
✅ Token expiration (24 hours)  
✅ Error handling  

## 🐛 Troubleshooting

### Email not received?

1. **Check spam folder**
2. **Check server logs** for error messages
3. **Verify Brevo API key** (already configured)
4. **Check console** for "✅ Verification email sent successfully"

### Can't login?

1. **Verify email first** - check inbox
2. **Check password** is correct
3. **Look at server response** - it will tell you the issue

### Token expired?

Click "Resend confirmation email" on the verification page, or call:

```bash
curl -X POST http://localhost:3000/api/auth/resend-confirm \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

## 📚 More Information

- **Full Documentation**: See `README.md`
- **Testing Guide**: See `TESTING_GUIDE.md`
- **Implementation Details**: See `BREVO_IMPLEMENTATION_SUMMARY.md`

## 🎉 Success!

You now have a production-ready email verification system powered by Brevo!

**No Zoho anymore!** All email verification is handled by Brevo's reliable API.

---

**Need help?** Check the server logs - they provide detailed information about what's happening.
