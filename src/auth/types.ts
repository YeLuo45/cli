export type AuthMethod = 'api-key' | 'oauth';

export type { OAuthCredentials as CredentialFile } from '../config/schema';

export interface ResolvedCredential {
  token: string;
  method: AuthMethod;
  source: string;
}
