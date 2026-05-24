
(async function () {
    try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        const data = await res.json();
        if (!data.success || data.user?.role !== 'admin') {
            window.location.href = 'login.html';
        }
    } catch (err) {
        window.location.href = 'login.html';
    }
})();

document.getElementById('adminLogoutBtn').addEventListener('click', async function (e) {
    e.preventDefault();
    if (confirm('Are you sure you want to log out?')) {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
        window.location.href = 'login.html';
    }
});


function showSection(name) {
    document.querySelectorAll('[id$="-section"]').forEach(s => s.classList.add('d-none'));
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
    const target = document.getElementById(name + '-section');
    if (target) target.classList.remove('d-none');
    document.querySelectorAll('.sidebar-link').forEach(link => {
        if (link.getAttribute('onclick')?.includes(name)) link.classList.add('active');
    });
}

function showToast(message, type = 'success') {
    const toastEl = document.getElementById('adminToast');
    const toastBody = document.getElementById('adminToastBody');
    toastEl.className = `toast text-white bg-${type}`;
    toastBody.textContent = message;
    bootstrap.Toast.getOrCreateInstance(toastEl).show();
}


function statusBadge(status) {
    const map = {
        Pending: 'bg-warning text-dark',
        Processing: 'bg-info text-dark',
        Shipped: 'bg-primary text-white',
        Delivered: 'bg-success text-white',
        Cancelled: 'bg-danger text-white'
    };
    return map[status] || 'bg-secondary text-white';
}


function normalizeStatus(status) {
    if (!status) return 'Pending';
    const s = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
    const valid = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
    return valid.includes(s) ? s : status;
}


async function loadDashboardStats() {
    try {
        const [ordersRes, usersRes, productsRes] = await Promise.all([
            fetch('/api/orders', { credentials: 'include' }),
            fetch('/api/users', { credentials: 'include' }),
            fetch('/api/products/all', { credentials: 'include' })
        ]);

        const ordersData = await ordersRes.json();
        const usersData = await usersRes.json();
        const productsData = await productsRes.json();

        const orders = ordersData.success ? ordersData.orders : [];
        const users = usersData.success ? usersData.users : [];
        const products = productsData.success ? productsData.products : [];

        const totalRevenue = orders
            .filter(o => normalizeStatus(o.status) === 'Delivered')
            .reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
        const pendingOrders = orders.filter(o => normalizeStatus(o.status) === 'Pending').length;
        const lowStock = products.filter(p => parseInt(p.stock) <= 5).length;

        document.getElementById('statTotalOrders').textContent = orders.length;
        document.getElementById('statTotalUsers').textContent = users.length;
        document.getElementById('statTotalProducts').textContent = products.length;
        document.getElementById('statRevenue').textContent =
            '₱' + totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 });
        document.getElementById('statPendingOrders').textContent = pendingOrders;
        document.getElementById('statLowStock').textContent = lowStock;

        const recentBody = document.getElementById('recentOrdersBody');
        const recent = orders.slice(0, 5);
        if (!recent.length) {
            recentBody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">No orders yet.</td></tr>';
        } else {
            recentBody.innerHTML = recent.map(o => {
                const status = normalizeStatus(o.status);
                return `
                <tr>
                    <td>${o.order_code}</td>
                    <td>${o.fullname || 'N/A'}</td>
                    <td>${new Date(o.created_at).toLocaleDateString()}</td>
                    <td>₱${parseFloat(o.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td>${o.items?.map(i => `${i.name} x${i.quantity}`).join(', ') || 'N/A'}</td>
                    <td><span class="badge ${statusBadge(status)}">${status}</span></td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="openEditOrder(${o.id}, '${status}')">
                            <i class="fas fa-edit"></i>
                        </button>
                    </td>
                </tr>`;
            }).join('');
        }

        initCharts(orders, products);

    } catch (err) {
        console.error('Load dashboard stats error:', err);
    }
}

// -------------------------------------------------------
// Charts
// -------------------------------------------------------
let salesChartInstance = null;
let productsChartInstance = null;

