import { BadRequestException } from '@nestjs/common';
import { In, Repository } from 'typeorm';
import { CrudService } from '../crud/crud.service';
import { ProjectAccessService } from './project-access.service';

export class ProjectScopedCrudService<T extends { id: string; projectId: string }> extends CrudService<T> {
  constructor(
    repo: Repository<T>,
    protected readonly projectAccessService: ProjectAccessService,
  ) {
    super(repo);
  }

  async findAllForUser(userId: string | undefined, projectId?: string): Promise<T[]> {
    if (!userId) return [];
    const projectIds = await this.projectAccessService.filterAccessibleProjectIds(userId, projectId);
    if (projectIds.length === 0) return [];
    return this.repo.find({ where: { projectId: In(projectIds) } as any });
  }

  async findOneForUser(userId: string | undefined, id: string): Promise<T | null> {
    if (!userId) return null;
    const record = await this.findOne(id);
    if (!record) return null;
    await this.projectAccessService.assertProjectAccess(userId, record.projectId);
    return record;
  }

  async createForUser(userId: string | undefined, dto: Partial<T>): Promise<T> {
    if (!userId) {
      throw new BadRequestException('유저 정보가 필요합니다.');
    }
    const projectId = (dto as any).projectId as string | undefined;
    if (!projectId) {
      throw new BadRequestException('projectId가 필요합니다.');
    }
    await this.projectAccessService.assertProjectAccess(userId, projectId);
    return super.create(dto);
  }

  async updateForUser(userId: string | undefined, id: string, dto: Partial<T>): Promise<T | null> {
    if (!userId) return null;
    const record = await this.findOne(id);
    if (!record) return null;
    await this.projectAccessService.assertProjectAccess(userId, record.projectId);
    return super.update(id, dto);
  }

  async removeForUser(userId: string | undefined, id: string): Promise<void> {
    if (!userId) return;
    const record = await this.findOne(id);
    if (!record) return;
    await this.projectAccessService.assertProjectAccess(userId, record.projectId);
    return super.remove(id);
  }
}

