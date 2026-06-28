/**
 * Permission domain model.
 */
export class Permission {
  id!: string;
  code!: string;
  name!: string;
  description!: string | null;
  isSystem!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}
