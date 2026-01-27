import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('point_transactions')
export class PointTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'integer' })
  amount: number;

  @Column({ length: 50 })
  reason: string;

  @Column({ name: 'ref_type', length: 50, nullable: true })
  refType?: string;

  @Column({ name: 'ref_id', type: 'uuid', nullable: true })
  refId?: string;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
