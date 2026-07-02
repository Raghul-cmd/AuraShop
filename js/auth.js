// Authentication Controller

const Auth = {
  // Check if user is logged in
  isLoggedIn() {
    return !!localStorage.getItem('token');
  },

  // Get logged in user details
  getUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  // Get user role
  isAdmin() {
    const user = this.getUser();
    return user && user.role === 'admin';
  },

  // Log in user
  async login(email, password) {
    try {
      const data = await API.login(email, password);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      showToast('Welcome back, ' + data.user.name + '!', 'success');
      setTimeout(() => {
        if (data.user.role === 'admin') {
          window.location.href = 'admin.html';
        } else {
          window.location.href = 'profile.html';
        }
      }, 1000);
    } catch (error) {
      showToast(error.message, 'error');
    }
  },

  // Register user
  async register(name, email, password) {
    try {
      const data = await API.register(name, email, password);
      showToast(data.message, 'success');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1500);
    } catch (error) {
      showToast(error.message, 'error');
    }
  },

  // Log out user
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    showToast('Logged out successfully', 'info');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1000);
  },

  // Update profile details
  async updateProfile(name, password) {
    try {
      const data = await API.updateProfile(name, password);
      showToast(data.message, 'success');
      
      // Update local storage name
      const user = this.getUser();
      user.name = name;
      localStorage.setItem('user', JSON.stringify(user));
      
      return true;
    } catch (error) {
      showToast(error.message, 'error');
      return false;
    }
  },

  // Update navbar layout dynamically
  updateNavbar() {
    const navActions = document.getElementById('nav-actions');
    if (!navActions) return;

    const loggedIn = this.isLoggedIn();
    const isAdmin = this.isAdmin();
    const cartCount = Cart.getCartCount();

    let html = '';
    
    // Search icon, Theme toggler, Wishlist and Cart are always visible
    html += `
      <button class="action-btn" id="theme-toggle" title="Toggle Theme">
        <i class="fas fa-moon"></i>
      </button>
      <a href="products.html" class="action-btn" title="Search Products">
        <i class="fas fa-search"></i>
      </a>
      <a href="profile.html?tab=wishlist" class="action-btn" title="Wishlist">
        <i class="fas fa-heart"></i>
      </a>
      <a href="cart.html" class="action-btn" title="Cart">
        <i class="fas fa-shopping-cart"></i>
        <span class="badge" id="cart-badge">${cartCount}</span>
      </a>
    `;

    if (loggedIn) {
      if (isAdmin) {
        html += `<a href="admin.html" class="btn btn-secondary btn-sm"><i class="fas fa-chart-line"></i> Admin</a>`;
      } else {
        html += `<a href="profile.html" class="btn btn-secondary btn-sm"><i class="fas fa-user"></i> Profile</a>`;
      }
      html += `<button onclick="Auth.logout()" class="btn btn-primary btn-sm"><i class="fas fa-sign-out-alt"></i> Logout</button>`;
    } else {
      html += `
        <a href="login.html" class="btn btn-secondary btn-sm">Login</a>
        <a href="register.html" class="btn btn-primary btn-sm">Register</a>
      `;
    }

    navActions.innerHTML = html;
    
    // Re-initialize theme toggle button event listener
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
      // Set correct icon initially
      const isDark = document.body.classList.contains('dark-mode');
      themeBtn.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
      
      themeBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const darkActive = document.body.classList.contains('dark-mode');
        localStorage.setItem('theme', darkActive ? 'dark' : 'light');
        themeBtn.innerHTML = darkActive ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
      });
    }
  }
};

// Form submission listener hooks
document.addEventListener('DOMContentLoaded', () => {
  // Login form handler
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      if (!email || !password) {
        showToast('Please enter all credentials', 'warning');
        return;
      }
      loginForm.querySelector('button[type="submit"]').disabled = true;
      loginForm.querySelector('button[type="submit"]').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
      await Auth.login(email, password);
      loginForm.querySelector('button[type="submit"]').disabled = false;
      loginForm.querySelector('button[type="submit"]').innerHTML = 'Login';
    });
  }

  // Register form handler
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirm-password').value;

      if (!name || !email || !password || !confirmPassword) {
        showToast('Please fill all details', 'warning');
        return;
      }

      if (password !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
      }

      if (password.length < 6) {
        showToast('Password must be at least 6 characters long', 'warning');
        return;
      }

      registerForm.querySelector('button[type="submit"]').disabled = true;
      registerForm.querySelector('button[type="submit"]').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registering...';
      await Auth.register(name, email, password);
      registerForm.querySelector('button[type="submit"]').disabled = false;
      registerForm.querySelector('button[type="submit"]').innerHTML = 'Create Account';
    });
  }
});
