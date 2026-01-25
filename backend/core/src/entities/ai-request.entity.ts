import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ai_requests')
export class AiRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', nullable: true })
  userId?: string;

  @Column({ name: 'project_id', nullable: true })
  projectId?: string;

  @Column({ length: 50 })
  feature: string;

  @Column({ length: 30, nullable: true })
  provider?: string;

  @Column({ length: 80, nullable: true })
  model?: string;

  @Column({ type: 'text', nullable: true })
  prompt?: string;

  @Column({ name: 'input_tokens', nullable: true })
  inputTokens?: number;

  @Column({ name: 'output_tokens', nullable: true })
  outputTokens?: number;

  @Column({ default: 'pending' })
  status: string;

  @Column({ type: 'jsonb', nullable: true })
  result?: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt?: Date;
}
