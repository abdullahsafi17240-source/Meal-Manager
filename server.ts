import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'mess-meal-super-secret';
const DB_PATH = path.join(__dirname, 'db.json');

// Initialize DB if it doesn't exist
if (!fs.existsSync(DB_PATH)) {
  fs.writeFileSync(DB_PATH, JSON.stringify({
    users: [],
    meals: [],
    settings: { lunchPrice: 50, dinnerPrice: 60 }
  }, null, 2));
}

function getDB() {
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

function saveDB(data: any) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors({
    origin: true, // Reflect request origin
    credentials: true
  }));
  app.use(express.json());
  app.use(cookieParser());

  // --- API Routes ---

  // Auth Middleware
  const authenticate = (req: any, res: any, next: any) => {
    let token = req.cookies.token;

    // Fallback to Authorization Header
    if (!token && req.headers.authorization) {
      if (req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
      }
    }

    if (!token) {
      console.log("Auth failed: No token found in cookies or Authorization header");
      return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      console.log("Auth failed: Token verification error", err);
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  const isAdmin = (req: any, res: any, next: any) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    next();
  };

  // Auth Endpoints
  app.post('/api/auth/register', async (req, res) => {
    const { email, password, name } = req.body;
    console.log(`Register attempt for: ${email}`);
    const db = getDB();
    if (db.users.find((u: any) => u.email === email)) {
      console.log(`Registration failed: User ${email} already exists`);
      return res.status(400).json({ error: 'User already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: Date.now().toString(),
      email,
      password: hashedPassword,
      name,
      role: db.users.length === 0 ? 'admin' : 'user' // First user is admin
    };
    db.users.push(newUser);
    saveDB(db);
    console.log(`User registered successfully: ${email} (${newUser.role})`);
    res.status(201).json({ message: 'User registered' });
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    console.log(`Login attempt for: ${email}`);
    const db = getDB();
    const user = db.users.find((u: any) => u.email === email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      console.log(`Login failed for: ${email}`);
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { 
      httpOnly: true, 
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'none',
      secure: true,
      path: '/'
    });
    console.log(`Login successful for: ${email}`);
    res.json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
  });

  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token', { sameSite: 'none', secure: true, path: '/' });
    res.json({ message: 'Logged out' });
  });

  app.get('/api/auth/me', authenticate, (req: any, res) => {
    res.json({ user: req.user });
  });

  // Meal Endpoints
  app.get('/api/meals', authenticate, (req: any, res) => {
    const db = getDB();
    const userMeals = db.meals.filter((m: any) => m.userId === req.user.id);
    res.json(userMeals);
  });

  app.post('/api/meals/mark', authenticate, (req: any, res) => {
    const { mealType, date } = req.body; // date format: YYYY-MM-DD
    console.log(`Marking ${mealType} for user ${req.user.email} on ${date}`);
    const db = getDB();
    
    // Check if duplicate
    const existing = db.meals.find((m: any) => m.userId === req.user.id && m.date === date && m.mealType === mealType);
    if (existing) {
      return res.status(400).json({ error: `Already marked ${mealType} for today.` });
    }

    const newMeal = {
      id: Date.now().toString(),
      userId: req.user.id,
      date,
      mealType,
      timestamp: new Date().toISOString()
    };
    db.meals.push(newMeal);
    saveDB(db);
    res.json(newMeal);
  });

  // Admin Endpoints
  app.get('/api/admin/summary', authenticate, isAdmin, (req, res) => {
    const db = getDB();
    const users = db.users.map((u: any) => ({ id: u.id, name: u.name, email: u.email, role: u.role }));
    const summary = users.map((u: any) => {
      const userMeals = db.meals.filter((m: any) => m.userId === u.id);
      const lunchCount = userMeals.filter((m: any) => m.mealType === 'Lunch').length;
      const dinnerCount = userMeals.filter((m: any) => m.mealType === 'Dinner').length;
      return {
        ...u,
        lunchCount,
        dinnerCount,
        totalMeals: lunchCount + dinnerCount,
        totalCost: (lunchCount * db.settings.lunchPrice) + (dinnerCount * db.settings.dinnerPrice)
      };
    });
    res.json({
      summary,
      settings: db.settings,
      totalStats: {
        totalLunch: db.meals.filter((m: any) => m.mealType === 'Lunch').length,
        totalDinner: db.meals.filter((m: any) => m.mealType === 'Dinner').length
      }
    });
  });

  app.post('/api/admin/settings', authenticate, isAdmin, (req, res) => {
    const { lunchPrice, dinnerPrice } = req.body;
    const db = getDB();
    db.settings = { lunchPrice: Number(lunchPrice), dinnerPrice: Number(dinnerPrice) };
    saveDB(db);
    res.json(db.settings);
  });

  app.get('/api/admin/users', authenticate, isAdmin, (req, res) => {
    const db = getDB();
    res.json(db.users.map((u: any) => ({ id: u.id, name: u.name, email: u.email, role: u.role })));
  });

  // --- End API Routes ---

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
