import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { isInteractive, isCI } from '../../src/utils/env';

function withTTY(stdout: boolean, stdin: boolean, fn: () => void): void {
  const origStdout = Object.getOwnPropertyDescriptor(process.stdout, 'isTTY');
  const origStdin = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');
  Object.defineProperty(process.stdout, 'isTTY', { value: stdout, configurable: true });
  Object.defineProperty(process.stdin, 'isTTY', { value: stdin, configurable: true });
  try { fn(); } finally {
    if (origStdout) Object.defineProperty(process.stdout, 'isTTY', origStdout);
    if (origStdin) Object.defineProperty(process.stdin, 'isTTY', origStdin);
  }
}

const SAVE_CI = process.env.CI;

afterEach(() => {
  process.env.CI = SAVE_CI;
});

describe('isInteractive', () => {
  it('returns true when both stdout and stdin are TTYs', () => {
    withTTY(true, true, () => {
      expect(isInteractive()).toBe(true);
    });
  });

  it('returns false when stdout is not a TTY', () => {
    withTTY(false, true, () => {
      expect(isInteractive()).toBe(false);
    });
  });

  it('returns false when stdin is not a TTY', () => {
    withTTY(true, false, () => {
      expect(isInteractive()).toBe(false);
    });
  });

  it('returns false when --non-interactive is set', () => {
    withTTY(true, true, () => {
      expect(isInteractive({ nonInteractive: true })).toBe(false);
    });
  });

  it('returns false in CI even with TTYs', () => {
    process.env.CI = 'true';
    withTTY(true, true, () => {
      expect(isInteractive()).toBe(false);
    });
  });
});

describe('isCI', () => {
  afterEach(() => {
    delete process.env.GITHUB_ACTIONS;
    delete process.env.GITLAB_CI;
    delete process.env.JENKINS_URL;
    delete process.env.TRAVIS;
    delete process.env.CIRCLECI;
  });

  it('returns true when CI env var is set', () => {
    process.env.CI = '1';
    expect(isCI()).toBe(true);
  });

  it('returns true for GitHub Actions', () => {
    process.env.CI = undefined;
    process.env.GITHUB_ACTIONS = 'true';
    expect(isCI()).toBe(true);
  });

  it('returns true for GitLab CI', () => {
    process.env.CI = undefined;
    process.env.GITLAB_CI = 'true';
    expect(isCI()).toBe(true);
  });

  it('returns true for Jenkins', () => {
    process.env.CI = undefined;
    process.env.JENKINS_URL = 'http://jenkins';
    expect(isCI()).toBe(true);
  });

  it('returns false when no CI env vars are set', () => {
    process.env.CI = undefined;
    expect(isCI()).toBe(false);
  });
});
