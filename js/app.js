// Global Bootstrapper & UI Layout Manager

// Self-invoking page preloader
(function () {
  const preloader = document.createElement('div');
  preloader.id = 'preloader';
  preloader.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100vh;
    background-color: var(--bg-primary, #ffffff);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 99999;
    transition: opacity 0.4s ease, visibility 0.4s ease;
  `;
  preloader.innerHTML = `
    <div style="text-align: center; font-family: sans-serif;">
      <div style="font-size: 2.2rem; font-weight: 800; letter-spacing: -0.5px; color: #000000; display: flex; align-items: center; gap: 10px; margin-bottom: 20px; justify-content: center; animation: loaderPulse 1.5s infinite ease-in-out;">
        <i class="fas fa-shopping-bag" style="color: #2563eb;"></i> <span><span style="color: #2563eb;">Aura</span>Shop</span>
      </div>
      <div style="width: 120px; height: 3px; background-color: var(--border, #e2e8f0); border-radius: 3px; overflow: hidden; margin: 0 auto;">
        <div style="width: 0%; height: 100%; background-color: #2563eb; animation: loadingProgress 1.2s forwards cubic-bezier(0.1, 0.8, 0.3, 1);"></div>
      </div>
    </div>
  `;

  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes loaderPulse {
      0%, 100% { transform: scale(0.97); opacity: 0.85; }
      50% { transform: scale(1.03); opacity: 1; }
    }
    @keyframes loadingProgress {
      to { width: 100%; }
    }
    body.dark-mode #preloader {
      background-color: #0f172a !important;
    }
    body.dark-mode #preloader div {
      color: #f8fafc !important;
    }
  `;
  document.head.appendChild(style);
  document.body ? document.body.prepend(preloader) : document.addEventListener('DOMContentLoaded', () => document.body.prepend(preloader));

  window.addEventListener('load', () => {
    setTimeout(() => {
      preloader.style.opacity = '0';
      preloader.style.visibility = 'hidden';
      setTimeout(() => preloader.remove(), 400);
    }, 450);
  });
})();


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
          <i class="fas fa-shopping-bag"></i> <span><span>Aura</span>Shop</span>
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
              <i class="fas fa-shopping-bag"></i> <span><span>Aura</span>Shop</span>
            </a>
            <p>Experience premium curation and sleek style. We deliver elegance directly to your doorstep.</p>
            <div class="social-links">
              <a href="mailto:svrcloudtech@gmail.com" class="btn-icon" title="Email Us"><i class="fas fa-envelope"></i></a>
              <a href="https://instagram.com/aurashop" target="_blank" class="btn-icon" title="Instagram"><i class="fab fa-instagram"></i></a>
              <a href="https://wa.me/15552345678" target="_blank" class="btn-icon" title="WhatsApp Us"><i class="fab fa-whatsapp"></i></a>
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
