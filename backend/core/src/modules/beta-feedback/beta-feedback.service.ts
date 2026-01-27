import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BetaAccessService } from '../beta-access/beta-access.service';
import { PointsService } from '../points/points.service';
import { BetaFeedback } from '../../entities';
import { CreateBetaFeedbackDto } from './dto/create-beta-feedback.dto';

@Injectable()
export class BetaFeedbackService {
  constructor(
    @InjectRepository(BetaFeedback)
    private readonly feedbackRepo: Repository<BetaFeedback>,
    private readonly betaAccessService: BetaAccessService,
    private readonly pointsService: PointsService,
  ) {}

  private maskAnonymous(feedback: BetaFeedback, viewerUserId: string, isProjectMember: boolean) {
    const base: any = { ...feedback };
    base.anonymous = Boolean(feedback.isAnonymous);
    if (isProjectMember && feedback.isAnonymous && feedback.userId && feedback.userId !== viewerUserId) {
      base.userId = undefined;
    }
    return base;
  }

  async findAllForUser(userId: string | undefined, sessionId: string) {
    if (!sessionId) return [];
    if (!userId) return [];

    const { isProjectMember } = await this.betaAccessService.getAccess(userId, sessionId);
    const where = isProjectMember ? ({ sessionId } as any) : ({ sessionId, userId } as any);
    const rows = await this.feedbackRepo.find({ where, order: { createdAt: 'DESC' } as any });
    return rows.map((f) => this.maskAnonymous(f, userId, isProjectMember));
  }

  async findOneForUser(userId: string | undefined, id: string) {
    if (!userId) return null;
    const feedback = await this.feedbackRepo.findOne({ where: { id } });
    if (!feedback) return null;

    const { isProjectMember } = await this.betaAccessService.getAccess(userId, feedback.sessionId);
    if (!isProjectMember && feedback.userId !== userId) {
      throw new ForbiddenException('권한이 없습니다.');
    }
    return this.maskAnonymous(feedback, userId, isProjectMember);
  }

  async createForUser(userId: string | undefined, dto: CreateBetaFeedbackDto) {
    if (!userId) throw new BadRequestException('로그인이 필요합니다.');
    if (!dto.sessionId) throw new BadRequestException('sessionId가 필요합니다.');

    const { isProjectMember } = await this.betaAccessService.getAccess(userId, dto.sessionId);

    const entity = await this.feedbackRepo.save(
      this.feedbackRepo.create({
        sessionId: dto.sessionId,
        userId,
        rating: dto.rating,
        immersionRating: dto.immersionRating,
        pacingRating: dto.pacingRating,
        characterRating: dto.characterRating,
        isAnonymous: Boolean(dto.isAnonymous),
        comment: dto.comment,
      }),
    );

    if (!isProjectMember) {
      await this.pointsService.addPoints({
        userId,
        amount: 10,
        reason: 'beta_feedback',
        refType: 'beta_session',
        refId: dto.sessionId,
      });
    }

    return this.maskAnonymous(entity, userId, isProjectMember);
  }

  async removeForUser(userId: string | undefined, id: string) {
    if (!userId) return;
    const feedback = await this.feedbackRepo.findOne({ where: { id } });
    if (!feedback) return;

    const { isProjectMember } = await this.betaAccessService.getAccess(userId, feedback.sessionId);
    if (!isProjectMember && feedback.userId !== userId) {
      throw new ForbiddenException('권한이 없습니다.');
    }

    await this.feedbackRepo.delete({ id } as any);
  }
}
