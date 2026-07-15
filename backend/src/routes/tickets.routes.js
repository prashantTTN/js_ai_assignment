const express = require('express');
const mongoose = require('mongoose');
const { body, param, query } = require('express-validator');
const { User, Comment } = require('../models');
const Ticket = require('../models/Ticket');
const { PRIORITIES, STATUSES } = require('../models/Ticket');
const { requireAuth } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validate');
const {
  assertValidTransition,
  getAllowedTransitions,
} = require('../services/ticketStateMachine');

const router = express.Router();

const userSelect = 'name email role';

const populateFields = [
  { path: 'assignedTo', select: userSelect },
  { path: 'createdBy', select: userSelect },
];

async function getCommentsForTicket(ticketId) {
  return Comment.find({ ticketId })
    .populate('createdBy', userSelect)
    .sort({ createdAt: 1 });
}

async function findTicketOr404(id, res) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(404).json({ error: 'Ticket not found' });
    return null;
  }
  const ticket = await Ticket.findById(id).populate(populateFields);
  if (!ticket) {
    res.status(404).json({ error: 'Ticket not found' });
    return null;
  }
  return ticket;
}

async function ticketWithComments(ticket) {
  const comments = await getCommentsForTicket(ticket._id);
  return {
    ...ticket.toJSON(),
    comments: comments.map((c) => c.toJSON()),
  };
}

function resolveAssignedToId(assignedTo) {
  if (!assignedTo) return null;
  if (!mongoose.Types.ObjectId.isValid(assignedTo)) {
    return { error: 'Invalid assignedTo' };
  }
  return { id: assignedTo };
}

router.get(
  '/',
  requireAuth,
  [
    query('status')
      .optional()
      .isIn(STATUSES)
      .withMessage('Invalid status value'),
    query('priority')
      .optional()
      .isIn(PRIORITIES)
      .withMessage('Invalid priority value'),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const filter = {};
      const { q, status, priority } = req.query;
      const page = req.query.page || 1;
      const limit = req.query.limit || 10;
      const skip = (page - 1) * limit;

      if (status) filter.status = status;
      if (priority) filter.priority = priority;
      if (q) {
        const regex = new RegExp(q, 'i');
        filter.$or = [{ title: regex }, { description: regex }];
      }

      const [tickets, total] = await Promise.all([
        Ticket.find(filter)
          .populate(populateFields)
          .sort({ updatedAt: -1 })
          .skip(skip)
          .limit(limit),
        Ticket.countDocuments(filter),
      ]);

      return res.json({
        data: tickets.map((t) => t.toJSON()),
        meta: { total, page, limit },
      });
    } catch (error) {
      return next(error);
    }
  }
);

router.post(
  '/',
  requireAuth,
  [
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Title is required')
      .isLength({ min: 3, max: 200 })
      .withMessage('Title must be at least 3 characters'),
    body('description')
      .trim()
      .notEmpty()
      .withMessage('Description is required')
      .isLength({ min: 10, max: 5000 })
      .withMessage('Description must be at least 10 characters'),
    body('priority')
      .optional()
      .isIn(PRIORITIES)
      .withMessage('Invalid priority value'),
    body('assignedTo').optional({ nullable: true }),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const { title, description, priority, assignedTo } = req.body;

      if (assignedTo) {
        const resolved = resolveAssignedToId(assignedTo);
        if (resolved.error) {
          return res.status(400).json({ error: resolved.error });
        }
        const user = await User.findById(resolved.id);
        if (!user) {
          return res.status(400).json({ error: 'Assigned user not found' });
        }
      }

      const ticket = await Ticket.create({
        title,
        description,
        priority,
        assignedTo: assignedTo || null,
        createdBy: req.session.userId,
        status: 'open',
      });

      const populated = await Ticket.findById(ticket._id).populate(populateFields);
      return res.status(201).json({ data: populated.toJSON() });
    } catch (error) {
      if (error.name === 'ValidationError') {
        const message = Object.values(error.errors)[0]?.message || 'Validation failed';
        return res.status(400).json({ error: message });
      }
      return next(error);
    }
  }
);

