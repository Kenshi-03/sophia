import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database initial mock nodes...');

  // Create a default developer user
  const user = await prisma.user.upsert({
    where: { email: 'user@sophia.local' },
    update: {},
    create: {
      email: 'user@sophia.local',
      name: 'Sophia Dev',
    },
  });

  console.log(`Created default user: ${user.name} (${user.email})`);

  // Seed memories
  const memoriesData = [
    {
      content: 'Parenthesis in NextJS routes e.g. (dashboard) acts as route grouping. Omit from actual pathname.',
      category: 'Research',
      tags: ['web-dev', 'nextjs', 'routing'],
      userId: user.id,
    },
    {
      content: 'Academic lecture scheduled in Room 302 focuses on higher cognitive computing logs.',
      category: 'Academics',
      tags: ['calendar', 'schedule', 'academics'],
      userId: user.id,
    },
  ];

  for (const memory of memoriesData) {
    await prisma.memoryNode.create({
      data: memory,
    });
  }

  // Seed tasks
  const tasksData = [
    {
      title: 'Review SOPHIA System Specifications',
      content: 'Analyze the system prompt requirements and cognitive layout designs.',
      completed: true,
      userId: user.id,
    },
    {
      title: 'Deep Work: Core AI Router Module',
      content: 'Integrate the query routing logic with Google Generative AI agent endpoints.',
      completed: false,
      userId: user.id,
    },
  ];

  for (const task of tasksData) {
    await prisma.task.create({
      data: task,
    });
  }

  // Seed events
  const now = new Date();
  const eventsData = [
    {
      title: 'Morning Lecture Prep',
      description: 'Prepare materials for higher cognitive computing.',
      startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0),
      endTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 30),
      userId: user.id,
    },
    {
      title: 'SOPHIA Dev Sprint',
      description: 'Implement backend API route definitions and next-auth credentials.',
      startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0),
      endTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 16, 0),
      userId: user.id,
    },
  ];

  for (const event of eventsData) {
    await prisma.event.create({
      data: event,
    });
  }

  console.log('Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error during database seed execution:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
