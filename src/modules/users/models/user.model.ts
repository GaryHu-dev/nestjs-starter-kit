import { UserStatus } from '@/shared/enums';

/**
 * User domain model.
 *
 * Represents the user profile. Authentication credentials are
 * held separately in the Identity model.
 */
export class User {
  id!: string;
  email!: string;
  firstName!: string;
  lastName!: string;
  displayName!: string | null;
  avatarUrl!: string | null;
  emailVerified!: boolean;
  status!: UserStatus;
  createdAt!: Date;
  updatedAt!: Date;
  deletedAt!: Date | null;
}
