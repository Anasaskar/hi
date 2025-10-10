# Test Plan: Authentication & Internationalization

## Test Environment Setup

### Prerequisites
- Node.js installed
- MongoDB running locally or remote instance accessible
- `.env` file configured with required variables
- Google OAuth credentials configured

### Environment Variables Required
```bash
MONGO_URI=mongodb://localhost:27017/virtufit
JWT_SECRET=test-jwt-secret
SESSION_SECRET=test-session-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
```

---

## 1. Local Authentication Tests

### Test 1.1: User Registration (Email/Password)

**Objective:** Verify new user can register with email and password

**Steps:**
1. Navigate to `/register`
2. Fill in registration form:
   - Full Name: "Test User"
   - Email: "testuser@example.com"
   - Password: "SecurePass123"
3. Submit form
4. Check server logs for confirmation URL

**Expected Result:**
- HTTP 201 response
- User created in database with:
  - `provider: 'local'`
  - `emailConfirmed: false`
  - `passwordHash` exists (bcrypt hash)
- Confirmation token generated
- Confirmation URL logged to console

**Verification Query:**
```javascript
db.users.findOne({ email: "testuser@example.com" })
```

---

### Test 1.2: Email Confirmation

**Objective:** Verify email confirmation process

**Steps:**
1. Register user (Test 1.1)
2. Copy confirmation URL from server logs
3. Navigate to confirmation page
4. Enter email and token
5. Submit confirmation

**Expected Result:**
- HTTP 200 response
- User's `emailConfirmed` updated to `true`
- `emailConfirmToken` and `emailConfirmExpires` cleared

**Verification Query:**
```javascript
db.users.findOne(
  { email: "testuser@example.com" },
  { emailConfirmed: 1, emailConfirmToken: 1 }
)
// Should show: { emailConfirmed: true, emailConfirmToken: null }
```

---

### Test 1.3: Local Login Success

**Objective:** Verify successful login with correct credentials

**Steps:**
1. Navigate to `/login`
2. Enter credentials:
   - Email: "testuser@example.com"
   - Password: "SecurePass123"
3. Submit form

**Expected Result:**
- HTTP 200 response with `{ redirect: '/pricing-page' }`
- JWT token set in `token` cookie (HttpOnly)
- Browser redirects to `/pricing-page`
- User can access protected routes

**Verification:**
- Check cookies in browser DevTools
- Access `/dashboard` - should not redirect to login

---

### Test 1.4: Local Login - Wrong Password

**Objective:** Verify login fails with incorrect password

**Steps:**
1. Navigate to `/login`
2. Enter credentials:
   - Email: "testuser@example.com"
   - Password: "WrongPassword"
3. Submit form

**Expected Result:**
- HTTP 401 response
- Error message: "كلمة المرور غير صحيحة" (Incorrect password)
- No token cookie set
- User remains on login page

---

### Test 1.5: Local Login - Unconfirmed Email

**Objective:** Verify unconfirmed users cannot login

**Steps:**
1. Register new user but don't confirm email
2. Attempt to login with correct credentials

**Expected Result:**
- HTTP 403 response
- Error message: "يجب تأكيد البريد الإلكتروني قبل تسجيل الدخول." (Must confirm email)
- No token cookie set

---

## 2. Google OAuth Tests

### Test 2.1: Google Login - New User

**Objective:** Verify new user can register via Google OAuth

**Prerequisites:**
- Gmail account not previously registered: "newuser@gmail.com"

**Steps:**
1. Navigate to `/login`
2. Click "Login with Google" button (redirects to `/api/auth/google`)
3. Complete Google authentication flow
4. Grant permissions

**Expected Result:**
- Google callback returns to `/api/auth/google/callback`
- New user created in database with:
  - `provider: 'google'`
  - `providerId: [Google user ID]`
  - `emailConfirmed: true`
  - `passwordHash: undefined`
