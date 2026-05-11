import { CLIError } from '../errors/base';
import { ExitCode } from '../errors/codes';

export const T2A_FORMATS = ['mp3', 'pcm', 'flac', 'wav', 'pcmu_raw', 'pcmu_wav', 'opus'] as const;
export const MUSIC_FORMATS = ['mp3', 'wav', 'pcm', 'flac'] as const;

export type T2AFormat = (typeof T2A_FORMATS)[number];
export type MusicFormat = (typeof MUSIC_FORMATS)[number];

export function formatList(formats: readonly string[]): string {
  return formats.join(', ');
}

export function validateAudioFormat(format: string, formats: readonly string[]): void {
  if (!(formats as readonly string[]).includes(format)) {
    throw new CLIError(
      `Invalid audio format "${format}". Supported: ${formatList(formats)}`,
      ExitCode.USAGE,
    );
  }
}

export function validateT2AStreaming(format: string, stream: boolean): void {
  if (stream && format === 'wav') {
    throw new CLIError(
      'wav format is not supported in streaming mode.',
      ExitCode.USAGE,
      'Use mp3, pcm, flac, pcmu_raw, pcmu_wav, or opus for streaming.',
    );
  }
}
