import { google } from "googleapis";
import { prisma } from "@/lib/db/prisma";

export function getGoogleClient(accessToken?: string) {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/auth/callback/google`
  );
  if (accessToken) {
    client.setCredentials({ access_token: accessToken });
  }
  return client;
}

/**
 * Retrieves a Google OAuth2 client with a guaranteed valid access token.
 * If the current access token is expired or close to expiring, it uses the refresh token
 * to renew the access token and updates the database record.
 */
export async function getValidGoogleClient(userId: string) {
  const account = await prisma.account.findFirst({
    where: {
      userId,
      provider: "google",
    },
  });

  if (!account) {
    throw new Error("No Google account associated with this user.");
  }

  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/auth/callback/google`
  );

  const expiresAtMs = account.expires_at ? account.expires_at * 1000 : 0;
  const isExpired = Date.now() >= expiresAtMs - 60000; // Expired or expiring within 60s

  if (isExpired && account.refresh_token) {
    console.log(`Access token for user ${userId} expired. Refreshing...`);
    client.setCredentials({
      access_token: account.access_token || undefined,
      refresh_token: account.refresh_token,
    });

    try {
      const response = await client.refreshAccessToken();
      const { credentials } = response;
      
      const newAccessToken = credentials.access_token;
      const newExpiresAt = credentials.expiry_date 
        ? Math.floor(credentials.expiry_date / 1000) 
        : Math.floor(Date.now() / 1000) + 3600; // Default 1 hour from now

      if (newAccessToken) {
        await prisma.account.update({
          where: { id: account.id },
          data: {
            access_token: newAccessToken,
            expires_at: newExpiresAt,
          },
        });
        
        client.setCredentials({ access_token: newAccessToken });
        console.log(`Successfully refreshed access token for user ${userId}`);
        return client;
      }
    } catch (error) {
      console.error(`Failed to refresh access token for user ${userId}:`, error);
      throw new Error(`Google OAuth token refresh failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  if (!account.access_token) {
    throw new Error("Missing Google access token and cannot refresh.");
  }

  client.setCredentials({ access_token: account.access_token });
  return client;
}
