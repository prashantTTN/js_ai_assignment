require('dotenv').config();
const { createApp } = require('./app');
const { connectDB } = require('./config/db');

const PORT = process.env.PORT || 3001;

async function start() {
  await connectDB();
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`API server running on http://localhost:${PORT}`);
  });
}

if (require.main === module) {
  start().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

module.exports = { start };
