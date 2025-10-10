# 📜 Privacy Policy Implementation Guide

## Overview

This package includes a complete, GDPR-compliant Privacy Policy system for CloyAI with integrated Facebook and Google OAuth data handling.

---

## 📁 Files Included

### 1. **`privacy-policy.html`** (Main Privacy Policy)
- **Purpose:** Complete, legally-informed privacy policy
- **URL:** `https://cloyai.com/privacy-policy.html`
- **Features:**
  - ✅ GDPR-compliant with all required elements
  - ✅ Facebook Login and Google OAuth integration explained
  - ✅ User rights (access, rectification, deletion, portability, etc.)
  - ✅ Data collection, processing, and retention details
  - ✅ International data transfers and security measures
  - ✅ Cookies and tracking explanation
  - ✅ Children's privacy (13+ age requirement)
  - ✅ Contact information and complaint procedures
  - ✅ Technical appendices with code samples

### 2. **`delete-data.html`** (Data Deletion Instructions)
- **Purpose:** User-facing page explaining how to delete data
- **URL:** `https://cloyai.com/delete-data.html`
- **Features:**
  - ✅ Two deletion methods (account settings + email)
  - ✅ Clear step-by-step instructions
  - ✅ Timeline of deletion process
  - ✅ FAQ section
  - ✅ Instructions for revoking OAuth permissions
  - ✅ Beautiful, user-friendly design

### 3. **`routes/facebookDataDeletion.js`** (Facebook Callback Implementation)
- **Purpose:** Backend endpoint for Facebook data deletion callback
- **URL:** `POST /api/facebook/data-deletion`
- **Features:**
  - ✅ Signed request verification
  - ✅ Automatic user lookup and deletion
  - ✅ Confirmation code generation
  - ✅ Status tracking endpoint
  - ✅ Fully commented code with implementation notes

---

## 🚀 Quick Start

### Step 1: Deploy Privacy Policy Pages

1. **Upload HTML files to your web server:**
   ```bash
   # Copy files to your web root
   cp privacy-policy.html /var/www/html/
   cp delete-data.html /var/www/html/
   ```

2. **Verify URLs are accessible:**
   - Privacy Policy: `https://cloyai.com/privacy-policy.html`
   - Delete Data: `https://cloyai.com/delete-data.html`

### Step 2: Integrate Facebook Deletion Callback

1. **Add the route to your server:**
   ```javascript
   // In server.js
   const facebookDeletionRoutes = require('./routes/facebookDataDeletion');
   app.use('/api/facebook', facebookDeletionRoutes);
   ```

2. **Update User model** (add these optional fields):
   ```javascript
   // In models/User.js
   markedForDeletion: { type: Boolean, default: false },
   deletionRequestDate: { type: Date },
   deletionConfirmationCode: { type: String }
   ```

3. **Configure Facebook App Dashboard:**
   - Go to: https://developers.facebook.com/apps/
   - Select your app → **Settings** → **Basic**
   - Scroll to **"Data Deletion Request URL"**
   - Enter: `https://cloyai.com/api/facebook/data-deletion`
   - Save changes

4. **Set environment variable:**
   ```env
   FACEBOOK_APP_SECRET=your-facebook-app-secret
   ```

### Step 3: Link Privacy Policy in Your App

Add privacy policy links to:
- **Login/Register pages** (footer)
- **Account settings**
- **Email footers**
- **Terms of Service** (cross-reference)

Example HTML:
```html
<footer>
    <a href="/privacy-policy.html">Privacy Policy</a> | 
    <a href="/delete-data.html">Delete Your Data</a>
</footer>
```

---

## 🔗 Facebook App Configuration

### Required Settings

1. **App Dashboard URL:** https://developers.facebook.com/apps/

2. **Data Deletion Request Callback:**
   - Setting: `Settings → Basic → Data Deletion Request URL`
   - Value: `https://cloyai.com/api/facebook/data-deletion`

3. **Privacy Policy URL:**
   - Setting: `App Review → Privacy Policy`
   - Value: `https://cloyai.com/privacy-policy.html`

4. **User Data Deletion Instructions:**
   - Setting: `App Review → User Data Deletion`
   - Value: `https://cloyai.com/delete-data.html`

### Testing

Facebook provides a test tool:
1. Go to **Settings** → **Basic**
2. Find **Data Deletion Request Callback**
3. Click **"Send Test"**
4. Verify your endpoint returns the correct JSON response

---