function initCharts(orders, products) {
    const months = [];
    const salesData = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
        months.push(label);
        const total = orders
            .filter(o => {
                const od = new Date(o.created_at);
                return od.getMonth() === d.getMonth() && od.getFullYear() === d.getFullYear() && normalizeStatus(o.status) === 'Delivered';
            })
            .reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
        salesData.push(total);
    }

    if (salesChartInstance) salesChartInstance.destroy();
    salesChartInstance = new Chart(document.getElementById('salesChart'), {
        type: 'bar',
        data: {
            labels: months,
            datasets: [{ label: 'Revenue (₱)', data: salesData, backgroundColor: '#d0b9b6' }]
        },
        options: { responsive: true, plugins: { legend: { display: false } } }
    });

    const categories = {};
    products.forEach(p => {
        const cat = p.category || 'Uncategorized';
        categories[cat] = (categories[cat] || 0) + 1;
    });

    if (productsChartInstance) productsChartInstance.destroy();
    productsChartInstance = new Chart(document.getElementById('productsChart'), {
        type: 'doughnut',
        data: {
            labels: Object.keys(categories).length ? Object.keys(categories) : ['No Products'],
            datasets: [{
                data: Object.values(categories).length ? Object.values(categories) : [1],
                backgroundColor: ['#d0b9b6', '#f8d7da', '#e5ded6', '#f2e9e6', '#b5c0d0', '#c9e4ca']
            }]
        },
        options: { responsive: true }
    });
}

// -------------------------------------------------------
// Products + Search Bar
// -------------------------------------------------------
let allProducts = [];

async function loadProducts() {
    try {
        const res = await fetch('/api/products/all', { credentials: 'include' });
        const data = await res.json();
        allProducts = data.success ? data.products : [];
        document.getElementById('productCount').textContent = allProducts.length;
        document.getElementById('statTotalProducts').textContent = allProducts.length;
        renderProductsTable(allProducts);
    } catch (err) {
        console.error('Load products error:', err);
    }
}

