import { describe, it, expect } from 'bun:test';
import { maskToken } from '../../src/utils/token';

describe('maskToken', () => {
  it('masks a standard token (show first 4, last 4)', () => {
    expect(maskToken('sk-cp-1234567890abcdef')).toBe('sk-c...cdef');
  });

  it('masks a short token (show first 4, last 4)', () => {
    expect(maskToken('sk-abcd1234')).toBe('sk-a...1234');
  });

  it('uses *** for tokens <= 8 chars', () => {
    expect(maskToken('sk-1234')).toBe('***');
    expect(maskToken('abcdefgh')).toBe('***');
    expect(maskToken('12345678')).toBe('***');
  });

  it('handles 9-char token (first 4 + last 4 > total)', () => {
    expect(maskToken('123456789')).toBe('1234...6789');
  });

  it('handles empty string gracefully', () => {
    expect(maskToken('')).toBe('***');
  });
});
