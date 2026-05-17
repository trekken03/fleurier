let currentProduct = null;
let quantity = 1;

function showToast(id, message) {
    const toastEl = document.getElementById(id);
    const bodyEl = document.getElementById(id + 'Body');
    if (bodyEl && message) bodyEl.textContent = message;
    if (toastEl) bootstrap.Toast.getOrCreateInstance(toastEl).show();
}

// Get product ID from URL
function getProductId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

// Check login
async function isLoggedIn() {
    try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        const data = await res.json();
        return data.success && data.user;
    } catch { return false; }
}

// Render the product detail
function renderProduct(product) {
    currentProduct = product;
    quantity = 1;

    // Breadcrumb
    document.getElementById('breadcrumbProduct').textContent = product.name;
    document.title = `${product.name} — Fleurier`;

    // Image
    const img = document.getElementById('productImage');
    img.src = product.image;
    img.alt = product.name;

    // Name & Price
    document.getElementById('productName').textContent = product.name;
    document.getElementById('productPrice').textContent =
        '₱' + parseFloat(product.price).toLocaleString(undefined, { minimumFractionDigits: 2 });

    // Description
    document.getElementById('productDescription').textContent =
        product.description || 'No description available.';

    // Stock badge
    const badge = document.getElementById('stockBadge');
    const stock = parseInt(product.stock);
    if (stock <= 0) {
        badge.textContent = 'Out of Stock';
        badge.className = 'stock-badge out-of-stock';
    } else if (stock <= 5) {
        badge.textContent = `Only ${stock} left in stock!`;
        badge.className = 'stock-badge low-stock';
    } else {
        badge.textContent = `${stock} in stock`;
        badge.className = 'stock-badge in-stock';
    }

    // Quantity & buttons
    const outOfStock = stock <= 0;
    document.getElementById('qtyValue').textContent = 1;
    document.getElementById('qtyMinus').disabled = true;
    document.getElementById('qtyPlus').disabled = outOfStock || stock <= 1;
    document.getElementById('addToCartBtn').disabled = outOfStock;
    document.getElementById('orderNowBtn').disabled = outOfStock;

    if (outOfStock) {
        document.getElementById('quantitySection').style.opacity = '0.4';
    }

    // Show content
    document.getElementById('loadingState').classList.add('d-none');
    document.getElementById('productContent').classList.remove('d-none');
}

// Render related products
function renderRelated(products, currentId) {
    const related = products.filter(p => p.id != currentId && p.stock > 0).slice(0, 4);
    if (!related.length) return;

    const grid = document.getElementById('relatedProductsGrid');
    grid.innerHTML = related.map(p => `
                <div class="col-6 col-md-3">
                    <a href="product.html?id=${p.id}" class="related-card">
                        <img src="${p.image}" alt="${p.name}">
                        <div class="related-card-body">
                            <div class="related-card-name">${p.name}</div>
                            <div class="related-card-price">
                                ₱${parseFloat(p.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                            <div class="related-card-stock">${p.stock} in stock</div>
                        </div>
                    </a>
                </div>`).join('');

    document.getElementById('relatedSection').classList.remove('d-none');
}

// Quantity controls
document.getElementById('qtyMinus').addEventListener('click', function () {
    if (quantity <= 1) return;
    quantity--;
    document.getElementById('qtyValue').textContent = quantity;
    document.getElementById('qtyMinus').disabled = quantity <= 1;
    document.getElementById('qtyPlus').disabled = quantity >= currentProduct.stock;
});

document.getElementById('qtyPlus').addEventListener('click', function () {
    if (quantity >= currentProduct.stock) {
        showToast('stockToast');
        return;
    }
    quantity++;
    document.getElementById('qtyValue').textContent = quantity;
    document.getElementById('qtyMinus').disabled = false;
    document.getElementById('qtyPlus').disabled = quantity >= currentProduct.stock;
});

// Add to Cart
document.getElementById('addToCartBtn').addEventListener('click', async function () {
    if (!await isLoggedIn()) {
        bootstrap.Toast.getOrCreateInstance(document.getElementById('loginToast')).show();
        return;
    }
    try {
        const res = await fetch('/api/cart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ product_id: currentProduct.id, quantity })
        });
        const data = await res.json();
        if (data.success) {
            showToast('cartToast', `${currentProduct.name} added to cart!`);
        } else {
            showToast('cartToast', data.message || 'Could not add to cart.');
        }
    } catch (err) {
        console.error('Add to cart error:', err);
    }
});

// Order Now
document.getElementById('orderNowBtn').addEventListener('click', async function () {
    if (!await isLoggedIn()) {
        bootstrap.Toast.getOrCreateInstance(document.getElementById('loginToast')).show();
        return;
    }
    const item = [{
        product_id: currentProduct.id,
        name: currentProduct.name,
        price: currentProduct.price,
        image: currentProduct.image,
        quantity,
        selected: true
    }];
    sessionStorage.setItem('checkoutItems', JSON.stringify(item));
    window.location.href = 'checkout.html';
});

// Init — load product
document.addEventListener('DOMContentLoaded', async function () {
    const productId = getProductId();

    if (!productId) {
        document.getElementById('loadingState').classList.add('d-none');
        document.getElementById('notFoundState').classList.remove('d-none');
        return;
    }

    try {
        const res = await fetch('/api/products', { credentials: 'include' });
        const data = await res.json();

        if (!data.success) throw new Error('Failed to load products');

        const product = data.products.find(p => p.id == productId);

        if (!product) {
            document.getElementById('loadingState').classList.add('d-none');
            document.getElementById('notFoundState').classList.remove('d-none');
            return;
        }

        renderProduct(product);
        renderRelated(data.products, productId);

    } catch (err) {
        console.error('Load product error:', err);
        document.getElementById('loadingState').classList.add('d-none');
        document.getElementById('notFoundState').classList.remove('d-none');
    }
});
