import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshToken } from '../../entities';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshRepo: Repository<RefreshToken>,
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

    return this.issueTokens(user.id, user.email, user.role);
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

    return this.issueTokens(user.id, user.email, user.role);
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
