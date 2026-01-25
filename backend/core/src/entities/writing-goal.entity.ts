import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('writing_goals')
export class WritingGoal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id' })
  projectId: string;

  @Column({ name: 'user_id', nullable: true })
  userId?: string;

  @Column({ name: 'goal_type', length: 20 })
  goalType: string;

  @Column({ name: 'target_words' })
  targetWords: number;

  @Column({ name: 'current_words', default: 0 })
  currentWords: number;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
