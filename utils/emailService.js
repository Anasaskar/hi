    // ===================================================================
// EMAIL SERVICE - BREVO (SENDINBLUE) INTEGRATION
// Handles email sending for verification and other notifications
// ===================================================================

const axios = require('axios');

// Brevo API Configuration
const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

// Default sender information
const DEFAULT_SENDER = {
    name: process.env.EMAIL_FROM_NAME || 'CloyAi',
    email: process.env.EMAIL_FROM_ADDRESS || 'noreply@cloyai.com'
};

/**
 * Send email verification link to user
 * @param {string} toEmail - Recipient email address
 * @param {string} toName - Recipient name
 * @param {string} verificationUrl - Full verification URL with token
 * @returns {Promise<object>} Response from Brevo API
 */
async function sendVerificationEmail(toEmail, toName, verificationUrl) {
    try {
        const emailData = {
            sender: DEFAULT_SENDER,
            to: [
                {
                    email: toEmail,
                    name: toName
                }
            ],
            subject: 'Verify Your Email - CloyAi',
            htmlContent: generateVerificationEmailHTML(toName, verificationUrl),
            textContent: `Hello ${toName},\n\nThank you for signing up with CloyAi. Please verify your email address by clicking the link below:\n\n${verificationUrl}\n\nThis link is valid for 24 hours.\n\nIf you didn't create an account, you can safely ignore this email.\n\nBest regards,\nCloyAi Team`
        };

        const response = await axios.post(BREVO_API_URL, emailData, {
            headers: {
                'api-key': BREVO_API_KEY,
                'Content-Type': 'application/json',
                'accept': 'application/json'
            }
        });

        console.log('✅ Verification email sent successfully to:', toEmail);
        console.log('📧 Brevo Message ID:', response.data.messageId);
        
        return {
            success: true,
            messageId: response.data.messageId,
            email: toEmail
        };
    } catch (error) {
        console.error('❌ Failed to send verification email:', error.response?.data || error.message);
        
        // Return detailed error information
        return {
            success: false,
            error: error.response?.data?.message || error.message,
            statusCode: error.response?.status,
            email: toEmail
        };
    }
}

/**
 * Generate HTML content for verification email
 * @param {string} userName - User's full name
 * @param {string} verificationUrl - Verification link
 * @returns {string} HTML email content
 */
