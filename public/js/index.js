async function requireLogin() {
    try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        const data = await res.json();
        if (!data.success || !data.user) {
            bootstrap.Toast.getOrCreateInstance(document.getElementById('loginToast')).show();
            return false;
        }
        return true;
    } catch (err) {
        bootstrap.Toast.getOrCreateInstance(document.getElementById('loginToast')).show();
        return false;
    }
}

async function addToCart(productId, name) {
    try {
        const res = await fetch('/api/cart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ product_id: productId, quantity: 1 })
        });
        const data = await res.json();
        return data.success;
    } catch (err) {
        console.error('Add to cart error:', err);
        return false;
    }
}

function attachButtonEvents() {
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', async function () {
            if (!await requireLogin()) return;
            const productId = this.dataset.id;
            const name = this.dataset.name;
            const success = await addToCart(productId, name);
            if (success) {
                document.getElementById('cartToastBody').textContent = `${name} added to cart!`;
                bootstrap.Toast.getOrCreateInstance(document.getElementById('cartToast')).show();
                renderProducts(await fetchProducts());

                fetch('/api/cart', { credentials: 'include' })
                    .then(r => r.json())
                    .then(data => {
                        const navCart = document.getElementById('navCart');
                        if (!navCart) return;
                        const cartLink = navCart.querySelector('a');
                        const count = data.success ? data.cart.reduce((sum, i) => sum + i.quantity, 0) : 0;
                        if (count > 0) {
                            cartLink.innerHTML = `<span class="position-relative"><i class="fa-solid fa-cart-shopping fa-xl"></i><span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style="font-size:0.6rem;padding:3px 6px;">${count}</span></span>`;
                        }
                    }).catch(() => { });
            }
        });
    });

    document.querySelectorAll('.order-now-btn').forEach(btn => {
        btn.addEventListener('click', async function () {
            if (!await requireLogin()) return;
            const productId = parseInt(this.dataset.id);
            const name = this.dataset.name;
            const price = parseFloat(this.dataset.price);
            const image = this.dataset.image;
            const stock = parseInt(this.dataset.stock);

            if (stock <= 0) return;

            const item = [{ product_id: productId, name, price, image, quantity: 1, selected: true }];
            sessionStorage.setItem('checkoutItems', JSON.stringify(item));
            window.location.href = 'checkout.html';
        });
    });
}

async function fetchProducts() {
    const res = await fetch('/api/products', { credentials: 'include' });
    const data = await res.json();
    return data.success ? data.products : [];
}

function renderProducts(products) {
    const grid = document.getElementById('productGrid');

    grid.innerHTML = products.map(p => `
        <div class="col-md-4 product-card-col">
          <div class="card h-100 shadow-sm ${p.stock <= 0 ? 'opacity-50' : ''}">
            <a href="product.html?id=${p.id}" style="text-decoration:none;">
              <img src="${p.image}" class="card-img-top img-fluid" alt="${p.name}"
                style="height:300px; object-fit:contain; background-color:#fbfaf9; padding:10px; cursor:pointer;">
            </a>
            <div class="card-body d-flex flex-column">
              <a href="product.html?id=${p.id}" style="text-decoration:none; color:inherit;">
                <h5 class="card-title">${p.name}</h5>
              </a>
              <h5 class="card-title">₱${parseFloat(p.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</h5>
              <p class="card-text flex-grow-1">${p.description || ''}</p>

              ${p.stock <= 0
            ? `<span class="badge bg-secondary mb-2">Out of Stock</span>`
            : `<span class="badge bg-light text-dark mb-2">${p.stock} in stock</span>`}

              ${p.stock <= 0 ? `<div class="text-muted fw-bold mb-2">Unavailable</div>` : ''}

              <div class="d-flex gap-2 justify-content-center mt-auto">
                <button class="btn btn-outline-danger add-to-cart-btn"
                  data-id="${p.id}" data-name="${p.name}" data-price="${p.price}" data-image="${p.image}"
                  ${p.stock <= 0 ? 'disabled' : ''}>
                  <i class="fas fa-cart-plus me-1"></i>Add to Cart
                </button>
                <button class="btn btn-danger order-now-btn"
                  data-id="${p.id}" data-name="${p.name}" data-price="${p.price}"
                  data-image="${p.image}" data-stock="${p.stock}"
                  ${p.stock <= 0 ? 'disabled' : ''}>
                  Order Now
                </button>
              </div>
            </div>
          </div>
        </div>`).join('');

    attachButtonEvents();
    initSearch();
}

function initSearch() {
    const searchInput = document.getElementById('productSearch');
    const clearBtn = document.getElementById('clearSearch');
    const noResults = document.getElementById('noResults');
    const searchTermEl = document.getElementById('searchTerm');

    searchInput.addEventListener('input', function () {
        const query = this.value.trim().toLowerCase();
        const cards = document.querySelectorAll('.product-card-col');
        let matchCount = 0;

        cards.forEach(card => {
            const name = card.querySelector('.card-title').textContent.toLowerCase();
            if (name.includes(query)) { card.style.display = ''; matchCount++; }
            else { card.style.display = 'none'; }
        });

        clearBtn.style.display = query ? 'block' : 'none';

        if (query && matchCount === 0) {
            noResults.classList.remove('d-none');
            searchTermEl.textContent = this.value.trim();
        } else {
            noResults.classList.add('d-none');
        }
    });

    clearBtn.addEventListener('click', function () {
        searchInput.value = '';
        clearBtn.style.display = 'none';
        noResults.classList.add('d-none');
        document.querySelectorAll('.product-card-col').forEach(c => c.style.display = '');
        searchInput.focus();
    });
}

document.addEventListener('DOMContentLoaded', async function () {
    const products = await fetchProducts();
    renderProducts(products);
});