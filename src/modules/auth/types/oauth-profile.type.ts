import { AuthProvider } from '@/shared/enums';

export interface OAuthProfile {
  provider: AuthProvider;
  providerUserId: string;
  email: string;
  /**
   * Whether the provider has verified the user owns `email`. Only a verified
   * provider email may be linked to an existing account — an unverified one
   * cannot be trusted against a pre-existing (possibly victim) account.
   */
  emailVerified: boolean;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}
