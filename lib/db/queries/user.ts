import prisma from '../prisma';

export async function getUserProfile(userId: string) {
  // Return dummy profile info
  return {
    id: userId,
    email: 'user@sophia.local',
    name: 'Sophia User',
  };
}

export async function updateUserProfile(userId: string, data: any) {
  return { id: userId, ...data };
}
