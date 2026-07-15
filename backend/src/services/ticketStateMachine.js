const { STATUSES } = require('../models/Ticket');

const TRANSITIONS = {
  open: ['in_progress', 'cancelled'],
  in_progress: ['resolved', 'cancelled'],
  resolved: ['closed'],
  closed: [],
  cancelled: [],
};

const STATUS_LABELS = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
  cancelled: 'Cancelled',
};

function formatStatus(status) {
  return STATUS_LABELS[status] || status;
}

function getAllowedTransitions(currentStatus) {
  if (!STATUSES.includes(currentStatus)) {
    return [];
  }
  return [...(TRANSITIONS[currentStatus] || [])];
}

function isValidTransition(currentStatus, nextStatus) {
  return getAllowedTransitions(currentStatus).includes(nextStatus);
}

function buildTransitionErrorMessage(currentStatus, nextStatus) {
  const from = formatStatus(currentStatus);
  const to = formatStatus(nextStatus);
  const allowed = getAllowedTransitions(currentStatus);

  if (allowed.length === 0) {
    return `Cannot change status. This ticket is ${from}.`;
  }

  const allowedLabels = allowed.map(formatStatus).join(', ');
  return `Cannot move from ${from} to ${to}. Allowed next steps: ${allowedLabels}.`;
}

function assertValidTransition(currentStatus, nextStatus) {
  if (!STATUSES.includes(nextStatus)) {
    const error = new Error('Invalid status value');
    error.statusCode = 400;
    throw error;
  }

  if (!isValidTransition(currentStatus, nextStatus)) {
    const error = new Error(buildTransitionErrorMessage(currentStatus, nextStatus));
    error.statusCode = 409;
    error.details = {
      currentStatus,
      requestedStatus: nextStatus,
      allowedTransitions: getAllowedTransitions(currentStatus),
    };
    throw error;
  }
}

module.exports = {
  getAllowedTransitions,
  isValidTransition,
  assertValidTransition,
  formatStatus,
  TRANSITIONS,
  STATUS_LABELS,
};
