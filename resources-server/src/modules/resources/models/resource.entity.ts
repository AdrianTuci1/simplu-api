import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('resources')
@Index(['businessId', 'locationId'])
@Index(['resourceType'])
@Index(['date'])
@Index(['businessId', 'locationId', 'resourceType', 'date'])
@Index(['createdAt'])
export class ResourceEntity {
  @PrimaryColumn({ type: 'varchar', length: 255 })
  id: string;

  @Column({ type: 'varchar', length: 255, name: 'business_id' })
  businessId: string;

  @Column({ type: 'varchar', length: 255, name: 'location_id' })
  locationId: string;

  @Column({ type: 'varchar', length: 100, name: 'resource_type' })
  resourceType: string;

  @Column({ type: 'varchar', length: 255, name: 'resource_id' })
  resourceId: string;

  @Column({ type: 'jsonb', name: 'data' })
  data: any;

  @Column({ type: 'date', name: 'date' })
  date: string;

  @Column({ type: 'varchar', length: 50, name: 'operation' })
  operation: string;

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'varchar', length: 255, name: 'shard_id', nullable: true })
  shardId?: string;
}
