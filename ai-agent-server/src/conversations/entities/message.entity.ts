import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Session } from './session.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  messageId: string;

  @Column()
  tenantId: string;

  @Column()
  sessionId: string;

  @Column('text')
  content: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @ManyToOne(() => Session, session => session.messages)
  @JoinColumn({ name: 'sessionId' })
  session: Session;

  @CreateDateColumn()
  timestamp: Date;
} 