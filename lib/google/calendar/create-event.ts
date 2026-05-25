import { google } from "googleapis";
import { getValidGoogleClient } from "../google-client";

interface GoogleEventInput {
  title: string;
  description?: string | null;
  startTime: Date | string;
  endTime: Date | string;
  location?: string | null;
}

/**
 * Creates an event in a specific Google Calendar for a user.
 * Returns the Google Event ID.
 */
export async function createGoogleEvent(
  userId: string,
  googleCalId: string,
  event: GoogleEventInput
): Promise<string> {
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
    const response = await calendar.events.insert({
      calendarId: googleCalId,
      requestBody: resource,
    });

    if (!response.data.id) {
      throw new Error("Google Calendar API did not return an event ID.");
    }

    return response.data.id;
  } catch (error) {
    console.error("Error creating Google Calendar event:", error);
    throw error;
  }
}
