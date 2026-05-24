import { hasAccessToDashboard } from '@/lib/auth/permissions';

describe('Role & Permissions Integrations', () => {
  it('should deny dashboard entry for anonymous users', () => {
    const access = hasAccessToDashboard(null);
    expect(access).toBe(false);
  });

  it('should approve dashboard access for valid user profiles', () => {
    const mockUser = { email: 'user@sophia.local' };
    const access = hasAccessToDashboard(mockUser);
    expect(access).toBe(true);
  });
});