- JWT token set in cookie
- Browser redirects to `/pricing-page`

**Verification Query:**
```javascript
db.users.findOne(
  { email: "newuser@gmail.com" },
  { provider: 1, providerId: 1, emailConfirmed: 1 }
)
// Should show: { provider: 'google', providerId: '...', emailConfirmed: true }
```

---

### Test 2.2: Google Login - Account Linking

**Objective:** Verify existing local account links to Google without creating duplicate

**Prerequisites:**
- Existing local user: "existing@gmail.com" with `provider: 'local'`

**Steps:**
1. Verify user exists in database:
   ```javascript
   db.users.findOne({ email: "existing@gmail.com" })
   ```
2. Navigate to `/login`
3. Click "Login with Google"
4. Authenticate with Google using "existing@gmail.com"
5. Grant permissions

**Expected Result:**
- User's `provider` updated from `'local'` to `'google'`
- `providerId` added to user document
- `emailConfirmed` set to `true`
- **No duplicate user created** - still only 1 user with that email
- JWT token set
- Browser redirects to `/pricing-page`

**Verification Queries:**
```javascript
// Should return 1 (not 2)
db.users.countDocuments({ email: "existing@gmail.com" })

// Should show updated provider
db.users.findOne(
  { email: "existing@gmail.com" },
  { provider: 1, providerId: 1 }
)
// Result: { provider: 'google', providerId: '...' }
```

**Critical Check:**
```javascript
// Run BEFORE and AFTER - count should be same
const before = db.users.countDocuments({});
// ... perform test ...
const after = db.users.countDocuments({});
console.log(before === after); // Should be true
```

---

### Test 2.3: Google Login - Failure Handling

**Objective:** Verify proper error handling when OAuth fails

**Steps:**
1. Navigate to `/api/auth/google`
2. Cancel/deny Google authentication
3. Observe redirect

**Expected Result:**
- Browser redirects to `/login?error=google_auth_failed`
- No token cookie set
- No user created or modified

---

### Test 2.4: Mixed Provider Login Prevention

**Objective:** Verify users cannot login with wrong provider

**Prerequisites:**
- User registered with Google: "googleuser@gmail.com"

**Steps:**
1. Navigate to `/login`
2. Try to login with email/password:
   - Email: "googleuser@gmail.com"
   - Password: "anypassword"

**Expected Result:**
- HTTP 401 response
- Error message: "This account is registered with google. Please use that method to login."
- No token cookie set

---

## 3. Internationalization (i18n) Tests

### Test 3.1: Language Detection from Header

**Objective:** Verify Accept-Language header detection

**Steps:**
1. Clear all cookies
2. Set browser language to Arabic (ar)
3. Navigate to `/` (home page)
4. Check server logs for detected language
5. Inspect `lang` cookie

**Expected Result:**
- Server logs: "Language set to: ar" (if /set-lang was called) or language detected from header
- `res.locals.lang` set to `'ar'`
- Cookie `lang=ar` set automatically

**Manual Test (cURL):**
```bash
curl -H "Accept-Language: ar" http://localhost:3000/ -c cookies.txt
cat cookies.txt | grep lang
# Should show: lang=ar
```

---

### Test 3.2: Language Cookie Persistence

**Objective:** Verify language choice persists across sessions

**Steps:**
1. Navigate to `/set-lang/ar`
2. Check cookies (should have `lang=ar`)
3. Close browser tab
4. Open new tab and navigate to `/`
5. Verify language is still Arabic

**Expected Result:**
- Cookie persists for 1 year
- Language remains Arabic without re-detection

---

### Test 3.3: Language Switching

**Objective:** Verify language switcher works

**Steps:**
1. Set language to English: `/set-lang/en`
2. Verify redirect to previous page or home
3. Check cookie: `lang=en`
4. Set language to Arabic: `/set-lang/ar`
5. Verify redirect and cookie updated

