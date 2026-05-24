// registration.js - registers user via server API
(async function () {
    try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        const data = await res.json();
        if (data.success && data.user) {
            window.location.href = 'index.html';
            return;
        }
    } catch (err) { /* not logged in, continue */ }
})();

const passwordInput = document.getElementById('password');
const confirmInput = document.getElementById('confirm_password');
const matchError = document.getElementById('passwordMatchError');
const reqLength = document.getElementById('reqLength');
const reqUppercase = document.getElementById('reqUppercase');
const reqLowercase = document.getElementById('reqLowercase');
const reqNumber = document.getElementById('reqNumber');

function showToast(message, type = 'danger') {
    const toastEl = document.getElementById('regToast');
    const toastBody = document.getElementById('regToastBody');
    toastEl.className = `toast text-white bg-${type}`;
    toastBody.textContent = message;
    bootstrap.Toast.getOrCreateInstance(toastEl).show();
}

function updateRequirement(element, met) {
    if (met) {
        element.innerHTML = element.innerHTML.replace('fa-times-circle text-danger', 'fa-check-circle text-success');
    } else {
        element.innerHTML = element.innerHTML.replace('fa-check-circle text-success', 'fa-times-circle text-danger');
    }
}

document.getElementById('phone').addEventListener('input', function () {
    this.value = this.value.replace(/[^0-9]/g, '');
});

passwordInput.addEventListener('input', function () {
    const val = this.value;
    updateRequirement(reqLength, val.length >= 8);
    updateRequirement(reqUppercase, /[A-Z]/.test(val));
    updateRequirement(reqLowercase, /[a-z]/.test(val));
    updateRequirement(reqNumber, /[0-9]/.test(val));
    if (confirmInput.value) checkMatch();
});

function checkMatch() {
    if (confirmInput.value && passwordInput.value !== confirmInput.value) {
        matchError.classList.remove('d-none');
    } else {
        matchError.classList.add('d-none');
    }
}
confirmInput.addEventListener('input', checkMatch);

document.getElementById('registerBtn').addEventListener('click', async function () {
    const fullname = document.getElementById('fullname').value.trim();
    const email = document.getElementById('emailInput').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const address = document.getElementById('address').value.trim();
    const password = passwordInput.value;
    const confirm = confirmInput.value;
    const errorBox = document.getElementById('registrationError');

    const errors = [];
    if (!fullname) errors.push('Full name is required.');
    if (!email) {
        errors.push('Email is required.');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push('Please enter a valid email address.');
    }
    if (!phone) {
        errors.push('Phone number is required.');
    } else if (!/^[0-9]{10,11}$/.test(phone)) {
        errors.push('Phone number must be 10-11 digits only.');
    }
    if (!address) errors.push('Address is required.');
    if (password.length < 8) errors.push('Password must be at least 8 characters long.');
    if (!/[A-Z]/.test(password)) errors.push('Password must contain at least one uppercase letter.');
    if (!/[a-z]/.test(password)) errors.push('Password must contain at least one lowercase letter.');
    if (!/[0-9]/.test(password)) errors.push('Password must contain at least one number.');
    if (password !== confirm) errors.push('Passwords do not match.');

    if (errors.length > 0) {
        errorBox.innerHTML = errors.join('<br>');
        errorBox.classList.remove('d-none');
        errorBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }
    errorBox.classList.add('d-none');

    try {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ fullname, email, phone, address, password })
        });

        const data = await res.json();

        if (data.success) {
            document.getElementById('emailError').classList.add('d-none');
            showToast(`Welcome, ${data.user.fullname}! Account created successfully.`, 'success');
            setTimeout(() => { window.location.href = 'index.html'; }, 1500);
        } else {
            if (res.status === 409) {
                document.getElementById('emailError').classList.remove('d-none');
            }
            showToast(data.message || 'Registration failed.');
        }

    } catch (err) {
        console.error('Register error:', err);
        showToast('Could not connect to server. Please try again.');
    }
});

document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') document.getElementById('registerBtn').click();
});