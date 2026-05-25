import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { syncUserCalendar } from "@/lib/google/calendar/sync";
import { seedDefaultCategoriesForUser } from "@/lib/settings/category-seeding";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = session.user.email;

    const dbUser = await prisma.user.findUnique({
      where: { email },
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

    // Call the robust bidirectional sync service
    await syncUserCalendar(dbUser.id);

    return NextResponse.json({
      success: true,
      mode: "cloud",
      message: "Successfully synchronized with Google Calendar.",
    });
  } catch (error: any) {
    console.error("Calendar sync endpoint error:", error);
    
    // Check if error is related to OAuth permissions
    const msg = error?.message || "";
    const isPermissionError = msg.includes("auth") || msg.includes("token") || msg.includes("OAuth");
    
    return NextResponse.json(
      { 
        error: "Synchronization failed", 
        details: msg,
        isOAuthError: isPermissionError
      },
      { status: 500 }
    );
  }
}
