import { PrismaClient, CognitiveCategoryType } from "@prisma/client";

const prisma = new PrismaClient();

const defaultCategories = [
  {
    cognitiveCategory: "Jadwal Kelas",
    color: "#3B82F6",
    categoryType: CognitiveCategoryType.ACADEMIC,
    googleCalendarId: "5c071371fe59dedb3c8a79c67537d0ce4dcd6c48150892a26c88b518c4070ef5@group.calendar.google.com",
    description: "Agenda perkuliahan dan kelas akademik.",
    isDefault: false,
  },
  {
    cognitiveCategory: "Kajian Teoritis & Deep Work",
    color: "#2563EB",
    categoryType: CognitiveCategoryType.DEEP_WORK,
    googleCalendarId: "cb5b774f7306744006a65f893d0c98465ba50c79c62699ea54b8bf83b3ad40bb@group.calendar.google.com",
    description: "Sesi pengerjaan mendalam, riset, atau belajar intensif.",
    isDefault: true,
  },
  {
    cognitiveCategory: "Workout & Kesehatan",
    color: "#10B981",
    categoryType: CognitiveCategoryType.HEALTH,
    googleCalendarId: "9850ac55121fff1b88f4ec04a37cfdf7d79eaf8786646a7311a1642725f5a56c@group.calendar.google.com",
    description: "Aktivitas olahraga, kebugaran, dan kesehatan.",
    isDefault: false,
  },
  {
    cognitiveCategory: "Istirahat",
    color: "#64748B",
    categoryType: CognitiveCategoryType.RECOVERY,
    googleCalendarId: "3a9a77555658ec00b39ef7e12ccfbb4f4fa7c7fcc31218287e956af01b1d7bb0@group.calendar.google.com",
    description: "Tidur, istirahat, recovery, untuk mencegah burnout.",
    isDefault: false,
  },
];

async function main() {
  console.log("Seeding database initial mock nodes...");

  // Create a default developer user
  const user = await prisma.user.upsert({
    where: { email: "bahrulgaming1@gmail.com" },
    update: {},
    create: {
      email: "bahrulgaming1@gmail.com",
      name: "Bahrul Taufiq",
    },
  });

  console.log(`Created default user: ${user.name} (${user.email})`);

  // Seed calendar configurations
  console.log("Seeding calendar configurations...");
  const categoriesMap: Record<string, string> = {};

  for (const cat of defaultCategories) {
    const existing = await prisma.calendarConfig.findFirst({
      where: { userId: user.id, categoryType: cat.categoryType, deletedAt: null },
    });

    if (existing) {
      categoriesMap[cat.categoryType] = existing.id;
    } else {
      const created = await prisma.calendarConfig.create({
        data: {
          userId: user.id,
          cognitiveCategory: cat.cognitiveCategory,
          categoryType: cat.categoryType,
          googleCalendarId: cat.googleCalendarId,
          description: cat.description,
          color: cat.color,
          isDefault: cat.isDefault,
          isActive: true,
          isSeededDefault: true,
        },
      });
      categoriesMap[cat.categoryType] = created.id;
    }
  }

  // Seed memories
  const memoriesData = [
    {
      content: "Parenthesis in NextJS routes e.g. (dashboard) acts as route grouping. Omit from actual pathname.",
      category: "Research",
      tags: ["web-dev", "nextjs", "routing"],
      userId: user.id,
    },
    {
      content: "Academic lecture scheduled in Room 302 focuses on higher cognitive computing logs.",
      category: "Academics",
      tags: ["calendar", "schedule", "academics"],
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
      title: "Review SOPHIA System Specifications",
      content: "Analyze the system prompt requirements and cognitive layout designs.",
      completed: true,
      userId: user.id,
    },
    {
      title: "Deep Work: Core AI Router Module",
      content: "Integrate the query routing logic with Google Generative AI agent endpoints.",
      completed: false,
      userId: user.id,
    },
  ];

  for (const task of tasksData) {
    await prisma.task.create({
      data: task,
    });
  }

  // Seed events mapped to categories
  const now = new Date();
  const eventsData = [
    {
      title: "Morning Lecture Prep",
      description: "Prepare materials for higher cognitive computing.",
      startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0),
      endTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 30),
      userId: user.id,
      calendarId: categoriesMap[CognitiveCategoryType.ACADEMIC],
    },
    {
      title: "SOPHIA Dev User Sprint",
      description: "Implement backend API route definitions and next-auth credentials.",
      startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0),
      endTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 16, 0),
      userId: user.id,
      calendarId: categoriesMap[CognitiveCategoryType.DEEP_WORK],
    },
  ];

  for (const event of eventsData) {
    await prisma.event.create({
      data: event,
    });
  }

  console.log("Database seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error("Error during database seed execution:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
