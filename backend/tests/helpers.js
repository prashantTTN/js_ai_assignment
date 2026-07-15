const request = require('supertest');
const { createApp } = require('../src/app');
const { User, Ticket } = require('../src/models');

const app = createApp();

async function createUser(email, password, name, role = 'agent') {
  const passwordHash = await User.hashPassword(password);
  return User.create({ email, passwordHash, name, role });
}

async function login(agent, email, password) {
  return agent.post('/api/v1/auth/login').send({ email, password });
}

async function createTicket(agent, overrides = {}) {
  const payload = {
    title: 'Test ticket title',
    description: 'Test ticket description long enough',
    priority: 'medium',
    ...overrides,
  };
  return agent.post('/api/v1/tickets').send(payload);
}

async function setTicketStatus(ticketId, status) {
  return Ticket.findByIdAndUpdate(ticketId, { status }, { new: true });
}

module.exports = {
  app,
  request,
  createUser,
  login,
  createTicket,
  setTicketStatus,
};
