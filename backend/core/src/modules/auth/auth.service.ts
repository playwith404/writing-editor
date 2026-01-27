import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, MoreThan } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { EmailVerificationToken, RefreshToken } from '../../entities';
import { MailService } from '../mail/mail.service';

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
  ) {}

  async register(dto: RegisterDto) {
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
      return this.issueTokens(user.id, user.email, user.role);
    }

    await this.sendVerification(user.id, user.email, user.name);
    return { success: true, message: '인증 메일을 발송했습니다. 메일함을 확인해 주세요.' };
  }

  async login(dto: LoginDto) {
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

    return this.issueTokens(user.id, user.email, user.role);
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
    if (!email) {
      return { success: true };
    }
    const user = await this.usersService.findByEmail(email);
    if (!user) return { success: true };
    if (user.emailVerifiedAt) return { success: true };

    await this.sendVerification(user.id, user.email, user.name);
    return { success: true, message: '인증 메일을 다시 발송했습니다.' };
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

  private async issueTokens(userId: string, email?: string, role?: string) {
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
}
