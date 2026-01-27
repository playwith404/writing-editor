import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { Payment, Subscription } from '../../entities';

type PlanId = 'free' | 'pro' | 'master';

const PLAN_ROLE: Record<PlanId, string> = {
  free: 'user',
  pro: 'pro',
  master: 'master',
};

@Injectable()
export class BillingService {
  constructor(
    private readonly usersService: UsersService,
    @InjectRepository(Subscription)
    private readonly subscriptionsRepo: Repository<Subscription>,
    @InjectRepository(Payment)
    private readonly paymentsRepo: Repository<Payment>,
  ) {}

  getPlans() {
    return [
      { id: 'free' as const, name: 'Free', priceMonthly: 0, currency: 'KRW', features: ['기본 에디터', '프로젝트 1개', 'AI 50회/월'] },
      { id: 'pro' as const, name: 'Pro', priceMonthly: 9900, currency: 'KRW', features: ['무제한 프로젝트', 'AI 500회/월', '클라우드'] },
      { id: 'master' as const, name: 'Master', priceMonthly: 19900, currency: 'KRW', features: ['무제한 AI', '팀 협업', '우선 지원'] },
    ];
  }

  private isPlanId(value: string): value is PlanId {
    return value === 'free' || value === 'pro' || value === 'master';
  }

  private addMonths(date: Date, months: number): Date {
    const d = new Date(date.getTime());
    d.setMonth(d.getMonth() + months);
    return d;
  }

  private async downgradeIfExpired(userId: string, subscription: Subscription) {
    if (subscription.status !== 'active') return subscription;
    const end = subscription.currentPeriodEnd;
    if (!end) return subscription;
    if (end.getTime() > Date.now()) return subscription;

    await this.subscriptionsRepo.update(
      { id: subscription.id } as any,
      {
        status: 'expired',
      } as any,
    );
    await this.usersService.update(userId, { role: PLAN_ROLE.free } as any);
    return { ...subscription, status: 'expired' } as Subscription;
  }

  async getSubscriptionForUser(userId: string | undefined) {
    if (!userId) {
      throw new ForbiddenException('로그인이 필요합니다.');
    }

    const subscription = await this.subscriptionsRepo.findOne({
      where: {
        userId,
        status: 'active',
        canceledAt: IsNull(),
        currentPeriodEnd: MoreThan(new Date(0)),
      } as any,
      order: { createdAt: 'DESC' } as any,
    });

    if (!subscription) {
      return { plan: 'free', status: 'none' };
    }

    const normalized = await this.downgradeIfExpired(userId, subscription);
    return {
      id: normalized.id,
      plan: normalized.plan,
      status: normalized.status,
      provider: normalized.provider,
      currentPeriodStart: normalized.currentPeriodStart,
      currentPeriodEnd: normalized.currentPeriodEnd,
      cancelAtPeriodEnd: normalized.cancelAtPeriodEnd,
    };
  }

  async requestSubscription(userId: string | undefined, plan: string) {
    if (!userId) {
      throw new ForbiddenException('로그인이 필요합니다.');
    }
    if (!this.isPlanId(plan)) {
      throw new BadRequestException('지원하지 않는 요금제입니다.');
    }
    const planId: PlanId = plan;

    if (planId === 'free') {
      return { success: true, message: 'Free 플랜은 결제가 필요하지 않습니다.' };
    }

    const created = await this.subscriptionsRepo.save(
      this.subscriptionsRepo.create({
        userId,
        plan: planId,
        status: 'pending',
        provider: 'manual',
      }),
    );

    return {
      success: true,
      message: '요금제 변경 요청이 접수되었습니다. 결제 연동 전까지는 관리자 승인 후 활성화됩니다.',
      subscriptionId: created.id,
    };
  }

  async adminActivateSubscription(
    actor: { userId: string; role?: string } | undefined,
    userId: string,
    plan: string,
    months = 1,
  ) {
    if (!actor?.userId || actor.role !== 'admin') {
      throw new ForbiddenException('관리자만 수행할 수 있습니다.');
    }
    if (!userId) throw new BadRequestException('userId가 필요합니다.');
    if (!this.isPlanId(plan)) throw new BadRequestException('지원하지 않는 요금제입니다.');
    const planId: PlanId = plan;
    if (!Number.isFinite(months) || months < 1) throw new BadRequestException('months는 1 이상이어야 합니다.');

    const now = new Date();
    const periodStart = now;
    const periodEnd = this.addMonths(now, months);

    await this.subscriptionsRepo.update({ userId, status: 'active' } as any, { status: 'canceled', canceledAt: now } as any);

    const subscription = await this.subscriptionsRepo.save(
      this.subscriptionsRepo.create({
        userId,
        plan: planId,
        status: 'active',
        provider: 'manual',
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
      }),
    );

    const amount =
      planId === 'pro' ? 9900 * months : planId === 'master' ? 19900 * months : 0;
    if (amount > 0) {
      await this.paymentsRepo.save(
        this.paymentsRepo.create({
          userId,
          subscriptionId: subscription.id,
          provider: 'manual',
          amount,
          currency: 'KRW',
          status: 'completed',
          completedAt: now,
          metadata: { plan: planId, months } as any,
        }),
      );
    }

    await this.usersService.update(userId, { role: PLAN_ROLE[planId] } as any);
    return { success: true, subscriptionId: subscription.id, plan: planId, currentPeriodEnd: periodEnd };
  }

  async adminCancelSubscription(actor: { userId: string; role?: string } | undefined, userId: string) {
    if (!actor?.userId || actor.role !== 'admin') {
      throw new ForbiddenException('관리자만 수행할 수 있습니다.');
    }
    if (!userId) throw new BadRequestException('userId가 필요합니다.');
    const now = new Date();

    await this.subscriptionsRepo.update({ userId, status: 'active' } as any, { status: 'canceled', canceledAt: now } as any);
    await this.usersService.update(userId, { role: PLAN_ROLE.free } as any);
    return { success: true };
  }
}
