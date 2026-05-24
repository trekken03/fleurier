// profile.js - profile operations via server API

(async function checkAuth() {
    try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        const data = await res.json();
        if (!data.success || !data.user) {
            window.location.href = 'login.html';
        }
    } catch (err) {
        window.location.href = 'login.html';
    }
})();

function showToast(message, type = 'success') {
    const toastEl = document.getElementById('profileToast');
    const toastBody = document.getElementById('profileToastBody');
    toastEl.className = `toast text-white bg-${type}`;
    toastBody.textContent = message;
    bootstrap.Toast.getOrCreateInstance(toastEl).show();
}

function statusBadge(status) {
    const map = {
        Pending: 'bg-warning text-dark',
        Processing: 'bg-info text-dark',
        Shipped: 'bg-primary',
        Delivered: 'bg-success',
        Cancelled: 'bg-danger'
    };
    return map[status] || 'bg-secondary';
}

async function loadProfile() {
    try {
        const res = await fetch('/api/users/me', { credentials: 'include' });
        const data = await res.json();
        if (!data.success) return;

        const u = data.user;
        document.getElementById('profileName').textContent = u.fullname || '—';
        document.getElementById('profileRole').textContent = u.role || 'user';
        document.getElementById('editFullname').value = u.fullname || '';
        document.getElementById('editEmail').value = u.email || '';
        document.getElementById('editPhone').value = u.phone || '';
        document.getElementById('editAddress').value = u.address || '';
    } catch (err) {
        console.error('Load profile error:', err);
    }
}

async function loadOrderHistory() {
    const listEl = document.getElementById('orderHistoryList');
    try {
        const res = await fetch('/api/orders/my', { credentials: 'include' });
        const data = await res.json();

        if (!data.success || !data.orders.length) {
            listEl.innerHTML = '<p class="text-muted text-center py-3">No orders yet.</p>';
            return;
        }

        listEl.innerHTML = data.orders.map(o => {
            const isPending = o.status === 'Pending' || o.status === 'pending';
            const cancelBtn = isPending
                ? `<button class="btn btn-outline-danger btn-sm mt-1 cancel-order-btn"
                        style="font-size:0.7rem;padding:2px 8px;"
                        data-id="${o.id}" data-code="${o.order_code}">
                        Cancel
                   </button>`
                : '';

            return `
            <div class="d-flex justify-content-between align-items-center border-bottom py-2">
                <div>
                    <div class="fw-semibold small">${o.order_code}</div>
                    <div class="text-muted" style="font-size:0.8rem;">
                        ${new Date(o.created_at).toLocaleDateString()} &bull; ${o.items?.length || 0} item(s)
                    </div>
                    ${cancelBtn}
                </div>
                <div class="text-end">
                    <div class="fw-bold text-danger small">₱${parseFloat(o.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                    <span class="badge ${statusBadge(o.status)}" style="font-size:0.7rem;">${o.status}</span>
                </div>
            </div>`;
        }).join('');

        // Attach cancel button events
        document.querySelectorAll('.cancel-order-btn').forEach(btn => {
            btn.addEventListener('click', async function () {
                const orderId = this.dataset.id;
                const orderCode = this.dataset.code;

                if (!confirm(`Cancel order ${orderCode}? This cannot be undone.`)) return;

                try {
                    const res = await fetch('/api/orders/' + orderId + '/status', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ status: 'Cancelled' })
                    });
                    const data = await res.json();

                    if (data.success) {
                        showToast('Order cancelled successfully.', 'success');
                        loadOrderHistory();
                    } else {
                        showToast(data.message || 'Failed to cancel order.', 'danger');
                    }
                } catch (err) {
                    console.error('Cancel order error:', err);
                    showToast('Could not connect to server.', 'danger');
                }
            });
        });

    } catch (err) {
        console.error('Load orders error:', err);
        listEl.innerHTML = '<p class="text-muted text-center py-3">Could not load orders.</p>';
    }
}

document.getElementById('saveProfileBtn').addEventListener('click', async function () {
    const fullname = document.getElementById('editFullname').value.trim();
    const email = document.getElementById('editEmail').value.trim();
    const phone = document.getElementById('editPhone').value.trim();
    const address = document.getElementById('editAddress').value.trim();

    if (!fullname || !email) {
        showToast('Full name and email are required.', 'danger');
        return;
    }

    try {
        const res = await fetch('/api/users/me', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ fullname, email, phone, address })
        });

        const data = await res.json();

        if (data.success) {
            document.getElementById('profileName').textContent = fullname;
            const greet = document.getElementById('navGreetingText');
            if (greet) greet.textContent = `Hi, ${fullname}!`;
            showToast('Profile updated successfully!', 'success');
        } else {
            showToast(data.message || 'Update failed.', 'danger');
        }

    } catch (err) {
        console.error('Save profile error:', err);
        showToast('Could not connect to server.', 'danger');
    }
});

