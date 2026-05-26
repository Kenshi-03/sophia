// Next-Auth v5 session getter utility
import { auth } from './auth';
import { prisma } from '@/lib/db/prisma';
import { redirect } from 'next/navigation';

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.email) return null;
  
  return prisma.user.findUnique({
    where: { email: session.user.email },
  });
}

// Redirects to /login if the user is not logged in.
// Useful inside server components (layouts/pages)
export async function requireSession() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect('/login');
  }
  
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });
  
  if (!user) {
    redirect('/login');
  }
  
  return { session, user };
}
