

function showToast(id) {
    const toastEl = document.getElementById(id);
    if (toastEl && typeof bootstrap !== 'undefined') {
        bootstrap.Toast.getOrCreateInstance(toastEl).show();
    }
}

async function fetchCart() {
    const res = await fetch('/api/cart', { credentials: 'include' });
    const data = await res.json();
    if (!data.success) return [];
    return data.cart;
}

async function renderCart() {
    const container = document.getElementById('mainCartItems');
    const subtotalEl = document.getElementById('mainCartTotal');
    const totalEl = document.getElementById('mainCartTotalFinal');
    if (!container) return;

    let cart = [];
    try {
        cart = await fetchCart();
    } catch (err) {
        container.innerHTML = `<p class="text-muted text-center py-5">Could not load cart. Please try again.</p>`;
        return;
    }

    if (cart.length === 0) {
        container.innerHTML = `
            <p class="text-muted text-center py-5">
                Your cart is empty. <a href="index.html" class="text-danger">Continue shopping</a>
            </p>`;
        if (subtotalEl) subtotalEl.textContent = '0';
        if (totalEl) totalEl.textContent = '0';
        updateSelectAll(cart);
        return;
    }

    container.innerHTML = '';
    let total = 0;

    cart.forEach(item => {
        if (item.selected) total += parseFloat(item.price) * item.quantity;

        const atMax = item.quantity >= item.stock;

        const row = document.createElement('div');
        row.className = 'cart-item-main d-flex align-items-center mb-3 p-3 border rounded';
        row.innerHTML = `
            <input type="checkbox" class="form-check-input me-3 item-checkbox" ${item.selected ? 'checked' : ''}>
            <img src="${item.image}" class="me-3" style="width:80px;height:80px;object-fit:cover;border-radius:8px;" alt="${item.name}">
            <div class="flex-grow-1">
                <div class="fw-bold fs-5">${item.name}</div>
                <div class="text-muted">₱${parseFloat(item.price).toFixed(2)} each</div>
                ${atMax ? `<div class="text-danger small mt-1"><i class="fas fa-exclamation-circle me-1"></i>Max stock reached (${item.stock})</div>` : ''}
            </div>
            <div class="d-flex align-items-center gap-3">
                <div class="d-flex align-items-center border rounded">
                    <button class="btn btn-outline-secondary border-0 minus-btn">−</button>
                    <span class="mx-3 fw-bold">${item.quantity}</span>
                    <button class="btn btn-outline-secondary border-0 plus-btn" ${atMax ? 'disabled' : ''}>+</button>
                </div>
                <div class="fw-bold fs-5" style="min-width:100px;text-align:right;">
                    ₱${(parseFloat(item.price) * item.quantity).toFixed(2)}
                </div>
                <button class="btn btn-outline-danger btn-sm remove-btn">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>`;


        row.querySelector('.item-checkbox').addEventListener('change', async e => {
            await fetch(`/api/cart/${item.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ selected: e.target.checked })
            });
            renderCart();
        });


        row.querySelector('.minus-btn').addEventListener('click', async () => {
            if (item.quantity <= 1) {
                showToast('quantityWarningToast');
                return;
            }
            await fetch(`/api/cart/${item.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ quantity: item.quantity - 1 })
            });
            renderCart();
        });


        row.querySelector('.plus-btn').addEventListener('click', async () => {
            if (item.quantity >= item.stock) {
                showToast('stockWarningToast');
                return;
            }
            await fetch(`/api/cart/${item.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ quantity: item.quantity + 1 })
            });
            renderCart();
        });


        row.querySelector('.remove-btn').addEventListener('click', async () => {
            if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
                await fetch(`/api/cart/${item.id}`, {
                    method: 'DELETE',
                    credentials: 'include'
                });
                showToast('deleteConfirmToast');
                renderCart();
            }
        });

        container.appendChild(row);
    });

    if (subtotalEl) subtotalEl.textContent = total.toFixed(2);
    if (totalEl) totalEl.textContent = total.toFixed(2);
    updateSelectAll(cart);
}

function updateSelectAll(cart) {
    const selectAll = document.getElementById('selectAllCheckbox');
    if (selectAll) {
        selectAll.checked = cart.length > 0 && cart.every(i => i.selected);
    }
}

function updateCartCount() {
    fetch('/api/cart', { credentials: 'include' })
        .then(r => r.json())
        .then(data => {
            const navCart = document.getElementById('navCart');
            if (!navCart) return;
            const cartLink = navCart.querySelector('a');
            if (!cartLink) return;
            const count = data.success
                ? data.cart.reduce((sum, item) => sum + item.quantity, 0)
                : 0;
            if (count > 0) {
                cartLink.innerHTML = `
                    <span class="position-relative">
                        <i class="fa-solid fa-cart-shopping fa-xl"></i>
                        <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                            style="font-size:0.6rem; padding: 3px 6px;">
                            ${count}
                        </span>
                    </span>`;
            } else {
                cartLink.innerHTML = `<i class="fa-solid fa-cart-shopping fa-xl"></i>`;
            }
        }).catch(() => { });
}

document.addEventListener('DOMContentLoaded', () => {
    renderCart();


    const selectAll = document.getElementById('selectAllCheckbox');
    if (selectAll) {
        selectAll.addEventListener('change', async e => {
            await fetch('/api/cart/select/all', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ selected: e.target.checked })
            });
            renderCart();
        });
    }

    const deleteBtn = document.getElementById('deleteSelectedBtn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
            const cart = await fetchCart();
            const selected = cart.filter(i => i.selected);

            if (selected.length === 0) {
                showToast('deleteWarningToast');
                return;
            }

            const confirmMessage = selected.length === 1
                ? `Are you sure you want to delete "${selected[0].name}"?`
                : `Are you sure you want to delete ${selected.length} selected items?`;

            if (confirm(confirmMessage)) {
                await fetch('/api/cart/selected/items', {
                    method: 'DELETE',
                    credentials: 'include'
                });
                showToast('deleteConfirmToast');
                renderCart();
                updateCartCount();
            }
        });
    }

    const checkoutBtn = document.getElementById('mainCheckoutBtn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', async () => {
            const cart = await fetchCart();
            const selected = cart.filter(i => i.selected);

            if (selected.length === 0) {
                showToast('checkoutWarningToast');
                return;
            }


            sessionStorage.setItem('checkoutItems', JSON.stringify(selected));
            window.location.href = 'checkout.html';
        });
    }
});