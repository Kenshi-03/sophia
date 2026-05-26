import { POST } from '../../app/api/ai/chat/route';

jest.mock('../../lib/auth/session', () => ({
  getCurrentUser: jest.fn().mockResolvedValue({ id: 'test-user-id', email: 'user@sophia.local' }),
}));

describe('AI Chat Route Handler', () => {
  it('should reject requests with missing query body parameter', async () => {
    const mockRequest = new Request('http://localhost:3000/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(mockRequest);
    expect(response.status).toBe(400);
    
    const body = await response.json();
    expect(body.error).toBe('Query is required.');
  });
});
