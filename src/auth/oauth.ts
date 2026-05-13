import type { OAuthCredentials, Region } from '../config/schema';
import { OAUTH_HOSTS } from '../config/schema';
import { CLIError } from '../errors/base';
import { ExitCode } from '../errors/codes';

const CLIENT_ID = '659cf4c1-615c-45f6-a5f6-4bf15eb476e5';
const CLIENT_NAME = 'MiniMax CLI';
const SCOPES = ['openid', 'profile', 'coding_plan'];

interface DeviceCodeResponse {
  base_resp?: { status_code: number; status_msg?: string };
  user_code: string;
  verification_uri: string;
  expired_in: number;   // absolute Unix ms (server's name; unfortunate)
  interval: number;     // poll interval in ms
  state: string;
}

interface TokenResponse {
  base_resp?: { status_code: number; status_msg?: string };
  status: 'pending' | 'success' | string;
  access_token?: string;
  refresh_token?: string;
  expired_in?: number;  // absolute Unix ms
  resource_url?: string;
}

/**
 * Run the OAuth 2.0 Device Authorization Grant against the MiniMax
 * account server for the given region (RFC 8628 + PKCE).
 *
 * Opens the user's browser to the verification URL, displays the
 * user code, and polls /oauth2/token until the user approves.
 */
export async function deviceCodeLogin(region: Region): Promise<OAuthCredentials> {
  const host = OAUTH_HOSTS[region];

  const { randomBytes, createHash } = await import('crypto');
  const codeVerifier = randomBytes(32).toString('base64url');
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
  const state = randomBytes(16).toString('base64url');

  const codeRes = await fetch(`${host}/oauth2/device/code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      scope: SCOPES.join(' '),
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state,
    }),
  });

  if (!codeRes.ok) {
    const body = await codeRes.text().catch(() => '');
    throw new CLIError(
      `Failed to start device-code flow (HTTP ${codeRes.status}).`,
      ExitCode.AUTH,
      body || `URL: ${host}/oauth2/device/code`,
    );
  }

  const data = (await codeRes.json()) as DeviceCodeResponse;
  if (data.state !== state) {
    throw new CLIError('OAuth state mismatch.', ExitCode.AUTH);
  }

  openBrowser(data.verification_uri);
  process.stderr.write(`\nOpened: ${data.verification_uri}\n`);
  process.stderr.write(`Code:   ${data.user_code}\n`);
  process.stderr.write(`Client: ${CLIENT_NAME}\n`);
  process.stderr.write('Waiting for authorization...\n');

  const deadline = data.expired_in;
  const intervalMs = data.interval || 3000;

  while (Date.now() < deadline) {
    await sleep(intervalMs);

    const tokRes = await fetch(`${host}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        client_id: CLIENT_ID,
        user_code: data.user_code,
        code_verifier: codeVerifier,
      }),
    });

    if (!tokRes.ok) {
      throw new CLIError(
        `Device-code authorization failed (HTTP ${tokRes.status}).`,
        ExitCode.AUTH,
      );
    }

    const tok = (await tokRes.json()) as TokenResponse;
    if (tok.status === 'pending') continue;
    if (tok.status === 'success' && tok.access_token) {
      return {
        access_token: tok.access_token,
        refresh_token: tok.refresh_token ?? '',
        expires_at: new Date(tok.expired_in ?? Date.now()).toISOString(),
        region,
        resource_url: tok.resource_url,
      };
    }
    throw new CLIError(`Device-code authorization failed: ${tok.status}`, ExitCode.AUTH);
  }

  throw new CLIError('Device-code authorization timed out.', ExitCode.TIMEOUT);
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Open `url` in the user's default browser without going through a shell.
 * Using execFile/spawn (not exec) avoids shell-injection via crafted URLs (#79).
 */
function openBrowser(url: string): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { execFile, spawn } = require('child_process') as typeof import('child_process');
  if (process.platform === 'darwin') {
    execFile('open', [url]);
  } else if (process.platform === 'win32') {
    spawn('cmd.exe', ['/c', 'start', '', url], { shell: false, detached: true });
  } else {
    execFile('xdg-open', [url]);
  }
}
