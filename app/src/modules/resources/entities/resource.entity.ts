import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('resources')
@Index(['businessLocationId'])
@Index(['resourceType'])
@Index(['startDate'])
@Index(['endDate'])
@Index(['businessLocationId', 'resourceType', 'startDate'])
@Index(['businessLocationId', 'resourceType', 'endDate'])
@Index(['createdAt'])
// Indexuri pentru câmpurile din JSON data
@Index('idx_data_medic_name', { synchronize: false })
@Index('idx_data_patient_name', { synchronize: false })
@Index('idx_data_trainer_name', { synchronize: false })
@Index('idx_data_customer_name', { synchronize: false })
@Index('idx_data_public', { synchronize: false })
export class ResourceEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id: number;

  @Column({ type: 'varchar', length: 255, name: 'business_location_id' })
  businessLocationId: string;

  @Column({ type: 'varchar', length: 100, name: 'resource_type' })
  resourceType: string;

  @Column({ type: 'varchar', length: 255, name: 'resource_id' })
  resourceId: string;

  @Column({ type: 'jsonb', name: 'data' })
  data: Record<string, any>;

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