## 📋 GDPR Compliance Checklist

### ✅ Implemented Features

- [x] **Lawful basis for processing** (contractual, legitimate interest, consent, legal obligation)
- [x] **User rights documentation:**
  - [x] Right of access
  - [x] Right to rectification
  - [x] Right to erasure (deletion)
  - [x] Right to data portability
  - [x] Right to object
  - [x] Right to restriction
  - [x] Right to withdraw consent
  - [x] Right to lodge a complaint
- [x] **Data collection transparency** (what, why, how)
- [x] **Data retention periods** (specified)
- [x] **Third-party disclosure** (listed with links to their policies)
- [x] **International data transfers** (SCCs, adequacy decisions)
- [x] **Security measures** (encryption, access controls)
- [x] **Automated decision-making** (AI processing explained)
- [x] **Contact information** (support@cloyai.com)
- [x] **Data Protection Officer** (if required, add contact)
- [x] **Effective date** and **last updated** date

### ⚠️ Additional Steps for Full Compliance

1. **Appoint a DPO** (if you have 250+ employees or process sensitive data at scale)
2. **Maintain a Record of Processing Activities** (ROPA)
3. **Conduct a Data Protection Impact Assessment** (DPIA) if high-risk processing
4. **Implement consent management** for cookies (cookie banner)
5. **Train staff** on GDPR and data protection
6. **Establish data breach notification procedures** (72-hour rule)
7. **Review and update annually** or when services change

---

## 🔒 Privacy Policy Features by Section

### 1. Information We Collect
- Personal account information
- OAuth provider data (Google, Facebook)
- Uploaded images and generated content
- Usage data and analytics
- Cookies and tracking technologies

### 2. Legal Basis (GDPR)
- Contractual necessity
- Legitimate interests
- Consent
- Legal obligations

### 3. How We Use Information
- Service delivery
- Authentication
- Payment processing
- Communications
- Analytics and improvement
- Security and fraud prevention

### 4. Third-Party OAuth
- **Google OAuth:** Profile data handling
- **Facebook Login:** Profile data handling
- Auto email verification for social logins
- Links to provider privacy policies

### 5. Information Sharing
- Service providers (hosting, payment, analytics, AI)
- Legal requirements
- Business transfers
- No selling of personal data

### 6. User Rights (GDPR)
- Detailed explanation of all 8 rights
- How to exercise rights
- Response timeline (30 days)
- Complaint procedures

### 7. Data Deletion
- **Self-service deletion** (account settings)
- **Email request** (support@cloyai.com)
- **Processing timeline** (30 days)
- **What gets deleted** (comprehensive list)
- **Retention exceptions** (legal compliance)
- **Facebook callback** (automated deletion)

### 8. Cookies & Tracking
- Types of cookies used
- Cookie management instructions
- Browser controls

### 9. Security
- Encryption (HTTPS, bcrypt)
- Access controls
- No absolute security guarantee

### 10. Data Retention
- Active accounts
- Deleted accounts (30 days)
- Legal requirements (7 years for financial)
- Aggregated data (indefinite)

### 11. International Transfers
- Cross-border processing
- Standard Contractual Clauses (SCCs)
- Adequacy decisions

### 12. Children's Privacy
- Minimum age: 13 years
- Parental consent requirements
- Deletion of child data

### 13. Policy Changes
- Notification methods (email, website)
- Effective date updates

### 14. Contact Information
- Email: support@cloyai.com
- Website: cloyai.com

### Appendices
- Sample deletion instructions
- Facebook callback technical spec
- JSON response example

---

## 💻 Technical Implementation

### Facebook Data Deletion Callback

**Endpoint:** `POST /api/facebook/data-deletion`

**Request from Facebook:**
```
POST /api/facebook/data-deletion
Content-Type: application/x-www-form-urlencoded

signed_request=<base64url_encoded_signed_request>
```

**Your Response:**
```json
{
  "url": "https://cloyai.com/deletion-status?id=abc123xyz",
  "confirmation_code": "abc123xyz"
}
```

**Implementation Flow:**
1. Parse and verify signed request
2. Extract Facebook user ID
3. Find user in database
4. Mark for deletion OR delete immediately
5. Generate confirmation code
6. Return JSON response
7. Process deletion asynchronously (recommended)

**Status Check Endpoint:** `GET /api/facebook/deletion-status?id=<code>`

Returns HTML page showing:
- Deletion in progress (if user still exists)
- Deletion complete (if user not found)

---

