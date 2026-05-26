import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { seedDefaultCategoriesForUser } from "@/lib/settings/category-seeding";
import { calendarSyncQueue } from "@/lib/queue/client";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        accounts: {
          where: { provider: "google" },
        },
      },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Seed default categories if they don't exist before syncing
    await seedDefaultCategoriesForUser(dbUser.id);

    const googleAccount = dbUser.accounts[0];
    const hasGoogleAccount = !!googleAccount;

    if (!hasGoogleAccount) {
      return NextResponse.json({
        success: true,
        mode: "local",
        message: "Google Account not linked. Running in local database mode.",
      });
    }

    // Schedule the robust bidirectional sync service in background with idempotency jobId
    try {
      await calendarSyncQueue.add(
        "sync",
        { userId: dbUser.id },
        { jobId: `sync:${dbUser.id}` }
      );

      return NextResponse.json(
        {
          success: true,
          mode: "cloud",
          message: "Google Calendar synchronization scheduled in background.",
        },
        { status: 202 }
      );
    } catch (queueErr) {
      console.warn("Failed to enqueue sync. Falling back to synchronous execution due to queue infrastructure issue:", queueErr);
      
      // Fallback: Run sync synchronously
      const { syncUserCalendar } = await import("@/lib/google/calendar/sync");
      await syncUserCalendar(dbUser.id);
      
      return NextResponse.json(
        {
          success: true,
          mode: "cloud-fallback",
          message: "Google Calendar synchronization processed synchronously (background queue unavailable).",
        },
        { status: 200 }
      );
    }
  } catch (error: any) {
    console.error("Calendar sync endpoint error:", error);
    
    // Check if error is related to OAuth permissions
    const msg = error?.message || "";
    const isPermissionError = msg.includes("auth") || msg.includes("token") || msg.includes("OAuth");
    
    return NextResponse.json(
      { 
        error: "Synchronization scheduling failed", 
        details: msg,
        isOAuthError: isPermissionError
      },
      { status: 500 }
    );
  }
}
