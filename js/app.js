// Global Bootstrapper & UI Layout Manager

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  renderHeaderFooter();
  setupMobileNav();
  Auth.updateNavbar();
});

// Theme setup check
function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }
}

// Injects the sticky navigation header and clean footer into the DOM
function renderHeaderFooter() {
  const headerElem = document.querySelector('header');
  if (headerElem) {
    headerElem.innerHTML = `
      <div class="container header-container">
        <a href="index.html" class="logo">
          <i class="fas fa-shopping-bag"></i> <span>Aura</span>Shop
        </a>
        <button class="menu-toggle" id="menu-toggle-btn" aria-label="Toggle Menu">
          <i class="fas fa-bars"></i>
        </button>
        <nav id="navbar-menu">
          <ul>
            <li><a href="index.html" class="${isActivePage('index.html')}">Home</a></li>
            <li><a href="products.html" class="${isActivePage('products.html')}">Shop</a></li>
            <li><a href="about.html" class="${isActivePage('about.html')}">About Us</a></li>
            <li><a href="contact.html" class="${isActivePage('contact.html')}">Contact</a></li>
          </ul>
        </nav>
        <div class="header-actions" id="nav-actions">
          <!-- Dynamically populated by Auth.updateNavbar() -->
        </div>
      </div>
    `;
  }

  const footerElem = document.querySelector('footer');
  if (footerElem) {
    footerElem.innerHTML = `
      <div class="container">
        <div class="footer-grid">
          <div class="footer-col">
            <a href="index.html" class="logo" style="margin-bottom: 15px;">
              <i class="fas fa-shopping-bag"></i> <span>Aura</span>Shop
            </a>
            <p>Experience premium curation and sleek style. We deliver elegance directly to your doorstep.</p>
            <div class="social-links">
              <a href="#" class="btn-icon"><i class="fab fa-facebook-f"></i></a>
              <a href="#" class="btn-icon"><i class="fab fa-twitter"></i></a>
              <a href="#" class="btn-icon"><i class="fab fa-instagram"></i></a>
            </div>
          </div>
          <div class="footer-col">
            <h3>Quick Links</h3>
            <ul class="footer-links">
              <li><a href="index.html">Home</a></li>
              <li><a href="products.html">Shop Catalog</a></li>
              <li><a href="about.html">About Our Store</a></li>
              <li><a href="contact.html">Contact Support</a></li>
            </ul>
          </div>
          <div class="footer-col">
            <h3>Customer Care</h3>
            <ul class="footer-links">
              <li><a href="#">Shipping Policy</a></li>
              <li><a href="#">Returns & Exchanges</a></li>
              <li><a href="#">FAQs</a></li>
              <li><a href="#">Privacy Policy</a></li>
            </ul>
          </div>
          <div class="footer-col">
            <h3>Newsletter</h3>
            <p>Subscribe to receive notifications about our premier launches and sales.</p>
            <form class="newsletter-form" onsubmit="event.preventDefault(); showToast('Subscribed to newsletter!', 'success'); this.reset();">
              <input type="email" class="form-control" placeholder="Your email address" required>
              <button type="submit" class="btn btn-primary" style="padding: 10px 18px;"><i class="fas fa-paper-plane"></i></button>
            </form>
          </div>
        </div>
        <div class="footer-bottom">
          <p>&copy; ${new Date().getFullYear()} AuraShop. All rights reserved.</p>
          <div style="display: flex; gap: 15px;">
            <i class="fab fa-cc-visa" style="font-size: 1.5rem;"></i>
            <i class="fab fa-cc-mastercard" style="font-size: 1.5rem;"></i>
            <i class="fab fa-cc-paypal" style="font-size: 1.5rem;"></i>
          </div>
        </div>
      </div>
    `;
  }
}

// Check which navbar link is active
function isActivePage(pageName) {
  const currentPath = window.location.pathname;
  if (currentPath.endsWith('/') && pageName === 'index.html') return 'active';
  return currentPath.includes(pageName) ? 'active' : '';
}

// Setup Mobile Navigation Menu Slide Toggler
function setupMobileNav() {
  document.addEventListener('click', (e) => {
    const toggleBtn = document.getElementById('menu-toggle-btn');
    const navMenu = document.getElementById('navbar-menu');
    
    if (toggleBtn && (toggleBtn.contains(e.target) || e.target.closest('#menu-toggle-btn'))) {
      navMenu.classList.toggle('nav-active');
      const icon = toggleBtn.querySelector('i');
      if (navMenu.classList.contains('nav-active')) {
        icon.className = 'fas fa-times';
      } else {
        icon.className = 'fas fa-bars';
      }
    } else if (navMenu && navMenu.classList.contains('nav-active') && !navMenu.contains(e.target)) {
      navMenu.classList.remove('nav-active');
      const icon = document.querySelector('#menu-toggle-btn i');
      if (icon) icon.className = 'fas fa-bars';
    }
  });
}

// Global Toast Alert Dispatcher
function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = '<i class="fas fa-check-circle"></i>';
  if (type === 'error') icon = '<i class="fas fa-times-circle"></i>';
  if (type === 'warning') icon = '<i class="fas fa-exclamation-circle"></i>';
  if (type === 'info') icon = '<i class="fas fa-info-circle"></i>';

  toast.innerHTML = `
    ${icon}
    <span>${message}</span>
  `;

  container.appendChild(toast);

  // Auto remove from DOM
  setTimeout(() => {
    toast.remove();
    if (container.children.length === 0) {
      container.remove();
    }
  }, 3000);
}
