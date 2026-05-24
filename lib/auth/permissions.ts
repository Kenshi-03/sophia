import { UserProfile } from '@/types/user';

export function hasAccessToDashboard(user: Partial<UserProfile> | null | undefined): boolean {
  if (!user) return false;
  return true;
}

export function canManageSettings(user: Partial<UserProfile> | null | undefined): boolean {
  if (!user) return false;
  // Role based placeholder
  return true;
}
