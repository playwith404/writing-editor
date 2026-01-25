import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('characters')
export class Character {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id' })
  projectId: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 50, nullable: true })
  role?: string;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  profile: Record<string, unknown>;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  appearance: Record<string, unknown>;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  personality: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  backstory?: string;

  @Column({ name: 'speech_sample', type: 'text', nullable: true })
  speechSample?: string;

  @Column({ name: 'image_url', nullable: true })
  imageUrl?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
