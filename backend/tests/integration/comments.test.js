const {
  app,
  request,
  createUser,
  login,
  createTicket,
} = require('../helpers');

describe('Comments integration', () => {
  let agent;

  beforeEach(async () => {
    agent = request.agent(app);
    await createUser('comments@test.com', 'password1', 'Comment User');
    await login(agent, 'comments@test.com', 'password1');
  });

  it('adds a comment to a ticket', async () => {
    const created = await createTicket(agent);
    const ticketId = created.body.data.id;

    const response = await agent
      .post(`/api/v1/tickets/${ticketId}/comments`)
      .send({ message: 'This is a test comment' });

    expect(response.status).toBe(201);
    expect(response.body.data.comments).toHaveLength(1);
    expect(response.body.data.comments[0].message).toBe('This is a test comment');
    expect(response.body.data.comments[0].ticketId).toBe(ticketId);
    expect(response.body.data.comments[0].createdBy).toBeDefined();
  });

  it('rejects empty comment message', async () => {
    const created = await createTicket(agent);
    const ticketId = created.body.data.id;

    const response = await agent
      .post(`/api/v1/tickets/${ticketId}/comments`)
      .send({ message: '' });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/message/i);
  });
});
