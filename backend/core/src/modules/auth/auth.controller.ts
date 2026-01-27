import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshDto } from './dto/refresh.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RequestEmailChangeDto } from './dto/request-email-change.dto';
import { ConfirmEmailChangeDto } from './dto/confirm-email-change.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto, @Req() req: any) {
    return this.authService.register(dto, this.extractSessionMeta(req));
  }

  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: any) {
    return this.authService.login(dto, this.extractSessionMeta(req));
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }

  @Post('resend-verification')
  resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto.email);
  }

  @Post('request-password-reset')
  requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @Post('confirm-email-change')
  confirmEmailChange(@Body() dto: ConfirmEmailChangeDto) {
    return this.authService.confirmEmailChange(dto.token);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@Req() req: any) {
    const user = req.user as { userId: string };
    return this.authService.logout(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: any) {
    return this.authService.me(req.user?.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateMe(@Req() req: any, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(req.user?.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  sessions(@Req() req: any) {
    return this.authService.listSessions(req.user?.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('sessions/:id')
  revokeSession(@Req() req: any, @Param('id') id: string) {
    return this.authService.revokeSession(req.user?.userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  changePassword(@Req() req: any, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(req.user?.userId, dto.currentPassword, dto.newPassword);
  }

  @UseGuards(JwtAuthGuard)
  @Post('request-email-change')
  requestEmailChange(@Req() req: any, @Body() dto: RequestEmailChangeDto) {
    return this.authService.requestEmailChange(req.user?.userId, dto.newEmail);
  }

  @UseGuards(JwtAuthGuard)
  @Post('delete-account')
  deleteAccount(@Req() req: any, @Body() dto: DeleteAccountDto) {
    return this.authService.deleteAccount(req.user?.userId, dto.password);
  }

  private extractSessionMeta(req: any) {
    const userAgent = typeof req?.headers?.['user-agent'] === 'string' ? (req.headers['user-agent'] as string) : undefined;
    const forwarded = typeof req?.headers?.['x-forwarded-for'] === 'string' ? (req.headers['x-forwarded-for'] as string) : undefined;
    const ipAddress = forwarded?.split(',')[0]?.trim() || req?.ip;
    return { userAgent, ipAddress };
  }
}
