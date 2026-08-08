const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;

/**
 * Rooms used:
 *  - `user:<id>`   — a single student's own order updates
 *  - `kitchen`     — canteen_staff/admin live order queue
 *  - `queue-board` — public pickup-slot board (no auth needed to view)
 *
 * Connection carries a JWT (same token used for the REST API) in the
 * socket handshake auth payload, so a socket is tied to the same identity
 * as the user's normal session — no separate real-time login step.
 */
function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: '*' },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      // allow anonymous connections — they only get the public queue board
      socket.user = null;
      return next();
    }
    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch (err) {
      next(); // treat as anonymous rather than rejecting the connection
    }
  });

  io.on('connection', (socket) => {
    socket.join('queue-board');

    if (socket.user) {
      socket.join(`user:${socket.user.id}`);
      if (['admin', 'canteen_staff'].includes(socket.user.role)) {
        socket.join('kitchen');
      }
    }
  });

  return io;
}

function getIO() {
  return io; // may be null if called before initSocket() — callers below guard for this
}

function emitNewOrder(order) {
  if (!io) return;
  io.to('kitchen').emit('order:new', { id: order.id, token_number: order.token_number });
}

function emitOrderStatusChanged(order) {
  if (!io) return;
  io.to(`user:${order.user_id}`).emit('order:status', {
    id: order.id, status: order.status, counter_number: order.counter_number,
  });
  io.to('kitchen').emit('order:updated', { id: order.id, status: order.status });
}

function emitQueueChanged() {
  if (!io) return;
  io.to('queue-board').emit('queue:changed');
}

module.exports = { initSocket, getIO, emitNewOrder, emitOrderStatusChanged, emitQueueChanged };
