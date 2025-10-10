// ===================================================================
// FACEBOOK DATA DELETION CALLBACK ENDPOINT
// Required for Facebook Login compliance
// Documentation: https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback
// ===================================================================

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const User = require('../models/User');

// Facebook App Secret (get from Facebook App Dashboard)
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;

/**
 * Parse and verify Facebook's signed request
 * @param {string} signedRequest - The signed_request parameter from Facebook
 * @returns {Object|null} - Parsed data if valid, null if invalid
 */
function parseSignedRequest(signedRequest) {
    if (!signedRequest || !FACEBOOK_APP_SECRET) {
        return null;
    }

    const [encodedSig, payload] = signedRequest.split('.');
    
    if (!encodedSig || !payload) {
        return null;
    }

    // Decode the signature
    const sig = base64UrlDecode(encodedSig);
    
    // Decode the payload
    const data = JSON.parse(base64UrlDecode(payload));
    
    // Verify signature
    const expectedSig = crypto
        .createHmac('sha256', FACEBOOK_APP_SECRET)
        .update(payload)
        .digest();
    
    if (!crypto.timingSafeEqual(Buffer.from(sig), expectedSig)) {
        console.error('Invalid signature - signed request verification failed');
        return null;
    }
    
    return data;
}

/**
 * Base64 URL decode helper
 * @param {string} str - Base64 URL encoded string
 * @returns {string} - Decoded string
 */
function base64UrlDecode(str) {
    // Convert base64url to base64
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    
    // Add padding if needed
    while (base64.length % 4) {
        base64 += '=';
    }
    
    return Buffer.from(base64, 'base64').toString('utf8');
}

/**
 * Generate a unique confirmation code for deletion tracking
 * @param {string} userId - The user's Facebook ID
 * @returns {string} - Unique confirmation code
 */
function generateConfirmationCode(userId) {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    return `${userId}_${timestamp}_${randomString}`;
}

// ===================================================================
// FACEBOOK DATA DELETION ENDPOINT
// ===================================================================

/**
 * POST /api/facebook/data-deletion
 * Handles data deletion requests from Facebook when a user deletes their Facebook account
 * or removes the app from their Facebook account
 */
router.post('/data-deletion', async (req, res) => {
    try {
        console.log('📥 Received Facebook data deletion request');
        
        // Facebook sends the signed_request in the POST body
        const signedRequest = req.body.signed_request;
        
        if (!signedRequest) {
            console.error('❌ No signed_request parameter found');
            return res.status(400).json({
                error: 'Missing signed_request parameter'
            });
        }

        // Parse and verify the signed request
        const data = parseSignedRequest(signedRequest);
        
        if (!data) {
            console.error('❌ Invalid signed request');
            return res.status(400).json({
                error: 'Invalid signed request'
            });
        }

        // Extract the user ID from Facebook
        const facebookUserId = data.user_id;
        
        if (!facebookUserId) {
            console.error('❌ No user_id in signed request data');
            return res.status(400).json({
                error: 'Missing user_id in request'
            });
        }

        console.log(`🔍 Processing deletion for Facebook user: ${facebookUserId}`);

        // Generate a unique confirmation code
        const confirmationCode = generateConfirmationCode(facebookUserId);

        // Find the user in your database
        const user = await User.findOne({ 
            provider: 'facebook', 
            providerId: facebookUserId 
        });

        if (user) {
            console.log(`✅ Found user: ${user.email} (ID: ${user._id})`);
            
            // Option 1: Delete immediately (for smaller datasets)
            // await User.findByIdAndDelete(user._id);
            // console.log('✅ User deleted immediately');

            // Option 2: Mark for deletion and process asynchronously (recommended)
            user.markedForDeletion = true;
            user.deletionRequestDate = new Date();
            user.deletionConfirmationCode = confirmationCode;
            await user.save();
            console.log('✅ User marked for deletion');

            // Queue the deletion job (implement your async deletion logic here)
            // await queueDeletionJob(user._id, confirmationCode);

        } else {
            console.log(`⚠️  User not found for Facebook ID: ${facebookUserId}`);
            // This is okay - the user may have already been deleted or never created an account
        }

        // Construct the status URL where users can check deletion progress
        const statusUrl = `${process.env.CLIENT_ORIGIN || 'https://cloyai.com'}/deletion-status?id=${confirmationCode}`;

        // Return the required response to Facebook
        const response = {
            url: statusUrl,
            confirmation_code: confirmationCode
        };

        console.log('✅ Deletion request processed successfully');
        console.log(`📊 Response: ${JSON.stringify(response)}`);

        return res.status(200).json(response);

    } catch (error) {
        console.error('💥 Error processing Facebook data deletion:', error);
        
        // Return a generic error to Facebook (don't expose internal details)
        return res.status(500).json({
            error: 'Internal server error',
            message: 'Unable to process deletion request'
        });
    }
});

