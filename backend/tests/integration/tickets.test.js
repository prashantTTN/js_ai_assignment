const {
  app,
  request,
  createUser,
  login,
  createTicket,
} = require('../helpers');

describe('Auth integration', () => {
  it('returns 401 for protected route without session', async () => {
    const response = await request(app).get('/api/v1/tickets');
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Authentication required');
  });

  it('logs in with valid credentials', async () => {
    const user = await createUser('auth@test.com', 'password1', 'Auth User');
    const agent = request.agent(app);
    const response = await login(agent, user.email, 'password1');

    expect(response.status).toBe(200);
    expect(response.body.data.email).toBe(user.email);
    expect(response.body.data.passwordHash).toBeUndefined();
  });

  it('returns 401 for invalid credentials', async () => {
    await createUser('bad@test.com', 'password1', 'Bad User');
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'bad@test.com', password: 'wrongpass' });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid email or password');
  });
});

describe('Tickets integration', () => {
  let agent;

  beforeEach(async () => {
    agent = request.agent(app);
    await createUser('tickets@test.com', 'password1', 'Ticket User');
    await login(agent, 'tickets@test.com', 'password1');
  });

  it('creates a ticket', async () => {
    const response = await createTicket(agent);
    expect(response.status).toBe(201);
    expect(response.body.data.status).toBe('open');
    expect(response.body.data.title).toBe('Test ticket title');
  });

  it('lists tickets', async () => {
    await createTicket(agent);
    const response = await agent.get('/api/v1/tickets');
    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('rejects create without title', async () => {
    const response = await agent.post('/api/v1/tickets').send({
      description: 'Valid description here',
    });
    expect(response.status).toBe(400);
  });

  it('rejects invalid priority', async () => {
    const response = await createTicket(agent, { priority: 'urgent' });
    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/priority/i);
  });

  it('updates ticket fields', async () => {
    const created = await createTicket(agent);
    const ticketId = created.body.data.id;

    const response = await agent.patch(`/api/v1/tickets/${ticketId}`).send({
      title: 'Updated ticket title',
    });

    expect(response.status).toBe(200);
    expect(response.body.data.title).toBe('Updated ticket title');
  });

  it('filters tickets by priority', async () => {
    await createTicket(agent, { title: 'High priority issue', priority: 'high' });
    await createTicket(agent, { title: 'Low priority issue', priority: 'low' });

    const response = await agent.get('/api/v1/tickets?priority=high');

    expect(response.status).toBe(200);
    expect(response.body.data.every((t) => t.priority === 'high')).toBe(true);
  });

  it('rejects invalid priority filter', async () => {
    const response = await agent.get('/api/v1/tickets?priority=urgent');
    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/priority/i);
  });

  it('returns user entity with name and role on login', async () => {
    const user = await createUser('entity@test.com', 'password1', 'Entity User', 'admin');
    const agent = request.agent(app);
    const response = await login(agent, user.email, 'password1');

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      name: 'Entity User',
      email: 'entity@test.com',
      role: 'admin',
    });
    expect(response.body.data.id).toBeDefined();
    expect(response.body.data.passwordHash).toBeUndefined();
  });

  it('returns ticket entity with assignedTo and timestamps', async () => {
    const user = await createUser('ticket-entity@test.com', 'password1', 'Ticket User', 'agent');
    const localAgent = request.agent(app);
    await login(localAgent, user.email, 'password1');

    const created = await createTicket(localAgent, { title: 'Entity shape ticket' });
    expect(created.body.data).toMatchObject({
      title: 'Entity shape ticket',
      status: 'open',
      priority: 'medium',
    });
    expect(created.body.data.id).toBeDefined();
    expect(created.body.data.createdAt).toBeDefined();
    expect(created.body.data.updatedAt).toBeDefined();
    expect(created.body.data.createdBy).toBeDefined();
  });

  it('paginates tickets with limit 10', async () => {
    for (let i = 0; i < 12; i += 1) {
      await createTicket(agent, {
        title: `Paginated ticket ${i}`,
        description: `Pagination test ticket number ${i}`,
      });
    }

    const page1 = await agent.get('/api/v1/tickets?limit=10&page=1');
    const page2 = await agent.get('/api/v1/tickets?limit=10&page=2');

    expect(page1.status).toBe(200);
    expect(page1.body.data).toHaveLength(10);
    expect(page1.body.meta.total).toBeGreaterThanOrEqual(12);
    expect(page2.status).toBe(200);
    expect(page2.body.data.length).toBeGreaterThanOrEqual(2);
  });
});
