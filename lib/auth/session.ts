// Next-Auth v5 session getter utility
import { authOptions } from './auth-options';

// Mock getSession helper to check user details in server components
export async function getSession() {
  return null; // NextAuth session resolver placeholder
}

export async function getCurrentUser() {
  const session = await getSession();
  return session ? (session as any).user : null;
}
