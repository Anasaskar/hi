# Email Verification Testing Guide

This guide will help you test the new Brevo email verification system.

## Prerequisites

1. MongoDB is running
2. All dependencies are installed: `npm install`
3. Server is running: `npm start` or `npm run dev`

## Testing Steps

### 1. Test User Registration

**Endpoint:** `POST http://localhost:3000/api/auth/register`

**Request Body:**
```json
{
  "fullName": "Test User",
  "email": "test@example.com",
  "password": "SecurePassword123"
}
```

**Expected Response:**
```json
{
  "message": "تم إنشاء الحساب بنجاح. تم إرسال رسالة التأكيد إلى بريدك الإلكتروني.",
  "email": "test@example.com",
  "emailSent": true
}
```

**What Happens:**
- New user created in MongoDB
- `emailConfirmed` field set to `false`
- `emailConfirmToken` generated (40-character hex string)
- `emailConfirmExpires` set to 24 hours from now
- Verification email sent via Brevo API

**Check Server Logs:**
```
✅ New local user saved: test@example.com
📧 Confirmation URL: http://localhost:3000/auth/confirm/confirm_page.html?token=...
✅ Verification email sent successfully to: test@example.com
📧 Brevo Message ID: <message-id>
```

### 2. Check Email in Inbox

The user should receive an email with:
- Subject: "تأكيد البريد الإلكتروني - CloyAi"
- Beautiful HTML template with RTL support
- Verification button linking to confirmation page
- 24-hour expiry notice

### 3. Test Login Before Confirmation (Should Fail)

**Endpoint:** `POST http://localhost:3000/api/auth/login`

**Request Body:**
```json
{
  "email": "test@example.com",
  "password": "SecurePassword123"
}
```

**Expected Response:**
```json
{
  "message": "يجب تأكيد البريد الإلكتروني قبل تسجيل الدخول."
}
```

**Status Code:** `403 Forbidden`

### 4. Verify Email Address

**Method 1: Click Link in Email**
- Open email and click verification button
- Browser opens: `http://localhost:3000/auth/confirm/confirm_page.html?token=TOKEN&email=EMAIL`
- Page automatically verifies the token

**Method 2: Manual API Call**

**Endpoint:** `POST http://localhost:3000/api/auth/confirm`

**Request Body:**
```json
{
  "email": "test@example.com",
  "token": "YOUR_TOKEN_FROM_DATABASE"
}
```

**Expected Response:**
```json
{
  "message": "Email confirmed successfully"
}
```

**Check Database:**
```javascript
// In MongoDB
db.users.findOne({ email: "test@example.com" })

// Should show:
{
  emailConfirmed: true,
  emailConfirmToken: undefined,
  emailConfirmExpires: undefined
}
```

### 5. Test Login After Confirmation (Should Succeed)

**Endpoint:** `POST http://localhost:3000/api/auth/login`

**Request Body:**
```json
{
  "email": "test@example.com",
  "password": "SecurePassword123"
}
```

**Expected Response:**
```json
{
  "message": "تم تسجيل الدخول بنجاح",
  "redirect": "/pricing-page"
}
```

**Status Code:** `200 OK`

**What Happens:**
- JWT token created
- Cookie set with token
- User redirected to pricing page

### 6. Test Resend Verification Email

**Endpoint:** `POST http://localhost:3000/api/auth/resend-confirm`

**Request Body:**
```json
{
  "email": "test@example.com"
}
```

**Expected Response (if not yet confirmed):**
```json
{
  "message": "تم إرسال رسالة التأكيد بنجاح. يرجى التحقق من صندوق الوارد.",
  "email": "test@example.com"
}
```

**Expected Response (if already confirmed):**
```json
{
  "message": "البريد الإلكتروني مؤكد بالفعل"
}
```

### 7. Test Token Expiration

**Manually in MongoDB:**
```javascript
// Expire the token
db.users.updateOne(
  { email: "test@example.com" },
  { $set: { emailConfirmExpires: new Date("2020-01-01") } }
)
```

**Then try to verify:**

**Endpoint:** `POST http://localhost:3000/api/auth/confirm`

**Expected Response:**
```json
{
  "message": "Token expired"
}
```

**Status Code:** `400 Bad Request`

## Database Verification

### Check User Document