function renderProductsTable(products) {
    const body = document.getElementById('productsBody');
    if (!products.length) {
        body.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">No products found.</td></tr>';
        return;
    }
    body.innerHTML = products.map((p, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>
                <div class="d-flex align-items-center gap-2">
                    <img src="${p.image}" width="40" height="40" style="object-fit:cover" class="rounded">
                    <span>${p.name}</span>
                </div>
            </td>
            <td>${p.category || '—'}</td>
            <td>₱${parseFloat(p.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
            <td>${p.stock}</td>
            <td><span class="badge ${p.status === 'active' ? 'bg-success' : 'bg-secondary'}">${p.status}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="openEditProduct(${p.id})">
                    <i class="fas fa-edit"></i>
                </button>

                <button class="btn btn-sm btn-outline-danger" onclick="deleteProduct(${p.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>`).join('');
}

document.getElementById('productSearchInput').addEventListener('input', function () {
    const q = this.value.trim().toLowerCase();
    const filtered = q
        ? allProducts.filter(p =>
            p.name.toLowerCase().includes(q) ||
            (p.category || '').toLowerCase().includes(q) ||
            String(p.stock).includes(q))
        : allProducts;
    renderProductsTable(filtered);
});

async function saveProduct() {
    const name = document.getElementById('productName').value.trim();
    const category = document.getElementById('productCategory').value.trim();
    const price = document.getElementById('productPrice').value;
    const stock = document.getElementById('productStock').value;
    const image = document.getElementById('productImage').value.trim();
    const description = document.getElementById('productDescription').value.trim();
    const status = document.getElementById('productStatus').value;

    if (!name || !price) { showToast('Name and price are required.', 'danger'); return; }

    try {
        const res = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ name, category, price, stock, image, description, status })
        });
        const data = await res.json();
        if (data.success) {
            bootstrap.Modal.getInstance(document.getElementById('addProductModal')).hide();
            ['productName', 'productCategory', 'productPrice', 'productStock', 'productImage', 'productDescription'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            document.getElementById('productStatus').value = 'active';
            loadProducts();
            loadDashboardStats();
            showToast('Product added successfully!', 'success');
        } else {
            showToast(data.message || 'Failed to add product.', 'danger');
        }
    } catch (err) {
        showToast('Server error.', 'danger');
    }
}

async function openEditProduct(productId) {
    try {
        const res = await fetch('/api/products/all', { credentials: 'include' });
        const data = await res.json();
        const product = data.products?.find(p => p.id === productId);
        if (!product) return;
        document.getElementById('editProductId').value = product.id;
        document.getElementById('editProductName').value = product.name;
        document.getElementById('editProductCategory').value = product.category || 'Flowers';
        document.getElementById('editProductPrice').value = product.price;
        document.getElementById('editProductStock').value = product.stock;
        document.getElementById('editProductImage').value = product.image || '';
        document.getElementById('editProductDescription').value = product.description || '';
        document.getElementById('editProductStatus').value = product.status;
        bootstrap.Modal.getOrCreateInstance(document.getElementById('editProductModal')).show();
    } catch (err) {
        console.error('Open edit product error:', err);
    }
}

async function saveEditProduct() {
    const id = document.getElementById('editProductId').value;
    const name = document.getElementById('editProductName').value.trim();
    const category = document.getElementById('editProductCategory').value.trim();
    const price = document.getElementById('editProductPrice').value;
    const stock = document.getElementById('editProductStock').value;
    const image = document.getElementById('editProductImage').value.trim();
    const description = document.getElementById('editProductDescription').value.trim();
    const status = document.getElementById('editProductStatus').value;
    try {
        const res = await fetch(`/api/products/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ name, category, price, stock, image, description, status })
        });
        const data = await res.json();
        if (data.success) {
            bootstrap.Modal.getInstance(document.getElementById('editProductModal')).hide();
            loadProducts();
            loadDashboardStats();
            showToast('Product updated successfully!', 'success');
        } else {
            showToast(data.message || 'Failed to update product.', 'danger');
        }
    } catch (err) {
        showToast('Server error.', 'danger');
    }
}

async function deleteProduct(productId) {
    if (!confirm('Delete this product?')) return;
    try {
        const res = await fetch(`/api/products/${productId}`, { method: 'DELETE', credentials: 'include' });
        const data = await res.json();
        if (data.success) {
            loadProducts();
            loadDashboardStats();
            showToast('Product deleted.', 'danger');
        } else {
            showToast(data.message || 'Failed to delete.', 'danger');
        }
    } catch (err) {
        showToast('Server error.', 'danger');
    }
}

// -------------------------------------------------------
// Orders + Search Bar - FIX 4: dropdown now shows status names
// -------------------------------------------------------
let allOrders = [];

async function loadOrders() {
    try {
        const res = await fetch('/api/orders', { credentials: 'include' });
        const data = await res.json();
        allOrders = data.success ? data.orders : [];
        document.getElementById('orderCount').textContent = allOrders.length;
        renderOrdersTable(allOrders);
    } catch (err) {
        console.error('Load orders error:', err);
    }
}

function renderOrdersTable(orders) {
    const body = document.getElementById('ordersBody');
    if (!orders.length) {
        body.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">No orders found.</td></tr>';
        return;
    }
    body.innerHTML = orders.map(o => {
        const status = normalizeStatus(o.status);
        const itemsList = o.items?.map(i => `
            <div class="d-flex align-items-center gap-2 mb-1">
                <img src="${i.image}" width="30" height="30" style="object-fit:cover;border-radius:4px;" alt="${i.name}">
                <span class="small">${i.name} <span class="badge bg-secondary">x${i.quantity}</span></span>
                <span class="small text-muted ms-auto">₱${(parseFloat(i.price) * i.quantity).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>`).join('') || 'N/A';
        return `
            <tr>
                <td>${o.order_code}</td>
                <td>${o.fullname || 'N/A'}</td>
                <td>${o.email || 'N/A'}</td>
                <td>${new Date(o.created_at).toLocaleDateString()}</td>
                <td>₱${parseFloat(o.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td style="min-width:200px;">${itemsList}</td>
                <td><span class="badge ${statusBadge(status)}">${status}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="openEditOrder(${o.id}, '${status}')">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>`;
    }).join('');
}

document.getElementById('orderSearchInput').addEventListener('input', function () {
    const q = this.value.trim().toLowerCase();
    const filtered = q
        ? allOrders.filter(o =>
            o.order_code.toLowerCase().includes(q) ||
            (o.fullname || '').toLowerCase().includes(q) ||
            (o.email || '').toLowerCase().includes(q) ||
            normalizeStatus(o.status).toLowerCase().includes(q))
        : allOrders;
    renderOrdersTable(filtered);
});


function openEditOrder(orderId, currentStatus) {
    const status = normalizeStatus(currentStatus);
    document.getElementById('editOrderId').value = orderId;
    document.getElementById('editOrderIdDisplay').textContent = orderId;
    document.getElementById('editOrderStatus').value = status;
    bootstrap.Modal.getOrCreateInstance(document.getElementById('editOrderModal')).show();
}

document.getElementById('saveOrderStatusBtn').addEventListener('click', async function () {
    const orderId = document.getElementById('editOrderId').value;
    const newStatus = document.getElementById('editOrderStatus').value;
    try {
        const res = await fetch(`/api/orders/${orderId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ status: newStatus })
        });
        const data = await res.json();
        if (data.success) {
            bootstrap.Modal.getInstance(document.getElementById('editOrderModal')).hide();
            loadOrders();
            loadDashboardStats();
            showToast('Order status updated!', 'success');
        } else {
            showToast(data.message || 'Failed to update status.', 'danger');
        }
    } catch (err) {
        showToast('Server error.', 'danger');
    }
});

// -------------------------------------------------------
// Users + Search Bar + Role Change
// -------------------------------------------------------
let allUsers = [];

async function loadUsers() {
    try {
        const res = await fetch('/api/users', { credentials: 'include' });
        const data = await res.json();
        allUsers = data.success ? data.users : [];
        document.getElementById('userCount').textContent = allUsers.length;
        renderUsersTable(allUsers);
    } catch (err) {
        console.error('Load users error:', err);
    }
}

function renderUsersTable(users) {
    const body = document.getElementById('usersBody');
    if (!users.length) {
        body.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No users found.</td></tr>';
        return;
    }
    body.innerHTML = users.map((u, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>${u.fullname || 'N/A'}</td>
            <td>${u.email || 'N/A'}</td>
            <td>${u.phone || 'N/A'}</td>
            <td><span class="badge ${u.role === 'admin' ? 'bg-danger' : 'bg-primary'}">${u.role || 'user'}</span></td>
           <td>
                <button class="btn btn-sm btn-outline-secondary me-1" onclick="openChangeRole(${u.id}, '${u.fullname}', '${u.role}')">
                    <i class="fas fa-user-shield me-1"></i>Change Role
                </button>
                ${u.role !== 'admin' ? `
                <button class="btn btn-sm btn-outline-danger" onclick="deleteUser(${u.id}, '${u.fullname}')">
                    <i class="fas fa-trash"></i>
                </button>` : ''}
            </td>
        </tr>`).join('');
}

document.getElementById('userSearchInput').addEventListener('input', function () {
    const q = this.value.trim().toLowerCase();
    const filtered = q
        ? allUsers.filter(u =>
            (u.fullname || '').toLowerCase().includes(q) ||
            (u.email || '').toLowerCase().includes(q) ||
            (u.phone || '').toLowerCase().includes(q) ||
            (u.role || '').toLowerCase().includes(q))
        : allUsers;
    renderUsersTable(filtered);
});

function openChangeRole(userId, fullname, currentRole) {
    document.getElementById('changeRoleUserId').value = userId;
    document.getElementById('changeRoleUserName').textContent = fullname;
    document.getElementById('changeRoleSelect').value = currentRole;
    bootstrap.Modal.getOrCreateInstance(document.getElementById('changeRoleModal')).show();
}
async function deleteUser(userId, fullname) {
    if (!confirm(`Delete user "${fullname}"? This will also delete their cart and orders.`)) return;
    try {
        const res = await fetch(`/api/users/${userId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        const data = await res.json();
        if (data.success) {
            loadUsers();
            loadDashboardStats();
            showToast('User deleted.', 'danger');
        } else {
            showToast(data.message || 'Failed to delete user.', 'danger');
        }
    } catch (err) {
        showToast('Server error.', 'danger');
    }
}

document.getElementById('saveRoleBtn').addEventListener('click', async function () {
    const userId = document.getElementById('changeRoleUserId').value;
    const newRole = document.getElementById('changeRoleSelect').value;
    try {
        const res = await fetch(`/api/users/${userId}/role`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ role: newRole })
        });
        const data = await res.json();
        if (data.success) {
            bootstrap.Modal.getInstance(document.getElementById('changeRoleModal')).hide();
            loadUsers();
            showToast(`Role updated to "${newRole}" successfully!`, 'success');
        } else {
            showToast(data.message || 'Failed to update role.', 'danger');
        }
    } catch (err) {
        showToast('Server error.', 'danger');
    }
});

