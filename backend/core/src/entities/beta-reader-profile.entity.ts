import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('beta_reader_profiles')
export class BetaReaderProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', unique: true })
  userId: string;

  @Column({ name: 'preferred_genres', type: 'text', array: true, default: () => "'{}'" })
  preferredGenres: string[];

  @Column({ name: 'reading_volume', type: 'integer', default: 0 })
  readingVolume: number;

  @Column({ name: 'feedback_style', type: 'text', nullable: true })
  feedbackStyle?: string;

  @Column({ type: 'text', nullable: true })
  bio?: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

