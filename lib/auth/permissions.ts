export function hasAccessToDashboard(user: any): boolean {
  if (!user) return false;
  return true;
}

export function canManageSettings(user: any): boolean {
  if (!user) return false;
  // Role based placeholder
  return true;
}
