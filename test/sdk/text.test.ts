import { describe, it, expect, afterEach } from 'bun:test';
import { createMockServer, jsonResponse, sseResponse, type MockServer } from '../helpers/mock-server';
import { MiniMaxSDK } from '../../src/sdk';

describe('MiniMaxSDK.text', () => {
  let server: MockServer;

  afterEach(() => {
    server?.close();
  });

  it('should chat successfully', async () => {
    server = createMockServer({
      routes: {
        '/anthropic/v1/messages': () => jsonResponse({
          id: 'msg-123',
          type: 'message',
          role: 'assistant',
          content: [{ type: 'text', text: 'Hello!' }],
          model: 'MiniMax-M2.7',
          stop_reason: 'end_turn',
          usage: { input_tokens: 10, output_tokens: 5 },
        }),
      },
    });

    const sdk = new MiniMaxSDK({
      apiKey: 'test-key',
      baseUrl: server.url,
    });

    const result = await sdk.text.chat({
      messages: [{ role: 'user', content: 'Hello' }],
    });

    expect(result.id).toBe('msg-123');
  });

  it('streaming skips empty SSE data events', async () => {
    const chunk = JSON.stringify({
      type: 'content_block_delta',
      index: 0,
      delta: { type: 'text_delta', text: 'Hi' },
    });

    server = createMockServer({
      routes: {
        '/anthropic/v1/messages': () => sseResponse([
          { data: chunk },
          { data: '' },
          { data: chunk },
        ]),
      },
    });

    const sdk = new MiniMaxSDK({
      apiKey: 'test-key',
      baseUrl: server.url,
    });

    const stream = await sdk.text.chat({
      messages: [{ role: 'user', content: 'Hi' }],
      stream: true,
    });

    const events = [];
    for await (const event of stream) {
      events.push(event);
    }

    expect(events.length).toBe(2);
    expect(events[0].type).toBe('content_block_delta');
    expect(events[1].type).toBe('content_block_delta');
  });
});
