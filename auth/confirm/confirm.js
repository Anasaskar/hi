document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const email = params.get('email');
    const statusEl = document.getElementById('status');
    const actionsEl = document.getElementById('actions');
    const resendBtn = document.getElementById('resendBtn');

    if (!email) {
        statusEl.textContent = 'البريد غير موجود في الرابط.';
        return;
    }

    if (token) {
        // attempt confirm
        try {
            const res = await fetch('/api/auth/confirm', {
                method: 'POST', credentials: 'include', headers: {'Content-Type':'application/json'},
                body: JSON.stringify({ email, token })
            });
            const data = await res.json();
            if (res.ok) {
                statusEl.textContent = 'تم تأكيد بريدك بنجاح! يمكنك الآن تسجيل الدخول.';
                actionsEl.classList.add('hidden');
            } else {
                statusEl.textContent = data.message || 'فشل التحقق من الرابط.';
                actionsEl.classList.remove('hidden');
            }
        } catch (err) {
            statusEl.textContent = 'خطأ في الاتصال.';
            actionsEl.classList.remove('hidden');
        }
    } else {
        statusEl.textContent = 'لم يتم تمرير رمز التأكيد. يمكنك إعادة إرسال رسالة التأكيد.';
        actionsEl.classList.remove('hidden');
    }

    resendBtn.addEventListener('click', async () => {
        try {
            const res = await fetch('/api/auth/resend-confirm', {
                method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ email })
            });
            const data = await res.json();
            if (res.ok) {
                alert('تم إعادة إرسال رسالة التأكيد. تحقق من صندوق الوارد.');
            } else {
                alert(data.message || 'فشل إعادة الإرسال');
            }
        } catch (err) {
            alert('خطأ في الشبكة');
        }
    });
});