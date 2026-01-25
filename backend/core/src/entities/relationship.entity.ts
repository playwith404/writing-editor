import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('relationships')
export class Relationship {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id' })
  projectId: string;

  @Column({ name: 'character_a_id' })
  characterAId: string;

  @Column({ name: 'character_b_id' })
  characterBId: string;

  @Column({ name: 'relation_type', length: 50 })
  relationType: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'is_bidirectional', default: false })
  isBidirectional: boolean;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  metadata: Record<string, unknown>;
}
