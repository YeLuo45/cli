import { defineCommand } from '../../command';
import { CLIError } from '../../errors/base';
import { ExitCode } from '../../errors/codes';
import { pickAuthMethod, runOAuthLogin } from '../../auth/setup';
import { requestJson } from '../../client/http';
import { quotaEndpoint } from '../../client/endpoints';
import { renderQuotaTable } from '../../output/quota-table';

import { getConfigPath } from '../../config/paths';
import { readConfigFile, writeConfigFile } from '../../config/loader';
import { isInteractive } from '../../utils/env';
import { maskToken } from '../../utils/token';
import type { Config, Region } from '../../config/schema';
import { REGIONS } from '../../config/schema';
import type { GlobalFlags } from '../../types/flags';
import type { QuotaResponse, QuotaModelRemain } from '../../types/api';

interface QuotaApiResponse {
  model_remains: QuotaModelRemain[];
}

async function showQuotaAfterLogin(config: Config): Promise<void> {
  try {
    const url = quotaEndpoint(config.baseUrl);
    const response = await requestJson<QuotaApiResponse>(config, { url });
    renderQuotaTable(response.model_remains || [], config);
  } catch {
    // Non-fatal — login succeeded, quota display is best-effort
  }
}

/**
 * Mirrors the `mmx` (no-args) dashboard: prints the help panel
 * followed by the quota snapshot. Used right after a successful
 * login so the user lands somewhere useful instead of an empty prompt.
 */
async function showDashboardAfterLogin(config: Config): Promise<void> {
  const { registry } = await import('../../registry');
  registry.printHelp([], process.stderr, config.region);
  await showQuotaAfterLogin(config);
}

export default defineCommand({
  name: 'auth login',
  description: 'Authenticate via OAuth or API key',
  usage: 'mmx auth login [--api-key <key>] [--region global|cn]',
  options: [
    { flag: '--api-key <key>', description: 'Skip the menu and save this API key directly' },
  ],
  examples: [
    'mmx auth login',
    'mmx auth login --api-key sk-cp-xxxxx',
    'mmx auth login --region cn',
  ],
  async run(config: Config, flags: GlobalFlags) {
    const envKey = process.env.MINIMAX_API_KEY;
    if (envKey && !flags.apiKey) {
      const masked = maskToken(envKey);
      if (isInteractive({ nonInteractive: config.nonInteractive })) {
        const { confirm, isCancel } = await import('@clack/prompts');
        const proceed = await confirm({
          message: `MINIMAX_API_KEY is set (${masked}). Configure persistent credentials anyway?`,
          initialValue: false,
        });
        if (isCancel(proceed) || !proceed) {
          process.stdout.write('Login skipped. Using environment variable.\n');
          process.exit(0);
        }
      } else {
        process.stderr.write(`Warning: MINIMAX_API_KEY is already set in environment.\n`);
      }
    }

    if (flags.apiKey) {
      await loginWithApiKey(config, flags.apiKey as string);
      return;
    }

    if (config.dryRun) {
      console.log('Would prompt for auth method (oauth-global, oauth-cn, api-key).');
      return;
    }

    if (!isInteractive({ nonInteractive: config.nonInteractive })) {
      throw new CLIError(
        '--api-key is required in non-interactive mode.',
        ExitCode.USAGE,
        'mmx auth login --api-key sk-xxxxx',
      );
    }

    const choice = await pickAuthMethod();
    if (choice === 'api-key') {
      const { text, isCancel } = await import('@clack/prompts');
      const key = await text({
        message: 'Paste your MiniMax API key:',
        validate: (v) => (v && v.length > 0 ? undefined : 'API key cannot be empty.'),
      });
      if (isCancel(key)) throw new CLIError('Authentication cancelled.', ExitCode.AUTH);
      await loginWithApiKey(config, key as string);
      return;
    }

    const region: Region = (flags.region as Region) || (choice === 'oauth-cn' ? 'cn' : 'global');
    await runOAuthLogin(region);

    // Reload config so the OAuth subobject (and its resource_url) are picked up.
    const fresh = readConfigFile();
    const cfg: Config = {
      ...config,
      region,
      baseUrl: fresh.oauth?.resource_url || REGIONS[region],
    };
    await showDashboardAfterLogin(cfg);
  },
});

async function loginWithApiKey(config: Config, key: string): Promise<void> {
  if (config.dryRun) {
    console.log('Would validate and save API key.');
    return;
  }

  process.stderr.write('Testing key... ');
  try {
    const test = { ...config, apiKey: key };
    await requestJson<QuotaResponse>(test, { url: quotaEndpoint(test.baseUrl) });
    process.stderr.write('Valid\n');
  } catch {
    throw new CLIError(
      'API key validation failed.',
      ExitCode.AUTH,
      'Check that your key is valid and belongs to a Token Plan.',
    );
  }

  const existing = readConfigFile() as Record<string, unknown>;
  existing.api_key = key;
  await writeConfigFile(existing);
  process.stderr.write(`API key saved to ${getConfigPath()}\n`);

  await showDashboardAfterLogin({ ...config, apiKey: key });
}
