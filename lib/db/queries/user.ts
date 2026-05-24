import prisma from '../prisma';
import { UserProfile } from '@/types/user';

export async function getUserProfile(userId: string) {
  // Return dummy profile info
  return {
    id: userId,
    email: 'user@sophia.local',
    name: 'Sophia User',
  };
}

export async function updateUserProfile(userId: string, data: Partial<UserProfile>) {
  return { id: userId, ...data };
}