// -------------------------------------------------------
// Messages + Search Bar
// -------------------------------------------------------
let allMessages = [];

async function loadMessages() {
    try {
        const res = await fetch('/api/messages', { credentials: 'include' });
        const data = await res.json();
        allMessages = data.success ? data.messages : [];
        document.getElementById('messageCount').textContent = allMessages.length;
        renderMessagesTable(allMessages);
    } catch (err) {
        console.error('Load messages error:', err);
    }
}

function renderMessagesTable(messages) {
    const body = document.getElementById('messagesBody');
    if (!messages.length) {
        body.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">No messages found.</td></tr>';
        return;
    }
    body.innerHTML = messages.map((m, i) => {
        const replyBadge = m.reply
            ? '<span class="badge bg-success"><i class="fas fa-check me-1"></i>Replied</span>'
            : '<span class="badge bg-warning text-dark"><i class="fas fa-clock me-1"></i>Pending</span>';

        const safeMessage = (m.message || '').replace(/'/g, "\'");
        const safeReply = (m.reply || '').replace(/'/g, "\'");
        const safeName = (m.name || '').replace(/'/g, "\'");

        return `
        <tr>
            <td>${i + 1}</td>
            <td>${new Date(m.created_at).toLocaleDateString()}</td>
            <td>${m.name}</td>
            <td>${m.email}</td>
            <td>${m.message}</td>
            <td>${replyBadge}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1"
                    onclick="openReplyModal(${m.id}, '${safeName}', '${safeMessage}', '${safeReply}')">
                    <i class="fas fa-reply"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteMessage(${m.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>`;
    }).join('');
}

function openReplyModal(messageId, senderName, originalMessage, existingReply) {
    document.getElementById('replyMessageId').value = messageId;
    document.getElementById('replyMessageSender').textContent = senderName;
    document.getElementById('replyOriginalMessage').textContent = originalMessage;
    document.getElementById('replyText').value = existingReply || '';
    bootstrap.Modal.getOrCreateInstance(document.getElementById('replyModal')).show();
}

document.getElementById('sendReplyBtn').addEventListener('click', async function () {
    const messageId = document.getElementById('replyMessageId').value;
    const reply = document.getElementById('replyText').value.trim();

    if (!reply) { showToast('Reply cannot be empty.', 'danger'); return; }

    try {
        const res = await fetch('/api/messages/' + messageId + '/reply', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ reply })
        });
        const data = await res.json();
        if (data.success) {
            bootstrap.Modal.getInstance(document.getElementById('replyModal')).hide();
            loadMessages();
            showToast('Reply sent successfully!', 'success');
        } else {
            showToast(data.message || 'Failed to send reply.', 'danger');
        }
    } catch (err) {
        showToast('Server error.', 'danger');
    }
});

document.getElementById('messageSearchInput').addEventListener('input', function () {
    const q = this.value.trim().toLowerCase();
    const filtered = q
        ? allMessages.filter(m =>
            m.name.toLowerCase().includes(q) ||
            m.email.toLowerCase().includes(q) ||
            m.message.toLowerCase().includes(q))
        : allMessages;
    renderMessagesTable(filtered);
});

async function deleteMessage(messageId) {
    if (!confirm('Delete this message?')) return;
    try {
        const res = await fetch(`/api/messages/${messageId}`, { method: 'DELETE', credentials: 'include' });
        const data = await res.json();
        if (data.success) {
            loadMessages();
            showToast('Message deleted.', 'danger');
        } else {
            showToast(data.message || 'Failed to delete.', 'danger');
        }
    } catch (err) {
        showToast('Server error.', 'danger');
    }
}

// -------------------------------------------------------
// Init
// -------------------------------------------------------
document.getElementById('saveProductBtn').addEventListener('click', saveProduct);
document.getElementById('saveEditProductBtn').addEventListener('click', saveEditProduct);

document.addEventListener('DOMContentLoaded', function () {
    showSection('dashboard');
    loadDashboardStats();
    loadProducts();
    loadOrders();
    loadUsers();
    loadMessages();
});