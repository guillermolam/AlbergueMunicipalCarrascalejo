
import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const port = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mock booking API endpoints
app.get('/api/booking/dashboard/stats', (req, res) => {
  res.json({
    totalBookings: 42,
    occupancyRate: 75,
    revenue: 3240,
    averageStay: 2.5
  });
});

app.get('/api/booking/pricing', (req, res) => {
  res.json({
    basePrice: 25,
    seasonalMultiplier: 1.2,
    discounts: {
      pilgrim: 0.15,
      longStay: 0.1
    }
  });
});

// Production static file serving
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../dist');
  app.use(express.static(distPath));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  // Development mode - Vite will handle this
  app.get('*', (req, res) => {
    res.status(404).json({ error: 'Development mode - use Vite dev server' });
  });
}

server.listen(port, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${port}`);
});

export default app;
import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);

// Serve static files from dist in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
} else {
  // Development mode - proxy to Vite dev server
  app.get('*', (req, res) => {
    res.redirect('http://localhost:5173' + req.url);
  });
}

const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