**Expected Result:**
- Each request sets cookie and redirects back
- Cookie value updates correctly
- No errors in console

---

### Test 3.4: Fallback to Default Language

**Objective:** Verify fallback to English when language unsupported

**Steps:**
1. Clear all cookies
2. Set Accept-Language to unsupported language (e.g., "fr" for French)
3. Navigate to `/`

**Expected Result:**
- Language defaults to `'en'`
- No errors or crashes
- `res.locals.lang === 'en'`

---

## 4. Logout Tests

### Test 4.1: Logout Functionality

**Objective:** Verify logout clears session and redirects

**Steps:**
1. Login as any user (local or Google)
2. Navigate to `/logout`

**Expected Result:**
- `token` cookie cleared
- Passport session destroyed
- Browser redirects to `/` (home page)
- User is logged out

**Verification:**
- Check cookies - `token` should be gone
- Try to access `/dashboard` - should redirect to `/login`

---

### Test 4.2: Post-Logout Route Access

**Objective:** Verify protected routes inaccessible after logout

**Steps:**
1. Login as user
2. Access `/dashboard` (should work)
3. Logout
4. Try to access `/dashboard` again

**Expected Result:**
- After logout, accessing `/dashboard` redirects to `/login`
- No cached data displayed

---

## 5. Route Protection Tests

### Test 5.1: Dashboard Access (Paid Only)

**Objective:** Verify dashboard requires paid subscription

**Steps:**
1. Login as user with `type: 'unpay'`
2. Navigate to `/dashboard`

**Expected Result:**
- Redirect to `/pricing-page`
- User cannot access dashboard

**Steps (Paid User):**
1. Login as user with `type: 'pay'`
2. Navigate to `/dashboard`

**Expected Result:**
- Dashboard page loads successfully
- No redirect

---

### Test 5.2: Public Route Access

**Objective:** Verify home page accessible by logged-in users

**Steps:**
1. Logout (ensure not logged in)
2. Navigate to `/`
3. Verify page loads
4. Login as any user
5. Navigate to `/`
6. Verify page still loads

**Expected Result:**
- Home page accessible by everyone
- Logged-in users can still view home page
- Logout button visible when logged in

---

## 6. Migration Script Tests

### Test 6.1: Migrate Existing Users

**Objective:** Verify migration script updates users without provider

**Setup:**
1. Manually create users without provider:
   ```javascript
   db.users.insertOne({
     email: "olduser1@example.com",
     fullName: "Old User 1",
     passwordHash: "$2b$12$...", // bcrypt hash
     emailConfirmed: true
   })
   
   db.users.insertOne({
     email: "olduser2@example.com",
     fullName: "Old User 2",
     providerId: "12345678",
     emailConfirmed: true
   })
   ```

**Steps:**
1. Run migration: `node scripts/migrate-provider.js`
2. Check console output
3. Verify database updates

**Expected Result:**
- Console shows: "Found 2 users to update"
- olduser1: `provider: 'local'` (has passwordHash)
- olduser2: `provider: 'google'` (has providerId)
- Console shows summary with counts

**Verification Queries:**
```javascript
db.users.findOne({ email: "olduser1@example.com" }, { provider: 1 })
// Result: { provider: 'local' }

db.users.findOne({ email: "olduser2@example.com" }, { provider: 1 })
// Result: { provider: 'google' }
```

---

### Test 6.2: Migration Idempotency

**Objective:** Verify running migration twice doesn't cause issues

**Steps:**
1. Run migration: `node scripts/migrate-provider.js`
2. Note the "Found X users to update" count
3. Run migration again immediately

**Expected Result:**
- Second run shows: "Found 0 users to update"
- Message: "No users need updating. All users have a provider set."
- No errors or data corruption

---

## 7. Integration Tests

### Test 7.1: Complete User Journey - Local Auth

**Objective:** Test full user lifecycle with local authentication

