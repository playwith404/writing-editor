import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectAccessService } from '../../common/access/project-access.service';
import { BetaSession, BetaSessionParticipant } from '../../entities';

@Injectable()
export class BetaAccessService {
  constructor(
    @InjectRepository(BetaSession)
    private readonly sessionsRepo: Repository<BetaSession>,
    @InjectRepository(BetaSessionParticipant)
    private readonly participantsRepo: Repository<BetaSessionParticipant>,
    private readonly projectAccessService: ProjectAccessService,
  ) {}

  async getSessionOrThrow(sessionId: string): Promise<BetaSession> {
    const session = await this.sessionsRepo.findOne({ where: { id: sessionId } });
    if (!session) {
      throw new BadRequestException('베타 세션을 찾을 수 없습니다.');
    }
    return session;
  }

  async isParticipant(userId: string, sessionId: string): Promise<boolean> {
    return this.participantsRepo.exist({ where: { userId, sessionId, status: 'joined' } as any });
  }

  async getAccess(userId: string, sessionId: string): Promise<{ session: BetaSession; isProjectMember: boolean }> {
    const session = await this.getSessionOrThrow(sessionId);
    const isProjectMember = await this.projectAccessService.hasProjectAccess(userId, session.projectId);
    if (isProjectMember) return { session, isProjectMember: true };

    const ok = await this.isParticipant(userId, sessionId);
    if (!ok) {
      throw new ForbiddenException('베타 세션 접근 권한이 없습니다.');
    }
    return { session, isProjectMember: false };
  }

  async assertManageAccess(userId: string, sessionId: string): Promise<BetaSession> {
    const session = await this.getSessionOrThrow(sessionId);
    await this.projectAccessService.assertProjectAccess(userId, session.projectId);
    return session;
  }
}

