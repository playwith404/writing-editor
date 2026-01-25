import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('character_stats')
export class CharacterStat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'character_id' })
  characterId: string;

  @Column({ name: 'template_type', length: 50 })
  templateType: string;

  @Column({ type: 'jsonb' })
  stats: Record<string, unknown>;

  @Column({ name: 'episode_num', nullable: true })
  episodeNum?: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
