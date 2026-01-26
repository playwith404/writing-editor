import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectAccessService } from '../../common/access/project-access.service';
import { ProjectScopedCrudService } from '../../common/access/project-scoped-crud.service';
import { ResearchItem } from '../../entities';
import { AiService } from '../ai/ai.service';

@Injectable()
export class ResearchItemsService extends ProjectScopedCrudService<ResearchItem> {
  constructor(
    @InjectRepository(ResearchItem)
    repo: Repository<ResearchItem>,
    projectAccessService: ProjectAccessService,
    private readonly aiService: AiService,
  ) {
    super(repo, projectAccessService);
  }

  async generateForUser(
    user: { userId: string; role?: string },
    dto: { projectId?: string; query?: string; provider?: string; model?: string },
  ) {
    if (!dto.projectId) {
      throw new BadRequestException('projectId가 필요합니다.');
    }
    if (!dto.query) {
      throw new BadRequestException('query가 필요합니다.');
    }

    await this.projectAccessService.assertProjectAccess(user.userId, dto.projectId);

    const ai = await this.aiService.proxy(user, 'research', '/ai/research', {
      query: dto.query,
      provider: dto.provider,
      model: dto.model,
      projectId: dto.projectId,
    });

    const entity = this.repo.create({
      projectId: dto.projectId,
      query: dto.query,
      result: ai as any,
    } as any);
    return this.repo.save(entity as any);
  }
}
