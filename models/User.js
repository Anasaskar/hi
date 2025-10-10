const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    fullName: { type: String, required: true, trim: true, minlength: 2 },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    // passwordHash is optional for social logins
    passwordHash: { type: String, required: false },
    // provider: 'local' for email/password, 'google', 'facebook', 'apple', or 'vk' for social logins
    provider: { type: String, enum: ['local', 'google', 'facebook', 'apple', 'vk'], default: 'local' },
    // providerId: the unique ID from the social provider
    providerId: { type: String },
    // user type: 'pay' = paid subscriber, 'unpay' = free/unpaid, 'Baned' = banned user
    type: { type: String, enum: ['pay', 'unpay', 'Baned'], default: 'unpay' },
    // email confirmation: true for social logins, false for local until verified
    emailConfirmed: { type: Boolean, default: false },
    emailConfirmToken: { type: String },
    emailConfirmExpires: { type: Date },
    createdAt: { type: Date, default: Date.now },
    // Recent try-on orders for the user
    orders: [{
        tshirtImage: String, // data URL or saved URL
        processedImage: String, // URL to processed image
        modelId: String,
        status: { type: String, enum: ['Processing', 'Done', 'Failed'], default: 'Processing' },
        createdAt: { type: Date, default: Date.now }
    }]
});

module.exports = mongoose.model('User', userSchema);
