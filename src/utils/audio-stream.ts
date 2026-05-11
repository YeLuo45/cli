import { parseSSE } from '../client/stream';

interface SseAudioPayload {
  data?: { audio?: string; status?: number };
}

export async function pipeAudioStream(response: Response): Promise<void> {
  process.stdout.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EPIPE') process.exit(0);
    throw err;
  });

  for await (const event of parseSSE(response)) {
    if (!event.data || event.data === '[DONE]') break;

    let parsed: SseAudioPayload;
    try { parsed = JSON.parse(event.data); } catch { continue; }

    if (parsed.data?.status === 2) continue;

    const hex = parsed.data?.audio;
    if (!hex) continue;

    const chunk = Buffer.from(hex, 'hex');
    if (!process.stdout.write(chunk)) {
      await new Promise<void>(r => process.stdout.once('drain', r));
    }
  }
}
