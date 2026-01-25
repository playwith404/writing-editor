import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Character, Document, Plot, WorldSetting } from '../../entities';

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    @InjectRepository(Character)
    private readonly characterRepo: Repository<Character>,
    @InjectRepository(WorldSetting)
    private readonly worldRepo: Repository<WorldSetting>,
    @InjectRepository(Plot)
    private readonly plotRepo: Repository<Plot>,
  ) {}

  async projectStats(projectId: string) {
    const [documents, characters, worldSettings, plots] = await Promise.all([
      this.documentRepo.count({ where: { projectId } }),
      this.characterRepo.count({ where: { projectId } }),
      this.worldRepo.count({ where: { projectId } }),
      this.plotRepo.count({ where: { projectId } }),
    ]);

    const words = await this.documentRepo
      .createQueryBuilder('d')
      .select('COALESCE(SUM(d.word_count), 0)', 'sum')
      .where('d.project_id = :projectId', { projectId })
      .getRawOne();

    return {
      projectId,
      documents,
      characters,
      worldSettings,
      plots,
      wordCount: Number(words?.sum ?? 0),
    };
  }
}
