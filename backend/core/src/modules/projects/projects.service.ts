import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrudService } from '../../common/crud/crud.service';
import { Project, ProjectMember } from '../../entities';
import { SearchService } from '../search/search.service';

@Injectable()
export class ProjectsService extends CrudService<Project> {
  constructor(
    @InjectRepository(Project)
    repo: Repository<Project>,
    @InjectRepository(ProjectMember)
    private readonly membersRepo: Repository<ProjectMember>,
    private readonly searchService: SearchService,
  ) {
    super(repo);
  }

  async findAllForUser(userId: string): Promise<Project[]> {
    return this.repo
      .createQueryBuilder('p')
      .leftJoin(ProjectMember, 'pm', 'pm.project_id = p.id AND pm.user_id = :userId', { userId })
      .where('p.owner_id = :userId OR pm.id IS NOT NULL', { userId })
      .andWhere('p.deleted_at IS NULL')
      .orderBy('p.created_at', 'DESC')
      .getMany();
  }

  async findOneForUser(userId: string, projectId: string): Promise<Project | null> {
    const project = await this.repo.findOne({ where: { id: projectId } });
    if (!project || project.deletedAt) return null;

    if (project.ownerId === userId) return project;
    const isMember = await this.membersRepo.exist({ where: { projectId, userId } });
    return isMember ? project : null;
  }

  async assertAccess(userId: string, projectId: string): Promise<void> {
    const project = await this.findOneForUser(userId, projectId);
    if (!project) {
      throw new ForbiddenException('프로젝트 접근 권한이 없습니다.');
    }
  }

  async assertOwner(userId: string, projectId: string): Promise<void> {
    const project = await this.repo.findOne({ where: { id: projectId } });
    if (!project || project.deletedAt || project.ownerId !== userId) {
      throw new ForbiddenException('프로젝트 소유자만 수행할 수 있습니다.');
    }
  }

  override async create(dto: Partial<Project>): Promise<Project> {
    const project = await super.create(dto);
    await this.searchService.indexDocument('projects', project.id, {
      id: project.id,
      title: project.title,
      description: project.description,
      genre: project.genre,
      ownerId: project.ownerId,
    });
    return project;
  }

  override async update(id: string, dto: Partial<Project>): Promise<Project | null> {
    const project = await super.update(id, dto);
    if (project) {
      await this.searchService.indexDocument('projects', project.id, {
        id: project.id,
        title: project.title,
        description: project.description,
        genre: project.genre,
        ownerId: project.ownerId,
      });
    }
    return project;
  }

  async updateForUser(userId: string, id: string, dto: Partial<Project>): Promise<Project | null> {
    await this.assertAccess(userId, id);
    return this.update(id, dto);
  }

  async removeForUser(userId: string, id: string): Promise<void> {
    await this.assertOwner(userId, id);
    await this.repo.softDelete({ id } as any);
  }
}
