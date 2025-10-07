const registerForm = document.getElementById('registerForm');
const successToast = document.getElementById('registerSuccessToast');
const errorToast = document.getElementById('registerErrorToast');
const passwordMismatchToast = document.getElementById('passwordMismatchToast');

function showToast(el) {
    el.classList.remove('hidden'); el.classList.add('visible');
    setTimeout(() => { el.classList.remove('visible'); el.classList.add('hidden'); }, 3000);
}

registerForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    const fullName = document.getElementById('fullName').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (password !== confirmPassword) { showToast(passwordMismatchToast); return; }

    try {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fullName, email, password })
        });
        const data = await res.json();
        if (res.ok) {
            showToast(successToast);
            setTimeout(() => { window.location.href = '/'; }, 900);
        } else {
            errorToast.querySelector('span').textContent = data.message || 'فشل التسجيل';
            showToast(errorToast);
        }
    } catch (err) {
        errorToast.querySelector('span').textContent = 'خطأ بالشبكة';
        showToast(errorToast);
    }
});
