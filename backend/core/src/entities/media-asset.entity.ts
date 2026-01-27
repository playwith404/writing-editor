import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('media_assets')
export class MediaAsset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'project_id', nullable: true })
  projectId?: string;

  @Column({ name: 'original_name', type: 'text', nullable: true })
  originalName?: string;

  @Column({ name: 'mime_type', type: 'text' })
  mimeType: string;

  @Column({ type: 'integer' })
  size: number;

  @Column({ name: 'storage_path', type: 'text' })
  storagePath: string;

  @Column({ type: 'text' })
  url: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

