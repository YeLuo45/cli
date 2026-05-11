import { describe, it, expect } from 'bun:test';
import { musicGenerateModel, musicCoverModel, isCodingPlan } from '../../../src/commands/music/models';
import type { Config } from '../../../src/config/schema';

describe('music models', () => {
  it('isCodingPlan returns true for sk-cp- key', () => {
    expect(isCodingPlan({ apiKey: 'sk-cp-abc' } as Config)).toBe(true);
  });

  it('isCodingPlan returns false for sk-api- key', () => {
    expect(isCodingPlan({ apiKey: 'sk-api-xyz' } as Config)).toBe(false);
  });

  it('musicGenerateModel uses defaultMusicModel when set', () => {
    const config = { apiKey: 'sk-api-xyz', defaultMusicModel: 'music-2.6' } as Config;
    expect(musicGenerateModel(config)).toBe('music-2.6');
  });

  it('musicGenerateModel falls back to key-type default when no defaultMusicModel', () => {
    const cpConfig = { apiKey: 'sk-cp-abc' } as Config;
    expect(musicGenerateModel(cpConfig)).toBe('music-2.6');

    const apiConfig = { apiKey: 'sk-api-xyz' } as Config;
    expect(musicGenerateModel(apiConfig)).toBe('music-2.6-free');
  });

  it('musicCoverModel ignores defaultMusicModel for non-cover models', () => {
    const config = { apiKey: 'sk-api-xyz', defaultMusicModel: 'music-2.6' } as Config;
    expect(musicCoverModel(config)).toBe('music-cover-free');
  });

  it('musicCoverModel uses key-type default when no defaultMusicModel', () => {
    const cpConfig = { apiKey: 'sk-cp-abc' } as Config;
    expect(musicCoverModel(cpConfig)).toBe('music-cover');

    const apiConfig = { apiKey: 'sk-api-xyz' } as Config;
    expect(musicCoverModel(apiConfig)).toBe('music-cover-free');
  });
});
