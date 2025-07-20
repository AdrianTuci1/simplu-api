import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum TokenOperationType {
  WHATSAPP_CONVERSATION = 'whatsapp_conversation',
  SMS = 'sms',
  EMAIL = 'email',
  ELEVEN_LABS_CALL = 'eleven_labs_call',
  INTERNAL_API_LLM = 'internal_api_llm',
  MONTHLY_FEE = 'monthly_fee',
}

@Entity('business_tokens')
@Index(['tenantId'])
@Index(['tenantId', 'locationId'])
export class BusinessToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column({ nullable: true })
  locationId?: string;

  @Column('int', { default: 0 })
  availableTokens: number;

  @Column('int', { default: 0 })
  totalTokensPurchased: number;

  @Column('int', { default: 0 })
  totalTokensUsed: number;

  @Column('timestamp', { nullable: true })
  lastMonthlyFeeDate?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('token_usage_logs')
@Index(['tenantId', 'createdAt'])
@Index(['tenantId', 'locationId', 'createdAt'])
export class TokenUsageLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column({ nullable: true })
  locationId?: string;

  @Column({ nullable: true })
  userId?: string;

  @Column({ nullable: true })
  sessionId?: string;

  @Column({
    type: 'enum',
    enum: TokenOperationType,
  })
  operationType: TokenOperationType;

  @Column('int')
  tokensUsed: number;

  @Column('text', { nullable: true })
  description?: string;

  @Column('jsonb', { nullable: true })
  metadata?: any;

  @CreateDateColumn()
  createdAt: Date;
} 