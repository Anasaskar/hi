// ===================================================================
// NAVBAR & THEME MANAGER
// Handles navbar localization, user authentication state, and theme toggle
// ===================================================================

// Get current language (force English for this site)
function getCurrentLanguage() { return 'en'; }

// Built-in English translations (no external fetch)
let translations = {};
const DEFAULT_TRANSLATIONS = {
    nav: {
        home: 'Home',
        pricing: 'Pricing',
        contact: 'Contact',
        about: 'About Us',
        dashboard: 'Dashboard',
        gallery: 'Gallery',
        logout: 'Logout',
        login: 'Login',
        signup: 'Sign Up'
    },
    theme: {
        dark: 'Dark Mode',
        light: 'Light Mode',
        toggle: 'Toggle Theme'
    },
    common: {
        upgradeNotice: 'You need a paid subscription to access the dashboard'
    },
    hero: {
        badge: '🚀 AI-Powered Photography',
        title: 'Transform Your Products into Professional Photoshoots Without a Camera',
        subtitle: 'Unleash the power of AI to create stunning product images at minimal cost and in record time.',
        cta: {
            start: 'Get Started Free',
            demo: 'View Gallery'
        },
        stats: {
            images: 'Images Generated',
            users: 'Happy Users',
            savings: 'Cost Savings'
        }
    },
    features: {
        title: 'Why CloyAi?',
        item1: {
            title: 'AI-Powered Try-On',
            desc: 'See your designs on professional models instantly using cutting-edge AI technology.'
        },
        item2: {
            title: 'Lightning Fast',
            desc: 'Generate high-quality images in seconds, saving you time and effort.'
        },
        item3: {
            title: 'Cost Effective',
            desc: 'No expensive photoshoots needed. Get professional results at a fraction of the cost.'
        }
    },
    footer: {
        about: {
            title: 'CloyAi',
            text: 'AI product photography solutions for your brand.'
        },
        links: {
            title: 'Quick Links',
            home: 'Home',
            pricing: 'Pricing',
            contact: 'Contact Us'
        },
        social: {
            title: 'Follow Us'
        },
        bottom: {
            copyright: '© 2025 CloyAi. All rights reserved.'
        }
    },
    pricingPage: {
        banner: '🔥 All images are generated in <strong>HD</strong> quality using the latest <strong>CloyAi</strong> technology',
        title: 'Choose your plan and start with CloyAi now!',
        intro: 'Transform your clothing photos into stunning, realistic HD images using AI. Choose the plan that fits your needs and the number of images you want to generate.',
        starter: {
            title: 'Starter',
            features: '100 AI-generated images<br><strong>All images in high HD quality</strong><br>Perfect for new users or small projects',
            cta: 'Start Now'
        },
        pro: {
            badge: 'Most Popular',
            title: 'Pro',
            features: '500 high-quality generated images<br><strong>All images in realistic HD</strong><br>Great for designers and small shops<br>Fast support and processing priority',
            cta: 'Subscribe Now'
        },
        business: {
            title: 'Business',
            features: '1,000 professional generated images<br><strong>All images in ultra HD</strong><br>Ideal for brands and e‑commerce<br>Dedicated support with faster processing',
            cta: 'Get the Plan'
        }
    },
    contactPage: {
        aboutTitle: 'About CloyAi',
        whoWeAreTitle: 'Who We Are',
        whoWeAre: 'CloyAi is a leading platform in AI-powered product photography. We help brands and designers create stunning, professional images without the need for expensive photoshoots.',
        missionTitle: 'Our Mission',
        mission: 'Our mission is to make professional product photography accessible to everyone, using cutting-edge AI technology to deliver high-quality results at affordable prices.',
        visionTitle: 'Our Vision',
        vision: 'We envision a future where every brand, regardless of size, can showcase their products with professional-grade images, powered by AI innovation.',
        storyTitle: 'Our Story',
        story: 'Founded by a team of AI enthusiasts and e-commerce experts, CloyAi was born from the need to simplify product photography. We combine technology with creativity to deliver exceptional results.',
        valuesTitle: 'Our Values',
        values: {
            innovation: 'Innovation - Pushing the boundaries of AI technology',
            quality: 'Quality - Delivering HD images that exceed expectations',
            speed: 'Speed - Fast processing without compromising quality',
            trust: 'Trust - Building lasting relationships with our clients'
        },
        offerTitle: 'What We Offer',
        offer: 'AI-powered virtual try-on technology, HD image generation, fast processing, and dedicated support for all your product photography needs.',
        contactUsTitle: 'Ready to Transform Your Product Photography?',
        contactUs: 'Have questions? Reach out to us and we\'ll be happy to help you transform your product photography with AI.'
    },
    login: {
        title: 'Welcome Back',
        subtitle: 'Log in to continue using CloyAi.',
        email: 'Email Address',
        password: 'Password',
        placeholder: {
            email: 'your.email@example.com',
            password: 'Enter your password'
        },
        remember: 'Remember me',
        submit: 'Log In',
        orWith: 'Or log in with',
        google: 'Google',
        noAccount: 'Don\'t have an account? Create one now',
        toastSuccess: 'Login successful!',
        toastError: 'Login failed. Please check your credentials.'
    },
    register: {
        title: 'Create Your Account ✨',
        subtitle: 'Join CloyAi and start creating professional product photos.',
        fullName: 'Full Name',
        email: 'Email Address',
        password: 'Password',
        confirmPassword: 'Confirm Password',
        placeholder: {
            fullName: 'Enter your full name',
            email: 'your.email@example.com',
            password: 'Enter your password',
            confirmPassword: 'Confirm your password'
        },
        submit: 'Sign Up',
        orWith: 'Or sign up with',
        haveAccount: 'Already have an account? Log in',
        toastSuccess: 'Account created successfully!',
        toastError: 'Registration failed. Please check your information.',
        toastMismatch: 'Passwords do not match!',
        matchOk: 'Passwords match ✓'
    }
};

