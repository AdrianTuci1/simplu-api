import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('resources')
@Index(['businessId', 'locationId'])
@Index(['resourceType'])
@Index(['startDate'])
@Index(['endDate'])
@Index(['businessId', 'locationId', 'resourceType', 'startDate'])
@Index(['businessId', 'locationId', 'resourceType', 'endDate'])
@Index(['createdAt'])
export class ResourceEntity {
  @PrimaryColumn({ type: 'varchar', length: 255 })
  businessId: string;

  @PrimaryColumn({ type: 'varchar', length: 255 })
  locationId: string;

  @Column({ type: 'varchar', length: 100, name: 'resource_type' })
  resourceType: string;

  @Column({ type: 'varchar', length: 255, name: 'resource_id' })
  resourceId: string;

  @Column({ type: 'date', name: 'start_date' })
  startDate: string;

  @Column({ type: 'date', name: 'end_date' })
  endDate: string;

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'varchar', length: 255, name: 'shard_id', nullable: true })
  shardId?: string;
}
