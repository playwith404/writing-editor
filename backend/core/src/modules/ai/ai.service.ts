import { BadGatewayException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { ProjectAccessService } from '../../common/access/project-access.service';
import { AiRequest, AiUsage } from '../../entities';

type RequestUser = { userId: string; role?: string };

@Injectable()
export class AiService {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(AiRequest)
    private readonly requestsRepo: Repository<AiRequest>,
    @InjectRepository(AiUsage)
    private readonly usageRepo: Repository<AiUsage>,
    private readonly projectAccessService: ProjectAccessService,
  ) {}

  private getMonthlyLimit(role?: string): number | null {
    switch (role) {
      case 'admin':
      case 'master':
        return null;
      case 'pro':
        return 500;
      case 'user':
      default:
        return 50;
    }
  }

  private startOfCurrentMonthUtc(now = new Date()): Date {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  }

  async getQuota(userId: string, role?: string) {
    const limit = this.getMonthlyLimit(role);
    const used = await this.requestsRepo.count({
      where: {
        userId,
        createdAt: MoreThanOrEqual(this.startOfCurrentMonthUtc()),
      } as any,
    });

    return {
      limit,
      used,
      remaining: limit === null ? null : Math.max(limit - used, 0),
    };
  }

  private async assertQuota(userId: string, role?: string) {
    const { limit, used } = await this.getQuota(userId, role);
    if (limit !== null && used >= limit) {
      throw new HttpException('AI 사용 한도를 초과했습니다.', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  private extractPrompt(payload: any): string | undefined {
    if (!payload || typeof payload !== 'object') return undefined;
    const candidate = payload.prompt ?? payload.query ?? payload.text ?? payload.scenario ?? payload.character ?? undefined;
    if (typeof candidate !== 'string') return undefined;
    const trimmed = candidate.trim();
    if (!trimmed) return undefined;
    return trimmed.length > 20_000 ? `${trimmed.slice(0, 20_000)}…` : trimmed;
  }

  async proxy(user: RequestUser, feature: string, path: string, payload: any) {
    await this.assertQuota(user.userId, user.role);

    const projectId = payload?.projectId as string | undefined;
    if (projectId) {
      await this.projectAccessService.assertProjectAccess(user.userId, projectId);
    }

    const provider = typeof payload?.provider === 'string' ? payload.provider : undefined;
    const model = typeof payload?.model === 'string' ? payload.model : undefined;

    const created = this.requestsRepo.create({
      userId: user.userId,
      projectId,
      feature,
      provider,
      model,
      prompt: this.extractPrompt(payload),
      status: 'pending',
    } as Partial<AiRequest>);
    const request = await this.requestsRepo.save(created);

    const aiBaseUrl = this.configService.get<string>('ai.serviceUrl') ?? 'http://ai-service:8000';
    const url = `${aiBaseUrl.replace(/\/$/, '')}${path}`;

    const { projectId: _projectId, ...forward } = payload ?? {};

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60_000);
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(forward),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const text = await resp.text();
      const parsed = text ? JSON.parse(text) : {};

      if (!resp.ok) {
        await this.requestsRepo.update(
          { id: request.id } as any,
          {
            status: 'failed',
            result: { error: parsed?.detail ?? parsed?.message ?? text } as any,
            completedAt: new Date(),
          } as any,
        );
        throw new BadGatewayException('AI 서비스 요청에 실패했습니다.');
      }

      await Promise.all([
        this.requestsRepo.update(
          { id: request.id } as any,
          {
            status: 'completed',
            result: parsed as any,
            completedAt: new Date(),
          } as any,
        ),
        this.usageRepo.save(
          this.usageRepo.create({
            userId: user.userId,
            feature,
            tokensUsed: 1,
            model,
            provider,
          } as any),
        ),
      ]);

      return parsed;
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }
      await this.requestsRepo.update(
        { id: request.id } as any,
        {
          status: 'failed',
          result: { error: '요청 처리 중 오류가 발생했습니다.' } as any,
          completedAt: new Date(),
        } as any,
      );
      throw new BadGatewayException('AI 서비스 요청에 실패했습니다.');
    }
  }
}
