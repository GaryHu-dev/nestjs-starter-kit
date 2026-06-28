import { AuthProvider } from '@/shared/enums';

/**
 * Identity domain model.
 *
 * Represents the authentication credentials for a specific provider.
 * Each user may have multiple identities (one per provider).
 */
export class Identity {
  id!: string;
  userId!: string;
  provider!: AuthProvider;
  providerUserId!: string;
  expiresAt!: Date | null;
  lastLoginAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
}
