const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_123';

app.use(cors());
app.use(express.json());

// Expose static frontend files if served from server
app.use(express.static(path.join(__dirname)));

// ----------------------------------------------------
// DATABASE CONFIGURATION (PostgreSQL / SQLite Fallback)
// ----------------------------------------------------
let pgPool = null;
let sqliteDb = null;
const isPostgres = !!process.env.DATABASE_URL;

if (isPostgres) {
  console.log('Connecting to Aiven Cloud PostgreSQL...');
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
} else {
  console.log('No DATABASE_URL found. Initializing local SQLite database (ecommerce.db)...');
  sqliteDb = new sqlite3.Database(path.join(__dirname, 'ecommerce.db'));
}

// Adapts PostgreSQL positional parameter queries ($1, $2) for SQLite (?)
function queryAdapt(sql) {
  if (isPostgres) return sql;
  return sql.replace(/\$\d+/g, '?');
}

// Database Helpers Wrapper
function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    if (isPostgres) {
      pgPool.query(sql, params, (err, res) => {
        if (err) reject(err);
        else resolve(res.rows);
      });
    } else {
      sqliteDb.all(queryAdapt(sql), params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    }
  });
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    if (isPostgres) {
      pgPool.query(sql, params, (err, res) => {
        if (err) reject(err);
        else resolve(res.rows[0] || null);
      });
    } else {
      sqliteDb.get(queryAdapt(sql), params, (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      });
    }
  });
}

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    if (isPostgres) {
      pgPool.query(sql, params, (err, res) => {
        if (err) reject(err);
        else resolve({ lastID: res.insertId || null, changes: res.rowCount });
      });
    } else {
      sqliteDb.run(queryAdapt(sql), params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    }
  });
}

