import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
);

export function getGoogleClient(accessToken?: string) {
  if (accessToken) {
    oauth2Client.setCredentials({ access_token: accessToken });
  }
  return oauth2Client;
}
