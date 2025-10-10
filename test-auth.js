// ===================================================================
// AUTHENTICATION SYSTEM TEST SCRIPT
// Run this to verify your authentication setup
// ===================================================================

const fs = require('fs');
const path = require('path');

console.log('\n🔍 AUTHENTICATION SYSTEM VERIFICATION\n');
console.log('='.repeat(60));

let errors = [];
let warnings = [];
let success = [];

// ===================================================================
// 1. Check Required Files
// ===================================================================
console.log('\n📁 Checking Required Files...');

const requiredFiles = [
    { path: 'config/passport.js', description: 'Passport OAuth configuration' },
    { path: 'controllers/authController.js', description: 'Auth controllers' },
    { path: 'routes/authRoutes.js', description: 'Auth routes' },
    { path: 'models/User.js', description: 'User model' },
    { path: 'auth/login/social-auth.css', description: 'Social login styles' },
    { path: '.env.example', description: 'Environment template' }
];

requiredFiles.forEach(file => {
    const fullPath = path.join(__dirname, file.path);
    if (fs.existsSync(fullPath)) {
        success.push(`✅ ${file.description}: ${file.path}`);
    } else {
        errors.push(`❌ Missing: ${file.path}`);
    }
});

// ===================================================================
// 2. Check .env Configuration
// ===================================================================
console.log('\n⚙️  Checking Environment Configuration...');

if (fs.existsSync(path.join(__dirname, '.env'))) {
    success.push('✅ .env file exists');
    
    // Load .env
    require('dotenv').config();
    
    // Check critical variables
    const criticalVars = ['JWT_SECRET', 'MONGO_URI', 'SESSION_SECRET'];
    criticalVars.forEach(varName => {
        if (process.env[varName]) {
            success.push(`✅ ${varName} is set`);
        } else {
            warnings.push(`⚠️  ${varName} not set (using default)`);
        }
    });
    
    // Check OAuth providers
    const providers = [
        { name: 'Google', vars: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'] },
        { name: 'Facebook', vars: ['FACEBOOK_APP_ID', 'FACEBOOK_APP_SECRET'] },
        { name: 'Apple', vars: ['APPLE_CLIENT_ID', 'APPLE_TEAM_ID', 'APPLE_KEY_ID'] },
        { name: 'VK', vars: ['VK_APP_ID', 'VK_APP_SECRET'] }
    ];
    
    console.log('\n🔐 OAuth Provider Configuration:');
    providers.forEach(provider => {
        const configured = provider.vars.every(v => process.env[v]);
        if (configured) {
            success.push(`✅ ${provider.name} OAuth is configured`);
        } else {
            warnings.push(`⚠️  ${provider.name} OAuth not configured (optional)`);
        }
    });
    
} else {
    errors.push('❌ .env file not found - copy .env.example to .env');
}

// ===================================================================
// 3. Check Package Dependencies
// ===================================================================
console.log('\n📦 Checking Dependencies...');

const packageJson = require('./package.json');
const requiredDeps = [
    'passport',
    'passport-google-oauth20',
    'passport-facebook',
    'passport-apple',
    'passport-vkontakte',
    'express-session'
];

requiredDeps.forEach(dep => {
    if (packageJson.dependencies[dep]) {
        success.push(`✅ ${dep} installed`);
    } else {
        errors.push(`❌ Missing dependency: ${dep} - run 'npm install'`);
    }
});

// ===================================================================
// 4. Check HTML Files Updated
// ===================================================================
console.log('\n🎨 Checking Frontend Updates...');

const loginHtml = fs.readFileSync(path.join(__dirname, 'auth/login/login_page.html'), 'utf8');
const registerHtml = fs.readFileSync(path.join(__dirname, 'auth/signup/register_page.html'), 'utf8');

if (loginHtml.includes('social-login-buttons')) {
    success.push('✅ Login page has social buttons');
} else {
    errors.push('❌ Login page missing social buttons');
}

if (registerHtml.includes('social-login-buttons')) {
    success.push('✅ Register page has social buttons');
} else {
    errors.push('❌ Register page missing social buttons');
}

if (loginHtml.includes('social-auth.css')) {
    success.push('✅ Login page includes social-auth.css');
} else {
    warnings.push('⚠️  Login page missing social-auth.css');
}

// ===================================================================
// 5. Check User Model
// ===================================================================
console.log('\n👤 Checking User Model...');

const userModel = fs.readFileSync(path.join(__dirname, 'models/User.js'), 'utf8');

if (userModel.includes('provider')) {
    success.push('✅ User model has provider field');
} else {
    errors.push('❌ User model missing provider field');
}

if (userModel.includes('providerId')) {
    success.push('✅ User model has providerId field');
} else {
    errors.push('❌ User model missing providerId field');
}

if (userModel.includes('emailConfirmed')) {
    success.push('✅ User model has emailConfirmed field');
} else {
    errors.push('❌ User model missing emailConfirmed field');
}

// ===================================================================
// 6. Print Results
// ===================================================================
console.log('\n' + '='.repeat(60));
console.log('\n📊 TEST RESULTS:\n');

console.log(`✅ Success: ${success.length}`);
console.log(`⚠️  Warnings: ${warnings.length}`);
console.log(`❌ Errors: ${errors.length}`);

if (success.length > 0) {
    console.log('\n✅ PASSED CHECKS:');
    success.forEach(s => console.log(`   ${s}`));
}

if (warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    warnings.forEach(w => console.log(`   ${w}`));
}

if (errors.length > 0) {
    console.log('\n❌ ERRORS:');
    errors.forEach(e => console.log(`   ${e}`));
}

console.log('\n' + '='.repeat(60));

// ===================================================================
// 7. Final Assessment
// ===================================================================
if (errors.length === 0) {
    console.log('\n🎉 ALL CHECKS PASSED!\n');
    console.log('Your authentication system is ready to use.');
    console.log('\nNext steps:');
    console.log('1. Configure OAuth providers in .env (if not done)');
    console.log('2. Start server: npm start');
    console.log('3. Visit: http://localhost:3000/login');
    console.log('4. Test social login buttons\n');
} else {
    console.log('\n⚠️  SETUP INCOMPLETE\n');
    console.log('Please fix the errors above before proceeding.\n');
    process.exit(1);
}

console.log('📖 Documentation:');
console.log('   - Quick Start: QUICK_START.md');
console.log('   - Full Docs: AUTH_README.md\n');