// ===================================================================
// DELETION STATUS ENDPOINT (Optional)
// Allows users to check the status of their deletion request
// ===================================================================

/**
 * GET /api/facebook/deletion-status?id=<confirmation_code>
 * Returns the status of a deletion request
 */
router.get('/deletion-status', async (req, res) => {
    try {
        const confirmationCode = req.query.id;

        if (!confirmationCode) {
            return res.status(400).send(`
                <!DOCTYPE html>
                <html>
                <head><title>Invalid Request</title></head>
                <body style="font-family: Arial; padding: 40px; text-align: center;">
                    <h1>❌ Invalid Request</h1>
                    <p>No confirmation code provided.</p>
                </body>
                </html>
            `);
        }

        // Look up the deletion request
        const user = await User.findOne({ deletionConfirmationCode: confirmationCode });

        if (!user) {
            // Deletion already completed or invalid code
            return res.status(200).send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Deletion Complete - CloyAI</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 40px; text-align: center; background: #f8f9fa; }
                        .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                        h1 { color: #27ae60; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>✅ Deletion Complete</h1>
                        <p>Your data has been successfully deleted from CloyAI.</p>
                        <p><strong>Confirmation Code:</strong> ${confirmationCode}</p>
                        <p>If you have any questions, contact us at <a href="mailto:support@cloyai.com">support@cloyai.com</a></p>
                    </div>
                </body>
                </html>
            `);
        }

        // Deletion still in progress
        const requestDate = user.deletionRequestDate ? new Date(user.deletionRequestDate).toLocaleDateString() : 'Unknown';
        
        return res.status(200).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Deletion in Progress - CloyAI</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 40px; text-align: center; background: #f8f9fa; }
                    .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                    h1 { color: #3498db; }
                    .status { background: #e8f4f8; padding: 20px; border-radius: 8px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>⏳ Deletion in Progress</h1>
                    <div class="status">
                        <p><strong>Status:</strong> Your deletion request is being processed</p>
                        <p><strong>Request Date:</strong> ${requestDate}</p>
                        <p><strong>Confirmation Code:</strong> ${confirmationCode}</p>
                    </div>
                    <p>Your data will be completely removed within 30 days.</p>
                    <p>You will receive an email confirmation when the deletion is complete.</p>
                    <hr>
                    <p style="font-size: 0.9em; color: #7f8c8d;">
                        Questions? Contact <a href="mailto:support@cloyai.com">support@cloyai.com</a>
                    </p>
                </div>
            </body>
            </html>
        `);

    } catch (error) {
        console.error('Error checking deletion status:', error);
        return res.status(500).send('An error occurred while checking deletion status.');
    }
});

// ===================================================================
// EXPORTS
// ===================================================================

module.exports = router;

/* 
=============================================================================
IMPLEMENTATION NOTES
=============================================================================

1. ADD TO YOUR server.js:
   
   const facebookDeletionRoutes = require('./routes/facebookDataDeletion');
   app.use('/api/facebook', facebookDeletionRoutes);

2. UPDATE YOUR User MODEL (models/User.js):
   
   Add these optional fields for deletion tracking:
   
   markedForDeletion: { type: Boolean, default: false },
   deletionRequestDate: { type: Date },
   deletionConfirmationCode: { type: String }

3. FACEBOOK APP DASHBOARD CONFIGURATION:
   
   Go to: https://developers.facebook.com/apps/
   Select your app → Settings → Basic
   Scroll to "Data Deletion Request URL"
   Enter: https://yourdomain.com/api/facebook/data-deletion

4. ENVIRONMENT VARIABLES (.env):
   
   FACEBOOK_APP_SECRET=your-facebook-app-secret
   CLIENT_ORIGIN=https://yourdomain.com

5. TESTING:
   
   Facebook provides a test tool in the App Dashboard.
   You can simulate a deletion request to verify your endpoint works correctly.

6. ASYNC DELETION (RECOMMENDED):
   
   For production, implement a background job queue to handle actual deletion:
   
   - Mark user for deletion immediately
   - Return confirmation code to Facebook
   - Process actual deletion in a background worker
   - Send confirmation email when complete
   - Update deletion status page

7. SECURITY:
   
   - Always verify the signed request signature
   - Use timing-safe comparison for signatures
   - Log all deletion requests for audit trail
   - Rate limit this endpoint to prevent abuse

=============================================================================
*/
