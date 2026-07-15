const mongoose = require('mongoose');

const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const STATUSES = ['open', 'in_progress', 'resolved', 'closed', 'cancelled'];

const ticketSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [200, 'Title must be at most 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters'],
      maxlength: [5000, 'Description must be at most 5000 characters'],
    },
    priority: {
      type: String,
      enum: {
        values: PRIORITIES,
        message: 'Invalid priority value',
      },
      default: 'medium',
    },
    status: {
      type: String,
      enum: {
        values: STATUSES,
        message: 'Invalid status value',
      },
      default: 'open',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by is required'],
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform(_doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

ticketSchema.index({ title: 'text', description: 'text' });

const Ticket = mongoose.model('Ticket', ticketSchema);

module.exports = Ticket;
module.exports.PRIORITIES = PRIORITIES;
module.exports.STATUSES = STATUSES;
