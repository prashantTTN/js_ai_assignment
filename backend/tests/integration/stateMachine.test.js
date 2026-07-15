const {
  app,
  request,
  createUser,
  login,
  createTicket,
  setTicketStatus,
} = require('../helpers');

describe('State machine integration', () => {
  let agent;
  let user;

  beforeEach(async () => {
    agent = request.agent(app);
    user = await createUser('sm@test.com', 'password1', 'SM User');
    await login(agent, user.email, 'password1');
  });

  const allowed = [
    ['open', 'in_progress'],
    ['in_progress', 'resolved'],
    ['resolved', 'closed'],
    ['open', 'cancelled'],
    ['in_progress', 'cancelled'],
  ];

  it.each(allowed)('allows transition from %s to %s', async (from, to) => {
    const created = await createTicket(agent, {
      title: `Ticket ${from}-${to}`,
      description: `Transition test from ${from} to ${to}`,
    });
    const ticketId = created.body.data.id;
    await setTicketStatus(ticketId, from);

    const response = await agent
      .patch(`/api/v1/tickets/${ticketId}/status`)
      .send({ status: to });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe(to);
  });

  const rejected = [
    ['open', 'resolved'],
    ['open', 'closed'],
    ['in_progress', 'open'],
    ['in_progress', 'closed'],
    ['resolved', 'open'],
    ['resolved', 'in_progress'],
    ['resolved', 'cancelled'],
    ['closed', 'open'],
    ['closed', 'in_progress'],
    ['cancelled', 'open'],
    ['cancelled', 'resolved'],
  ];

  it.each(rejected)('rejects transition from %s to %s with 409', async (from, to) => {
    const created = await createTicket(agent, {
      title: `Reject ${from}-${to}`,
      description: `Invalid transition from ${from} to ${to}`,
    });
    const ticketId = created.body.data.id;
    await setTicketStatus(ticketId, from);

    const response = await agent
      .patch(`/api/v1/tickets/${ticketId}/status`)
      .send({ status: to });

    expect(response.status).toBe(409);
    expect(response.body.error).toMatch(/Cannot (move|change status)/);
    expect(response.body.details.allowedTransitions).toBeDefined();
  });

  it('returns a meaningful error for invalid transition', async () => {
    const created = await createTicket(agent);
    const ticketId = created.body.data.id;

    const response = await agent
      .patch(`/api/v1/tickets/${ticketId}/status`)
      .send({ status: 'resolved' });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe(
      'Cannot move from Open to Resolved. Allowed next steps: In Progress, Cancelled.'
    );
  });

  it('rejects status change via generic PATCH', async () => {
    const created = await createTicket(agent);
    const ticketId = created.body.data.id;

    const response = await agent
      .patch(`/api/v1/tickets/${ticketId}`)
      .send({ status: 'closed' });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/status/i);
  });
});
