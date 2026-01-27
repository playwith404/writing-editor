import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'crypto';
import { In, Repository } from 'typeorm';
import { ProjectAccessService } from '../../common/access/project-access.service';
import { BetaAccessService } from '../beta-access/beta-access.service';
import { BetaSessionInvite, BetaSessionParticipant, BetaSession, Document, User } from '../../entities';
import { CreateBetaSessionDto } from './dto/create-beta-session.dto';
import { UpdateBetaSessionDto } from './dto/update-beta-session.dto';
import { CreateBetaSessionInviteDto } from './dto/create-beta-session-invite.dto';

@Injectable()
export class BetaSessionsService {
  constructor(
    private readonly configService: ConfigService,
    private readonly projectAccessService: ProjectAccessService,
    private readonly betaAccessService: BetaAccessService,
    @InjectRepository(BetaSession)
    private readonly sessionsRepo: Repository<BetaSession>,
    @InjectRepository(BetaSessionInvite)
    private readonly invitesRepo: Repository<BetaSessionInvite>,
    @InjectRepository(BetaSessionParticipant)
    private readonly participantsRepo: Repository<BetaSessionParticipant>,
    @InjectRepository(Document)
    private readonly documentsRepo: Repository<Document>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  private hashToken(raw: string) {
    return createHash('sha256').update(raw).digest('hex');
  }

  async listForUser(userId: string | undefined, projectId?: string) {
    if (!userId) return [];
    const projectIds = await this.projectAccessService.filterAccessibleProjectIds(userId, projectId);
    if (projectIds.length === 0) return [];
    return this.sessionsRepo.find({ where: { projectId: In(projectIds) } as any, order: { createdAt: 'DESC' } as any });
  }

  async findOneForUser(userId: string | undefined, id: string) {
    if (!userId) return null;
    const { session } = await this.betaAccessService.getAccess(userId, id);
    return session;
  }

  async createForUser(userId: string | undefined, dto: CreateBetaSessionDto) {
    if (!userId) throw new BadRequestException('로그인이 필요합니다.');
    if (!dto.projectId) throw new BadRequestException('projectId가 필요합니다.');
    if (!dto.title) throw new BadRequestException('title이 필요합니다.');

    await this.projectAccessService.assertProjectAccess(userId, dto.projectId);
    const created = this.sessionsRepo.create({
      projectId: dto.projectId,
      documentId: dto.documentId,
      title: dto.title,
      description: dto.description,
      status: dto.status ?? 'open',
      createdBy: userId,
    });
    return this.sessionsRepo.save(created);
  }

  async updateForUser(userId: string | undefined, id: string, dto: UpdateBetaSessionDto) {
    if (!userId) throw new BadRequestException('로그인이 필요합니다.');
    const session = await this.betaAccessService.assertManageAccess(userId, id);

    await this.sessionsRepo.update(
      { id: session.id } as any,
      {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      } as any,
    );
    return this.sessionsRepo.findOne({ where: { id: session.id } });
  }

  async removeForUser(userId: string | undefined, id: string) {
    if (!userId) return;
    const session = await this.betaAccessService.assertManageAccess(userId, id);
    await this.sessionsRepo.delete({ id: session.id } as any);
  }

  async createInviteForSession(userId: string | undefined, sessionId: string, dto: CreateBetaSessionInviteDto) {
    if (!userId) throw new BadRequestException('로그인이 필요합니다.');
    await this.betaAccessService.assertManageAccess(userId, sessionId);

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);

    const hours = dto.expiresInHours ?? 24 * 7;
    const expiresAt = hours ? new Date(Date.now() + hours * 60 * 60 * 1000) : undefined;

    const invite = await this.invitesRepo.save(
      this.invitesRepo.create({
        sessionId,
        tokenHash,
        expiresAt,
        maxUses: dto.maxUses,
        createdBy: userId,
      }),
    );

    const baseUrl = this.configService.get<string>('app.baseUrl') ?? 'http://localhost:3100';
    const inviteUrl = `${baseUrl.replace(/\/$/, '')}/beta-invite?token=${encodeURIComponent(rawToken)}`;

    return {
      success: true,
      inviteId: invite.id,
      token: rawToken,
      inviteUrl,
      expiresAt: invite.expiresAt,
      maxUses: invite.maxUses,
    };
  }

