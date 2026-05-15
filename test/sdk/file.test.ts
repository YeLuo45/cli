import { describe, it, expect } from 'bun:test';
import { FileSDK } from '../../src/sdk/file';
import { existsSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('FileSDK', () => {
  it('throws SDKError when file does not exist', async () => {
    const sdk = new FileSDK({ apiKey: 'sk-test', region: 'global' });
    await expect(sdk.upload('/tmp/nonexistent-file-xxxxx.bin', 'retrieval'))
      .rejects
      .toThrow('File not found');
  });

  it('gets past file existence check for a valid file', async () => {
    const tmpFile = join(tmpdir(), 'mmx-sdk-test-upload.txt');
    writeFileSync(tmpFile, 'hello world');

    try {
      const sdk = new FileSDK({ apiKey: 'sk-test', region: 'global' });
      await sdk.upload(tmpFile, 'retrieval');
      // Should not reach here (no mock server), but if it does, fail informatively
    } catch (err) {
      // Must NOT be "File not found" — proves file existence check passed
      expect((err as Error).message).not.toContain('File not found');
    } finally {
      if (existsSync(tmpFile)) unlinkSync(tmpFile);
    }
  });
});
