import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('audio_assets')
export class AudioAsset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'document_id' })
  documentId: string;

  @Column({ length: 100, nullable: true })
  voice?: string;

  @Column({ length: 30, nullable: true })
  provider?: string;

  @Column({ name: 'audio_url', type: 'text', nullable: true })
  audioUrl?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
