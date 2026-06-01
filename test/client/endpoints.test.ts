import { describe, it, expect } from 'bun:test';
import { quotaEndpoint } from '../../src/client/endpoints';

describe('quotaEndpoint', () => {
  it('uses coding_plan/remains for global', () => {
    expect(quotaEndpoint('https://api.minimax.io')).toBe('https://api.minimax.io/v1/api/openplatform/coding_plan/remains');
  });

  it('uses coding_plan/remains for cn', () => {
    expect(quotaEndpoint('https://api.minimaxi.com')).toBe('https://api.minimaxi.com/v1/api/openplatform/coding_plan/remains');
  });
});
