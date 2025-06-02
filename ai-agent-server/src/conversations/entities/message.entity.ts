import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { Session } from './session.entity';

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

  @ManyToOne(() => Session, session => session.messages)
  @JoinColumn({ name: 'sessionId' })
  session: Session;

  @Column()
  sessionId: string;

  @CreateDateColumn()
  timestamp: Date;
} 