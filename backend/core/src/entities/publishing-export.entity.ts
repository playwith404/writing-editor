import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('publishing_exports')
export class PublishingExport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id' })
  projectId: string;

  @Column({ name: 'document_id', nullable: true })
  documentId?: string | null;

  @Column({ name: 'export_format', length: 20 })
  exportFormat: string;

  @Column({ default: 'queued' })
  status: string;

  @Column({ name: 'file_url', type: 'text', nullable: true })
  fileUrl?: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt?: Date | null;
}
