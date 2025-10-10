// ===================================================================
// MIGRATION SCRIPT: Update Existing Users with Provider Field
// Sets provider to 'local' for users without a provider value
// ===================================================================

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/virtufit';

async function migrateProviders() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');
        
        // Find all users without a provider or with null provider
        const usersToUpdate = await User.find({
            $or: [
                { provider: { $exists: false } },
                { provider: null },
                { provider: '' }
            ]
        });
        
        console.log(`📊 Found ${usersToUpdate.length} users to update`);
        
        if (usersToUpdate.length === 0) {
            console.log('✨ No users need updating. All users have a provider set.');
            await mongoose.disconnect();
            return;
        }
        
        // Update users
        let updated = 0;
        for (const user of usersToUpdate) {
            // Set provider to 'local' if user has a passwordHash
            // Otherwise, this might be a social user with incomplete data
            if (user.passwordHash) {
                user.provider = 'local';
            } else if (user.providerId) {
                // Has providerId but no provider - attempt to infer
                user.provider = 'google'; // Default to google for social logins
            } else {
                // No password and no providerId - default to local
                user.provider = 'local';
            }
            
            await user.save();
            updated++;
            console.log(`✅ Updated user: ${user.email} -> provider: ${user.provider}`);
        }
        
        console.log(`\n🎉 Migration complete! Updated ${updated} users.`);
        console.log('📋 Summary:');
        
        // Print summary
        const localCount = await User.countDocuments({ provider: 'local' });
        const googleCount = await User.countDocuments({ provider: 'google' });
        const facebookCount = await User.countDocuments({ provider: 'facebook' });
        const appleCount = await User.countDocuments({ provider: 'apple' });
        const vkCount = await User.countDocuments({ provider: 'vk' });
        
        console.log(`   - Local users: ${localCount}`);
        console.log(`   - Google users: ${googleCount}`);
        console.log(`   - Facebook users: ${facebookCount}`);
        console.log(`   - Apple users: ${appleCount}`);
        console.log(`   - VK users: ${vkCount}`);
        console.log(`   - Total users: ${await User.countDocuments()}`);
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

// Run migration
console.log('🚀 Starting provider migration...\n');
migrateProviders();
