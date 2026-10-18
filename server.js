/**
 * SWAN STUDIO — Node.js Express Backend Service
 * Brand: Swan Studio | Founder: Bhumika Nama
 * DevOps & Engineering: Mridul
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;

// Configurable CORS origins
const allowedOrigins = [
  'https://swanstudio2604-beep.github.io',
  'http://localhost:8080',
  'http://localhost:8085',
  'http://localhost:3000',
  'http://localhost:4000',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:8085'
];

if (process.env.CORS_ORIGIN) {
  process.env.CORS_ORIGIN.split(',').forEach(origin => {
    const trimmed = origin.trim();
    if (trimmed && !allowedOrigins.includes(trimmed)) {
      allowedOrigins.push(trimmed);
    }
  });
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server or curl requests with no origin
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.github.io') || origin.endsWith('.onrender.com')) {
      return callback(null, true);
    }
    return callback(null, true); // Permissive in dev/staging mode for smooth client testing
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ---------------------------------------------------------------------------
// Health Check Endpoint (Required by Render / Railway & DevOps specifications)
// ---------------------------------------------------------------------------
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'swan-studio-api',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ---------------------------------------------------------------------------
// API Status & Configuration Endpoint
// ---------------------------------------------------------------------------
app.get('/api/status', (req, res) => {
  res.status(200).json({
    success: true,
    brand: 'Swan Studio',
    founder: 'Bhumika Nama',
    tagline: 'Every Stitch Tells a Story',
    currency: 'INR (₹)',
    paymentMethod: 'Manual UPI (9509966512@fam)',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// ---------------------------------------------------------------------------
// Contact Inquiry Form Submission Endpoint
// ---------------------------------------------------------------------------
app.post('/api/contact', (req, res) => {
  const { name, email, phone, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({
      success: false,
      error: 'Name, email, and message are required fields.'
    });
  }

  console.log(`[Contact Inquiry Received] From: ${name} <${email}> (${phone || 'No phone'}): ${message.slice(0, 100)}...`);

  return res.status(200).json({
    success: true,
    message: 'Thank you for reaching out to Swan Studio! Bhumika will respond to your message shortly.'
  });
});

// ---------------------------------------------------------------------------
// Custom Order Request Endpoint
// ---------------------------------------------------------------------------
app.post('/api/custom-order', (req, res) => {
  const { name, contact, productType, description, colorPalette, deadline } = req.body;
  if (!name || !contact || !description) {
    return res.status(400).json({
      success: false,
      error: 'Name, contact, and description are required for custom orders.'
    });
  }

  console.log(`[Custom Order Received] From: ${name} (${contact}), Type: ${productType || 'Custom'}, Deadline: ${deadline || 'Flexible'}`);

  return res.status(200).json({
    success: true,
    orderReference: 'CUSTOM-' + Math.floor(100000 + Math.random() * 900000),
    message: 'Custom order request received! Bhumika will contact you via WhatsApp/Email to finalize design details.'
  });
});

// ---------------------------------------------------------------------------
// Static file serving for local unified preview
// ---------------------------------------------------------------------------
app.use(express.static(path.join(__dirname, './')));

// Catch-all 404 handler for unknown API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found.'
  });
});

// Start Server
const server = app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🌸 Swan Studio API Backend running on port ${PORT}`);
  console.log(`🩺 Health check available at: http://localhost:${PORT}/health`);
  console.log(`📁 Static files served from: ${path.join(__dirname, './')}`);
  console.log(`===============================================`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

module.exports = app;
