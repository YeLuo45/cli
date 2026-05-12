import { readConfigFile, writeConfigFile } from '../config/loader';
import type { CredentialFile } from './types';

/**
 * OAuth credentials live inside the user's main config file
 * (`~/.mmx/config.json`) under the `oauth` subobject. This keeps a
 * single source of truth for all CLI state.
 */

export async function loadCredentials(): Promise<CredentialFile | null> {
  const cfg = readConfigFile();
  return cfg.oauth ?? null;
}

export async function saveCredentials(creds: CredentialFile): Promise<void> {
  const existing = readConfigFile() as Record<string, unknown>;
  existing.oauth = creds;
  await writeConfigFile(existing);
}

export async function clearCredentials(): Promise<void> {
  const existing = readConfigFile() as Record<string, unknown>;
  if (!('oauth' in existing)) return;
  delete existing.oauth;
  await writeConfigFile(existing);
}
