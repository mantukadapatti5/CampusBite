const http = require('http');
const app = require('./app');
const sequelize = require('./config/db');
const { initSocket } = require('./websocket/io');
require('./models'); // registers associations
const mlService = require('./ml/mlService');

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await sequelize.authenticate();
    console.log('Database connected.');

    // sync() is fine for a college project / demo; use proper migrations
    // (sequelize-cli) if this ever goes to production.
    await sequelize.sync();
    console.log('Models synced.');

    // Socket.io needs the raw http server (not the express app) so it can
    // upgrade HTTP connections to WebSocket connections on the same port.
    const httpServer = http.createServer(app);
    initSocket(httpServer);

    httpServer.listen(PORT, () => {
      console.log(`Smart Canteen API + WebSocket running on port ${PORT}`);
      mlService.init(); // load the trained ML models (trains automatically if none exist)
    });
  } catch (err) {
    console.error('Unable to start server:', err);
    process.exit(1);
  }
}

start();
