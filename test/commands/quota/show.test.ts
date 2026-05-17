import { describe, it, expect } from 'bun:test';
import { default as showCommand } from '../../../src/commands/quota/show';

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

describe('quota show command', () => {
  it('has correct name', () => {
    expect(showCommand.name).toBe('quota show');
  });

  it('handles dry run', async () => {
    let captured = '';
    const origLog = console.log;
    console.log = (msg: string) => { captured += msg; };
    try {
      await showCommand.execute(
        { ...baseConfig, dryRun: true },
        { ...baseFlags, dryRun: true },
      );
      expect(captured).toContain('Would fetch quota');
    } finally {
      console.log = origLog;
    }
  });

});
