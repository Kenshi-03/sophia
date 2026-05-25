import { google } from "googleapis";
import { getValidGoogleClient } from "../google-client";

interface GoogleEventUpdateInput {
  title: string;
  description?: string | null;
  startTime: Date | string;
  endTime: Date | string;
  location?: string | null;
}

/**
 * Updates an existing event in a specific Google Calendar for a user.
 */
export async function updateGoogleEvent(
  userId: string,
  googleCalId: string,
  googleEventId: string,
  event: GoogleEventUpdateInput
): Promise<boolean> {
  const auth = await getValidGoogleClient(userId);
  const calendar = google.calendar({ version: "v3", auth });

  const resource = {
    summary: event.title,
    description: event.description || "",
    location: event.location || "",
    start: {
      dateTime: new Date(event.startTime).toISOString(),
    },
    end: {
      dateTime: new Date(event.endTime).toISOString(),
    },
  };

  try {
    await calendar.events.patch({
      calendarId: googleCalId,
      eventId: googleEventId,
      requestBody: resource,
    });
    return true;
  } catch (error) {
    console.error(`Error updating Google Calendar event ${googleEventId}:`, error);
    throw error;
  }
}
