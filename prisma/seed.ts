import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const defaultCategories = [
  {
    name: "Jadwal Kelas",
    color: "#c0c1ff",
    categoryType: "class-schedule",
    description: "Agenda perkuliahan dan kelas akademik.",
  },
  {
    name: "Deadline Tugas",
    color: "#ffb4ab",
    categoryType: "assignment-deadline",
    description: "Batas waktu pengumpulan tugas perkuliahan.",
  },
  {
    name: "Rapat Organisasi",
    color: "#adc6ff",
    categoryType: "organization-meeting",
    description: "Pertemuan rapat koordinasi organisasi mahasiswa.",
  },
  {
    name: "Acara",
    color: "#908fa0",
    categoryType: "event",
    description: "Acara umum, webinar, atau kegiatan insidental.",
  },
  {
    name: "Proker Hima",
    color: "#00a572",
    categoryType: "hima-program",
    description: "Program kerja Himpunan Mahasiswa.",
  },
  {
    name: "Ujian & Evaluasi",
    color: "#ffb4ab",
    categoryType: "exam-evaluation",
    description: "Jadwal ujian tengah/akhir semester dan evaluasi akademik.",
  },
  {
    name: "Kajian Teoritis & Deep Work",
    color: "#8083ff",
    categoryType: "deep-work",
    description: "Sesi pengerjaan mendalam, riset, atau belajar intensif.",
  },
  {
    name: "Workout & Kesehatan",
    color: "#4edea3",
    categoryType: "workout-health",
    description: "Aktivitas olahraga, kebugaran, dan kesehatan.",
  },
  {
    name: "Proyek Personal",
    color: "#adc6ff",
    categoryType: "personal-project",
    description: "Pengembangan proyek mandiri di luar akademis.",
  },
  {
    name: "Waktu Luang & Sosial",
    color: "#00a572",
    categoryType: "leisure-social",
    description: "Aktivitas bersantai, nongkrong, dan interaksi sosial.",
  },
  {
    name: "Ibadah",
    color: "#c0c1ff",
    categoryType: "worship",
    description: "Waktu ibadah dan kegiatan keagamaan.",
  },
  {
    name: "Istirahat",
    color: "#282a2d",
    categoryType: "rest",
    description: "Tidur, istirahat, recovery, untuk mencegah burnout.",
  },
];

async function main() {
  console.log("Seeding database initial mock nodes...");

  // Create a default developer user
  const user = await prisma.user.upsert({
    where: { email: "user@sophia.local" },
    update: {},
    create: {
      email: "user@sophia.local",
      name: "Sophia Dev",
    },
  });

  console.log(`Created default user: ${user.name} (${user.email})`);

  // Seed categories
  console.log("Seeding calendar categories...");
  const categoriesMap: Record<string, string> = {};

  for (const cat of defaultCategories) {
    const existing = await prisma.calendarCategory.findFirst({
      where: { userId: user.id, categoryType: cat.categoryType },
    });

    if (existing) {
      categoriesMap[cat.categoryType] = existing.id;
    } else {
      const created = await prisma.calendarCategory.create({
        data: {
          name: cat.name,
          color: cat.color,
          categoryType: cat.categoryType,
          description: cat.description,
          googleCalId: `local-${user.id}-${cat.categoryType}`,
          userId: user.id,
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
      calendarId: categoriesMap["class-schedule"],
    },
    {
      title: "SOPHIA Dev Sprint",
      description: "Implement backend API route definitions and next-auth credentials.",
      startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0),
      endTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 16, 0),
      userId: user.id,
      calendarId: categoriesMap["deep-work"],
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