document.getElementById('changePasswordBtn').addEventListener('click', async function () {
    const current = document.getElementById('currentPassword').value;
    const newPass = document.getElementById('newPassword').value;
    const confirm = document.getElementById('confirmNewPassword').value;

    if (!current || !newPass || !confirm) {
        showToast('Please fill in all password fields.', 'danger');
        return;
    }
    if (newPass.length < 8) {
        showToast('New password must be at least 8 characters.', 'danger');
        return;
    }
    if (newPass !== confirm) {
        showToast('New passwords do not match.', 'danger');
        return;
    }

    try {
        const res = await fetch('/api/users/me/password', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ current_password: current, new_password: newPass })
        });

        const data = await res.json();

        if (data.success) {
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmNewPassword').value = '';
            showToast('Password changed successfully!', 'success');
        } else {
            showToast(data.message || 'Password change failed.', 'danger');
        }

    } catch (err) {
        console.error('Change password error:', err);
        showToast('Could not connect to server.', 'danger');
    }
});


async function loadMyMessages() {
    const listEl = document.getElementById('myMessagesList');
    if (!listEl) return;

    try {
        const res = await fetch('/api/messages/my', { credentials: 'include' });
        const data = await res.json();

        if (!data.success || !data.messages.length) {
            listEl.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-envelope-open fa-2x mb-2" style="color:#d0b9b6;opacity:0.5;"></i>
                    <p class="text-muted small mb-0">No messages sent yet.</p>
                </div>`;
            return;
        }

        const count = data.messages.length;
        const countBadge = '<div class="d-flex justify-content-between align-items-center mb-2">' +
            '<span class="small text-muted">' + count + ' message' + (count > 1 ? 's' : '') + '</span>' +
            '</div>';

        const messageItems = data.messages.map((m, i) => {
            const date = new Date(m.created_at).toLocaleDateString();
            const replDate = m.replied_at ? new Date(m.replied_at).toLocaleDateString() : '';
            const statusBadge = m.reply
                ? '<span class="badge bg-success" style="font-size:0.65rem;">Replied</span>'
                : '<span class="badge bg-warning text-dark" style="font-size:0.65rem;">Awaiting Reply</span>';

            const replyBlock = m.reply
                ? '<div class="mt-2 pt-2" style="border-top:1px dashed #dee2e6;">' +
                '<div class="d-flex align-items-start gap-2">' +
                '<i class="fas fa-headset mt-1" style="color:#28a745;font-size:0.75rem;"></i>' +
                '<div class="flex-grow-1">' +
                '<div class="small fw-semibold mb-1" style="color:#28a745;">Admin Reply <span class="fw-normal text-muted">&bull; ' + replDate + '</span></div>' +
                '<div class="small" style="color:#444;">' + m.reply + '</div>' +
                '</div></div></div>'
                : '';

            return '<div class="message-thread-item p-2 mb-2 rounded" style="background-color:#fbfaf9;border:1px solid #f0ebe9;">' +
                '<div class="d-flex justify-content-between align-items-start mb-1">' +
                '<span class="small text-muted">' + date + '</span>' +
                statusBadge +
                '</div>' +
                '<div class="d-flex align-items-start gap-2">' +
                '<i class="fas fa-user-circle mt-1" style="color:#d0b9b6;font-size:0.75rem;"></i>' +
                '<div class="small flex-grow-1" style="color:#555;">' + m.message + '</div>' +
                '</div>' +
                replyBlock +
                '</div>';
        }).join('');

        listEl.innerHTML =
            countBadge +
            '<div style="max-height:280px;overflow-y:auto;padding-right:4px;">' +
            messageItems +
            '</div>';

    } catch (err) {
        console.error('Load my messages error:', err);
        if (listEl) listEl.innerHTML = '<p class="text-muted text-center py-3">Could not load messages.</p>';
    }
}

document.addEventListener('DOMContentLoaded', function () {
    loadProfile();
    loadOrderHistory();
    loadMyMessages();
});