import { prisma } from "@/lib/db/prisma";

export interface SeededCategory {
  name: string;
  color: string;
  categoryType: string;
  googleCalId: string;
  description: string;
}

export const COGNITIVE_CATEGORIES: SeededCategory[] = [
  {
    name: "Jadwal Kelas",
    color: "#3B82F6",
    categoryType: "academic",
    googleCalId: "5c071371fe59dedb3c8a79c67537d0ce4dcd6c48150892a26c88b518c4070ef5@group.calendar.google.com",
    description: "Agenda perkuliahan dan kelas akademik.",
  },
  {
    name: "Deadline Tugas",
    color: "#EF4444",
    categoryType: "deadline",
    googleCalId: "dd10a24ca3ca75f038a5cfc48788e0c0146bc9200e66cda70e5197bb7582b2c9@group.calendar.google.com",
    description: "Batas waktu pengumpulan tugas perkuliahan.",
  },
  {
    name: "Rapat Organisasi",
    color: "#8B5CF6",
    categoryType: "organization",
    googleCalId: "d7dd28da08604d9965417f06b8e9ba78b6ae7e5d4ebe0acdb742ca63cebcc38d@group.calendar.google.com",
    description: "Pertemuan rapat koordinasi organisasi mahasiswa.",
  },
  {
    name: "Acara",
    color: "#F59E0B",
    categoryType: "event",
    googleCalId: "e6283cea6d85f432a8e596432436ebffbe6829cb67675016e85d58fbb64d3c70@group.calendar.google.com",
    description: "Acara umum, webinar, atau kegiatan insidental.",
  },
  {
    name: "Proker Hima",
    color: "#EC4899",
    categoryType: "project",
    googleCalId: "02a01251057d07486bb5c9b8bb45cb3b1f9fbbb0d179a1300d90b4b781fdbe32@group.calendar.google.com",
    description: "Program kerja Himpunan Mahasiswa.",
  },
  {
    name: "Ujian & Evaluasi",
    color: "#DC2626",
    categoryType: "exam",
    googleCalId: "3ba04661b696c0e294b67f9b54a786a2af5ba7a80d7b76b06afbd03d3048dabb@group.calendar.google.com",
    description: "Jadwal ujian tengah/akhir semester dan evaluasi akademik.",
  },
  {
    name: "Kajian Teoritis & Deep Work",
    color: "#2563EB",
    categoryType: "deep-work",
    googleCalId: "cb5b774f7306744006a65f893d0c98465ba50c79c62699ea54b8bf83b3ad40bb@group.calendar.google.com",
    description: "Sesi pengerjaan mendalam, riset, atau belajar intensif.",
  },
  {
    name: "Workout & Kesehatan",
    color: "#10B981",
    categoryType: "health",
    googleCalId: "9850ac55121fff1b88f4ec04a37cfdf7d79eaf8786646a7311a1642725f5a56c@group.calendar.google.com",
    description: "Aktivitas olahraga, kebugaran, dan kesehatan.",
  },
  {
    name: "Proyek Personal",
    color: "#14B8A6",
    categoryType: "personal-project",
    googleCalId: "6c4fc769164f7001b66ea7cc76e4af96514d926a7e8da4eb5d3bac254f6b545d@group.calendar.google.com",
    description: "Pengembangan proyek mandiri di luar akademis.",
  },
  {
    name: "Waktu Luang & Sosial",
    color: "#F97316",
    categoryType: "social",
    googleCalId: "f044793220d98e746a450b4fd35248b7c055854ff893df5f409ccca43185dc27@group.calendar.google.com",
    description: "Aktivitas bersantai, nongkrong, dan interaksi sosial.",
  },
  {
    name: "Ibadah",
    color: "#22C55E",
    categoryType: "spiritual",
    googleCalId: "8173994218a8d7f9dbfad09262650164b2dd79aa214ac2e7729b48c3839853eb@group.calendar.google.com",
    description: "Waktu ibadah dan kegiatan keagamaan.",
  },
  {
    name: "Istirahat",
    color: "#64748B",
    categoryType: "recovery",
    googleCalId: "3a9a77555658ec00b39ef7e12ccfbb4f4fa7c7fcc31218287e956af01b1d7bb0@group.calendar.google.com",
    description: "Tidur, istirahat, recovery, untuk mencegah burnout.",
  },
];

/**
 * Seeds default cognitive categories for a user if they do not exist.
 * Uses exact Google Calendar IDs.
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
      return prisma.calendarCategory.create({
        data: {
          name: cat.name,
          color: cat.color,
          categoryType: cat.categoryType,
          description: cat.description,
          googleCalId: cat.googleCalId,
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
