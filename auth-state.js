// auth-state.js
// Runs on pages to detect if a user is logged in (via cookie-backed session)
// and swaps header UI: shows user menu (name, dashboard, logout) when logged in
// and keeps the login button when not.

async function updateAuthState() {
    try {
        const res = await fetch('/api/user/info', { credentials: 'include' });
        const headerLoginBtn = document.querySelector('.header-login');
        const container = document.querySelector('.main-header .container');

        if (res.ok) {
            const user = await res.json();

            // Remove existing login button if present
            if (headerLoginBtn) headerLoginBtn.remove();

            // Ensure dashboard CSS is loaded so header looks the same
            if (!document.querySelector('link[href="/dashboard-page/dashboard_page_style.css"]')) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = '/dashboard-page/dashboard_page_style.css';
                document.head.appendChild(link);
            }

            // If on index page and user is logged in, redirect to dashboard
            if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
                window.location.href = '/dashboard';
                return;
            }

            // If a dashboard header already exists (on dashboard page), just update user info
            let dashboardHeader = document.querySelector('.dashboard-header');
            if (dashboardHeader) {
                const userNameSpan = dashboardHeader.querySelector('.user-info span');
                if (userNameSpan) userNameSpan.textContent = user.fullName;
            } else {
                // Hide default main header if present and remove its reserved padding
                const mainHeader = document.querySelector('.main-header');
                if (mainHeader) {
                    mainHeader.style.display = 'none';
                    // Save original body padding-top and remove it so no extra gap appears
                    const body = document.body;
                    if (!body.dataset._savedPaddingTop) {
                        const computed = window.getComputedStyle(body).paddingTop || '';
                        body.dataset._savedPaddingTop = computed || '';
                    }
                    body.style.paddingTop = '0px';
                }

                // Create dashboard-style header
                dashboardHeader = document.createElement('header');
                dashboardHeader.className = 'dashboard-header';
                dashboardHeader.innerHTML = `
                    <div class="container">
                        <div class="logo">CloyAi</div>
                        <nav class="dashboard-nav">
                            <ul>
                                <li><a href="/dashboard" class="dashboard-link active">Dashboard</a></li>
                                <li><a href="#">Try-On</a></li>
                                <li><a href="#">Gallery</a></li>
                                <li><a href="/pricing-page">Pricing</a></li>
                                <li><a href="#" class="logout-btn">تسجيل الخروج</a></li>
                            </ul>
                        </nav>
                        <div class="user-info">
                            <i class="fas fa-user-circle"></i>
                            <span>${escapeHtml(user.fullName)}</span>
                        </div>
                        <button class="nav-toggle" aria-label="Toggle navigation">&#9776;</button>
                    </div>
                `;

                // Insert at top of body
                document.body.insertBefore(dashboardHeader, document.body.firstChild);

                // Attach nav toggle behavior
                const navToggle = dashboardHeader.querySelector('.nav-toggle');
                const dashboardNav = dashboardHeader.querySelector('.dashboard-nav');
                if (navToggle && dashboardNav) {
                    navToggle.addEventListener('click', () => dashboardNav.classList.toggle('active'));
                }

                // Attach logout handler
                const logoutBtn = dashboardHeader.querySelector('.logout-btn');
                if (logoutBtn) {
                    logoutBtn.addEventListener('click', async (e) => {
                        e.preventDefault();
                        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
                        window.location.reload();
                    });
                }
            }

            // Show or hide paid features
            if (user.type === 'pay') {
                document.querySelectorAll('.paid-only').forEach(el => el.classList.remove('hidden'));
                document.querySelectorAll('.unpaid-only').forEach(el => el.classList.add('hidden'));
            } else {
                document.querySelectorAll('.paid-only').forEach(el => el.classList.add('hidden'));
                document.querySelectorAll('.unpaid-only').forEach(el => el.classList.remove('hidden'));

                // Lock dashboard button: intercept clicks and show subscribe message
                const dashLinks = document.querySelectorAll('.dashboard-link, .header-dashboard');
                dashLinks.forEach(link => {
                    link.classList.add('locked');
                    // ensure we can catch clicks even if it's an anchor
                    link.addEventListener('click', (ev) => {
                        ev.preventDefault();
                        showSubscribeToast();
                    });
                });
            }
        } else {
            // If on dashboard page and not logged in, redirect to login
            if (window.location.pathname.startsWith('/dashboard')) {
                window.location.href = '/auth/login/login_page.html';
                return;
            }

            // Not logged in: restore body padding-top if it was modified
            const body = document.body;
            if (body.dataset._savedPaddingTop !== undefined) {
                body.style.paddingTop = body.dataset._savedPaddingTop || '';
                delete body.dataset._savedPaddingTop;
            } else {
                // Ensure default padding (matches original style.css)
                body.style.paddingTop = '70px';
            }

            // If we're on a page that had a main-footer, ensure it uses the shared simple-footer styles
            const mainFooter = document.querySelector('.main-footer');
            if (mainFooter && !mainFooter.classList.contains('simple-footer')) {
                mainFooter.classList.add('simple-footer');
            }
            // Not logged in — ensure login button exists (if some pages removed it)
            if (!headerLoginBtn) {
                const loginLink = document.createElement('a');
                loginLink.href = '/login';
                loginLink.className = 'button primary header-login';
                loginLink.textContent = 'تسجيل الدخول';
                if (container) container.appendChild(loginLink);
            }
        }
    } catch (err) {
        // network error — do nothing
        console.error('Auth state check failed', err);
    }
}

// Basic HTML escape for the displayed name
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Run on DOMContentLoaded so headers exist
document.addEventListener('DOMContentLoaded', updateAuthState);

// Export for other scripts if needed
window.updateAuthState = updateAuthState;

// Create subscribe toast element
function ensureSubscribeToast() {
    if (document.getElementById('subscribeToast')) return;
    const toast = document.createElement('div');
    toast.id = 'subscribeToast';
    toast.className = 'toast-notification error hidden';
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.zIndex = '1000';
    toast.innerHTML = `<i class="fas fa-exclamation-circle"></i>
        <span>هذه الميزة متاحة للخطط المدفوعة فقط. الرجاء الاشتراك أولاً.</span>`;
    document.body.appendChild(toast);
}

function showSubscribeToast() {
    ensureSubscribeToast();
    const t = document.getElementById('subscribeToast');
    if (!t) return;
    t.classList.remove('hidden');
    t.classList.add('visible');
    setTimeout(() => { t.classList.remove('visible'); t.classList.add('hidden'); }, 3500);
}
