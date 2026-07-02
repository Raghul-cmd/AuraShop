// Products Management & Grid Rendering

const Products = {
  // Render HTML structure of single product card
  renderProductCard(product) {
    const isDiscounted = product.discount > 0;
    const finalPrice = (product.price * (1 - product.discount / 100)).toFixed(2);
    const isWish = Cart.isWishlisted(product.id);
    
    // Build rating stars
    let ratingStars = '';
    const ratingVal = Math.round(product.rating || 4);
    for (let i = 1; i <= 5; i++) {
      ratingStars += i <= ratingVal ? '<i class="fas fa-star"></i>' : '<i class="far fa-star"></i>';
    }

    return `
      <div class="product-card" data-id="${product.id}">
        <div class="product-image-container">
          ${isDiscounted ? `<span class="product-badge discount-badge">-${Math.round(product.discount)}%</span>` : ''}
          <button onclick="Products.handleWishlistToggle(${product.id}, this)" class="product-wishlist-btn ${isWish ? 'active' : ''}" title="Add to Wishlist">
            <i class="${isWish ? 'fas' : 'far'} fa-heart"></i>
          </button>
          <a href="product.html?id=${product.id}">
            <img src="${product.image_url || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=500'}" alt="${product.name}">
          </a>
        </div>
        <div class="product-details">
          <p class="product-cat">${product.category_name || 'Category'}</p>
          <a href="product.html?id=${product.id}">
            <h3 class="product-title">${product.name}</h3>
          </a>
          <div class="product-rating">
            ${ratingStars}
            <span>(${product.rating})</span>
          </div>
          <div class="product-price-row">
            <div class="product-prices">
              <span class="current-price">$${finalPrice}</span>
              ${isDiscounted ? `<span class="original-price">$${parseFloat(product.price).toFixed(2)}</span>` : ''}
            </div>
            <button onclick="Products.handleAddToCart(${product.id})" class="btn-icon add-cart-btn" title="Add to Cart">
              <i class="fas fa-shopping-basket"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  },

  // Add Item handler
  async handleAddToCart(productId) {
    try {
      const product = await API.getProduct(productId);
      if (product.stock <= 0) {
        showToast('Sorry, this product is out of stock', 'warning');
        return;
      }
      Cart.addToCart(product, 1);
    } catch (error) {
      showToast('Error adding product to cart', 'error');
    }
  },

  // Wishlist handler
  handleWishlistToggle(productId, btnElement) {
    const isAdded = Cart.toggleWishlist(productId);
    if (btnElement) {
      const icon = btnElement.querySelector('i');
      if (isAdded) {
        btnElement.classList.add('active');
        icon.className = 'fas fa-heart';
      } else {
        btnElement.classList.remove('active');
        icon.className = 'far fa-heart';
      }
    }
  },

  // Load products list on catalog view
  async loadCatalog(container, params = {}) {
    if (!container) return;
    
    container.innerHTML = `
      <div class="spinner-wrapper" style="grid-column: 1/-1;">
        <div class="spinner"></div>
      </div>
    `;

    try {
      const list = await API.getProducts(params);
      if (list.length === 0) {
        container.innerHTML = `
          <div class="flex-center" style="grid-column: 1/-1; flex-direction: column; padding: 60px 0;">
            <i class="fas fa-search" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 20px;"></i>
            <h3>No products found</h3>
            <p style="color: var(--text-secondary);">Try refining your search filters</p>
          </div>
        `;
        return;
      }
      
      container.innerHTML = list.map(item => this.renderProductCard(item)).join('');
    } catch (error) {
      container.innerHTML = `<div class="flex-center" style="grid-column: 1/-1;"><p style="color: var(--danger);">Failed to load products. Backend API may be offline.</p></div>`;
    }
  },

  // Load individual product detail page content
  async loadDetailView(container, productId) {
    if (!container) return;

    container.innerHTML = `
      <div class="spinner-wrapper" style="grid-column: 1/-1;">
        <div class="spinner"></div>
      </div>
    `;

    try {
      const product = await API.getProduct(productId);
      const isDiscounted = product.discount > 0;
      const finalPrice = (product.price * (1 - product.discount / 100)).toFixed(2);
      const isWish = Cart.isWishlisted(product.id);

      // Star rating build
      let ratingStars = '';
      const ratingVal = Math.round(product.rating || 4);
      for (let i = 1; i <= 5; i++) {
        ratingStars += i <= ratingVal ? '<i class="fas fa-star"></i>' : '<i class="far fa-star"></i>';
      }

      container.innerHTML = `
        <div class="detail-grid">
          <div class="detail-img-card">
            <img src="${product.image_url || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=500'}" alt="${product.name}" style="width: 100%; height: 500px; object-fit: cover;">
          </div>
          <div class="detail-info">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <span class="hero-tag" style="margin-bottom: 0;">${product.category_name || 'General'}</span>
              <button onclick="Products.handleWishlistToggle(${product.id}, this)" class="btn-icon ${isWish ? 'active' : ''}" style="border-radius: var(--radius-round); width: 44px; height: 44px; color: ${isWish ? 'var(--danger)' : 'inherit'}; border-color: ${isWish ? 'var(--danger)' : 'var(--border)'};">
                <i class="${isWish ? 'fas' : 'far'} fa-heart"></i>
              </button>
            </div>
            <h2>${product.name}</h2>
            <div class="product-rating" style="font-size: 1rem; margin-bottom: 20px;">
              ${ratingStars}
              <span style="color: var(--text-secondary); margin-left: 8px;">${product.rating} Stars / Verified Reviewers</span>
            </div>
            <p style="color: var(--text-secondary); margin-bottom: 25px; line-height: 1.8;">${product.description || 'No description available for this premium selection.'}</p>
            
            <div class="detail-price-row">
              <div style="display: flex; align-items: baseline; gap: 15px;">
                <span class="price">$${finalPrice}</span>
                ${isDiscounted ? `<span style="text-decoration: line-through; color: var(--text-muted); font-size: 1.2rem;">$${parseFloat(product.price).toFixed(2)}</span>` : ''}
                ${isDiscounted ? `<span style="color: var(--danger); font-weight: 700; font-size: 0.9rem; background-color: #fee2e2; padding: 4px 8px; border-radius: 4px;">Save ${Math.round(product.discount)}%</span>` : ''}
              </div>
            </div>

            <div class="detail-meta">
              <div><strong>Availability:</strong> ${product.stock > 0 ? `<span style="color: var(--success); font-weight: 600;">In Stock (${product.stock} left)</span>` : '<span style="color: var(--danger); font-weight: 600;">Out of Stock</span>'}</div>
              <div><strong>Standard Shipping:</strong> Free over $50. Arrives in 3-5 business days.</div>
            </div>

            ${product.stock > 0 ? `
              <div class="detail-actions">
                <div class="qty-input">
                  <button onclick="Products.adjustDetailQty(-1)">-</button>
                  <input type="number" id="detail-qty" value="1" min="1" max="${product.stock}">
                  <button onclick="Products.adjustDetailQty(1)">+</button>
                </div>
                <button onclick="Products.addDetailToCart(${product.id})" class="btn btn-primary" style="flex: 1;"><i class="fas fa-shopping-cart"></i> Add to Cart</button>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    } catch (error) {
      container.innerHTML = `<div class="flex-center"><p style="color: var(--danger);">Failed to load product details.</p></div>`;
    }
  },

  adjustDetailQty(val) {
    const input = document.getElementById('detail-qty');
    if (!input) return;
    const currentVal = parseInt(input.value);
    const maxVal = parseInt(input.getAttribute('max'));
    const newVal = currentVal + val;
    if (newVal >= 1 && newVal <= maxVal) {
      input.value = newVal;
    }
  },

  async addDetailToCart(productId) {
    const qtyInput = document.getElementById('detail-qty');
    const qty = qtyInput ? parseInt(qtyInput.value) : 1;
    try {
      const product = await API.getProduct(productId);
      Cart.addToCart(product, qty);
    } catch (error) {
      showToast('Error adding item to cart', 'error');
    }
  }
};