**Steps:**
1. Register: POST `/api/auth/register`
2. Confirm email: POST `/api/auth/confirm`
3. Login: POST `/api/auth/login`
4. Access protected route: GET `/api/user/info`
5. Logout: GET `/logout`
6. Try to access protected route again

**Expected Results:**
- Registration: HTTP 201
- Confirmation: HTTP 200
- Login: HTTP 200, cookie set, redirect to `/pricing-page`
- User info: HTTP 200 with user data
- Logout: Redirect to `/`, cookie cleared
- Protected route after logout: Redirect to `/login`

---

### Test 7.2: Complete User Journey - Google OAuth

**Objective:** Test full user lifecycle with Google authentication

**Steps:**
1. Navigate to `/login`
2. Click "Login with Google"
3. Complete OAuth flow
4. Access protected route: GET `/api/user/info`
5. Logout: GET `/logout`
6. Login with Google again

**Expected Results:**
- OAuth flow completes successfully
- Redirect to `/pricing-page`
- User info accessible
- Logout clears session
- Second login uses same account (no duplicate)

---

## 8. Error Handling Tests

### Test 8.1: Invalid JWT Token

**Objective:** Verify invalid tokens are rejected

**Steps:**
1. Manually set invalid token cookie: `token=invalid.jwt.token`
2. Try to access `/dashboard`

**Expected Result:**
- Cookie cleared
- Redirect to `/login`
- Server logs: "Invalid token"

---

### Test 8.2: Expired JWT Token

**Objective:** Verify expired tokens are rejected

**Steps:**
1. Login and get valid token
2. Manually expire token (or wait 7 days)
3. Try to access protected route

**Expected Result:**
- HTTP 401 or redirect to `/login`
- Token cookie cleared

---

### Test 8.3: Database Connection Loss

**Objective:** Verify graceful error handling when DB unavailable

**Steps:**
1. Stop MongoDB service
2. Try to login
3. Start MongoDB service

**Expected Result:**
- HTTP 500 response with server error message
- No server crash
- After DB restart, functionality resumes

---

## Test Execution Checklist

- [ ] All environment variables set
- [ ] MongoDB running
- [ ] Google OAuth credentials configured
- [ ] Server running on port 3000
- [ ] Test database cleared before tests
- [ ] All 20+ test cases passed
- [ ] No errors in server logs
- [ ] No console errors in browser
- [ ] Cookies set correctly
- [ ] Redirects working as expected
- [ ] Migration script tested
- [ ] Documentation reviewed

---

## Automated Test Script (Optional)

```javascript
// test-auth-flow.js
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testLocalAuth() {
  console.log('Testing local authentication...');
  
  // Register
  const registerRes = await axios.post(`${BASE_URL}/api/auth/register`, {
    fullName: 'Test User',
    email: 'test@example.com',
    password: 'Password123'
  });
  console.log('✅ Registration:', registerRes.status);
  
  // Login (will fail - email not confirmed)
  try {
    await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'test@example.com',
      password: 'Password123'
    });
  } catch (err) {
    console.log('✅ Email confirmation required:', err.response.status === 403);
  }
}

testLocalAuth();
```

---

## Success Criteria

✅ **All tests pass**
- Local registration and login working
- Google OAuth working with new users
- Google OAuth linking existing accounts (no duplicates)
- Language detection from header working
- Language cookie persistence working
- Logout clearing session and redirecting
- Protected routes properly secured
- Migration script updating existing users
- No errors in logs during normal operation

✅ **Security verified**
- Passwords hashed with bcrypt
- JWT tokens HttpOnly
- Sessions secure in production
- Invalid tokens rejected
- Banned users blocked

✅ **UX requirements met**
- Redirect to `/pricing-page` after login
- Home page accessible to all users
- Logout visible when logged in
- Mobile menu includes login button
- Language switcher works

---

**Test Plan Version:** 1.0.0  
**Last Updated:** 2025-10-10  
**Status:** Ready for execution
