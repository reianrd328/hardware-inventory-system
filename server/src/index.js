const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initSchema } = require('./db/database');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for development frontend
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Mount API routes
app.use('/api', apiRoutes);

// In production or when client/dist is built, serve frontend statically
const clientDistPath = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  console.log(`[Server] Serving static client build from ${clientDistPath}`);
  app.use(express.static(clientDistPath));

  // Catch-all fallback for SPA client-side routing
  app.use((req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Start Server after DB schema initialization
async function startServer() {
  try {
    await initSchema();
    console.log('[Server] Database initialized successfully.');

    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`Hardware Stock Monitoring System Backend running`);
      console.log(`Port: ${PORT} | Env: ${process.env.NODE_ENV || 'development'}`);
      console.log(`API URL: http://localhost:${PORT}/api`);
      console.log(`====================================================`);
    });
  } catch (err) {
    console.error('[Server] Failed to initialize database:', err);
    process.exit(1);
  }
}

startServer();