// ----------------------------------------------------
// DATABASE INITIALIZATION & SEEDING
// ----------------------------------------------------
async function initDb() {
  try {
    if (isPostgres) {
      // Execute the schema SQL
      const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
      await pgPool.query(schemaSql);
      console.log('PostgreSQL schema initialized successfully.');
    } else {
      // Create tables for SQLite
      await dbRun(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          name TEXT NOT NULL,
          role TEXT DEFAULT 'user',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await dbRun(`
        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          slug TEXT UNIQUE NOT NULL,
          description TEXT
        )
      `);
      await dbRun(`
        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          price REAL NOT NULL,
          discount REAL DEFAULT 0,
          rating REAL DEFAULT 4.0,
          image_url TEXT,
          category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
          stock INTEGER DEFAULT 10,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await dbRun(`
        CREATE TABLE IF NOT EXISTS orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          total REAL NOT NULL,
          status TEXT DEFAULT 'Pending',
          coupon TEXT,
          shipping_address TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await dbRun(`
        CREATE TABLE IF NOT EXISTS order_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
          product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
          quantity INTEGER NOT NULL,
          price REAL NOT NULL
        )
      `);
      await dbRun(`
        CREATE TABLE IF NOT EXISTS cart (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
          quantity INTEGER NOT NULL DEFAULT 1,
          UNIQUE(user_id, product_id)
        )
      `);
      await dbRun(`
        CREATE TABLE IF NOT EXISTS wishlist (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
          UNIQUE(user_id, product_id)
        )
      `);
      console.log('SQLite tables verified/created.');
    }

    // Seed Categories if empty
    const catCheck = await dbGet('SELECT COUNT(*) as count FROM categories');
    if (parseInt(catCheck.count) === 0) {
      console.log('Seeding initial categories...');
      const cats = [
        ['Electronics', 'electronics', 'Latest gadgets and tech'],
        ['Fashion', 'fashion', 'Trendy clothes and accessories'],
        ['Home & Living', 'home-living', 'Decorations, furniture, and kitchen items'],
        ['Sports & Outdoors', 'sports-outdoors', 'Fitness equipment and outdoor gear'],
        ['Books', 'books', 'Novels, text books, and audio guides']
      ];
      for (const cat of cats) {
        await dbRun('INSERT INTO categories (name, slug, description) VALUES ($1, $2, $3)', cat);
      }
    }

    // Seed Products if empty
    const prodCheck = await dbGet('SELECT COUNT(*) as count FROM products');
    if (parseInt(prodCheck.count) === 0) {
      console.log('Seeding initial products...');
      // Get category IDs
      const categoryRows = await dbAll('SELECT id, slug FROM categories');
      const catMap = {};
      categoryRows.forEach(c => { catMap[c.slug] = c.id; });

      const products = [
        ['Wireless Headphones', 'Premium noise-canceling over-ear wireless headphones.', 99.99, 10, 4.5, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500', catMap['electronics'], 15],
        ['Smart Sports Watch', 'Waterproof fitness tracker with heart rate and GPS tracking.', 199.99, 15, 4.7, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500', catMap['electronics'], 10],
        ['Classic Running Shoes', 'Ergonomic light-weight training sneakers.', 79.99, 20, 4.3, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500', catMap['fashion'], 25],
        ['Minimalist Leather Jacket', '100% genuine dark brown retro leather jacket.', 149.99, 0, 4.6, 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500', catMap['fashion'], 8],
        ['Drip Coffee Maker', 'Programmable 12-cup glass carafe coffee brewer.', 49.99, 5, 4.2, 'https://images.unsplash.com/photo-1517256064527-09c53b2d0bc6?w=500', catMap['home-living'], 12],
        ['Ergonomic Office Chair', 'Breathable mesh chair with lumber support and adjustable armrests.', 249.99, 25, 4.8, 'https://images.unsplash.com/photo-1505797149-43b0069ec26b?w=500', catMap['home-living'], 5],
        ['Eco-Friendly Yoga Mat', 'Non-slip natural rubber alignment guide training mat.', 29.99, 0, 4.4, 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=500', catMap['sports-outdoors'], 30],
        ['Hardtail Mountain Bike', '21-speed adult trail bike with dual-disc brakes.', 499.99, 12, 4.7, 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=500', catMap['sports-outdoors'], 6]
      ];
      for (const prod of products) {
        await dbRun('INSERT INTO products (name, description, price, discount, rating, image_url, category_id, stock) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)', prod);
      }
    }

    // Seed default administrator if empty
    const adminCheck = await dbGet('SELECT COUNT(*) as count FROM users WHERE role = $1', ['admin']);
    if (parseInt(adminCheck.count) === 0) {
      console.log('Seeding default administrator (admin@store.com / admin123)...');
      const hash = await bcrypt.hash('admin123', 10);
      await dbRun('INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4)', [
        'admin@store.com',
        hash,
        'System Admin',
        'admin'
      ]);
    }
  } catch (error) {
    console.error('Database migration/seed error:', error);
  }
}

initDb();

// ----------------------------------------------------
// AUTHENTICATION MIDDLEWARE
// ----------------------------------------------------
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access token missing' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

function requireAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Admin permissions required' });
  }
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// 1. Auth: Register
app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ message: 'Please enter all details' });
  }
  try {
    const existing = await dbGet('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' });
    }
    const hash = await bcrypt.hash(password, 10);
    const result = await dbRun('INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4)', [
      email.toLowerCase(),
      hash,
      name,
      'user'
    ]);
    res.status(201).json({ message: 'Registration successful! You can now log in.' });
  } catch (error) {
    res.status(500).json({ message: 'Server registration error' });
  }
});

// 2. Auth: Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Please enter email and password' });
  }
  try {
    const user = await dbGet('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (!user) {
      return res.status(400).json({ message: 'Incorrect email or password' });
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ message: 'Incorrect email or password' });
    }
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: { id: user.id, email: user.email, role: user.role, name: user.name }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server login error' });
  }
});

// 3. User: Get Current Profile
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await dbGet('SELECT id, email, name, role, created_at FROM users WHERE id = $1', [req.user.id]);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server profile load error' });
  }
});

// 4. User: Update Profile Details
app.put('/api/auth/me', authenticateToken, async (req, res) => {
  const { name, password } = req.body;
  try {
    if (password && password.trim() !== '') {
      const hash = await bcrypt.hash(password, 10);
      await dbRun('UPDATE users SET name = $1, password = $2 WHERE id = $3', [name, hash, req.user.id]);
    } else {
      await dbRun('UPDATE users SET name = $1 WHERE id = $2', [name, req.user.id]);
    }
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server profile update error' });
  }
});

