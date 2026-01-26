import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectAccessService } from '../../common/access/project-access.service';
import { ProjectScopedCrudService } from '../../common/access/project-scoped-crud.service';
import { ProjectMember } from '../../entities';

@Injectable()
export class ProjectMembersService extends ProjectScopedCrudService<ProjectMember> {
  constructor(
    @InjectRepository(ProjectMember)
    repo: Repository<ProjectMember>,
    projectAccessService: ProjectAccessService,
  ) {
    super(repo, projectAccessService);
  }

  override async createForUser(userId: string | undefined, dto: Partial<ProjectMember>): Promise<ProjectMember> {
    const projectId = (dto as any).projectId as string | undefined;
    if (userId && projectId) {
      await this.projectAccessService.assertProjectOwner(userId, projectId);
    }
    return super.createForUser(userId, dto);
  }

  override async updateForUser(userId: string | undefined, id: string, dto: Partial<ProjectMember>) {
    const record = await this.findOne(id);
    if (userId && record) {
      await this.projectAccessService.assertProjectOwner(userId, record.projectId);
    }
    return super.updateForUser(userId, id, dto);
  }

  override async removeForUser(userId: string | undefined, id: string) {
    const record = await this.findOne(id);
    if (userId && record) {
      await this.projectAccessService.assertProjectOwner(userId, record.projectId);
    }
    return super.removeForUser(userId, id);
  }
}
