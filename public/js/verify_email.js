// Get email from URL param
const params = new URLSearchParams(window.location.search);
const email = params.get('email') || 'your email';
document.getElementById('emailDisplay').textContent = email;

// Auto-focus and jump between inputs
const inputs = document.querySelectorAll('.code-input');
inputs.forEach((input, i) => {
    input.addEventListener('input', function () {
        this.value = this.value.replace(/[^0-9]/g, '');
        if (this.value && i < inputs.length - 1) {
            inputs[i + 1].focus();
        }
    });
    input.addEventListener('keydown', function (e) {
        if (e.key === 'Backspace' && !this.value && i > 0) {
            inputs[i - 1].focus();
        }
    });
    input.addEventListener('paste', function (e) {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
        pasted.split('').forEach((char, idx) => {
            if (inputs[idx]) inputs[idx].value = char;
        });
        if (inputs[pasted.length - 1]) inputs[pasted.length - 1].focus();
    });
});

function getCode() {
    return Array.from(inputs).map(i => i.value).join('');
}

function showToast(message, type = 'danger') {
    const toastEl = document.getElementById('verifyToast');
    const toastBody = document.getElementById('verifyToastBody');
    toastEl.className = `toast text-white bg-${type}`;
    toastBody.textContent = message;
    bootstrap.Toast.getOrCreateInstance(toastEl).show();
}

// Countdown timer
let seconds = 600;
const countdownEl = document.getElementById('countdown');
const timer = setInterval(() => {
    seconds--;
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    countdownEl.textContent = `${m}:${s}`;
    if (seconds <= 0) {
        clearInterval(timer);
        countdownEl.textContent = 'Expired';
        countdownEl.style.color = '#dc3545';
    }
}, 1000);

// Verify button
document.getElementById('verifyBtn').addEventListener('click', async function () {
    const code = getCode();
    if (code.length < 6) {
        showToast('Please enter the complete 6-digit code.');
        return;
    }

    try {
        const res = await fetch('/api/auth/verify-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ code })
        });
        const data = await res.json();

        if (data.success) {
            showToast('Email verified! Redirecting to login...', 'success');
            clearInterval(timer);
            setTimeout(() => { window.location.href = 'login.html'; }, 2000);
        } else {
            showToast(data.message || 'Invalid code. Please try again.');
            inputs.forEach(i => i.value = '');
            inputs[0].focus();
        }
    } catch (err) {
        showToast('Could not connect to server. Please try again.');
    }
});

// Resend button
document.getElementById('resendBtn').addEventListener('click', async function () {
    try {
        const res = await fetch('/api/auth/resend-code', {
            method: 'POST',
            credentials: 'include'
        });
        const data = await res.json();
        if (data.success) {
            showToast('New code sent! Check your email.', 'success');
            seconds = 600;
            inputs.forEach(i => i.value = '');
            inputs[0].focus();
        } else {
            showToast(data.message || 'Failed to resend code.');
        }
    } catch (err) {
        showToast('Could not connect to server.');
    }
});

// Focus first input on load
inputs[0].focus();