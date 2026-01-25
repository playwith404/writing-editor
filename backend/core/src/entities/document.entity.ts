import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id' })
  projectId: string;

  @Column({ name: 'parent_id', nullable: true })
  parentId?: string;

  @Column({ length: 20 })
  type: string;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  content?: string;

  @Column({ name: 'order_index', default: 0 })
  orderIndex: number;

  @Column({ name: 'word_count', default: 0 })
  wordCount: number;

  @Column({ default: 'draft' })
  status: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
