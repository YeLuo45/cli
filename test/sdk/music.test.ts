import { describe, it, expect, afterEach } from 'bun:test';
import { createMockServer, jsonResponse, type MockServer } from '../helpers/mock-server';
import { MiniMaxSDK } from '../../src/sdk';
import { MusicSDK } from '../../src/sdk/music';
import { existsSync, unlinkSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { MusicResponse } from '../../src/types/api';

function makeMusicResponse(hexAudio?: string): MusicResponse {
  return {
    base_resp: { status_code: 0, status_msg: 'ok' },
    data: {
      audio: hexAudio || Buffer.from('hello music audio').toString('hex'),
      status: 0,
    },
  };
}

describe('MiniMaxSDK.music', () => {
  let server: MockServer;

  afterEach(() => {
    server?.close();
  });

  it('should generate music successfully', async () => {
    server = createMockServer({
      routes: {
        '/v1/music_generation': () => jsonResponse({
          data: { audio_url: 'https://example.com/music.mp3' },
          base_resp: { status_code: 0, status_msg: 'success' },
        }),
      },
    });

    const sdk = new MiniMaxSDK({
      apiKey: 'test-key',
      baseUrl: server.url,
    });

    const result = await sdk.music.generate({
      lyrics: 'no lyrics',
      instrumental: true,
    });

    expect(result.data.audio_url).toBe('https://example.com/music.mp3');
  });
});

describe('MusicSDK.save', () => {
  const sdk = new MusicSDK({ apiKey: 'sk-test', region: 'global' });

  it('decodes hex audio and saves to disk', () => {
    const out = join(tmpdir(), `music-sdk-save-${Date.now()}.mp3`);
    const response = makeMusicResponse();

    const saved = sdk.save(response, out);
    expect(saved).toBe(out);
    expect(existsSync(out)).toBe(true);
    expect(readFileSync(out).toString()).toBe('hello music audio');
    unlinkSync(out);
  });

  it('generates default filename with timestamp', () => {
    const response = makeMusicResponse();
    const saved = sdk.save(response);
    expect(saved).toMatch(/music_\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.mp3/);
    expect(existsSync(saved)).toBe(true);
    unlinkSync(saved);
  });

  it('creates intermediate directories', () => {
    const out = join(tmpdir(), `music-sdk-deep-${Date.now()}`, 'x', 'y', 'song.wav');
    const response = makeMusicResponse();
    const saved = sdk.save(response, out, 'wav');
    expect(existsSync(saved)).toBe(true);
    unlinkSync(saved);
  });

  it('throws when audio data is missing', () => {
    const response = makeMusicResponse('');
    response.data.audio = undefined;
    expect(() => sdk.save(response, '/tmp/test.mp3')).toThrow('missing audio data');
  });
});

describe('MusicSDK.validateParams', () => {
  const sdk = new MusicSDK({ apiKey: 'sk-test', region: 'global' });

  it('throws when is_instrumental and lyrics are both provided', async () => {
    await expect(
      sdk.generate({ is_instrumental: true, lyrics: 'hello' } as any),
    ).rejects.toThrow('Cannot use is_instrumental with lyrics');
  });

  it('throws when lyrics_optimizer is used with lyrics', async () => {
    await expect(
      sdk.generate({ lyrics_optimizer: true, lyrics: 'hello' } as any),
    ).rejects.toThrow('Cannot use lyrics_optimizer with lyrics or is_instrumental');
  });

  it('throws when lyrics_optimizer is used with is_instrumental', async () => {
    await expect(
      sdk.generate({ lyrics_optimizer: true, is_instrumental: true } as any),
    ).rejects.toThrow('Cannot use lyrics_optimizer with lyrics or is_instrumental');
  });

  it('throws when no prompt, lyrics, is_instrumental, or lyrics_optimizer', async () => {
    await expect(
      sdk.generate({} as any),
    ).rejects.toThrow('At least one of prompt or lyrics or is_instrumental or lyrics_optimizer is required');
  });

  it('throws when lyrics is missing (not is_instrumental, not lyrics_optimizer)', async () => {
    await expect(
      sdk.generate({ prompt: 'Upbeat pop' } as any),
    ).rejects.toThrow('lyrics is required');
  });

  it('throws on invalid model', async () => {
    await expect(
      sdk.generate({ prompt: 'Folk', lyrics: 'no lyrics', model: 'music-2.0' } as any),
    ).rejects.toThrow('Invalid model');
  });

  it('throws on invalid output_format', async () => {
    await expect(
      sdk.generate({ prompt: 'Folk', lyrics: 'no lyrics', output_format: 'mp3' } as any),
    ).rejects.toThrow('Invalid output format');
  });

  it('throws when stream and output_format=url are used together', async () => {
    await expect(
      sdk.generate({ prompt: 'Folk', lyrics: 'no lyrics', stream: true, output_format: 'url' } as any),
    ).rejects.toThrow('stream and output_format url cannot be used together');
  });
});
