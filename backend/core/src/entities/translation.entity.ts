import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('translations')
export class Translation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'document_id' })
  documentId: string;

  @Column({ name: 'target_language', length: 10 })
  targetLanguage: string;

  @Column({ length: 30, nullable: true })
  provider?: string;

  @Column({ type: 'text', nullable: true })
  content?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
