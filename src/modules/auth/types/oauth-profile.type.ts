import { AuthProvider } from '@/shared/enums';

export interface OAuthProfile {
  provider: AuthProvider;
  providerUserId: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}
