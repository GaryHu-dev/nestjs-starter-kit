import {
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

/**
 * Base ORM entity.
 *
 * Provides common audit fields shared by all entities.
 */
export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamptz',
  })
  updatedAt!: Date;

  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamptz',
    nullable: true,
  })
  deletedAt!: Date | null;

  /**
   * Optimistic-lock version. TypeORM maintains and checks it only on `.save()`
   * of a previously-loaded entity, making the read-modify-write update paths
   * (users/roles/permissions profile updates) safe compare-and-swap operations
   * rather than silent last-write-wins. Hot counters that must not lose writes
   * under concurrency (failed-login count, token version) instead use atomic
   * `.increment()` / row-locked updates and do not rely on this column.
   */
  @VersionColumn()
  version!: number;
}
