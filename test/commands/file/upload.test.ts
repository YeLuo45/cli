import { describe, it, expect } from 'bun:test';
import { default as uploadCommand } from '../../../src/commands/file/upload';

const baseConfig = {
  apiKey: 'test-key',
  region: 'global' as const,
  baseUrl: 'https://api.mmx.io',
  output: 'text' as const,
  timeout: 10,
  verbose: false,
  quiet: false,
  noColor: true,
  yes: false,
  dryRun: false,
  nonInteractive: true,
  async: false,
};

const baseFlags = {
  quiet: false,
  verbose: false,
  noColor: true,
  yes: false,
  dryRun: false,
  help: false,
  nonInteractive: true,
  async: false,
};

describe('file upload command', () => {
  it('has correct name', () => {
    expect(uploadCommand.name).toBe('file upload');
  });

  it('requires file argument in non-interactive mode', async () => {
    await expect(
      uploadCommand.execute(baseConfig, baseFlags),
    ).rejects.toThrow('Missing required argument: --file');
  });

  it('throws when file does not exist', async () => {
    await expect(
      uploadCommand.execute(baseConfig, { ...baseFlags, file: '/tmp/nonexistent-file-xxxxx.bin' }),
    ).rejects.toThrow('File not found');
  });

  it('shows dry-run output with file info', async () => {
    let captured = '';
    const origWrite = process.stdout.write;
    process.stdout.write = (chunk: any): any => { captured += String(chunk); return true; };

    await uploadCommand.execute(
      { ...baseConfig, dryRun: true },
      { ...baseFlags, dryRun: true, file: '/dev/null', purpose: 'vision' },
    );

    process.stdout.write = origWrite;
    expect(captured).toContain('/dev/null');
    expect(captured).toContain('vision');
  });
});