router.get(
  '/:id',
  requireAuth,
  [param('id').isMongoId().withMessage('Invalid ticket id')],
  handleValidation,
  async (req, res, next) => {
    try {
      const ticket = await findTicketOr404(req.params.id, res);
      if (!ticket) return undefined;
      const data = await ticketWithComments(ticket);
      return res.json({
        data,
        meta: { allowedTransitions: getAllowedTransitions(ticket.status) },
      });
    } catch (error) {
      return next(error);
    }
  }
);

router.patch(
  '/:id',
  requireAuth,
  [
    param('id').isMongoId().withMessage('Invalid ticket id'),
    body('title')
      .optional()
      .trim()
      .isLength({ min: 3, max: 200 })
      .withMessage('Title must be at least 3 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ min: 10, max: 5000 })
      .withMessage('Description must be at least 10 characters'),
    body('priority')
      .optional()
      .isIn(PRIORITIES)
      .withMessage('Invalid priority value'),
    body('assignedTo').optional({ nullable: true }),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      if ('status' in req.body) {
        return res.status(400).json({
          error: 'Use PATCH /tickets/:id/status to change status',
        });
      }

      const { title, description, priority, assignedTo } = req.body;
      if (
        title === undefined &&
        description === undefined &&
        priority === undefined &&
        assignedTo === undefined
      ) {
        return res.status(400).json({ error: 'At least one field must be provided' });
      }

      const ticket = await findTicketOr404(req.params.id, res);
      if (!ticket) return undefined;

      if (assignedTo !== undefined && assignedTo !== null) {
        const resolved = resolveAssignedToId(assignedTo);
        if (resolved.error) {
          return res.status(400).json({ error: resolved.error });
        }
        const user = await User.findById(resolved.id);
        if (!user) {
          return res.status(400).json({ error: 'Assigned user not found' });
        }
        ticket.assignedTo = assignedTo;
      } else if (assignedTo === null) {
        ticket.assignedTo = null;
      }

      if (title !== undefined) ticket.title = title;
      if (description !== undefined) ticket.description = description;
      if (priority !== undefined) ticket.priority = priority;

      await ticket.save();
      const populated = await Ticket.findById(ticket._id).populate(populateFields);
      return res.json({ data: populated.toJSON() });
    } catch (error) {
      if (error.name === 'ValidationError') {
        const message = Object.values(error.errors)[0]?.message || 'Validation failed';
        return res.status(400).json({ error: message });
      }
      return next(error);
    }
  }
);

router.patch(
  '/:id/status',
  requireAuth,
  [
    param('id').isMongoId().withMessage('Invalid ticket id'),
    body('status').isIn(STATUSES).withMessage('Invalid status value'),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const ticket = await findTicketOr404(req.params.id, res);
      if (!ticket) return undefined;

      try {
        assertValidTransition(ticket.status, req.body.status);
      } catch (transitionError) {
        return res.status(transitionError.statusCode).json({
          error: transitionError.message,
          details: transitionError.details,
        });
      }

      ticket.status = req.body.status;
      await ticket.save();
      const populated = await Ticket.findById(ticket._id).populate(populateFields);
      const data = await ticketWithComments(populated);
      return res.json({
        data,
        meta: { allowedTransitions: getAllowedTransitions(ticket.status) },
      });
    } catch (error) {
      return next(error);
    }
  }
);

router.post(
  '/:id/comments',
  requireAuth,
  [
    param('id').isMongoId().withMessage('Invalid ticket id'),
    body('message')
      .trim()
      .isLength({ min: 1, max: 2000 })
      .withMessage('Message is required'),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const ticket = await findTicketOr404(req.params.id, res);
      if (!ticket) return undefined;

      await Comment.create({
        ticketId: ticket._id,
        message: req.body.message,
        createdBy: req.session.userId,
      });

      const data = await ticketWithComments(ticket);
      return res.status(201).json({ data });
    } catch (error) {
      if (error.name === 'ValidationError') {
        const message = Object.values(error.errors)[0]?.message || 'Validation failed';
        return res.status(400).json({ error: message });
      }
      return next(error);
    }
  }
);

module.exports = router;
