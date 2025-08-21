import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('resources')
@Index(['businessId', 'locationId'])
@Index(['resourceType'])
@Index(['startDate'])
@Index(['endDate'])
@Index(['businessId', 'locationId', 'resourceType', 'startDate'])
@Index(['businessId', 'locationId', 'resourceType', 'endDate'])
@Index(['createdAt'])
export class ResourceEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id: number;

  @Column({ type: 'varchar', length: 255, name: 'business_id' })
  businessId: string;

  @Column({ type: 'varchar', length: 255, name: 'location_id' })
  locationId: string;

  @Column({ type: 'varchar', length: 100, name: 'resource_type' })
  resourceType: string;

  @Column({ type: 'varchar', length: 255, name: 'resource_id' })
  resourceId: string;

  @Column({ type: 'jsonb', name: 'data' })
  data: Record<string, any>;

  @Column({ type: 'date', name: 'start_date', nullable: true })
  startDate: string | null;

  @Column({ type: 'date', name: 'end_date', nullable: true })
  endDate: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'varchar', length: 255, name: 'shard_id', nullable: true })
  shardId?: string;
}
