

document.getElementById('sendResetBtn').addEventListener('click', async function () {
    const email = document.getElementById('email').value.trim();
    const toastEl = document.getElementById('resetToast');
    const toastBody = document.getElementById('resetToastBody');

    if (!email) {
        toastEl.className = 'toast text-white bg-danger';
        toastBody.textContent = 'Please enter your email address.';
        bootstrap.Toast.getOrCreateInstance(toastEl).show();
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        toastEl.className = 'toast text-white bg-danger';
        toastBody.textContent = 'Please enter a valid email address.';
        bootstrap.Toast.getOrCreateInstance(toastEl).show();
        return;
    }

    try {
        const res = await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email })
        });

        const data = await res.json();

        if (data.success) {
            toastEl.className = 'toast text-white bg-success';
            toastBody.textContent = data.message;
            bootstrap.Toast.getOrCreateInstance(toastEl).show();
            document.getElementById('email').value = '';
            setTimeout(() => { window.location.href = 'login.html'; }, 3000);
        } else {
            toastEl.className = 'toast text-white bg-danger';
            toastBody.textContent = data.message || 'No account found with that email address.';
            bootstrap.Toast.getOrCreateInstance(toastEl).show();
        }

    } catch (err) {
        console.error('Forgot password error:', err);
        toastEl.className = 'toast text-white bg-danger';
        toastBody.textContent = 'Could not connect to server. Please try again.';
        bootstrap.Toast.getOrCreateInstance(toastEl).show();
    }
});