import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ProjectAccessService } from '../../common/access/project-access.service';
import { BetaReaderProfile, Project, User } from '../../entities';
import { UpsertBetaReaderProfileDto } from './dto/upsert-beta-reader-profile.dto';

@Injectable()
export class BetaReadersService {
  constructor(
    @InjectRepository(BetaReaderProfile)
    private readonly profilesRepo: Repository<BetaReaderProfile>,
    @InjectRepository(Project)
    private readonly projectsRepo: Repository<Project>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly projectAccessService: ProjectAccessService,
  ) {}

  async getMyProfile(userId: string | undefined) {
    if (!userId) return null;
    return this.profilesRepo.findOne({ where: { userId } as any });
  }

  async upsertMyProfile(userId: string | undefined, dto: UpsertBetaReaderProfileDto) {
    if (!userId) throw new BadRequestException('로그인이 필요합니다.');
    const existing = await this.profilesRepo.findOne({ where: { userId } as any });
    const preferredGenres = Array.isArray(dto.preferredGenres)
      ? dto.preferredGenres.map((g) => String(g).trim()).filter(Boolean).slice(0, 20)
      : undefined;

    if (!existing) {
      const created = this.profilesRepo.create({
        userId,
        preferredGenres: preferredGenres ?? [],
        readingVolume: dto.readingVolume ?? 0,
        feedbackStyle: dto.feedbackStyle,
        bio: dto.bio,
        isActive: dto.isActive ?? true,
      });
      return this.profilesRepo.save(created);
    }

    await this.profilesRepo.update(
      { id: existing.id } as any,
      {
        ...(preferredGenres ? { preferredGenres } : {}),
        ...(dto.readingVolume !== undefined ? { readingVolume: dto.readingVolume } : {}),
        ...(dto.feedbackStyle !== undefined ? { feedbackStyle: dto.feedbackStyle } : {}),
        ...(dto.bio !== undefined ? { bio: dto.bio } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      } as any,
    );

    return this.getMyProfile(userId);
  }

  async recommendForProject(userId: string | undefined, projectId: string) {
    if (!userId) throw new BadRequestException('로그인이 필요합니다.');
    if (!projectId) throw new BadRequestException('projectId가 필요합니다.');

    await this.projectAccessService.assertProjectAccess(userId, projectId);
    const project = await this.projectsRepo.findOne({ where: { id: projectId } as any });
    if (!project) throw new BadRequestException('프로젝트를 찾을 수 없습니다.');

    const genre = (project.genre ?? '').trim();
    const qb = this.profilesRepo.createQueryBuilder('p').where('p.is_active = true');

    if (genre) {
      qb.andWhere(':genre = ANY(p.preferred_genres)', { genre });
    }

    const profiles = await qb.orderBy('p.reading_volume', 'DESC').addOrderBy('p.updated_at', 'DESC').limit(30).getMany();
    if (profiles.length === 0) return [];

    const users = await this.usersRepo.find({
      where: { id: In(profiles.map((p) => p.userId)) } as any,
      select: { id: true, name: true, avatarUrl: true } as any,
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    return profiles.map((p) => ({
      ...p,
      user: userMap.get(p.userId) ?? null,
    }));
  }
}
