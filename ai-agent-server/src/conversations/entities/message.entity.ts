import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  messageId: string;

  @Column()
  @Index()
  tenantId: string;

  @Column('text')
  content: string;

  @CreateDateColumn()
  timestamp: Date;
} 