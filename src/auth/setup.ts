import type { Config, Region } from '../config/schema';
import { readConfigFile, writeConfigFile } from '../config/loader';
import { promptText, promptConfirm } from '../utils/prompt';
import { isInteractive } from '../utils/env';
import { maskToken } from '../utils/token';
import { CLIError } from '../errors/base';
import { ExitCode } from '../errors/codes';
import { deviceCodeLogin } from './oauth';
import { saveCredentials, loadCredentials } from './credentials';

interface AuthChoice {
  value: 'oauth-global' | 'oauth-cn' | 'api-key';
  label: string;
  hint: string;
}

const AUTH_CHOICES: AuthChoice[] = [
  { value: 'oauth-global', label: 'MiniMax',   hint: 'OAuth login (Global)' },
  { value: 'oauth-cn',     label: 'MiniMaxCN', hint: 'OAuth login (China)' },
  { value: 'api-key',      label: 'API key',   hint: 'Paste sk-cp-... or sk-...' },
];

export async function ensureAuth(config: Config): Promise<void> {
  if (config.apiKey || config.fileApiKey) return;
  if (await loadCredentials()) return;

  const envKey = process.env.MINIMAX_API_KEY;
  if (envKey) {
    if (!isInteractive({ nonInteractive: config.nonInteractive })) {
      return; // env key is enough; no prompt
    }
    const save = await promptConfirm({
      message: `Found MINIMAX_API_KEY in environment (${maskToken(envKey)}). Save to config file?`,
    });
    if (save) {
      await persistApiKey(config, envKey);
    }
    return;
  }

  if (!isInteractive({ nonInteractive: config.nonInteractive })) {
    throw new CLIError(
      'No credentials found.',
      ExitCode.AUTH,
      'Log in:        mmx auth login\nPass directly:  --api-key sk-xxxxx',
    );
  }

  const choice = await pickAuthMethod();
  if (choice === 'api-key') {
    const input = await promptText({ message: 'Enter your MiniMax API key:' });
    if (!input) throw new CLIError('API key is required.', ExitCode.AUTH);
    await persistApiKey(config, input);
    return;
  }

  await runOAuthLogin(choice === 'oauth-cn' ? 'cn' : 'global');
}

export async function pickAuthMethod(): Promise<AuthChoice['value']> {
  const { select, isCancel } = await import('@clack/prompts');
  const value = await select({
    message: 'How would you like to authenticate?',
    options: AUTH_CHOICES.map(c => ({ value: c.value, label: `${c.label}  ·  ${c.hint}` })),
  });
  if (isCancel(value)) throw new CLIError('Authentication cancelled.', ExitCode.AUTH);
  return value as AuthChoice['value'];
}

export async function runOAuthLogin(region: Region): Promise<void> {
  const creds = await deviceCodeLogin(region);
  await saveCredentials(creds);
  process.stderr.write('Logged in successfully.\n');
  process.stderr.write('Credentials saved to ~/.mmx/config.json\n');
}

async function persistApiKey(config: Config, key: string): Promise<void> {
  const data = { ...(readConfigFile() as Record<string, unknown>), api_key: key };
  await writeConfigFile(data);
  config.fileApiKey = key;
  process.stderr.write(`API key saved to ${config.configPath ?? '~/.mmx/config.json'}\n`);
}

// Legacy alias kept so main.ts keeps working without churn.
export const ensureApiKey = ensureAuth;
