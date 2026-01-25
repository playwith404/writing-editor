import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('world_settings')
export class WorldSetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id' })
  projectId: string;

  @Column({ name: 'parent_id', nullable: true })
  parentId?: string;

  @Column({ length: 50 })
  category: string;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  content?: string;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
