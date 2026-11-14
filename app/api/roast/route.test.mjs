import { afterEach, expect, mock, test } from 'bun:test';

const review = mock(async () => ({ raw: 'review', metrics: {} }));
mock.module('next/server', () => ({ NextResponse: Response, NextRequest: Request }));
mock.module('@/lib/github', () => ({
  isGitHubUrl: () => true,
  fetchSkillFromGitHub: async () => ({ content: '# Skill', skillFiles: null }),
}));
mock.module('@/lib/tessl', () => ({ runTesslReview: review }));
mock.module('@/lib/rate-limit', () => ({ rateLimit: () => true }));

const { POST } = await import('./route.ts');
afterEach(() => review.mockClear());

for (const body of [null, [], 42, 'text']) {
  test(`rejects a non-object JSON body: ${JSON.stringify(body)}`, async () => {
    const request = new Request('https://example.test/api/roast', {
      method: 'POST', body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(review).not.toHaveBeenCalled();
  });
}

test('keeps malformed JSON a client error', async () => {
  const response = await POST(new Request('https://example.test/api/roast', { method: 'POST', body: '{' }));
  expect(response.status).toBe(400);
  expect(review).not.toHaveBeenCalled();
});

test('still reviews a valid request', async () => {
  const response = await POST(new Request('https://example.test/api/roast', {
    method: 'POST', body: JSON.stringify({ type: 'url', content: 'https://github.com/owner/repo' }),
    headers: { 'content-type': 'application/json' },
  }));
  expect(response.status).toBe(200);
  expect((await response.json()).type).toBe('review');
  expect(review).toHaveBeenCalledTimes(1);
});
