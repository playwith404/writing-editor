import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ai_usage')
export class AiUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ length: 50 })
  feature: string;

  @Column({ name: 'tokens_used' })
  tokensUsed: number;

  @Column({ length: 80, nullable: true })
  model?: string | null;

  @Column({ length: 30, nullable: true })
  provider?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
