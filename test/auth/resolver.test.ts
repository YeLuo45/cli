import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { resolveCredential } from '../../src/auth/resolver';
import type { Config } from '../../src/config/schema';
import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

function makeConfig(overrides: Partial<Config> = {}): Config {
  return {
    region: 'global' as const,
      baseUrl: 'https://api.mmx.io',
    output: 'text',
    timeout: 300,
    verbose: false,
    quiet: false,
    noColor: false,
    yes: false,
    dryRun: false,
    nonInteractive: false,
    async: false,
    ...overrides,
  };
}

describe('resolveCredential', () => {
  const testDir = join(tmpdir(), `mmx-resolver-test-${Date.now()}`);
  const originalConfigDir = process.env.MMX_CONFIG_DIR;

  beforeEach(() => {
    const configDir = join(testDir, '.mmx');
    mkdirSync(configDir, { recursive: true });
    process.env.MMX_CONFIG_DIR = configDir;
  });

  afterEach(() => {
    if (originalConfigDir) process.env.MMX_CONFIG_DIR = originalConfigDir;
    else delete process.env.MMX_CONFIG_DIR;
    delete process.env.MINIMAX_API_KEY;
    rmSync(testDir, { recursive: true, force: true });
  });

  it('resolves from flag (apiKey in config)', async () => {
    const config = makeConfig({ apiKey: 'sk-from-flag' });
    const cred = await resolveCredential(config);
    expect(cred.token).toBe('sk-from-flag');
    expect(cred.method).toBe('api-key');
  });

  it('resolves from config file api key', async () => {
    const config = makeConfig({ fileApiKey: 'sk-from-file' });
    const cred = await resolveCredential(config);
    expect(cred.token).toBe('sk-from-file');
    expect(cred.method).toBe('api-key');
    expect(cred.source).toBe('config.json');
  });

  it('throws when no credentials found', async () => {
    const config = makeConfig();
    await expect(resolveCredential(config)).rejects.toThrow('No credentials found');
  });

  it('prefers flag over file api key', async () => {
    const config = makeConfig({ apiKey: 'sk-flag', fileApiKey: 'sk-file' });
    const cred = await resolveCredential(config);
    expect(cred.token).toBe('sk-flag');
  });
});
