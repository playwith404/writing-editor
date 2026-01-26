import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectAccessService } from '../../common/access/project-access.service';
import { BetaFeedback, BetaSession } from '../../entities';

@Injectable()
export class BetaFeedbackService {
  constructor(
    @InjectRepository(BetaFeedback)
    private readonly feedbackRepo: Repository<BetaFeedback>,
    @InjectRepository(BetaSession)
    private readonly sessionsRepo: Repository<BetaSession>,
    private readonly projectAccessService: ProjectAccessService,
  ) {}

  private async assertSessionAccess(userId: string, sessionId: string): Promise<BetaSession> {
    const session = await this.sessionsRepo.findOne({ where: { id: sessionId } });
    if (!session) {
      throw new BadRequestException('베타 세션을 찾을 수 없습니다.');
    }
    await this.projectAccessService.assertProjectAccess(userId, session.projectId);
    return session;
  }

  async findAllForUser(userId: string, sessionId: string) {
    await this.assertSessionAccess(userId, sessionId);
    return this.feedbackRepo.find({
      where: { sessionId } as any,
      order: { createdAt: 'DESC' } as any,
    });
  }

  async findOneForUser(userId: string, id: string) {
    const feedback = await this.feedbackRepo.findOne({ where: { id } });
    if (!feedback) return null;
    await this.assertSessionAccess(userId, feedback.sessionId);
    return feedback;
  }

  async createForUser(userId: string, dto: Partial<BetaFeedback>) {
    if (!dto.sessionId) {
      throw new BadRequestException('sessionId가 필요합니다.');
    }
    await this.assertSessionAccess(userId, dto.sessionId);
    const entity = this.feedbackRepo.create({ ...dto, userId: dto.userId ?? userId } as any);
    return this.feedbackRepo.save(entity as any);
  }

  async removeForUser(userId: string, id: string) {
    const entity = await this.feedbackRepo.findOne({ where: { id } });
    if (!entity) return;
    await this.assertSessionAccess(userId, entity.sessionId);
    await this.feedbackRepo.delete({ id } as any);
  }
}

