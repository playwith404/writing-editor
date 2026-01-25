import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('plot_points')
export class PlotPoint {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'plot_id' })
  plotId: string;

  @Column({ name: 'document_id', nullable: true })
  documentId?: string;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'order_index', default: 0 })
  orderIndex: number;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
