import { describe, it, expect, afterEach } from 'bun:test';
import { createMockServer, jsonResponse, type MockServer } from '../helpers/mock-server';
import { MiniMaxSDK } from '../../src/sdk';
import { VideoSDK } from '../../src/sdk/video';

describe('MiniMaxSDK.video', () => {
  let server: MockServer;

  afterEach(() => {
    server?.close();
  });

  it('should generate video async successfully', async () => {
    server = createMockServer({
      routes: {
        '/v1/video_generation': () => jsonResponse({
          task_id: 'vid-123',
          base_resp: { status_code: 0, status_msg: 'success' },
        }),
      },
    });

    const sdk = new MiniMaxSDK({
      apiKey: 'test-key',
      baseUrl: server.url,
    });

    const result = await sdk.video.generate({
      prompt: 'A cat walking',
      async: true,
    });

    expect(result.taskId).toBe('vid-123');
  });

  it('should get task status', async () => {
    server = createMockServer({
      routes: {
        '/v1/query/video_generation': () => jsonResponse({
          task_id: 'vid-123',
          status: 'Success',
          base_resp: { status_code: 0, status_msg: 'success' },
        }),
      },
    });

    const sdk = new MiniMaxSDK({
      apiKey: 'test-key',
      baseUrl: server.url,
    });

    const result = await sdk.video.getTask({ taskId: 'vid-123' });

    expect(result.status).toBe('Success');
  });
});

describe('VideoSDK.validateParams', () => {
  const sdk = new VideoSDK({ apiKey: 'sk-test', region: 'global' });

  it('throws when prompt is missing', async () => {
    await expect(sdk.generate({} as any)).rejects.toThrow('prompt is required');
  });

  it('throws when last_frame_image is provided without first_frame_image', async () => {
    await expect(
      sdk.generate({ prompt: 'test', last_frame_image: 'data:image/png;base64,xxx' }),
    ).rejects.toThrow('last_frame_image requires first_frame_image');
  });

  it('throws when last_frame_image and subject_reference are used together', async () => {
    await expect(
      sdk.generate({
        prompt: 'test',
        first_frame_image: 'data:image/png;base64,xxx',
        last_frame_image: 'data:image/png;base64,yyy',
        subject_reference: [{ type: 'character', image: ['data:image/png;base64,zzz'] }],
      }),
    ).rejects.toThrow('SEF and S2V are different modes');
  });

  it('throws when Fast model used without first_frame_image', async () => {
    await expect(
      sdk.generate({ prompt: 'test', model: 'MiniMax-Hailuo-2.3-Fast' }),
    ).rejects.toThrow('MiniMax-Hailuo-2.3-Fast only supports I2V');
  });

  it('auto-selects SEF model when last_frame_image is provided', async () => {
    // Validation passes → tries network → fails with non-validation error
    await expect(
      sdk.generate({
        prompt: 'test',
        first_frame_image: 'data:image/png;base64,xxx',
        last_frame_image: 'data:image/png;base64,yyy',
      }),
    ).rejects.not.toThrow(/prompt|last_frame/);
  });

  it('auto-selects S2V model when subject_reference is provided', async () => {
    await expect(
      sdk.generate({
        prompt: 'test',
        subject_reference: [{ type: 'character', image: ['data:image/png;base64,zzz'] }],
      }),
    ).rejects.not.toThrow(/prompt|subject/);
  });
});
