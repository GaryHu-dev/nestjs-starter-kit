/**
 * Role domain model.
 */
export class Role {
  id!: string;
  code!: string;
  name!: string;
  description!: string | null;
  isSystem!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}
