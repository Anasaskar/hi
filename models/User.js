const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    fullName: { type: String, required: true, trim: true, minlength: 2 },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    passwordHash: { type: String, required: true },
    // user type: 'pay' = paid subscriber, 'unpay' = free/unpaid, 'Baned' = banned user
    type: { type: String, enum: ['pay', 'unpay', 'Baned'], default: 'unpay' },
    // email confirmation
    emailConfirmed: { type: Boolean, default: false },
    emailConfirmToken: { type: String },
    emailConfirmExpires: { type: Date },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
