// API Manager
// Wraps fetch queries for backend REST API calls

const API_BASE = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
  ? 'http://localhost:5000/api' 
  : '/api';

const API = {
  // Get common headers with authorization if logged in
  getHeaders() {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  },

  // Helper request function
  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = this.getHeaders();
    
    const config = {
      ...options,
      headers: {
        ...headers,
        ...options.headers
      }
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
      }
      return data;
    } catch (error) {
      console.error(`API Error on ${endpoint}:`, error.message);
      throw error;
    }
  },

  // Authenticate Endpoints
  async login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },

  async register(name, email, password) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    });
  },

  async getProfile() {
    return this.request('/auth/me');
  },

  async updateProfile(name, password) {
    return this.request('/auth/me', {
      method: 'PUT',
      body: JSON.stringify({ name, password })
    });
  },

  // Product Endpoints
  async getProducts(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/products${queryString ? '?' + queryString : ''}`;
    return this.request(endpoint);
  },

  async getProduct(id) {
    return this.request(`/products/${id}`);
  },

  async addProduct(productData) {
    return this.request('/products', {
      method: 'POST',
      body: JSON.stringify(productData)
    });
  },

  async updateProduct(id, productData) {
    return this.request(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(productData)
    });
  },

  async deleteProduct(id) {
    return this.request(`/products/${id}`, {
      method: 'DELETE'
    });
  },

  // Category Endpoints
  async getCategories() {
    return this.request('/categories');
  },

  async addCategory(catData) {
    return this.request('/categories', {
      method: 'POST',
      body: JSON.stringify(catData)
    });
  },

  async deleteCategory(id) {
    return this.request(`/categories/${id}`, {
      method: 'DELETE'
    });
  },

  // Order Endpoints
  async placeOrder(orderData) {
    return this.request('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData)
    });
  },

  async getOrders() {
    return this.request('/orders');
  },

  // Admin Dashboard stats
  async getAdminStats() {
    return this.request('/admin/stats');
  },

  async getAdminOrders() {
    return this.request('/admin/orders');
  },

  async updateOrderStatus(orderId, status) {
    return this.request(`/admin/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  }
};
