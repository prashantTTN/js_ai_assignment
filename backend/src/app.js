require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const { errorHandler } = require('./middleware/validate');
const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');
const ticketsRoutes = require('./routes/tickets.routes');

function createApp() {
  const app = express();

  app.use(
    cors({
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
    })
  );
  app.use(express.json());

  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'test' ? 'lax' : 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000,
      },
    })
  );

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/users', usersRoutes);
  app.use('/api/v1/tickets', ticketsRoutes);

  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
