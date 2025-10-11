document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const email = params.get('email');
    const statusEl = document.getElementById('status');
    const actionsEl = document.getElementById('actions');
    const resendBtn = document.getElementById('resendBtn');
    const iconContainer = document.getElementById('iconContainer');
    const emailDisplay = document.getElementById('emailDisplay');

    // Helper function to update UI state
    function updateStatus(message, icon, iconClass, showActions = false) {
        statusEl.innerHTML = message;
        iconContainer.innerHTML = `<i class="${icon}"></i>`;
        iconContainer.className = `confirm-icon ${iconClass}`;
        
        if (showActions) {
            actionsEl.classList.remove('hidden');
        } else {
            actionsEl.classList.add('hidden');
        }
    }

    // Display email if present
    if (email) {
        emailDisplay.textContent = email;
        emailDisplay.style.display = 'block';
    } else {
        updateStatus(
            '❌ Email address is missing from the link.<br>Please use the complete link from your email.',
            'fas fa-exclamation-triangle',
            'error',
            false
        );
        return;
    }

    if (token) {
        // Attempt to confirm email
        try {
            const res = await fetch('/api/auth/confirm', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, token })
            });
            const data = await res.json();
            
            if (res.ok) {
                updateStatus(
                    '✅ Email verified successfully!<br>You can now login and enjoy our services.',
                    'fas fa-check-circle',
                    'success',
                    false
                );
                
                // Show login button
                actionsEl.innerHTML = `
                    <a href="/login" class="btn btn-primary">
                        <i class="fas fa-sign-in-alt"></i>
                        Login Now
                    </a>
                `;
                actionsEl.classList.remove('hidden');
                
                // Auto redirect after 3 seconds
                setTimeout(() => {
                    window.location.href = '/login';
                }, 3000);
            } else {
                updateStatus(
                    `❌ ${data.message || 'Verification failed.'}<br>Please try again or resend the verification email.`,
                    'fas fa-times-circle',
                    'error',
                    true
                );
            }
        } catch (err) {
            console.error('Confirmation error:', err);
            updateStatus(
                '❌ Connection error occurred.<br>Please check your internet connection and try again.',
                'fas fa-wifi',
                'error',
                true
            );
        }
    } else {
        updateStatus(
            '⚠️ Verification token is missing from the link.<br>You can resend the verification email to your inbox.',
            'fas fa-exclamation-circle',
            'error',
            true
        );
    }

    // Resend button handler
    resendBtn.addEventListener('click', async () => {
        if (!email) {
            alert('Email address not available');
            return;
        }

        // Disable button during request
        resendBtn.disabled = true;
        const originalHTML = resendBtn.innerHTML;
        resendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

        try {
            const res = await fetch('/api/auth/resend-confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            
            if (res.ok) {
                updateStatus(
                    '✉️ Verification email resent successfully!<br>Please check your inbox or spam folder.',
                    'fas fa-envelope-open-text',
                    'success',
                    true
                );
                
                // Update button text
                resendBtn.innerHTML = '<i class="fas fa-check"></i> Sent Successfully';
                setTimeout(() => {
                    resendBtn.innerHTML = originalHTML;
                    resendBtn.disabled = false;
                }, 5000);
            } else {
                alert(data.message || 'Failed to resend. Please try again later.');
                resendBtn.innerHTML = originalHTML;
                resendBtn.disabled = false;
            }
        } catch (err) {
            console.error('Resend error:', err);
            alert('Server connection error. Please try again later.');
            resendBtn.innerHTML = originalHTML;
            resendBtn.disabled = false;
        }
    });
});