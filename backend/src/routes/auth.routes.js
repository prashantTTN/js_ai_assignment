const express = require('express');
const { body } = require('express-validator');
const { User } = require('../models');
const { handleValidation } = require('../middleware/validate');

const router = express.Router();

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email }).select('+passwordHash');
      if (!user || !(await user.verifyPassword(password))) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      req.session.userId = user._id.toString();
      const safeUser = await User.findById(user._id);
      return res.json({ data: safeUser });
    } catch (error) {
      return next(error);
    }
  }
);

router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.clearCookie('connect.sid');
    return res.json({ data: { message: 'Logged out' } });
  });
});

router.get('/me', async (req, res, next) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    return res.json({ data: user });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
