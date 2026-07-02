// Cart & Wishlist State Controller

const Cart = {
  // --- WISHLIST MANAGEMENT ---
  getWishlist() {
    const list = localStorage.getItem('wishlist');
    return list ? JSON.parse(list) : [];
  },

  saveWishlist(list) {
    localStorage.setItem('wishlist', JSON.stringify(list));
  },

  isWishlisted(productId) {
    const list = this.getWishlist();
    return list.some(id => parseInt(id) === parseInt(productId));
  },

  toggleWishlist(productId) {
    let list = this.getWishlist();
    productId = parseInt(productId);
    const index = list.indexOf(productId);
    
    if (index === -1) {
      list.push(productId);
      showToast('Added to Wishlist', 'success');
    } else {
      list.splice(index, 1);
      showToast('Removed from Wishlist', 'info');
    }
    
    this.saveWishlist(list);
    
    // Update navbar indicators
    Auth.updateNavbar();

    // Trigger custom event so details or list pages can re-render if active
    document.dispatchEvent(new CustomEvent('wishlistUpdated', { detail: { id: productId } }));
    return index === -1;
  },

  // --- CART MANAGEMENT ---
  getCart() {
    const items = localStorage.getItem('cart');
    return items ? JSON.parse(items) : [];
  },

  saveCart(items) {
    localStorage.setItem('cart', JSON.stringify(items));
    Auth.updateNavbar();
  },

  getCartCount() {
    const cart = this.getCart();
    return cart.reduce((acc, item) => acc + item.quantity, 0);
  },

  addToCart(product, quantity = 1) {
    const cart = this.getCart();
    const existing = cart.find(item => item.id === product.id);
    
    if (existing) {
      existing.quantity += quantity;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: parseFloat(product.price),
        discount: parseFloat(product.discount || 0),
        image_url: product.image_url,
        quantity: quantity
      });
    }

    this.saveCart(cart);
    showToast('Product added to Cart', 'success');
  },

  updateQuantity(productId, quantity) {
    if (quantity <= 0) {
      this.removeFromCart(productId);
      return;
    }
    const cart = this.getCart();
    const item = cart.find(i => i.id === productId);
    if (item) {
      item.quantity = quantity;
      this.saveCart(cart);
      document.dispatchEvent(new CustomEvent('cartUpdated'));
    }
  },

  removeFromCart(productId) {
    let cart = this.getCart();
    cart = cart.filter(item => item.id !== productId);
    this.saveCart(cart);
    showToast('Item removed from Cart', 'info');
    document.dispatchEvent(new CustomEvent('cartUpdated'));
  },

  clearCart() {
    localStorage.removeItem('cart');
    this.saveCart([]);
    document.dispatchEvent(new CustomEvent('cartUpdated'));
  },

  // Live Total Calculations
  getTotals(couponCode = '') {
    const cart = this.getCart();
    let subtotal = 0;
    let discount = 0;
    
    cart.forEach(item => {
      const discountedPrice = item.price * (1 - item.discount / 100);
      subtotal += item.price * item.quantity;
      discount += (item.price - discountedPrice) * item.quantity;
    });

    let total = subtotal - discount;
    let couponDiscount = 0;

    if (couponCode && couponCode.toUpperCase() === 'SAVE10') {
      couponDiscount = total * 0.1;
      total = total * 0.9;
    }

    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      discount: parseFloat(discount.toFixed(2)),
      couponDiscount: parseFloat(couponDiscount.toFixed(2)),
      total: parseFloat(total.toFixed(2))
    };
  },

  // Checkout process trigger
  async checkout(shippingAddress, couponCode = '') {
    if (!Auth.isLoggedIn()) {
      showToast('Please log in to complete your checkout', 'warning');
      setTimeout(() => { window.location.href = 'login.html'; }, 1500);
      return;
    }

    const cartItems = this.getCart();
    if (cartItems.length === 0) {
      showToast('Your cart is empty', 'warning');
      return;
    }

    const { total } = this.getTotals(couponCode);

    try {
      const response = await API.placeOrder({
        cartItems,
        total,
        coupon: couponCode,
        shippingAddress
      });
      
      showToast(response.message, 'success');
      this.clearCart();
      setTimeout(() => {
        window.location.href = 'profile.html?tab=orders';
      }, 1500);
    } catch (error) {
      showToast(error.message, 'error');
    }
  }
};
