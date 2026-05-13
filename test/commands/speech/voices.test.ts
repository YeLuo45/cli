import { describe, it, expect, afterEach } from 'bun:test';
import { createMockServer, jsonResponse, type MockServer } from '../../helpers/mock-server';
import { default as voicesCommand } from '../../../src/commands/speech/voices';
import { filterByLanguage } from '../../../src/commands/speech/voices';
import type { SystemVoiceInfo } from '../../../src/types/api';

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

const MOCK_VOICES: SystemVoiceInfo[] = [
  { voice_id: 'English_Narrator', voice_name: 'Narrator', description: ['Clear narration voice'] },
  { voice_id: 'English_Female', voice_name: 'Female', description: ['Warm female voice'] },
  { voice_id: 'Korean_Female', voice_name: 'Korean Female', description: ['Natural Korean'] },
  { voice_id: 'Japanese (Kansai)_Male', voice_name: 'Kansai Male', description: ['Kansai dialect'] },
  { voice_id: 'Chinese_Mandarin_Female', voice_name: 'Mandarin Female', description: ['Standard Mandarin'] },
];

describe('speech voices command', () => {
  it('has correct name', () => {
    expect(voicesCommand.name).toBe('speech voices');
  });

  it('has --language option', () => {
    const flags = voicesCommand.options?.map(o => o.flag) ?? [];
    expect(flags.some(f => f.startsWith('--language'))).toBe(true);
  });

  it('has examples', () => {
    expect(voicesCommand.examples?.length).toBeGreaterThan(0);
  });

  it('dry-run prints expected request', async () => {
    let captured = '';
    const origLog = console.log;
    console.log = (msg: string) => { captured += msg; };

    await voicesCommand.execute(
      { ...baseConfig, dryRun: true, output: 'json' as const },
      { ...baseFlags, dryRun: true },
    );

    console.log = origLog;
    const parsed = JSON.parse(captured);
    expect(parsed.request.voice_type).toBe('system');
  });
});

describe('speech voices command with mock server', () => {
  let server: MockServer;

  afterEach(() => {
    server?.close();
  });

  it('lists all voices', async () => {
    server = createMockServer({
      routes: {
        '/v1/get_voice': () => jsonResponse({
          system_voice: MOCK_VOICES,
          base_resp: { status_code: 0, status_msg: 'ok' },
        }),
      },
    });

    let captured = '';
    const origLog = console.log;
    console.log = (msg: string) => { captured += msg; };

    await voicesCommand.execute(
      { ...baseConfig, baseUrl: server.url, output: 'text' as const },
      baseFlags,
    );

    console.log = origLog;
    expect(captured).toContain('English_Narrator');
    expect(captured).toContain('Korean_Female');
    expect(captured).toContain('Chinese_Mandarin_Female');
  });

  it('filters voices by language', async () => {
    server = createMockServer({
      routes: {
        '/v1/get_voice': () => jsonResponse({
          system_voice: MOCK_VOICES,
          base_resp: { status_code: 0, status_msg: 'ok' },
        }),
      },
    });

    let captured = '';
    const origLog = console.log;
    console.log = (msg: string) => { captured += msg; };

    await voicesCommand.execute(
      { ...baseConfig, baseUrl: server.url, output: 'text' as const },
      { ...baseFlags, language: 'english' },
    );

    console.log = origLog;
    expect(captured).toContain('English_Narrator');
    expect(captured).toContain('English_Female');
    expect(captured).not.toContain('Korean');
    expect(captured).not.toContain('Japanese');
  });

  it('filters voices by dialect language', async () => {
    server = createMockServer({
      routes: {
        '/v1/get_voice': () => jsonResponse({
          system_voice: MOCK_VOICES,
          base_resp: { status_code: 0, status_msg: 'ok' },
        }),
      },
    });

    let captured = '';
    const origLog = console.log;
    console.log = (msg: string) => { captured += msg; };

    await voicesCommand.execute(
      { ...baseConfig, baseUrl: server.url, output: 'text' as const },
      { ...baseFlags, language: 'japanese' },
    );

    console.log = origLog;
    expect(captured).toContain('Japanese (Kansai)_Male');
    expect(captured).not.toContain('English');
    expect(captured).not.toContain('Korean');
  });

  it('returns JSON output when configured', async () => {
    server = createMockServer({
      routes: {
        '/v1/get_voice': () => jsonResponse({
          system_voice: MOCK_VOICES,
          base_resp: { status_code: 0, status_msg: 'ok' },
        }),
      },
    });

    let captured = '';
    const origLog = console.log;
    console.log = (msg: string) => { captured += msg; };

    await voicesCommand.execute(
      { ...baseConfig, baseUrl: server.url, output: 'json' as const },
      baseFlags,
    );

    console.log = origLog;
    const parsed = JSON.parse(captured);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toContain('English_Narrator');
  });

  it('JSON output with language filter returns filtered array', async () => {
    server = createMockServer({
      routes: {
        '/v1/get_voice': () => jsonResponse({
          system_voice: MOCK_VOICES,
          base_resp: { status_code: 0, status_msg: 'ok' },
        }),
      },
    });

    let captured = '';
    const origLog = console.log;
    console.log = (msg: string) => { captured += msg; };

    await voicesCommand.execute(
      { ...baseConfig, baseUrl: server.url, output: 'json' as const },
      { ...baseFlags, language: 'korean' },
    );

    console.log = origLog;
    const parsed = JSON.parse(captured);
    expect(parsed.length).toBe(1);
    expect(parsed[0].voice_id).toBe('Korean_Female');
  });
});

describe('filterByLanguage', () => {
  it('matches exact language prefix', () => {
    const result = filterByLanguage(MOCK_VOICES, 'english');
    expect(result.length).toBe(2);
  });

  it('matches dialect language', () => {
    const result = filterByLanguage(MOCK_VOICES, 'japanese');
    expect(result.length).toBe(1);
    expect(result[0].voice_id).toBe('Japanese (Kansai)_Male');
  });

  it('returns empty for unmatched language', () => {
    const result = filterByLanguage(MOCK_VOICES, 'french');
    expect(result.length).toBe(0);
  });

  it('is case-insensitive', () => {
    const result = filterByLanguage(MOCK_VOICES, 'ENGLISH');
    expect(result.length).toBe(2);
  });

  it('matches multi-word language', () => {
    const result = filterByLanguage(MOCK_VOICES, 'chinese');
    expect(result.length).toBe(1);
    expect(result[0].voice_id).toBe('Chinese_Mandarin_Female');
  });
});