  async getInviteInfo(userId: string | undefined, token: string) {
    if (!userId) throw new BadRequestException('로그인이 필요합니다.');
    if (!token) throw new BadRequestException('token이 필요합니다.');

    const tokenHash = this.hashToken(token);
    const invite = await this.invitesRepo.findOne({ where: { tokenHash } as any });
    if (!invite) throw new BadRequestException('초대장을 찾을 수 없습니다.');
    if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('초대장이 만료되었습니다.');
    }
    if (invite.maxUses !== undefined && invite.uses >= invite.maxUses) {
      throw new BadRequestException('초대장 사용 횟수를 초과했습니다.');
    }

    const session = await this.sessionsRepo.findOne({ where: { id: invite.sessionId } });
    if (!session) throw new BadRequestException('베타 세션을 찾을 수 없습니다.');

    return {
      session: {
        id: session.id,
        projectId: session.projectId,
        documentId: session.documentId,
        title: session.title,
        description: session.description,
        status: session.status,
      },
      invite: {
        id: invite.id,
        expiresAt: invite.expiresAt,
        maxUses: invite.maxUses,
        uses: invite.uses,
      },
    };
  }

  async joinByInvite(userId: string | undefined, token: string) {
    if (!userId) throw new BadRequestException('로그인이 필요합니다.');
    if (!token) throw new BadRequestException('token이 필요합니다.');

    const tokenHash = this.hashToken(token);
    const invite = await this.invitesRepo.findOne({ where: { tokenHash } as any });
    if (!invite) throw new BadRequestException('초대장을 찾을 수 없습니다.');
    if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('초대장이 만료되었습니다.');
    }
    if (invite.maxUses !== undefined && invite.uses >= invite.maxUses) {
      throw new BadRequestException('초대장 사용 횟수를 초과했습니다.');
    }

    const session = await this.sessionsRepo.findOne({ where: { id: invite.sessionId } });
    if (!session) throw new BadRequestException('베타 세션을 찾을 수 없습니다.');

    const existing = await this.participantsRepo.findOne({ where: { sessionId: session.id, userId } as any });
    if (!existing) {
      const user = await this.usersRepo.findOne({ where: { id: userId } as any, select: { name: true } as any });
      await this.participantsRepo.save(
        this.participantsRepo.create({
          sessionId: session.id,
          userId,
          status: 'joined',
          displayName: user?.name,
        }),
      );
      await this.invitesRepo.update({ id: invite.id } as any, { uses: invite.uses + 1 } as any);
    }

    return {
      success: true,
      sessionId: session.id,
    };
  }

  async listParticipantsForSession(userId: string | undefined, sessionId: string) {
    if (!userId) throw new BadRequestException('로그인이 필요합니다.');
    const session = await this.betaAccessService.assertManageAccess(userId, sessionId);

    const participants = await this.participantsRepo.find({ where: { sessionId: session.id } as any, order: { joinedAt: 'ASC' } as any });
    if (participants.length === 0) return [];

    const users = await this.usersRepo.find({
      where: { id: In(participants.map((p) => p.userId)) } as any,
      select: { id: true, name: true, avatarUrl: true } as any,
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    return participants.map((p) => ({
      ...p,
      user: userMap.get(p.userId) ?? null,
    }));
  }

  async getSessionDocumentForUser(userId: string | undefined, sessionId: string) {
    if (!userId) throw new BadRequestException('로그인이 필요합니다.');
    const { session } = await this.betaAccessService.getAccess(userId, sessionId);
    if (!session.documentId) {
      throw new BadRequestException('이 세션에는 documentId가 설정되어 있지 않습니다.');
    }

    const doc = await this.documentsRepo.findOne({
      where: { id: session.documentId } as any,
      select: { id: true, projectId: true, title: true, content: true, updatedAt: true } as any,
    });
    if (!doc) throw new BadRequestException('문서를 찾을 수 없습니다.');
    if (doc.projectId !== session.projectId) throw new BadRequestException('문서 정보가 올바르지 않습니다.');

    return doc;
  }
}
