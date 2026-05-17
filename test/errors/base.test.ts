import { describe, it, expect } from 'bun:test';
import { CLIError, SDKError } from '../../src/errors/base';
import { ExitCode } from '../../src/errors/codes';

describe('CLIError', () => {
  it('sets name, message, and exitCode', () => {
    const err = new CLIError('something went wrong', ExitCode.GENERAL);
    expect(err.name).toBe('CLIError');
    expect(err.message).toBe('something went wrong');
    expect(err.exitCode).toBe(ExitCode.GENERAL);
  });

  it('defaults to ExitCode.GENERAL', () => {
    const err = new CLIError('oops');
    expect(err.exitCode).toBe(1);
    expect(err.hint).toBeUndefined();
  });

  it('accepts optional hint', () => {
    const err = new CLIError('auth failed', ExitCode.AUTH, 'Try mmx auth login');
    expect(err.exitCode).toBe(3);
    expect(err.hint).toBe('Try mmx auth login');
  });

  it('toJSON includes code and message', () => {
    const err = new CLIError('bad input', ExitCode.USAGE);
    const json = err.toJSON();
    expect(json.error.code).toBe(2);
    expect(json.error.message).toBe('bad input');
    expect(json.error.hint).toBeUndefined();
  });

  it('toJSON includes hint when present', () => {
    const err = new CLIError('quota', ExitCode.QUOTA, 'Upgrade your plan');
    const json = err.toJSON();
    expect(json.error.code).toBe(4);
    expect(json.error.hint).toBe('Upgrade your plan');
  });
});

describe('SDKError', () => {
  it('sets name to SDKError', () => {
    const err = new SDKError('sdk failure', ExitCode.USAGE);
    expect(err.name).toBe('SDKError');
    expect(err).toBeInstanceOf(CLIError);
  });

  it('inherits toJSON from CLIError', () => {
    const err = new SDKError('validation', ExitCode.USAGE, 'Check params');
    const json = err.toJSON();
    expect(json.error.code).toBe(2);
    expect(json.error.message).toBe('validation');
    expect(json.error.hint).toBe('Check params');
  });
});
