"use server"

import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { encrypt } from "@/lib/security/encryption";
import { CognitiveCategoryType } from "@prisma/client";

interface CategoryInput {
  name: string;
  categoryType: string;
  googleCalId: string;
  color: string;
}

interface SetupInput {
  aiModel: string;
  aiApiKey: string;
  productivityIntensity: string;
  cognitiveThreshold: number;
  memoryDepth: number;
  categories: CategoryInput[];
}

export async function saveSetupAction(formData: SetupInput) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const encryptedKey = formData.aiApiKey ? encrypt(formData.aiApiKey) : null;

    // 1. Update or create UserSettings
    await prisma.userSettings.upsert({
      where: { userId: user.id },
      update: {
        aiModel: formData.aiModel,
        aiApiKey: encryptedKey,
        productivityIntensity: formData.productivityIntensity,
        cognitiveThreshold: formData.cognitiveThreshold,
        memoryDepth: formData.memoryDepth,
        isOnboarded: true,
      },
      create: {
        userId: user.id,
        aiModel: formData.aiModel,
        aiApiKey: encryptedKey,
        productivityIntensity: formData.productivityIntensity,
        cognitiveThreshold: formData.cognitiveThreshold,
        memoryDepth: formData.memoryDepth,
        isOnboarded: true,
      },
    });

    // 2. Create Calendar Configurations for the user
    for (const cat of formData.categories) {
      if (cat.name.trim() && cat.googleCalId.trim()) {
        let enumType: CognitiveCategoryType = CognitiveCategoryType.GENERAL;
        const normalized = cat.categoryType.toUpperCase().replace("-", "_");
        if (Object.values(CognitiveCategoryType).includes(normalized as any)) {
          enumType = normalized as CognitiveCategoryType;
        }

        const existing = await prisma.calendarConfig.findFirst({
          where: {
            userId: user.id,
            googleCalendarId: cat.googleCalId,
            deletedAt: null,
          },
        });

        if (existing) {
          await prisma.calendarConfig.update({
            where: { id: existing.id },
            data: {
              cognitiveCategory: cat.name,
              categoryType: enumType,
              color: cat.color,
            },
          });
        } else {
          await prisma.calendarConfig.create({
            data: {
              userId: user.id,
              cognitiveCategory: cat.name,
              categoryType: enumType,
              googleCalendarId: cat.googleCalId,
              color: cat.color,
              isDefault: cat.name.toLowerCase().includes("deep"),
              isActive: true,
            },
          });
        }
      }
    }

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("Setup onboarding action failed:", error);
    return { success: false, error: error.message || "Failed to save configuration." };
  }
}
