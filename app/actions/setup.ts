"use server"

import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";

import { encrypt } from "@/lib/security/encryption";

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

    // 2. Create Calendar Categories for the user
    for (const cat of formData.categories) {
      if (cat.name.trim() && cat.googleCalId.trim()) {
        await prisma.calendarCategory.upsert({
          where: {
            googleCalId: cat.googleCalId,
          },
          update: {
            name: cat.name,
            categoryType: cat.categoryType,
            color: cat.color,
            userId: user.id,
          },
          create: {
            name: cat.name,
            categoryType: cat.categoryType,
            googleCalId: cat.googleCalId,
            color: cat.color,
            userId: user.id,
          },
        });
      }
    }

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("Setup onboarding action failed:", error);
    return { success: false, error: error.message || "Failed to save configuration." };
  }
}
