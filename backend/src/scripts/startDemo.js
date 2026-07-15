/**
 * Demo startup when local MongoDB/Docker is unavailable.
 * Uses mongodb-memory-server — data is lost when the process stops.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { MongoMemoryServer } = require('mongodb-memory-server');
const { connectDB } = require('../config/db');
const { seedData } = require('./seed');
const { createApp } = require('../app');

const PORT = process.env.PORT || 3001;

async function startDemo() {
  const mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'demo-session-secret';
  process.env.CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

  await connectDB();
  await seedData();

  const app = createApp();
  app.listen(PORT, () => {
    console.log(`Demo API running on http://localhost:${PORT}`);
    console.log(`In-memory MongoDB — data resets when this process stops`);
    console.log(`Login: ${process.env.SEED_ADMIN_EMAIL || 'admin@example.com'}`);
  });

  const shutdown = async () => {
    await mongo.stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

if (require.main === module) {
  startDemo().catch((error) => {
    console.error('Demo startup failed:', error);
    process.exit(1);
  });
}

module.exports = { startDemo };
