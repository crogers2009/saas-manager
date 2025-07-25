import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeDatabase, seedDatabase } from './database.js';
import cookieParser from 'cookie-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import routes
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import departmentsRouter from './routes/departments.js';
import featureTagsRouter from './routes/featureTags.js';
import softwareRouter from './routes/software.js';
import requestsRouter from './routes/requests.js';
import auditsRouter from './routes/audits.js';
import dashboardRouter from './routes/dashboard.js';
import emailRouter from './routes/email.js';
import { authenticateUser, isAdmin } from './middleware/auth.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Set proper MIME types for JavaScript modules and other files
app.use((req, res, next) => {
  if (req.url.endsWith('.js') || req.url.endsWith('.mjs')) {
    res.setHeader('Content-Type', 'application/javascript');
  } else if (req.url.endsWith('.tsx') || req.url.endsWith('.ts')) {
    res.setHeader('Content-Type', 'application/javascript');
  } else if (req.url.endsWith('.css')) {
    res.setHeader('Content-Type', 'text/css');
  } else if (req.url.endsWith('.html')) {
    res.setHeader('Content-Type', 'text/html');
  }
  next();
});

// Middleware
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Serve static files from the dist directory with proper headers
app.use(express.static(path.join(__dirname, '../dist'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.js') || path.endsWith('.mjs')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
  }
}));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/users', authenticateUser, isAdmin, usersRouter);
app.use('/api/departments', authenticateUser, isAdmin, departmentsRouter);
app.use('/api/feature-tags', authenticateUser, featureTagsRouter);
app.use('/api/software', authenticateUser, softwareRouter);
app.use('/api/requests', authenticateUser, requestsRouter);
app.use('/api/audits', authenticateUser, auditsRouter);
app.use('/api/dashboard', authenticateUser, dashboardRouter);
app.use('/api/email', authenticateUser, isAdmin, emailRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'SaaS Manager API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Catch all handler: send back React's index.html file for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Initialize database and start server
const startServer = async () => {
  try {
    await initializeDatabase();
    console.log('Database initialized successfully');
    
    await seedDatabase();
    console.log('Database seeded successfully');
    
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
      console.log(`API endpoints available at http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();