// 5. Products: List & Filter
app.get('/api/products', async (req, res) => {
  const { category, search, minPrice, maxPrice, sort } = req.query;
  let query = 'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE 1=1';
  const params = [];
  let paramIdx = 1;

  if (category) {
    query += ` AND c.slug = $${paramIdx++}`;
    params.push(category);
  }
  if (search) {
    query += ` AND (p.name LIKE $${paramIdx} OR p.description LIKE $${paramIdx})`;
    params.push(`%${search}%`);
    paramIdx++;
  }
  if (minPrice) {
    query += ` AND (p.price * (1 - p.discount / 100.0)) >= $${paramIdx++}`;
    params.push(parseFloat(minPrice));
  }
  if (maxPrice) {
    query += ` AND (p.price * (1 - p.discount / 100.0)) <= $${paramIdx++}`;
    params.push(parseFloat(maxPrice));
  }

  // Sorting logic
  if (sort === 'price-asc') {
    query += ' ORDER BY (p.price * (1 - p.discount / 100.0)) ASC';
  } else if (sort === 'price-desc') {
    query += ' ORDER BY (p.price * (1 - p.discount / 100.0)) DESC';
  } else if (sort === 'rating') {
    query += ' ORDER BY p.rating DESC';
  } else {
    query += ' ORDER BY p.id DESC'; // Newest
  }

  try {
    const products = await dbAll(query, params);
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server products loading error' });
  }
});

// 6. Products: Get Individual
app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await dbGet('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = $1', [req.params.id]);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server product loading error' });
  }
});

// 7. Categories: List All
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await dbAll('SELECT * FROM categories ORDER BY name ASC');
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Server categories loading error' });
  }
});