async function loadTranslations() {
    translations = DEFAULT_TRANSLATIONS;
}

// Translation helper
function t(key) {
    const keys = key.split('.');
    let value = translations;
    for (const k of keys) {
        value = value?.[k];
        if (!value) return key;
    }
    return value;
}

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    // Update theme toggle in header (for logged-out users)
    const themeBtn = document.querySelector('.theme-toggle');
    if (themeBtn) {
        const icon = themeBtn.querySelector('i');
        if (icon) {
            icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
        themeBtn.setAttribute('aria-label', t('theme.toggle'));
        themeBtn.setAttribute('title', theme === 'dark' ? t('theme.light') : t('theme.dark'));
    }

    // Update theme toggle in dropdown (for logged-in users)
    const themeBtnDropdown = document.querySelector('.theme-toggle-dropdown');
    if (themeBtnDropdown) {
        const icon = themeBtnDropdown.querySelector('i');
        if (icon) {
            icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
        themeBtnDropdown.setAttribute('aria-label', t('theme.toggle'));
        themeBtnDropdown.setAttribute('title', theme === 'dark' ? t('theme.light') : t('theme.dark'));
    }
}

// Create placeholder navbar (shows immediately while loading)
function createPlaceholderNavbar() {
    return `
        <header class="main-header">
            <div class="container">
                <a href="/" class="logo">CloyAi</a>
                
                <nav class="main-nav">
                    <ul class="nav-menu">
                        <li><a href="/">${t('nav.home')}</a></li>
                        <li><a href="/pricing-page">${t('nav.pricing')}</a></li>
                        <li><a href="/contact-page">${t('nav.about')}</a></li>
                    </ul>
                </nav>

                <div class="header-actions" style="opacity: 0.3;">
                    <div style="width: 100px; height: 40px; background: var(--bg-tertiary, #f0f2f5); border-radius: 20px; animation: pulse 1.5s ease-in-out infinite;"></div>
                </div>

                <div class="right-controls">
                    <button class="nav-toggle" aria-label="Toggle navigation">
                        <span class="hamburger-icon">&#9776;</span>
                    </button>
                </div>
            </div>
        </header>
        <style>
            @keyframes pulse {
                0%, 100% { opacity: 0.3; }
                50% { opacity: 0.6; }
            }
        </style>
    `;
}

// Create navbar for logged-out users
function createPublicNavbar() {
    const lang = getCurrentLanguage();
    const dir = 'ltr';
    return `
        <header class="main-header">
            <div class="container">
                <a href="/" class="logo">CloyAi</a>
                
                <nav class="main-nav">
                    <ul class="nav-menu">
                        <li><a href="/">${t('nav.home')}</a></li>
                        <li><a href="/pricing-page">${t('nav.pricing')}</a></li>
                        <li><a href="/contact-page">${t('nav.about')}</a></li>
                        <li class="mobile-only"><a href="/login">${t('nav.login')}</a></li>
                    </ul>
                </nav>

                <div class="header-actions">
                    <a href="/login" class="button primary header-login desktop-only">${t('nav.login')}</a>
                    <button class="theme-toggle" aria-label="${t('theme.toggle')}">
                        <i class="fas fa-moon"></i>
                    </button>
                </div>

                <div class="right-controls">
                    <button class="nav-toggle" aria-label="Toggle navigation">
                        <span class="hamburger-icon">&#9776;</span>
                    </button>
                </div>
            </div>
        </header>
    `;
}

// Create navbar for logged-in users
function createAuthNavbar(user) {
    const lang = getCurrentLanguage();
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    return `
        <header class="main-header auth-header">
            <div class="container">
                <a href="/" class="logo">CloyAi</a>
                
                <nav class="main-nav">
                    <ul class="nav-menu">
                        <li><a href="/dashboard">${t('nav.dashboard')}</a></li>
                        <li><a href="/gallery">${t('nav.gallery')}</a></li>
                        <li><a href="/pricing-page">${t('nav.pricing')}</a></li>
                        <li><a href="/contact-page">${t('nav.about')}</a></li>
                    </ul>
                </nav>

                <div class="header-actions">
                    <div class="user-menu">
                        <button class="user-menu-toggle" aria-label="User menu">
                            <i class="fas fa-user-circle"></i>
                            <span class="user-name">${escapeHtml(user.fullName)}</span>
                            <i class="fas fa-chevron-down dropdown-icon"></i>
                        </button>
                        <div class="user-dropdown">
                            <button class="dropdown-item theme-toggle-dropdown" aria-label="${t('theme.toggle')}">
                                <i class="fas fa-moon"></i>
                                <span class="theme-text">${t('theme.toggle')}</span>
                            </button>
                            <a href="/logout" class="dropdown-item logout-btn">
                                <i class="fas fa-sign-out-alt"></i>
                                ${t('nav.logout')}
                            </a>
                        </div>
                    </div>
                </div>

                <div class="right-controls">
                    <button class="nav-toggle" aria-label="Toggle navigation">
                        <span class="hamburger-icon">&#9776;</span>
                    </button>
                </div>
            </div>
        </header>
    `;
}

// HTML escape for security
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Initialize navbar based on auth state
async function initNavbar() {
    // Initialize theme FIRST to prevent flash
    initTheme();

    await loadTranslations();
    // Set document language and direction
    const lang = getCurrentLanguage();
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', 'ltr');

    // Show placeholder navbar immediately to prevent blank space
    let existingHeader = document.querySelector('.main-header');
    if (!existingHeader) {
        // Check if we have cached user data for instant rendering
        const cachedUser = getCachedUser();
        if (cachedUser) {
            // Show navbar with cached data immediately
            const navbarHtml = createAuthNavbar(cachedUser);
            document.body.insertAdjacentHTML('afterbegin', navbarHtml);
            existingHeader = document.querySelector('.main-header');
            attachNavbarListeners();
            attachUserMenuListeners();
            attachDashboardProtection(cachedUser);
            applyTranslations();
            highlightActiveNav();
        } else {
            // Create placeholder with loading state
            const placeholderHtml = createPlaceholderNavbar();
            document.body.insertAdjacentHTML('afterbegin', placeholderHtml);
            existingHeader = document.querySelector('.main-header');
        }
    }

    try {
        const res = await fetch('/api/user/info', { credentials: 'include' });

        if (res.ok) {
            // User is logged in
            const user = await res.json();

            // Cache user data for next page load
            cacheUser(user);

            const navbarHtml = createAuthNavbar(user);

            // Replace placeholder with actual navbar
            existingHeader.outerHTML = navbarHtml;

            // Attach event listeners
            attachNavbarListeners();
            attachUserMenuListeners();
            attachDashboardProtection(user);
            // Apply translations to static DOM
            applyTranslations();
            // Highlight active link
            highlightActiveNav();

        } else {
            // User is not logged in - clear cache
            clearUserCache();

            const navbarHtml = createPublicNavbar();
            existingHeader.outerHTML = navbarHtml;

            // Attach event listeners
            attachNavbarListeners();
            // Apply translations to static DOM
            applyTranslations();
            highlightActiveNav();
        }

    } catch (err) {
        // Only log unexpected errors (not 401 authentication failures)
        if (err.message && !err.message.includes('401')) {
            console.error('Failed to initialize navbar:', err);
        }
        // Fallback to public navbar
        clearUserCache();
        const navbarHtml = createPublicNavbar();
        existingHeader.outerHTML = navbarHtml;
        attachNavbarListeners();
        applyTranslations();
        highlightActiveNav();
    }
}

// Cache user data for instant navbar rendering
function cacheUser(user) {
    try {
        localStorage.setItem('cachedUser', JSON.stringify({
            fullName: user.fullName,
            email: user.email,
            type: user.type,
            timestamp: Date.now()
        }));
    } catch (e) {
        // localStorage not available
    }
}

// Get cached user data (valid for 5 minutes)
function getCachedUser() {
    try {
        const cached = localStorage.getItem('cachedUser');
        if (!cached) return null;

        const data = JSON.parse(cached);
        const age = Date.now() - data.timestamp;

        // Cache valid for 5 minutes
        if (age > 5 * 60 * 1000) {
            localStorage.removeItem('cachedUser');
            return null;
        }

        return data;
    } catch (e) {
        return null;
    }
}

// Clear cached user data
function clearUserCache() {
    try {
        localStorage.removeItem('cachedUser');
    } catch (e) {
        // ignore
    }
}

// Attach navbar event listeners
function attachNavbarListeners() {
    // Mobile nav toggle
    const navToggle = document.querySelector('.nav-toggle');
    const mainNav = document.querySelector('.main-nav');
    const body = document.body;

    if (navToggle && mainNav) {
        navToggle.addEventListener('click', () => {
            mainNav.classList.toggle('active');
            navToggle.classList.toggle('active');
            body.classList.toggle('nav-open');
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.main-header') && mainNav.classList.contains('active')) {
                mainNav.classList.remove('active');
                navToggle.classList.remove('active');
                body.classList.remove('nav-open');
            }
        });

        // Close menu when clicking on a link
        const navLinks = document.querySelectorAll('.main-nav a');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    mainNav.classList.remove('active');
                    navToggle.classList.remove('active');
                    body.classList.remove('nav-open');
                }
            });
        });
    }

    // Theme toggle (for logged-out users - in header)
    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    // Theme toggle (for logged-in users - in dropdown)
    const themeToggleDropdown = document.querySelector('.theme-toggle-dropdown');
    if (themeToggleDropdown) {
        themeToggleDropdown.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleTheme();
        });
    }
}

