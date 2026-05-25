import { google } from "googleapis";
import { getValidGoogleClient } from "../google-client";

/**
 * Deletes an event from a specific Google Calendar for a user.
 * Handles 404 or 410 (Gone) errors gracefully as successful deletions.
 */
export async function deleteGoogleEvent(
  userId: string,
  googleCalId: string,
  googleEventId: string
): Promise<boolean> {
  const auth = await getValidGoogleClient(userId);
  const calendar = google.calendar({ version: "v3", auth });

  try {
    await calendar.events.delete({
      calendarId: googleCalId,
      eventId: googleEventId,
    });
    return true;
  } catch (error: any) {
    // If the event was already deleted on Google, treat it as success
    if (error.status === 404 || error.status === 410) {
      console.warn(`Google Event ${googleEventId} was already deleted or not found.`);
      return true;
    }
    console.error(`Error deleting Google Calendar event ${googleEventId}:`, error);
    throw error;
  }
}
