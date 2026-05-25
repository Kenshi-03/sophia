import { prisma } from "@/lib/db/prisma";

export interface SeededCategory {
  name: string;
  color: string;
  categoryType: string;
  description: string;
}

export const COGNITIVE_CATEGORIES: SeededCategory[] = [
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

/**
 * Seeds default cognitive categories for a user if they do not exist.
 * Uses a unique local identifier format for `googleCalId` to satisfy database constraints.
 */
export async function seedDefaultCategoriesForUser(userId: string) {
  try {
    const existingCount = await prisma.calendarCategory.count({
      where: { userId },
    });

    if (existingCount > 0) {
      return { success: true, seeded: false, count: existingCount };
    }

    const seedPromises = COGNITIVE_CATEGORIES.map((cat) => {
      // Create a unique local googleCalId using userId and categoryType
      const localCalId = `local-${userId}-${cat.categoryType}`;
      
      return prisma.calendarCategory.create({
        data: {
          name: cat.name,
          color: cat.color,
          categoryType: cat.categoryType,
          description: cat.description,
          googleCalId: localCalId,
          userId,
        },
      });
    });

    await Promise.all(seedPromises);
    console.log(`Seeded ${COGNITIVE_CATEGORIES.length} default categories for user: ${userId}`);
    
    return { success: true, seeded: true, count: COGNITIVE_CATEGORIES.length };
  } catch (error) {
    console.error(`Failed to seed categories for user ${userId}:`, error);
    return { success: false, seeded: false, error };
  }
}
