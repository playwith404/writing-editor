import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'subscription_id', nullable: true })
  subscriptionId?: string;

  @Column({ length: 20, default: 'manual' })
  provider: string;

  @Column({ type: 'integer', default: 0 })
  amount: number;

  @Column({ length: 10, default: 'KRW' })
  currency: string;

  @Column({ length: 20, default: 'pending' })
  status: string;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt?: Date;
}

