// 04_api.spec.js — Backend API: health, SSE chat stream, conversations, CORS
// Requires: backend running on http://localhost:8501

const { test, expect } = require('@playwright/test');

// Parse raw SSE text into an array of parsed payloads
function parseSse(text) {
  return text
    .split('\n')
    .filter(line => line.startsWith('data: '))
    .map(line => line.slice(6).trim())
    .filter(Boolean);
}

test.describe('Backend API', () => {

  test('A-01: GET /health returns 200 with ok:true', async ({ request }) => {
    const res = await request.get('/health');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  test('A-02: POST /chat returns 200 with text/event-stream', async ({ request }) => {
    const res = await request.post('/chat', {
      data: {
        query: 'What is the vacation carryover policy?',
        history: [],
        agent_label: 'Americas HR',
      },
    });
    expect(res.status()).toBe(200);
    const contentType = res.headers()['content-type'] || '';
    expect(contentType).toContain('text/event-stream');
  });

  test('A-03: first SSE event contains sources array', async ({ request }) => {
    const res = await request.post('/chat', {
      data: {
        query: 'What is the vacation carryover policy?',
        history: [],
        agent_label: 'Americas HR',
      },
    });
    const rawBody = await res.text();
    const events = parseSse(rawBody);

    // Filter out [DONE]
    const dataEvents = events.filter(e => e !== '[DONE]');
    expect(dataEvents.length).toBeGreaterThan(0);

    // First event should have sources
    const first = JSON.parse(dataEvents[0]);
    expect(first).toHaveProperty('sources');
    expect(Array.isArray(first.sources)).toBe(true);
  });

  test('A-04: subsequent SSE events contain text chunks', async ({ request }) => {
    const res = await request.post('/chat', {
      data: {
        query: 'What is the vacation carryover policy?',
        history: [],
        agent_label: 'Americas HR',
      },
    });
    const rawBody = await res.text();
    const events = parseSse(rawBody).filter(e => e !== '[DONE]');

    const textEvents = events.slice(1).map(e => {
      try { return JSON.parse(e); } catch { return null; }
    }).filter(Boolean);

    const hasText = textEvents.some(e => typeof e.text === 'string');
    expect(hasText).toBe(true);
  });

  test('A-05: SSE stream terminates with [DONE]', async ({ request }) => {
    const res = await request.post('/chat', {
      data: {
        query: 'What is the vacation carryover policy?',
        history: [],
        agent_label: 'Americas HR',
      },
    });
    const rawBody = await res.text();
    const events = parseSse(rawBody);
    const last = events[events.length - 1];
    expect(last).toBe('[DONE]');
  });

  test('A-06: POST /chat with empty query returns 4xx', async ({ request }) => {
    const res = await request.post('/chat', {
      data: { query: '', history: [], agent_label: 'Americas HR' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('A-07: GET /conversations returns a JSON array', async ({ request }) => {
    const res = await request.get('/conversations?user_id=default');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('A-08: POST /conversations creates a conversation and returns id', async ({ request }) => {
    const res = await request.post('/conversations', {
      data: { user_id: 'playwright-test', title: 'E2E test chat' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('id');
    expect(typeof body.id).toBe('string');
    expect(body.id.length).toBeGreaterThan(0);
  });

  test('A-09: GET /conversations/{id}/messages returns a JSON array', async ({ request }) => {
    // Create a fresh conversation to get a valid ID
    const createRes = await request.post('/conversations', {
      data: { user_id: 'playwright-test', title: 'Messages test' },
    });
    const { id } = await createRes.json();

    const res = await request.get(`/conversations/${id}/messages`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('A-10: OPTIONS /health includes CORS allow-origin header', async ({ request }) => {
    const res = await request.fetch('/health', {
      method: 'OPTIONS',
      headers: { Origin: 'http://localhost:8080' },
    });
    const headers = res.headers();
    const corsHeader = headers['access-control-allow-origin'];
    expect(corsHeader).toBeTruthy();
  });

});
