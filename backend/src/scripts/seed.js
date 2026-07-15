require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { connectDB, disconnectDB } = require('../config/db');
const { User, Ticket, Comment } = require('../models');

async function upsertUser(email, password, name, role) {
  const passwordHash = await User.hashPassword(password);
  return User.findOneAndUpdate(
    { email },
    { email, passwordHash, name, role },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

const ticketSamples = [
  {
    title: 'Cannot reset password',
    description: 'User reports password reset email never arrives after multiple attempts.',
    priority: 'high',
    status: 'open',
    comments: ['Checked spam folder — still no email.'],
  },
  {
    title: 'Dashboard loading slowly',
    description: 'Analytics dashboard takes over 30 seconds to load for large accounts.',
    priority: 'medium',
    status: 'in_progress',
    comments: [],
  },
  {
    title: 'API rate limit too strict',
    description: 'Integration partner hitting 429 errors during bulk sync operations.',
    priority: 'critical',
    status: 'cancelled',
    assignedTo: null,
    comments: ['Waiting on infra team to review limit policy.'],
  },
  {
    title: 'Export CSV missing columns',
    description: 'Exported report omits the created_at column for ticket history.',
    priority: 'low',
    status: 'resolved',
    comments: [],
  },
  {
    title: 'Mobile layout broken on iOS',
    description: 'Ticket list overlaps the navigation bar on iPhone 14 Safari.',
    priority: 'medium',
    status: 'closed',
    comments: [],
  },
  {
    title: 'Webhook delivery failures',
    description: 'Outbound webhooks to customer endpoints fail intermittently with timeout errors.',
    priority: 'high',
    status: 'open',
    comments: [],
  },
  {
    title: 'SSO login redirect loop',
    description: 'SAML users are stuck in a redirect loop when signing in via Okta.',
    priority: 'critical',
    status: 'in_progress',
    comments: ['Reproduced in staging with Okta test tenant.'],
  },
  {
    title: 'Notification emails delayed',
    description: 'Assignment notification emails arrive 2–3 hours after the ticket is updated.',
    priority: 'medium',
    status: 'open',
    assignedTo: null,
    comments: [],
  },
  {
    title: 'Bulk edit breaks ticket tags',
    description: 'Selecting multiple tickets and editing tags clears existing tag values.',
    priority: 'high',
    status: 'cancelled',
    comments: [],
  },
  {
    title: 'Dark mode contrast issue',
    description: 'Priority badges are hard to read in dark mode on the ticket detail page.',
    priority: 'low',
    status: 'resolved',
    comments: [],
  },
  {
    title: 'Search ignores ticket ID',
    description: 'Searching by exact ticket ID does not return the matching record.',
    priority: 'medium',
    status: 'open',
    comments: [],
  },
  {
    title: 'Attachment upload size limit',
    description: 'Users cannot upload files larger than 5MB despite plan allowing 25MB.',
    priority: 'high',
    status: 'in_progress',
    comments: [],
  },
  {
    title: 'Timezone shown incorrectly',
    description: 'Comment timestamps display in UTC instead of the user local timezone.',
    priority: 'low',
    status: 'closed',
    comments: [],
  },
  {
    title: 'Role permissions not applied',
    description: 'Read-only agents can still change ticket status after role update.',
    priority: 'critical',
    status: 'open',
    comments: ['Escalated to security team for review.'],
  },
  {
    title: 'Report scheduler duplicate runs',
    description: 'Scheduled weekly reports are generated twice every Monday morning.',
    priority: 'medium',
    status: 'resolved',
    comments: [],
  },
];

async function seedTickets(adminId, agentId) {
  const TARGET_COUNT = 15;
  const existingCount = await Ticket.countDocuments();
  if (existingCount >= TARGET_COUNT) {
    console.log(`Skipping ticket seed — ${existingCount} tickets already exist`);
    return;
  }

  const toCreate = ticketSamples.slice(existingCount, TARGET_COUNT);

  for (const sample of toCreate) {
    const assignToAgent = sample.assignedTo === undefined;
    const ticket = await Ticket.create({
      title: sample.title,
      description: sample.description,
      priority: sample.priority,
      status: sample.status,
      assignedTo: sample.assignedTo === null ? null : assignToAgent ? agentId : null,
      createdBy: adminId,
    });

    for (const [index, message] of sample.comments.entries()) {
      await Comment.create({
        ticketId: ticket._id,
        message,
        createdBy: index % 2 === 0 ? adminId : agentId,
      });
    }
  }

  console.log(`Seeded ${toCreate.length} sample tickets (${existingCount + toCreate.length} total)`);
}

async function seedData() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'changeme123';
  const agentEmail = process.env.SEED_AGENT_EMAIL || 'agent@example.com';
  const agentPassword = process.env.SEED_AGENT_PASSWORD || 'changeme123';

  const admin = await upsertUser(adminEmail, adminPassword, 'Admin User', 'admin');
  const agent = await upsertUser(agentEmail, agentPassword, 'Support Agent', 'agent');
  console.log(`Upserted users: ${admin.email} (${admin.role}), ${agent.email} (${agent.role})`);

  await seedTickets(admin._id, agent._id);
}

async function seed() {
  await connectDB();
  await seedData();
  await disconnectDB();
  console.log('Seed completed');
}

if (require.main === module) {
  seed().catch(async (error) => {
    console.error('Seed failed:', error);
    await disconnectDB().catch(() => {});
    process.exit(1);
  });
}

module.exports = { seed, seedData };
