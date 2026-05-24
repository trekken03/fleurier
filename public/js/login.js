// login.js - authenticates via server API
(async function () {
    // If already logged in, redirect
    try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        const data = await res.json();
        if (data.success && data.user) {
            window.location.href = data.user.role === 'admin' ? 'admin_dashb.html' : 'index.html';
            return;
        }
    } catch (err) { /* not logged in, continue */ }
})();

function showToast(message, type = 'danger') {
    const toastEl = document.getElementById('loginToast');
    const toastBody = document.getElementById('loginToastBody');
    toastEl.className = `toast text-white bg-${type}`;
    toastBody.textContent = message;
    bootstrap.Toast.getOrCreateInstance(toastEl).show();
}

document.getElementById('loginBtn').addEventListener('click', async function () {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    if (!email || !password) {
        showToast('Please fill in all fields.');
        return;
    }

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (data.success) {
            showToast(data.message, 'success');
            setTimeout(() => {
                window.location.href = data.user.role === 'admin' ? 'admin_dashb.html' : 'index.html';
            }, 1500);
        } else if (data.unverified) {
            showToast('Please verify your email first. Redirecting...', 'warning');
            setTimeout(() => {
                window.location.href = 'verify.html?email=' + encodeURIComponent(email);
            }, 2000);
        } else {
            showToast(data.message || 'Invalid email or password.');
        }

    } catch (err) {
        console.error('Login error:', err);
        showToast('Could not connect to server. Please try again.');
    }
});

document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') document.getElementById('loginBtn').click();
});