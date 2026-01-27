import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, MoreThan } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { EmailChangeToken, EmailVerificationToken, PasswordResetToken, RefreshToken } from '../../entities';
import { MailService } from '../mail/mail.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    @InjectRepository(RefreshToken)
    private readonly refreshRepo: Repository<RefreshToken>,
    @InjectRepository(EmailVerificationToken)
    private readonly verifyRepo: Repository<EmailVerificationToken>,
    @InjectRepository(PasswordResetToken)
    private readonly passwordResetRepo: Repository<PasswordResetToken>,
    @InjectRepository(EmailChangeToken)
    private readonly emailChangeRepo: Repository<EmailChangeToken>,
  ) {}

  async register(dto: RegisterDto, meta?: { userAgent?: string; ipAddress?: string }) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('이미 사용 중인 이메일입니다.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      email: dto.email,
      name: dto.name,
      passwordHash,
      avatarUrl: dto.avatarUrl,
    });

    const enabled = Boolean(this.configService.get<boolean>('auth.emailVerificationEnabled'));
    if (!enabled) {
      await this.usersService.update(user.id, { emailVerifiedAt: new Date() } as any);
      return this.issueTokens(user.id, user.email, user.role, meta);
    }

    await this.sendVerification(user.id, user.email, user.name);
    return { success: true, message: '인증 메일을 발송했습니다. 메일함을 확인해 주세요.' };
  }

  async login(dto: LoginDto, meta?: { userAgent?: string; ipAddress?: string }) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    const enabled = Boolean(this.configService.get<boolean>('auth.emailVerificationEnabled'));
    if (enabled && !user.emailVerifiedAt) {
      throw new UnauthorizedException('이메일 인증이 필요합니다.');
    }

    return this.issueTokens(user.id, user.email, user.role, meta);
  }

  async verifyEmail(token: string) {
    if (!token) {
      throw new UnauthorizedException('유효하지 않은 인증 토큰입니다.');
    }
    const tokenHash = this.hashToken(token);
    const record = await this.verifyRepo.findOne({
      where: {
        tokenHash,
        usedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      } as any,
    });

    if (!record) {
      throw new UnauthorizedException('유효하지 않거나 만료된 인증 토큰입니다.');
    }

    record.usedAt = new Date();
    await this.verifyRepo.save(record);

    await this.usersService.update(record.userId, { emailVerifiedAt: new Date() } as any);
    const user = await this.usersService.findById(record.userId);
    if (!user) {
      throw new UnauthorizedException('유저 정보를 찾을 수 없습니다.');
    }
    return this.issueTokens(user.id, user.email, user.role);
  }

  async resendVerification(email: string) {
    const enabled = Boolean(this.configService.get<boolean>('auth.emailVerificationEnabled'));
    if (!enabled) return { success: true };

    const message = '인증 메일을 발송했습니다. 메일함을 확인해 주세요. (추가 발송은 10분마다 가능합니다.)';
    const cooldownMs = 10 * 60 * 1000;

    if (!email) return { success: true, message };

    const user = await this.usersService.findByEmail(email);
    if (!user) return { success: true, message };
    if (user.emailVerifiedAt) return { success: true, message };

    const latest = await this.verifyRepo.findOne({ where: { userId: user.id } as any, order: { createdAt: 'DESC' } });
    if (latest?.createdAt && Date.now() - latest.createdAt.getTime() < cooldownMs) {
      return { success: true, message };
    }

    await this.sendVerification(user.id, user.email, user.name);
    return { success: true, message };
  }

  async refresh(refreshToken: string) {
    let payload: { sub: string; type?: string } | null = null;
    try {
      payload = this.jwtService.verify<{ sub: string; type?: string }>(refreshToken, {
        secret: this.configService.get<string>('jwt.secret'),
      });
    } catch (error) {
      throw new UnauthorizedException('유효하지 않은 리프레시 토큰입니다.');
    }

    if (!payload || payload.type !== 'refresh') {
      throw new UnauthorizedException('유효하지 않은 리프레시 토큰입니다.');
    }

    const tokens = await this.refreshRepo.find({
      where: { userId: payload.sub, revokedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });

    let matched: RefreshToken | null = null;
    for (const token of tokens) {
      const ok = await bcrypt.compare(refreshToken, token.tokenHash);
      if (ok) {
        matched = token;
        break;
      }
    }

    if (!matched || matched.expiresAt < new Date()) {
      throw new UnauthorizedException('리프레시 토큰이 만료되었습니다.');
    }

    matched.revokedAt = new Date();
    await this.refreshRepo.save(matched);

    return this.issueTokens(payload.sub, undefined, undefined);
  }

  async logout(userId: string) {
    await this.refreshRepo.update({ userId, revokedAt: IsNull() }, { revokedAt: new Date() });
    return { success: true };
  }

  private async issueTokens(
    userId: string,
    email?: string,
    role?: string,
    meta?: { userAgent?: string; ipAddress?: string },
  ) {
    if (!email || !role) {
      const user = await this.usersService.findById(userId);
      email = email ?? user?.email;
      role = role ?? user?.role;
    }
    const accessToken = this.jwtService.sign(
      { sub: userId, email, role },
      { expiresIn: this.configService.get<string>('jwt.expiresIn') },
    );

    const refreshToken = this.jwtService.sign(
      { sub: userId, type: 'refresh' },
      { expiresIn: this.configService.get<string>('jwt.refreshExpiresIn') },
    );

    const tokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date(Date.now() + this.parseExpiryMs(this.configService.get<string>('jwt.refreshExpiresIn')));

    await this.refreshRepo.save(
      this.refreshRepo.create({
        userId,
        tokenHash,
        expiresAt,
        userAgent: meta?.userAgent,
        ipAddress: meta?.ipAddress,
      }),
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  private hashToken(raw: string) {
    return createHash('sha256').update(raw).digest('hex');
  }

  private async sendVerification(userId: string, email: string, name?: string) {
    // 기존 토큰은 사용 처리 (재발급)
    await this.verifyRepo.update({ userId, usedAt: IsNull() } as any, { usedAt: new Date() } as any);

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.verifyRepo.save(
      this.verifyRepo.create({
        userId,
        tokenHash,
        expiresAt,
      } as any),
    );

    await this.mailService.sendEmailVerification(email, rawToken, name);
  }

  private parseExpiryMs(value?: string) {
    if (!value) return 7 * 24 * 60 * 60 * 1000;
    const match = value.match(/^(\d+)([smhd])$/);
    if (!match) return Number(value) || 7 * 24 * 60 * 60 * 1000;
    const amount = Number(match[1]);
    const unit = match[2];
    switch (unit) {
      case 's':
        return amount * 1000;
      case 'm':
        return amount * 60 * 1000;
      case 'h':
        return amount * 60 * 60 * 1000;
      case 'd':
        return amount * 24 * 60 * 60 * 1000;
      default:
        return amount;
    }
  }

  me(userId: string | undefined) {
    if (!userId) {
      throw new UnauthorizedException('로그인이 필요합니다.');
    }
    return this.usersService.findById(userId);
  }

  async updateProfile(userId: string | undefined, dto: UpdateProfileDto) {
    if (!userId) {
      throw new UnauthorizedException('로그인이 필요합니다.');
    }
    const next: any = {};
    if (dto.name !== undefined) next.name = dto.name;
    if (dto.avatarUrl !== undefined) next.avatarUrl = dto.avatarUrl;
    await this.usersService.update(userId, next);
    return this.usersService.findById(userId);
  }

  async listSessions(userId: string | undefined) {
    if (!userId) {
      throw new UnauthorizedException('로그인이 필요합니다.');
    }
    const sessions = await this.refreshRepo.find({
      where: { userId } as any,
      order: { createdAt: 'DESC' } as any,
      take: 20,
    });
    return sessions.map((s) => ({
      id: s.id,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      revokedAt: s.revokedAt,
      userAgent: s.userAgent,
      ipAddress: s.ipAddress,
    }));
  }

  async revokeSession(userId: string | undefined, sessionId: string) {
    if (!userId) {
      throw new UnauthorizedException('로그인이 필요합니다.');
    }
    if (!sessionId) {
      throw new BadRequestException('sessionId가 필요합니다.');
    }
    await this.refreshRepo.update({ id: sessionId, userId, revokedAt: IsNull() } as any, { revokedAt: new Date() } as any);
    return { success: true };
  }

  async requestPasswordReset(email: string) {
    const message = '비밀번호 재설정 링크를 발송했습니다. 메일함을 확인해 주세요.';
    if (!email) return { success: true, message };

    const user = await this.usersService.findByEmail(email);
    if (!user) return { success: true, message };

    await this.passwordResetRepo.update({ userId: user.id, usedAt: IsNull() } as any, { usedAt: new Date() } as any);

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.passwordResetRepo.save(
      this.passwordResetRepo.create({
        userId: user.id,
        tokenHash,
        expiresAt,
      } as any),
    );

    await this.mailService.sendPasswordReset(user.email, rawToken, user.name);
    return { success: true, message };
  }

  async resetPassword(token: string, newPassword: string) {
    if (!token || !newPassword) {
      throw new BadRequestException('token과 newPassword가 필요합니다.');
    }

    const tokenHash = this.hashToken(token);
    const record = await this.passwordResetRepo.findOne({
      where: {
        tokenHash,
        usedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      } as any,
    });

    if (!record) {
      throw new UnauthorizedException('유효하지 않거나 만료된 토큰입니다.');
    }

    const user = await this.usersService.findByIdWithPassword(record.userId);
    if (!user) {
      throw new UnauthorizedException('유저 정보를 찾을 수 없습니다.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.usersService.update(user.id, { passwordHash } as any);

    record.usedAt = new Date();
    await this.passwordResetRepo.save(record);

    await this.refreshRepo.update({ userId: user.id, revokedAt: IsNull() } as any, { revokedAt: new Date() } as any);
    return { success: true };
  }

  async changePassword(userId: string | undefined, currentPassword: string, newPassword: string) {
    if (!userId) {
      throw new UnauthorizedException('로그인이 필요합니다.');
    }
    if (!currentPassword || !newPassword) {
      throw new BadRequestException('currentPassword와 newPassword가 필요합니다.');
    }

    const user = await this.usersService.findByIdWithPassword(userId);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('비밀번호를 변경할 수 없습니다.');
    }

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('현재 비밀번호가 올바르지 않습니다.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.usersService.update(user.id, { passwordHash } as any);
    await this.refreshRepo.update({ userId: user.id, revokedAt: IsNull() } as any, { revokedAt: new Date() } as any);

    return { success: true };
  }

  async requestEmailChange(userId: string | undefined, newEmail: string) {
    if (!userId) {
      throw new UnauthorizedException('로그인이 필요합니다.');
    }
    if (!newEmail) {
      throw new BadRequestException('newEmail이 필요합니다.');
    }

    const user = await this.usersService.findByIdWithPassword(userId);
    if (!user) {
      throw new UnauthorizedException('유저 정보를 찾을 수 없습니다.');
    }

    if (user.email === newEmail) {
      return { success: true, message: '이메일 변경 확인 메일을 발송했습니다. 메일함을 확인해 주세요.' };
    }

    const exists = await this.usersService.findByEmail(newEmail);
    if (exists && exists.id !== user.id) {
      throw new ConflictException('이미 사용 중인 이메일입니다.');
    }

    await this.emailChangeRepo.update({ userId: user.id, usedAt: IsNull() } as any, { usedAt: new Date() } as any);

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.emailChangeRepo.save(
      this.emailChangeRepo.create({
        userId: user.id,
        tokenHash,
        newEmail,
        expiresAt,
      } as any),
    );

    await this.mailService.sendEmailChange(newEmail, rawToken, user.name);
    return { success: true, message: '이메일 변경 확인 메일을 발송했습니다. 메일함을 확인해 주세요.' };
  }

  async confirmEmailChange(token: string) {
    if (!token) {
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }

    const tokenHash = this.hashToken(token);
    const record = await this.emailChangeRepo.findOne({
      where: {
        tokenHash,
        usedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      } as any,
    });

    if (!record) {
      throw new UnauthorizedException('유효하지 않거나 만료된 토큰입니다.');
    }

    const user = await this.usersService.findByIdWithPassword(record.userId);
    if (!user) {
      throw new UnauthorizedException('유저 정보를 찾을 수 없습니다.');
    }

    const exists = await this.usersService.findByEmail(record.newEmail);
    if (exists && exists.id !== user.id) {
      throw new ConflictException('이미 사용 중인 이메일입니다.');
    }

    await this.usersService.update(user.id, { email: record.newEmail, emailVerifiedAt: new Date() } as any);

    record.usedAt = new Date();
    await this.emailChangeRepo.save(record);

    await this.refreshRepo.update({ userId: user.id, revokedAt: IsNull() } as any, { revokedAt: new Date() } as any);
    return this.issueTokens(user.id, record.newEmail, user.role);
  }

  async deleteAccount(userId: string | undefined, password?: string) {
    if (!userId) {
      throw new UnauthorizedException('로그인이 필요합니다.');
    }

    const user = await this.usersService.findByIdWithPassword(userId);
    if (!user) {
      throw new UnauthorizedException('유저 정보를 찾을 수 없습니다.');
    }

    if (user.passwordHash) {
      if (!password) {
        throw new BadRequestException('비밀번호가 필요합니다.');
      }
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) {
        throw new UnauthorizedException('비밀번호가 올바르지 않습니다.');
      }
    }

    await this.refreshRepo.update({ userId: user.id, revokedAt: IsNull() } as any, { revokedAt: new Date() } as any);

    const anonymizedEmail = `deleted+${user.id}@cowrite.local`;
    await this.usersService.update(user.id, {
      email: anonymizedEmail,
      name: '탈퇴한 사용자',
      passwordHash: null,
      oauthProvider: null,
      oauthId: null,
      emailVerifiedAt: null,
    } as any);

    await this.usersService.softDelete(user.id);
    return { success: true };
  }
}
