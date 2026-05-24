import { google } from 'googleapis';
import { getGoogleClient } from './google-client';

export async function listCalendarEvents(accessToken: string, timeMin?: string, timeMax?: string) {
  const auth = getGoogleClient(accessToken);
  const calendar = google.calendar({ version: 'v3', auth });
  
  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: timeMin || new Date().toISOString(),
    timeMax: timeMax,
    singleEvents: true,
    orderBy: 'startTime',
  });
  
  return response.data.items || [];
}
