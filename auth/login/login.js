


const loginForm = document.querySelector('.login-form');
const successToast = document.getElementById('loginSuccessToast');
const errorToast = document.getElementById('loginErrorToast');

loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const remember = document.getElementById('rememberMe').checked;

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, remember })
        });
        const data = await res.json();
        if (res.ok) {
            showToast(successToast);
            // التوجيه إلى لوحة التحكم بعد تسجيل الدخول
            setTimeout(() => { window.location.href = '/dashboard'; }, 800);
        } else {
            if (res.status === 403 && data.message && data.message.includes('تأكيد')) {
                // redirect to confirm page
                window.location.href = `/auth/confirm/confirm_page.html?email=${encodeURIComponent(email)}`;
                return;
            }
            errorToast.querySelector('span').textContent = data.message || 'فشل تسجيل الدخول';
            showToast(errorToast);
        }
    } catch (err) {
        errorToast.querySelector('span').textContent = 'خطأ بالشبكة';
        showToast(errorToast);
    }
});

function showToast(el) {
    el.classList.remove('hidden'); el.classList.add('visible');
    setTimeout(() => { el.classList.remove('visible'); el.classList.add('hidden'); }, 3000);
}
