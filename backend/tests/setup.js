const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.SESSION_SECRET = 'test-session-secret';
  process.env.CLIENT_URL = 'http://localhost:5173';

  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  const { connectDB } = require('../src/config/db');
  await connectDB();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  const { disconnectDB } = require('../src/config/db');
  await disconnectDB();
  if (mongoServer) {
    await mongoServer.stop();
  }
});
