let checkoutCart = [];

function showToast(id, message) {
    const toastEl = document.getElementById(id);
    const bodyEl = document.getElementById(id + 'Body');
    if (bodyEl && message) bodyEl.textContent = message;
    if (toastEl) bootstrap.Toast.getOrCreateInstance(toastEl).show();
}

async function loadUserInfo() {
    try {
        const res = await fetch('/api/users/me', { credentials: 'include' });
        const data = await res.json();
        if (data.success) {
            const u = data.user;
            if (u.fullname) document.getElementById('fullname').value = u.fullname;
            if (u.email) document.getElementById('email').value = u.email;
            if (u.phone) document.getElementById('phone').value = u.phone;
            if (u.address) document.getElementById('address').value = u.address;
        }
    } catch (err) {
        console.error('Load user info error:', err);
    }
}

function renderCheckoutCart() {
    const itemsDiv = document.getElementById('checkoutItems');
    const subtotalSpan = document.getElementById('checkoutSubtotal');
    const placeOrderBtn = document.getElementById('placeOrderBtn');

    if (!checkoutCart || !checkoutCart.length) {
        itemsDiv.innerHTML = `
            <div class="text-center text-muted py-3">
                Your cart is empty.<br>
                <a href="index.html" class="btn btn-danger mt-3">Shop Now</a>
            </div>`;
        subtotalSpan.textContent = '0.00';
        document.getElementById('deliveryFee').textContent = '0.00';
        document.getElementById('checkoutTotal').textContent = '0.00';
        placeOrderBtn.disabled = true;
        return;
    }

    let html = '';
    let subtotal = 0;

    for (const item of checkoutCart) {
        const lineTotal = parseFloat(item.price) * item.quantity;
        subtotal += lineTotal;
        html += `
            <div class="d-flex align-items-center justify-content-between mb-3">
                <div class="d-flex align-items-center gap-2">
                    <img src="${item.image}" width="48" height="48" style="object-fit:cover" class="rounded" alt="${item.name}">
                    <div>
                        <div class="fw-semibold">${item.name}</div>
                        <div class="small text-muted">Qty: ${item.quantity}</div>
                    </div>
                </div>
                <span class="fw-semibold">₱${lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>`;
    }

    itemsDiv.innerHTML = html;
    subtotalSpan.textContent = subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 });
    placeOrderBtn.disabled = false;
    updateSummary();
}

function updateSummary() {
    const subtotal = parseFloat(document.getElementById('checkoutSubtotal').textContent.replace(/,/g, '')) || 0;
    const isPickup = document.getElementById('pickup').checked;
    const deliveryFee = isPickup ? 0 : 100;
    const total = subtotal + deliveryFee;

    document.getElementById('deliveryFee').textContent = deliveryFee.toLocaleString(undefined, { minimumFractionDigits: 2 });
    document.getElementById('checkoutTotal').textContent = total.toLocaleString(undefined, { minimumFractionDigits: 2 });
}

async function placeOrder() {
    if (!checkoutCart || !checkoutCart.length) {
        showToast('errorToast', 'No items in your cart.');
        return;
    }

    const requiredFields = [
        { id: 'fullname', label: 'Full Name' },
        { id: 'phone', label: 'Phone Number' },
        { id: 'address', label: 'Address' }
    ];

    for (const field of requiredFields) {
        const el = document.getElementById(field.id);
        if (!el.value.trim()) {
            showToast('errorToast', `Please fill in the ${field.label} field.`);
            el.focus();
            return;
        }
    }

    const subtotal = parseFloat(document.getElementById('checkoutSubtotal').textContent.replace(/,/g, '')) || 0;
    const deliveryFee = parseFloat(document.getElementById('deliveryFee').textContent.replace(/,/g, '')) || 0;
    const total = parseFloat(document.getElementById('checkoutTotal').textContent.replace(/,/g, '')) || 0;

    const orderPayload = {
        items: checkoutCart.map(item => ({
            product_id: item.product_id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            image: item.image
        })),
        fullname: document.getElementById('fullname').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        address: document.getElementById('address').value.trim(),
        additional_info: document.getElementById('additionalInfo').value.trim(),
        delivery_instructions: document.getElementById('deliveryInstructions').value.trim(),
        shipping_method: document.querySelector('input[name="shippingMethod"]:checked').value,
        payment_method: document.querySelector('input[name="paymentMethod"]:checked').value,
        subtotal,
        delivery_fee: deliveryFee,
        total
    };

    try {
        const res = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(orderPayload)
        });

        const data = await res.json();

        if (data.success) {
            sessionStorage.removeItem('checkoutItems');
            showToast('successToast', `Order placed! Order ID: ${data.orderId}`);
            setTimeout(() => { window.location.href = 'index.html'; }, 2000);
        } else {
            showToast('errorToast', data.message || 'Failed to place order.');
        }

    } catch (err) {
        console.error('Place order error:', err);
        showToast('errorToast', 'Could not connect to server. Please try again.');
    }
}

document.addEventListener('DOMContentLoaded', async function () {

    const stored = sessionStorage.getItem('checkoutItems');
    if (stored) {
        checkoutCart = JSON.parse(stored);
    } else {

        try {
            const res = await fetch('/api/cart', { credentials: 'include' });
            const data = await res.json();
            checkoutCart = data.success ? data.cart : [];
        } catch (err) {
            checkoutCart = [];
        }
    }

    await loadUserInfo();
    renderCheckoutCart();

    document.querySelectorAll('input[name="shippingMethod"]').forEach(radio => {
        radio.addEventListener('change', updateSummary);
    });

    // Phone number input: numbers only, max 11 characters
    const phoneInput = document.getElementById('phone');
    phoneInput.addEventListener('input', function () {
        this.value = this.value.replace(/[^0-9]/g, '').slice(0, 11);
    });

    document.getElementById('placeOrderBtn').addEventListener('click', placeOrder);
});