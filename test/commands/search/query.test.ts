import { describe, it, expect, afterEach } from 'bun:test';
import { createMockServer, jsonResponse, type MockServer } from '../../helpers/mock-server';
import { default as queryCommand } from '../../../src/commands/search/query';

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

describe('search query command', () => {
  it('has correct name', () => {
    expect(queryCommand.name).toBe('search query');
  });

  it('requires q argument', async () => {
    await expect(
      queryCommand.execute({ ...baseConfig, dryRun: true }, { ...baseFlags, dryRun: true }),
    ).rejects.toThrow('--q is required');
  });
});

describe('search query command with mock server', () => {
  let server: MockServer;

  afterEach(() => {
    server?.close();
  });

  it('searches and displays results', async () => {
    server = createMockServer({
      routes: {
        '/v1/coding_plan/search': () => jsonResponse({
          organic: [
            { title: 'Result 1', link: 'https://example.com/1', snippet: 'Snippet one', date: '2026-01-01' },
            { title: 'Result 2', link: 'https://example.com/2', snippet: 'Snippet two', date: '2026-01-02' },
          ],
        }),
      },
    });

    let captured = '';
    const origLog = console.log;
    console.log = (msg: string) => { captured += msg + '\n'; };

    await queryCommand.execute(
      { ...baseConfig, baseUrl: server.url },
      { ...baseFlags, q: 'test query' },
    );

    console.log = origLog;
    expect(captured).toContain('Result 1');
    expect(captured).toContain('https://example.com/1');
    expect(captured).toContain('Result 2');
  });

  it('handles empty results', async () => {
    server = createMockServer({
      routes: {
        '/v1/coding_plan/search': () => jsonResponse({ organic: [] }),
      },
    });

    let captured = '';
    const origLog = console.log;
    console.log = (msg: string) => { captured += msg + '\n'; };

    await queryCommand.execute(
      { ...baseConfig, baseUrl: server.url },
      { ...baseFlags, q: 'no results' },
    );

    console.log = origLog;
    expect(captured).toContain('No results found');
  });
});