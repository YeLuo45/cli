import { defineCommand } from '../../command';
import { CLIError } from '../../errors/base';
import { ExitCode } from '../../errors/codes';
import { loadCredentials, saveCredentials } from '../../auth/credentials';
import { refreshAccessToken } from '../../auth/refresh';
import { formatOutput, detectOutputFormat } from '../../output/formatter';
import type { Config } from '../../config/schema';
import type { GlobalFlags } from '../../types/flags';
import type { CredentialFile } from '../../auth/types';

export default defineCommand({
  name: 'auth refresh',
  description: 'Manually refresh OAuth token',
  usage: 'mmx auth refresh',
  examples: [
    'mmx auth refresh',
  ],
  async run(config: Config, _flags: GlobalFlags) {
    const creds = await loadCredentials();

    if (!creds) {
      throw new CLIError(
        'Not applicable: not authenticated via OAuth.',
        ExitCode.USAGE,
        'Run mmx auth login first.',
      );
    }

    if (config.dryRun) {
      console.log('Would refresh OAuth token.');
      return;
    }

    const fresh = await refreshAccessToken(creds.refresh_token, creds.region ?? 'global');

    const updated: CredentialFile = {
      access_token: fresh.access_token,
      refresh_token: fresh.refresh_token,
      expires_at: fresh.expires_at,
      region: creds.region,
      resource_url: fresh.resource_url ?? creds.resource_url,
      account: creds.account,
    };

    await saveCredentials(updated);

    const format = detectOutputFormat(config.output);

    if (config.quiet) {
      console.log(updated.expires_at);
      return;
    }

    console.log(formatOutput({
      status: 'Token refreshed',
      expires: updated.expires_at,
    }, format));
  },
});
