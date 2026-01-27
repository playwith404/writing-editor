import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PointTransaction } from '../../entities';

@Injectable()
export class PointsService {
  constructor(
    @InjectRepository(PointTransaction)
    private readonly pointsRepo: Repository<PointTransaction>,
  ) {}

  async addPoints(params: {
    userId: string;
    amount: number;
    reason: string;
    refType?: string;
    refId?: string;
    metadata?: Record<string, unknown>;
  }) {
    if (!params.userId) return;
    if (!Number.isFinite(params.amount) || params.amount === 0) return;
    await this.pointsRepo.save(
      this.pointsRepo.create({
        userId: params.userId,
        amount: Math.trunc(params.amount),
        reason: params.reason,
        refType: params.refType,
        refId: params.refId,
        metadata: params.metadata ?? {},
      }),
    );
  }

  async balance(userId: string | undefined) {
    if (!userId) throw new ForbiddenException('로그인이 필요합니다.');
    const row = await this.pointsRepo
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.amount), 0)', 'sum')
      .where('p.user_id = :userId', { userId })
      .getRawOne();
    return { balance: Number(row?.sum ?? 0) };
  }

  async transactions(userId: string | undefined) {
    if (!userId) throw new ForbiddenException('로그인이 필요합니다.');
    return this.pointsRepo.find({
      where: { userId } as any,
      order: { createdAt: 'DESC' } as any,
      take: 100,
    });
  }
}
