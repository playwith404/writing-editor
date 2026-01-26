import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Project, ProjectMember } from '../../entities';

type ProjectRole = 'owner' | 'editor' | string;

@Injectable()
export class ProjectAccessService {
  constructor(
    @InjectRepository(Project)
    private readonly projectsRepo: Repository<Project>,
    @InjectRepository(ProjectMember)
    private readonly membersRepo: Repository<ProjectMember>,
  ) {}

  async getAccessibleProjectIds(userId: string): Promise<string[]> {
    const [owned, memberOf] = await Promise.all([
      this.projectsRepo.find({ where: { ownerId: userId }, select: { id: true } }),
      this.membersRepo.find({ where: { userId }, select: { projectId: true } as any }),
    ]);

    const ids = new Set<string>();
    for (const p of owned) ids.add(p.id);
    for (const m of memberOf) ids.add(m.projectId);
    return Array.from(ids);
  }

  async getProjectRole(userId: string, projectId: string): Promise<ProjectRole | null> {
    const project = await this.projectsRepo.findOne({ where: { id: projectId }, select: { ownerId: true } as any });
    if (!project) return null;
    if (project.ownerId === userId) return 'owner';

    const member = await this.membersRepo.findOne({
      where: { projectId, userId },
      select: { role: true } as any,
    });
    return member?.role ?? null;
  }

  async hasProjectAccess(userId: string, projectId: string): Promise<boolean> {
    const role = await this.getProjectRole(userId, projectId);
    return Boolean(role);
  }

  async assertProjectAccess(userId: string, projectId: string): Promise<void> {
    const ok = await this.hasProjectAccess(userId, projectId);
    if (!ok) {
      throw new ForbiddenException('프로젝트 접근 권한이 없습니다.');
    }
  }

  async assertProjectOwner(userId: string, projectId: string): Promise<void> {
    const role = await this.getProjectRole(userId, projectId);
    if (role !== 'owner') {
      throw new ForbiddenException('프로젝트 소유자만 수행할 수 있습니다.');
    }
  }

  async filterAccessibleProjectIds(userId: string, requestedProjectId?: string): Promise<string[]> {
    if (!requestedProjectId) {
      return this.getAccessibleProjectIds(userId);
    }

    await this.assertProjectAccess(userId, requestedProjectId);
    return [requestedProjectId];
  }

  async isMember(userId: string, projectId: string): Promise<boolean> {
    return this.membersRepo.exist({ where: { userId, projectId } });
  }

  async isOwner(userId: string, projectId: string): Promise<boolean> {
    return this.projectsRepo.exist({ where: { id: projectId, ownerId: userId } });
  }

  async findMembers(projectId: string): Promise<ProjectMember[]> {
    return this.membersRepo.find({ where: { projectId } });
  }

  async addMember(projectId: string, userId: string, role = 'editor'): Promise<ProjectMember> {
    const existing = await this.membersRepo.findOne({ where: { projectId, userId } });
    if (existing) return existing;
    const member = this.membersRepo.create({ projectId, userId, role } as any);
    return this.membersRepo.save(member as any);
  }

  async removeMember(projectId: string, userId: string): Promise<void> {
    await this.membersRepo.delete({ projectId, userId } as any);
  }

  async removeMemberById(projectId: string, memberId: string): Promise<void> {
    const member = await this.membersRepo.findOne({ where: { id: memberId } });
    if (!member || member.projectId !== projectId) return;
    await this.membersRepo.delete({ id: memberId } as any);
  }

  async projectsByIds(projectIds: string[]): Promise<Project[]> {
    if (projectIds.length === 0) return [];
    return this.projectsRepo.find({ where: { id: In(projectIds) } });
  }
}