// 8. Orders: Create / Checkout Order
app.post('/api/orders', authenticateToken, async (req, res) => {
  const { cartItems, total, coupon, shippingAddress } = req.body;
  if (!cartItems || cartItems.length === 0 || !shippingAddress) {
    return res.status(400).json({ message: 'Cart items and shipping address are required' });
  }

  try {
    // 1. Validate stocks and calculate total
    let computedTotal = 0;
    const itemsToInsert = [];

    for (const item of cartItems) {
      const prod = await dbGet('SELECT * FROM products WHERE id = $1', [item.id]);
      if (!prod) return res.status(404).json({ message: `Product ${item.name} not found` });
      if (prod.stock < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for product: ${prod.name}. Only ${prod.stock} left.` });
      }
      const itemFinalPrice = parseFloat((prod.price * (1 - prod.discount / 100)).toFixed(2));
      computedTotal += itemFinalPrice * item.quantity;
      itemsToInsert.push({
        id: prod.id,
        quantity: item.quantity,
        price: itemFinalPrice,
        newStock: prod.stock - item.quantity
      });
    }

    // Apply Coupon calculation validation
    if (coupon && coupon.trim().toUpperCase() === 'SAVE10') {
      computedTotal = parseFloat((computedTotal * 0.9).toFixed(2));
    }

    // 2. Insert Order
    const status = 'Pending';
    let orderResult;
    if (isPostgres) {
      const insertOrder = await dbGet(
        'INSERT INTO orders (user_id, total, status, coupon, shipping_address) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [req.user.id, computedTotal, status, coupon || null, shippingAddress]
      );
      orderResult = { lastID: insertOrder.id };
    } else {
      orderResult = await dbRun(
        'INSERT INTO orders (user_id, total, status, coupon, shipping_address) VALUES ($1, $2, $3, $4, $5)',
        [req.user.id, computedTotal, status, coupon || null, shippingAddress]
      );
    }

    const orderId = isPostgres ? orderResult.lastID : orderResult.lastID;

    // 3. Insert Order Items & Deduct Stock
    for (const item of itemsToInsert) {
      await dbRun('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)', [
        orderId,
        item.id,
        item.quantity,
        item.price
      ]);
      await dbRun('UPDATE products SET stock = $1 WHERE id = $2', [item.newStock, item.id]);
    }

    res.status(201).json({ message: 'Order placed successfully!', orderId });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ message: 'Server checkout processing error' });
  }
});

// 9. Orders: List User Orders
app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    const orders = await dbAll('SELECT * FROM orders WHERE user_id = $1 ORDER BY id DESC', [req.user.id]);
    // Enrich with items details
    for (const order of orders) {
      order.items = await dbAll(
        'SELECT oi.*, p.name, p.image_url FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = $1',
        [order.id]
      );
    }
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server order logs loading error' });
  }
});

// ----------------------------------------------------
// ADMIN DASHBOARD & CRUD ROUTES
// ----------------------------------------------------

// Admin Dashboard stats
app.get('/api/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const usersCount = await dbGet('SELECT COUNT(*) as count FROM users WHERE role = $1', ['user']);
    const productsCount = await dbGet('SELECT COUNT(*) as count FROM products');
    const ordersCount = await dbGet('SELECT COUNT(*) as count FROM orders');
    const totalSales = await dbGet('SELECT SUM(total) as sum FROM orders WHERE status != $1', ['Cancelled']);
    const recentOrders = await dbAll(
      'SELECT o.*, u.name as user_name FROM orders o JOIN users u ON o.user_id = u.id ORDER BY o.id DESC LIMIT 5'
    );

    res.json({
      users: usersCount ? parseInt(usersCount.count) : 0,
      products: productsCount ? parseInt(productsCount.count) : 0,
      orders: ordersCount ? parseInt(ordersCount.count) : 0,
      sales: totalSales && totalSales.sum ? parseFloat(totalSales.sum).toFixed(2) : '0.00',
      recentOrders
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server metrics calculation error' });
  }
});

// Admin: Manage All Orders
app.get('/api/admin/orders', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const orders = await dbAll(
      'SELECT o.*, u.name as user_name, u.email as user_email FROM orders o JOIN users u ON o.user_id = u.id ORDER BY o.id DESC'
    );
    for (const order of orders) {
      order.items = await dbAll(
        'SELECT oi.*, p.name FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = $1',
        [order.id]
      );
    }
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server admin order loading error' });
  }
});

// Admin: Update Order Status
app.put('/api/admin/orders/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ message: 'Status is required' });
  try {
    await dbRun('UPDATE orders SET status = $1 WHERE id = $2', [status, req.params.id]);
    res.json({ message: 'Order status updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server order status updating error' });
  }
});

// Admin: Add Product
app.post('/api/products', authenticateToken, requireAdmin, async (req, res) => {
  const { name, description, price, discount, rating, image_url, category_id, stock } = req.body;
  if (!name || !price || !category_id) {
    return res.status(400).json({ message: 'Product name, price, and category are required' });
  }
  try {
    await dbRun(
      'INSERT INTO products (name, description, price, discount, rating, image_url, category_id, stock) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [
        name,
        description || '',
        parseFloat(price),
        parseFloat(discount || 0),
        parseFloat(rating || 4.0),
        image_url || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=500',
        parseInt(category_id),
        parseInt(stock || 10)
      ]
    );
    res.status(201).json({ message: 'Product added successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server adding product error' });
  }
});

// Admin: Update Product
app.put('/api/products/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { name, description, price, discount, rating, image_url, category_id, stock } = req.body;
  try {
    const existing = await dbGet('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (!existing) return res.status(404).json({ message: 'Product not found' });

    await dbRun(
      'UPDATE products SET name = $1, description = $2, price = $3, discount = $4, rating = $5, image_url = $6, category_id = $7, stock = $8 WHERE id = $9',
      [
        name || existing.name,
        description !== undefined ? description : existing.description,
        price !== undefined ? parseFloat(price) : existing.price,
        discount !== undefined ? parseFloat(discount) : existing.discount,
        rating !== undefined ? parseFloat(rating) : existing.rating,
        image_url !== undefined ? image_url : existing.image_url,
        category_id !== undefined ? parseInt(category_id) : existing.category_id,
        stock !== undefined ? parseInt(stock) : existing.stock,
        req.params.id
      ]
    );
    res.json({ message: 'Product updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server updating product error' });
  }
});

// Admin: Delete Product
app.delete('/api/products/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await dbRun('DELETE FROM products WHERE id = $1', [req.params.id]);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server deleting product error' });
  }
});

// Admin: Add Category
app.post('/api/categories', authenticateToken, requireAdmin, async (req, res) => {
  const { name, slug, description } = req.body;
  if (!name || !slug) return res.status(400).json({ message: 'Name and Slug are required' });
  try {
    await dbRun('INSERT INTO categories (name, slug, description) VALUES ($1, $2, $3)', [
      name,
      slug.toLowerCase().replace(/\s+/g, '-'),
      description || ''
    ]);
    res.status(201).json({ message: 'Category added successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server adding category error' });
  }
});

// Admin: Delete Category
app.delete('/api/categories/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await dbRun('DELETE FROM categories WHERE id = $1', [req.params.id]);
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server deleting category error' });
  }
});

// ----------------------------------------------------
// DEFAULT ROUTE & SERVER RUN
// ----------------------------------------------------
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`E-Commerce application running on http://localhost:${PORT}`);
  });
}

module.exports = app;