// Attach user menu listeners
function attachUserMenuListeners() {
    const userMenuToggle = document.querySelector('.user-menu-toggle');
    const userDropdown = document.querySelector('.user-dropdown');

    if (userMenuToggle && userDropdown) {
        userMenuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown.classList.toggle('active');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.user-menu')) {
                userDropdown.classList.remove('active');
            }
        });
    }

    // Logout handler
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    credentials: 'include'
                });
                window.location.href = '/';
            } catch (err) {
                console.error('Logout failed:', err);
                // Fallback: redirect anyway
                window.location.href = '/logout';
            }
        });
    }
}

// Dashboard protection for unpaid users
function attachDashboardProtection(user) {
    if (user.type !== 'pay') {
        // User is not paid, protect dashboard link
        const dashboardLinks = document.querySelectorAll('a[href="/dashboard"]');
        dashboardLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                showUpgradeToast();
            });
        });
    }
}

// Show toast notification for unpaid users
function showUpgradeToast() {
    // Remove existing toast if present
    const existingToast = document.getElementById('upgradeToast');
    if (existingToast) existingToast.remove();

    // Create toast
    const toast = document.createElement('div');
    toast.id = 'upgradeToast';
    toast.className = 'toast-notification';
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas fa-lock"></i>
            <span>${t('common.upgradeNotice')}</span>
        </div>
    `;

    // Add styles if not exist
    if (!document.getElementById('toastStyles')) {
        const style = document.createElement('style');
        style.id = 'toastStyles';
        style.textContent = `
            .toast-notification {
                position: fixed;
                bottom: 30px;
                left: 50%;
                transform: translateX(-50%);
                background-color: var(--card-bg);
                color: var(--text-primary);
                padding: 16px 24px;
                border-radius: 8px;
                box-shadow: var(--shadow-lg);
                border: 2px solid #ff6b6b;
                z-index: 10000;
                animation: slideUp 0.3s ease;
            }
            .toast-content {
                display: flex;
                align-items: center;
                gap: 12px;
                font-size: 15px;
            }
            .toast-content i {
                color: #ff6b6b;
                font-size: 18px;
            }
            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translate(-50%, 20px);
                }
                to {
                    opacity: 1;
                    transform: translate(-50%, 0);
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Add to page
    document.body.appendChild(toast);

    // Remove after 4 seconds
    setTimeout(() => {
        toast.style.animation = 'slideUp 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initNavbar);

// Export for use in other scripts
window.initNavbar = initNavbar;
window.toggleTheme = toggleTheme;
window.getCurrentLanguage = getCurrentLanguage;
// Expose translator for inline scripts
window.t = t;

// Apply translations to elements with [data-i18n]
function applyTranslations() {
    try {
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (!key) return;
            const translated = t(key);
            // If element has a data-i18n-attr, set attribute instead of text
            const targetAttr = el.getAttribute('data-i18n-attr');
            if (targetAttr) {
                el.setAttribute(targetAttr, translated);
            } else if (el.hasAttribute('data-i18n-html') || translated.includes('<br>') || translated.includes('<strong>')) {
                // Use innerHTML if it has HTML tags or data-i18n-html attribute
                el.innerHTML = translated.replace(/\n/g, '<br>');
            } else {
                el.textContent = translated;
            }
        });
    } catch (e) {
        console.error('applyTranslations failed:', e);
    }
}

// Highlight the current nav link based on location.pathname
function highlightActiveNav() {
    try {
        const path = window.location.pathname.replace(/\/$/, '') || '/';
        const links = document.querySelectorAll('.main-header .nav-menu a');
        links.forEach(a => {
            const href = a.getAttribute('href');
            if (!href) return;
            const clean = href.replace(/\/$/, '');
            if (clean === path) {
                a.classList.add('active');
            } else {
                a.classList.remove('active');
            }
        });
    } catch (e) {
        // no-op
    }
}

// Initialize translations on page load
document.addEventListener('DOMContentLoaded', async () => {
    await loadTranslations();
    // Apply translations to the entire page, not just navbar
    applyTranslations();
});