```javascript
// MongoDB Shell
use virtufit

// Find user
db.users.findOne({ email: "test@example.com" })

// Expected fields:
{
  _id: ObjectId("..."),
  fullName: "Test User",
  email: "test@example.com",
  passwordHash: "$2b$12$...",
  provider: "local",
  emailConfirmed: true,  // false before verification
  emailConfirmToken: "abc123...",  // undefined after verification
  emailConfirmExpires: ISODate("2025-..."),  // undefined after verification
  type: "unpay",
  createdAt: ISODate("2025-..."),
  orders: []
}
```

## Brevo Dashboard Verification

1. Go to https://app.brevo.com/
2. Login with your Brevo account
3. Navigate to **Email** > **Transactional**
4. Check recent email sends
5. Verify:
   - Email was sent successfully
   - Delivery status
   - Open/click rates (if tracked)

## Common Issues and Solutions

### Issue: Email not received

**Possible Causes:**
1. Brevo API key invalid
2. Email in spam folder
3. Brevo account suspended or out of credits
4. Sender email not verified in Brevo

**Solutions:**
1. Check server logs for errors
2. Verify API key in `.env`
3. Check Brevo dashboard for account status
4. Check spam folder

### Issue: Token invalid or expired

**Possible Causes:**
1. Token expired (24 hours passed)
2. User already verified
3. Token mismatch

**Solutions:**
1. Request new verification email
2. Check database for current token
3. Ensure token in URL matches database

### Issue: Can't login after verification

**Possible Causes:**
1. Database not updated correctly
2. Wrong password
3. User not found

**Solutions:**
1. Check `emailConfirmed` field in database
2. Verify password is correct
3. Check user exists with exact email

## Testing with Postman

### Import Collection

Create a Postman collection with these requests:

```json
{
  "info": { "name": "CloyAi Auth Tests" },
  "item": [
    {
      "name": "Register",
      "request": {
        "method": "POST",
        "url": "http://localhost:3000/api/auth/register",
        "body": {
          "mode": "raw",
          "raw": "{\"fullName\":\"Test User\",\"email\":\"test@example.com\",\"password\":\"SecurePass123\"}"
        }
      }
    },
    {
      "name": "Login (Before Confirm)",
      "request": {
        "method": "POST",
        "url": "http://localhost:3000/api/auth/login",
        "body": {
          "mode": "raw",
          "raw": "{\"email\":\"test@example.com\",\"password\":\"SecurePass123\"}"
        }
      }
    },
    {
      "name": "Confirm Email",
      "request": {
        "method": "POST",
        "url": "http://localhost:3000/api/auth/confirm",
        "body": {
          "mode": "raw",
          "raw": "{\"email\":\"test@example.com\",\"token\":\"PUT_TOKEN_HERE\"}"
        }
      }
    },
    {
      "name": "Login (After Confirm)",
      "request": {
        "method": "POST",
        "url": "http://localhost:3000/api/auth/login",
        "body": {
          "mode": "raw",
          "raw": "{\"email\":\"test@example.com\",\"password\":\"SecurePass123\"}"
        }
      }
    },
    {
      "name": "Resend Confirmation",
      "request": {
        "method": "POST",
        "url": "http://localhost:3000/api/auth/resend-confirm",
        "body": {
          "mode": "raw",
          "raw": "{\"email\":\"test@example.com\"}"
        }
      }
    }
  ]
}
```

## Security Testing

### Test Invalid Tokens

1. Try random token strings
2. Try expired tokens
3. Try tokens from different users

### Test Email Injection

1. Try special characters in email
2. Try SQL injection patterns
3. Try XSS patterns

### Expected Behavior

All malicious inputs should be rejected with appropriate error messages, and no security vulnerabilities should be exploitable.

## Production Testing Checklist

- [ ] Environment variables configured correctly
- [ ] HTTPS enabled (`NODE_ENV=production`)
- [ ] Brevo API key is production key
- [ ] Email sender domain verified in Brevo
- [ ] Database connection to production MongoDB
- [ ] JWT secret is strong and unique
- [ ] Session secret is strong and unique
- [ ] CORS configured for production domain
- [ ] Error messages don't leak sensitive information
- [ ] Rate limiting implemented (optional but recommended)

## Success Criteria

✅ User can register with email/password  
✅ Verification email sent immediately after registration  
✅ Email received with correct verification link  
✅ User cannot login before email verification  
✅ Clicking verification link confirms email  
✅ User can login after email confirmation  
✅ Resend functionality works for unconfirmed users  
✅ Expired tokens are rejected  
✅ Invalid tokens are rejected  
✅ All error cases handled gracefully  

---

**All tests passed?** Your email verification system is working correctly! 🎉
