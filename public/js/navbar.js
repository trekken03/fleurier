
(async function () {
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        navbar.style.position = 'sticky';
        navbar.style.top = '0';
        navbar.style.zIndex = '1000';
    }

    const navLogin = document.getElementById('navLogin');
    const navRegister = document.getElementById('navRegister');
    const navGreeting = document.getElementById('navGreeting');
    const navGreetingText = document.getElementById('navGreetingText');
    const navCart = document.getElementById('navCart');
    const navLogout = document.getElementById('navLogout');
    const logoutBtn = document.getElementById('logoutBtn');

    try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        const data = await res.json();

        if (data.success && data.user) {
            const user = data.user;


            const isAdminPage = window.location.pathname.endsWith('admin_dashb.html');
            if (user.role === 'admin' && !isAdminPage) {
                window.location.href = 'admin_dashb.html';
                return;
            }

            if (navLogin) navLogin.classList.add('d-none');
            if (navRegister) navRegister.classList.add('d-none');
            if (navGreeting) navGreeting.classList.remove('d-none');
            if (navGreetingText) navGreetingText.textContent = `Hi, ${user.fullname}!`;
            if (navCart) navCart.classList.remove('d-none');

            fetch('/api/cart', { credentials: 'include' })
                .then(r => r.json())
                .then(data => {
                    if (data.success && data.cart.length > 0) {
                        const cartLink = navCart.querySelector('a');
                        const count = data.cart.length;
                        cartLink.innerHTML = `
                <span class="position-relative">
                    <i class="fa-solid fa-cart-shopping fa-xl"></i>
                    <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                        style="font-size:0.6rem; padding: 3px 6px;">
                        ${count}
                    </span>
                </span>`;
                    }
                }).catch(() => { });
            if (navLogout) navLogout.classList.remove('d-none');

        } else {
            if (navLogin) navLogin.classList.remove('d-none');
            if (navRegister) navRegister.classList.remove('d-none');
            if (navGreeting) navGreeting.classList.add('d-none');
            if (navCart) navCart.classList.add('d-none');
            if (navLogout) navLogout.classList.add('d-none');
        }

    } catch (err) {
        console.error('Navbar session check failed:', err);
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function (e) {
            e.preventDefault();
            try {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    credentials: 'include'
                });
            } catch (err) {
                console.error('Logout error:', err);
            }
            window.location.href = 'login.html';
        });
    }
})();