import { google } from "googleapis";
import { prisma } from "@/lib/db/prisma";
import { getValidGoogleClient } from "../google-client";
import { createGoogleEvent } from "./create-event";

/**
 * Synchronizes a user's calendar categories and events with Google Calendar.
 * 1. Checks if Google Calendars exist for all categories; creates them if missing.
 * 2. Fetches events from Google for each category and updates/inserts/deletes locally.
 * 3. Finds local events not yet pushed to Google and inserts them.
 */
export async function syncUserCalendar(userId: string) {
  try {
    const auth = await getValidGoogleClient(userId);
    const calendar = google.calendar({ version: "v3", auth });

    // 1. Fetch user categories
    const categories = await prisma.calendarCategory.findMany({
      where: { userId },
    });

    console.log(`Syncing ${categories.length} categories for user ${userId}`);

    // Time window for sync (e.g., 30 days back, 90 days forward)
    const timeMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const timeMax = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

    for (const category of categories) {
      let googleCalId = category.googleCalId;
      let calendarExists = false;

      // 2. Validate calendar exists in Google
      if (googleCalId && !googleCalId.startsWith("local-")) {
        try {
          const calCheck = await calendar.calendars.get({ calendarId: googleCalId });
          if (calCheck.data.id) {
            calendarExists = true;
          }
        } catch (err) {
          console.warn(`Google Calendar ID ${googleCalId} not found, will recreate.`);
        }
      }

      // Recreate calendar if it doesn't exist on Google
      if (!calendarExists) {
        try {
          console.log(`Creating Google Calendar for category: ${category.name}`);
          const newCal = await calendar.calendars.insert({
            requestBody: {
              summary: `SOPHIA - ${category.name}`,
              description: category.description || `Konteks produktivitas SOPHIA: ${category.name}`,
            },
          });

          if (newCal.data.id) {
            googleCalId = newCal.data.id;
            await prisma.calendarCategory.update({
              where: { id: category.id },
              data: { googleCalId },
            });
            console.log(`Calendar created: ${newCal.data.id}`);
          }
        } catch (err) {
          console.error(`Failed to create calendar for category ${category.name}:`, err);
          continue; // Skip sync for this category if calendar creation fails
        }
      }

      // 3. Fetch events from Google Calendar
      let googleEvents: any[] = [];
      try {
        const response = await calendar.events.list({
          calendarId: googleCalId,
          timeMin,
          timeMax,
          showDeleted: true, // Crucial to catch deletions
          singleEvents: true,
        });
        googleEvents = response.data.items || [];
      } catch (err) {
        console.error(`Failed to fetch events from Google Calendar ${googleCalId}:`, err);
        continue;
      }

      // 4. Sync Google events to Local DB
      for (const gEvent of googleEvents) {
        if (!gEvent.id) continue;

        // Check if event is cancelled/deleted on Google
        if (gEvent.status === "cancelled") {
          // Delete local event if it exists
          await prisma.event.deleteMany({
            where: {
              userId,
              googleEventId: gEvent.id,
            },
          });
          continue;
        }

        const start = gEvent.start?.dateTime || gEvent.start?.date;
        const end = gEvent.end?.dateTime || gEvent.end?.date;
        if (!start || !end) continue;

        // Find existing local event
        const existingLocal = await prisma.event.findFirst({
          where: {
            userId,
            googleEventId: gEvent.id,
          },
        });

        if (existingLocal) {
          // Update local event if Google is source of truth
          await prisma.event.update({
            where: { id: existingLocal.id },
            data: {
              title: gEvent.summary || "Tanpa Judul",
              description: gEvent.description || null,
              startTime: new Date(start),
              endTime: new Date(end),
              location: gEvent.location || null,
            },
          });
        } else {
          // Create local event
          await prisma.event.create({
            data: {
              userId,
              calendarId: category.id,
              googleEventId: gEvent.id,
              title: gEvent.summary || "Tanpa Judul",
              description: gEvent.description || null,
              startTime: new Date(start),
              endTime: new Date(end),
              location: gEvent.location || null,
            },
          });
        }
      }

      // 5. Push Local Events (not yet synced) to Google Calendar
      const unsyncedLocalEvents = await prisma.event.findMany({
        where: {
          userId,
          calendarId: category.id,
          OR: [
            { googleEventId: null },
            { googleEventId: "" },
          ],
        },
      });

      for (const localEvent of unsyncedLocalEvents) {
        try {
          console.log(`Pushing unsynced event: ${localEvent.title} to Google`);
          const newGoogleId = await createGoogleEvent(userId, googleCalId, {
            title: localEvent.title,
            description: localEvent.description,
            startTime: localEvent.startTime,
            endTime: localEvent.endTime,
            location: localEvent.location,
          });

          await prisma.event.update({
            where: { id: localEvent.id },
            data: { googleEventId: newGoogleId },
          });
        } catch (err) {
          console.error(`Failed to push event ${localEvent.id} to Google:`, err);
        }
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Google Calendar Synchronization failed:", error);
    throw error;
  }
}