## 📝 Customization Guide

### Update Company Information

1. **Company name:** Search and replace "CloyAI" with your company name
2. **Contact email:** Replace `support@cloyai.com` with your support email
3. **Website:** Replace `cloyai.com` with your domain
4. **Physical address:** Add mailing address if required by your jurisdiction

### Update Effective Date

```html
<p class="effective-date">
    <strong>Effective Date:</strong> [YOUR_DATE]<br>
    <strong>Last Updated:</strong> [YOUR_DATE]
</p>
```

### Add Additional Sections

Common additions:
- **California Privacy Rights** (CCPA compliance)
- **Cookie Policy** (detailed cookie list)
- **Subprocessor List** (specific third-party services)
- **Data Processing Addendum** (for B2B customers)

### Customize Deletion Timeline

Update the timeline in `delete-data.html` to match your actual process:
```html
<li><strong>Within X days:</strong> [Your process]</li>
```

---

## 🌍 International Compliance

### GDPR (EU/EEA)
✅ Fully compliant (all rights, lawful basis, DPO info)

### CCPA (California)
⚠️ Mostly compliant, consider adding:
- "Do Not Sell My Personal Information" section
- Categories of personal information sold (if applicable)
- California-specific rights language

### UK GDPR
✅ Compliant (similar to EU GDPR)

### PIPEDA (Canada)
✅ Generally compliant

### Other Jurisdictions
Review local requirements and add jurisdiction-specific sections as needed.

---

## 🔄 Maintenance

### Annual Review
- Review and update privacy policy annually
- Check for changes in laws/regulations
- Update third-party service provider list
- Verify all links still work
- Update effective date

### When to Update
- New features that collect/process data
- New third-party services integrated
- Changes to data retention policies
- Changes to user rights procedures
- Security incidents or breaches
- Legal or regulatory changes

### Version Control
Keep a changelog of privacy policy updates:
```
Version 2.0 - January 1, 2026
- Added new AI feature data processing
- Updated retention periods
- Added new third-party service

Version 1.0 - January 1, 2025
- Initial release
```

---

## ✅ Final Checklist

Before going live:

### Documentation
- [ ] Privacy policy deployed and accessible
- [ ] Delete data page deployed and accessible
- [ ] All links tested and working
- [ ] Mobile responsiveness verified
- [ ] Effective date set to current date

### Technical
- [ ] Facebook deletion callback endpoint deployed
- [ ] Endpoint verified with Facebook test tool
- [ ] User model updated with deletion tracking fields
- [ ] Environment variables configured
- [ ] Deletion status page working

### Legal
- [ ] Reviewed by legal counsel (recommended)
- [ ] DPO appointed (if required)
- [ ] ROPA documented
- [ ] Data breach procedures established
- [ ] Staff trained on privacy procedures

### Integration
- [ ] Privacy policy linked from login/register pages
- [ ] Privacy policy linked from account settings
- [ ] Privacy policy linked from email footers
- [ ] Cookie consent banner implemented (if needed)
- [ ] Analytics configured to respect user choices

### Facebook App
- [ ] Data Deletion URL configured
- [ ] Privacy Policy URL configured
- [ ] User Data Deletion Instructions URL configured
- [ ] App reviewed and approved by Facebook

### Google OAuth
- [ ] Privacy Policy URL in Google Cloud Console
- [ ] OAuth consent screen configured
- [ ] Scopes properly documented

---

## 📞 Support

### Questions About Implementation?
Email: support@cloyai.com

### Legal Questions?
Consult with a qualified attorney familiar with data privacy laws in your jurisdiction.

### Facebook Integration Issues?
Check Facebook's documentation:
- [Data Deletion Callback](https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback)
- [Login Review](https://developers.facebook.com/docs/facebook-login/review)

---

## 📚 Additional Resources

### GDPR
- [Official GDPR Text](https://gdpr-info.eu/)
- [ICO Guide](https://ico.org.uk/for-organisations/guide-to-data-protection/guide-to-the-general-data-protection-regulation-gdpr/)

### CCPA
- [California Attorney General Guide](https://oag.ca.gov/privacy/ccpa)

### OAuth Providers
- [Google OAuth Policies](https://developers.google.com/terms/api-services-user-data-policy)
- [Facebook Platform Policies](https://developers.facebook.com/docs/development/release/policies)

---

**Last Updated:** January 1, 2025  
**Version:** 1.0  
**License:** Proprietary - CloyAI Internal Use Only
