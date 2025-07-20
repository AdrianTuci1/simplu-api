import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, OneToMany, BeforeInsert } from 'typeorm';
import { Message } from './message.entity';
import { v4 as uuidv4 } from 'uuid';

@Entity('sessions')
export class Session {
  @PrimaryColumn()
  id: string;

  @Column()
  tenantId: string;

  @Column()
  userId: string;

  @Column({ nullable: true })
  locationId?: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @OneToMany(() => Message, message => message.session)
  messages: Message[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }
} 