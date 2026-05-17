import { describe, it, expect, beforeEach } from 'bun:test';
import { isInteractive, isCI } from '../../src/utils/env';

function withTTY(stdout: boolean, stdin: boolean, fn: () => void): void {
  const origStdout = Object.getOwnPropertyDescriptor(process.stdout, 'isTTY');
  const origStdin = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');
  Object.defineProperty(process.stdout, 'isTTY', { value: stdout, configurable: true });
  Object.defineProperty(process.stdin, 'isTTY', { value: stdin, configurable: true });
  try { fn(); } finally {
    if (origStdout) {
      Object.defineProperty(process.stdout, 'isTTY', origStdout);
    } else {
      delete (process.stdout as unknown as Record<string, unknown>).isTTY;
    }
    if (origStdin) {
      Object.defineProperty(process.stdin, 'isTTY', origStdin);
    } else {
      delete (process.stdin as unknown as Record<string, unknown>).isTTY;
    }
  }
}

describe('isInteractive', () => {
  // Ensure CI env is clean before each test — other test files may set it
  beforeEach(() => {
    delete process.env.CI;
  });

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
  beforeEach(() => {
    delete process.env.CI;
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
    process.env.GITHUB_ACTIONS = 'true';
    expect(isCI()).toBe(true);
  });

  it('returns true for GitLab CI', () => {
    process.env.GITLAB_CI = 'true';
    expect(isCI()).toBe(true);
  });

  it('returns true for Jenkins', () => {
    process.env.JENKINS_URL = 'http://jenkins';
    expect(isCI()).toBe(true);
  });

  it('returns false when no CI env vars are set', () => {
    expect(isCI()).toBe(false);
  });
});
