import { prisma } from "@/lib/db/prisma";
import { CognitiveCategoryType } from "@prisma/client";

export interface SeededCategory {
  cognitiveCategory: string;
  color: string;
  categoryType: CognitiveCategoryType;
  googleCalendarId: string;
  description: string;
  isDefault: boolean;
}

export const COGNITIVE_CATEGORIES: SeededCategory[] = [
  {
    cognitiveCategory: "General",
    color: "#64748B",
    categoryType: CognitiveCategoryType.GENERAL,
    googleCalendarId: "primary",
    description: "Kategori umum untuk tugas dan agenda harian.",
    isDefault: false,
  },
  {
    cognitiveCategory: "Deep Work",
    color: "#2563EB",
    categoryType: CognitiveCategoryType.DEEP_WORK,
    googleCalendarId: "primary",
    description: "Sesi pengerjaan mendalam, riset, atau belajar intensif.",
    isDefault: true,
  },
  {
    cognitiveCategory: "Meeting",
    color: "#8B5CF6",
    categoryType: CognitiveCategoryType.MEETING,
    googleCalendarId: "primary",
    description: "Rapat koordinasi dan diskusi tim.",
    isDefault: false,
  },
  {
    cognitiveCategory: "Personal",
    color: "#F97316",
    categoryType: CognitiveCategoryType.PERSONAL,
    googleCalendarId: "primary",
    description: "Aktivitas pribadi, sosial, dan istirahat santai.",
    isDefault: false,
  },
];

/**
 * Seeds default cognitive calendar configurations for a user if they do not exist.
 * Maps them initially to the "primary" Google Calendar ID.
 */
export async function seedDefaultCategoriesForUser(userId: string) {
  try {
    const existingCount = await prisma.calendarConfig.count({
      where: { userId, deletedAt: null },
    });

    if (existingCount > 0) {
      return { success: true, seeded: false, count: existingCount };
    }

    const seedPromises = COGNITIVE_CATEGORIES.map((cat) => {
      return prisma.calendarConfig.create({
        data: {
          userId,
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
    });

    await Promise.all(seedPromises);
    console.log(`Seeded ${COGNITIVE_CATEGORIES.length} default calendar configs for user: ${userId}`);
    
    return { success: true, seeded: true, count: COGNITIVE_CATEGORIES.length };
  } catch (error) {
    console.error(`Failed to seed calendar configs for user ${userId}:`, error);
    return { success: false, seeded: false, error };
  }
}