function generateVerificationEmailHTML(userName, verificationUrl) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #f7f9fc 0%, #e8f0f7 100%);
            margin: 0;
            padding: 40px 20px;
            line-height: 1.6;
        }
        .email-wrapper {
            max-width: 600px;
            margin: 0 auto;
        }
        .email-container {
            background-color: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
        }
        .header {
            background: linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 100%);
            padding: 50px 40px;
            text-align: center;
            position: relative;
        }
        .logo {
            color: #a7f300;
            font-size: 32px;
            font-weight: 800;
            letter-spacing: -1px;
            margin-bottom: 10px;
        }
        .header-subtitle {
            color: #e7e7e7;
            font-size: 16px;
            font-weight: 400;
        }
        .content {
            padding: 50px 40px;
            color: #333333;
        }
        .greeting {
            font-size: 24px;
            font-weight: 700;
            color: #0d0d0d;
            margin-bottom: 20px;
        }
        .content p {
            font-size: 16px;
            margin-bottom: 20px;
            color: #555555;
        }
        .verify-button {
            display: inline-block;
            background-color: #a7f300;
            color: #0d0d0d;
            text-decoration: none;
            padding: 18px 48px;
            border-radius: 12px;
            font-size: 17px;
            font-weight: 700;
            margin: 30px 0;
            text-align: center;
            transition: all 0.3s ease;
            box-shadow: 0 4px 20px rgba(167, 243, 0, 0.3);
        }
        .verify-button:hover {
            background-color: #92d900;
            transform: translateY(-2px);
            box-shadow: 0 6px 25px rgba(167, 243, 0, 0.4);
        }
        .button-container {
            text-align: center;
            margin: 40px 0;
        }
        .info-box {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-left: 4px solid #a7f300;
            padding: 20px;
            margin: 30px 0;
            border-radius: 8px;
            font-size: 14px;
            color: #555555;
        }
        .info-box strong {
            color: #0d0d0d;
        }
        .divider {
            height: 1px;
            background: linear-gradient(90deg, transparent 0%, #e0e0e0 50%, transparent 100%);
            margin: 40px 0;
        }
        .footer {
            background-color: #f8f9fa;
            padding: 30px 40px;
            text-align: center;
            border-top: 1px solid #e9ecef;
        }
        .footer-logo {
            color: #a7f300;
            font-size: 20px;
            font-weight: 800;
            margin-bottom: 10px;
        }
        .footer p {
            font-size: 14px;
            color: #6c757d;
            margin: 8px 0;
        }
        .link-text {
            word-break: break-all;
            color: #a7f300;
            font-size: 13px;
            display: inline-block;
            margin-top: 10px;
        }
        .help-text {
            font-size: 14px;
            color: #888888;
            margin-top: 30px;
        }
        @media only screen and (max-width: 600px) {
            body {
                padding: 20px 10px;
            }
            .header {
                padding: 40px 20px;
            }
            .content {
                padding: 40px 20px;
            }
            .footer {
                padding: 30px 20px;
            }
            .verify-button {
                padding: 16px 36px;
                font-size: 16px;
            }
        }
    </style>
</head>
<body>
    <div class="email-wrapper">
        <div class="email-container">
            <div class="header">
                <div class="logo">CloyAi</div>
                <div class="header-subtitle">AI-Powered Product Photography</div>
            </div>
            <div class="content">
                <div class="greeting">Hello ${userName}! 👋</div>
                <p>Welcome to <strong>CloyAi</strong>, your ultimate AI-powered product photography platform.</p>
                <p>To complete your registration and activate your account, please verify your email address by clicking the button below:</p>
                
                <div class="button-container">
                    <a href="${verificationUrl}" class="verify-button">Verify Email Address</a>
                </div>
                
                <div class="info-box">
                    <strong>⏰ Important:</strong> This verification link is valid for <strong>24 hours</strong>. If the link expires, you can request a new one from the registration page.
                </div>
                
                <div class="divider"></div>
                
                <p class="help-text">
                    If you didn't create an account with CloyAi, you can safely ignore this email.
                </p>
                
                <p class="help-text">
                    Having trouble clicking the button? Copy and paste this link into your browser:<br>
                    <span class="link-text">${verificationUrl}</span>
                </p>
            </div>
            <div class="footer">
                <div class="footer-logo">CloyAi</div>
                <p><strong>Powered by AI</strong></p>
                <p>© 2025 CloyAi. All rights reserved.</p>
                <p style="margin-top: 15px; font-size: 12px;">
                    Need help? Contact us at support@cloyai.com
                </p>
            </div>
        </div>
    </div>
</body>
</html>
    `.trim();
}

/**
 * Send a generic email using Brevo
 * @param {object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.toName - Recipient name
 * @param {string} options.subject - Email subject
 * @param {string} options.htmlContent - HTML email content
 * @param {string} options.textContent - Plain text content (optional)
 * @returns {Promise<object>} Response from Brevo API
 */
async function sendEmail({ to, toName, subject, htmlContent, textContent }) {
    try {
        const emailData = {
            sender: DEFAULT_SENDER,
            to: [{ email: to, name: toName }],
            subject,
            htmlContent,
            textContent: textContent || ''
        };

        const response = await axios.post(BREVO_API_URL, emailData, {
            headers: {
                'api-key': BREVO_API_KEY,
                'Content-Type': 'application/json',
                'accept': 'application/json'
            }
        });

        console.log('✅ Email sent successfully to:', to);
        return {
            success: true,
            messageId: response.data.messageId
        };
    } catch (error) {
        console.error('❌ Failed to send email:', error.response?.data || error.message);
        return {
            success: false,
            error: error.response?.data?.message || error.message
        };
    }
}

module.exports = {
    sendVerificationEmail,
    sendEmail
};
