import { describe, it, expect } from 'bun:test';
import {
  T2A_FORMATS,
  MUSIC_FORMATS,
  formatList,
  validateAudioFormat,
  validateT2AStreaming,
} from '../../src/utils/audio-formats';

describe('audio-formats', () => {
  describe('T2A_FORMATS', () => {
    it.each(['mp3', 'pcm', 'flac', 'wav', 'pcmu_raw', 'pcmu_wav', 'opus'] as const)(
      'accepts %s',
      (fmt) => expect(() => validateAudioFormat(fmt, T2A_FORMATS)).not.toThrow(),
    );

    it.each(['aac', 'ogg', 'wma', 'mp4', ''])(
      'rejects %s',
      (fmt) => expect(() => validateAudioFormat(fmt, T2A_FORMATS)).toThrow(/Invalid audio format/),
    );
  });

  describe('MUSIC_FORMATS', () => {
    it.each(['mp3', 'wav', 'pcm', 'flac'] as const)(
      'accepts %s',
      (fmt) => expect(() => validateAudioFormat(fmt, MUSIC_FORMATS)).not.toThrow(),
    );

    it.each(['opus', 'pcmu_raw', 'pcmu_wav', 'aac'])(
      'rejects %s',
      (fmt) => expect(() => validateAudioFormat(fmt, MUSIC_FORMATS)).toThrow(/Invalid audio format/),
    );
  });

  describe('validateT2AStreaming', () => {
    it('rejects wav in streaming mode', () => {
      expect(() => validateT2AStreaming('wav', true)).toThrow(/wav format is not supported in streaming/);
    });

    it('allows wav in non-streaming mode', () => {
      expect(() => validateT2AStreaming('wav', false)).not.toThrow();
    });

    it.each(['mp3', 'pcm', 'flac', 'pcmu_raw', 'pcmu_wav', 'opus'])(
      'allows %s in streaming mode',
      (fmt) => expect(() => validateT2AStreaming(fmt, true)).not.toThrow(),
    );
  });

  describe('formatList', () => {
    it('joins formats with comma-space', () => {
      expect(formatList(['a', 'b', 'c'])).toBe('a, b, c');
    });
  });
});
