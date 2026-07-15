const express = require('express');
const { User } = require('../models');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, async (_req, res, next) => {
  try {
    const users = await User.find().select('name email role').sort({ name: 1 });
    return res.json({ data: users });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
