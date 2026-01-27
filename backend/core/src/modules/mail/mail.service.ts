import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter?: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {}

  private getTransporter(): nodemailer.Transporter {
    if (this.transporter) return this.transporter;

    const host = this.configService.get<string>('smtp.host');
    const port = this.configService.get<number>('smtp.port') ?? 587;
    const secure = Boolean(this.configService.get<boolean>('smtp.secure'));
    const user = this.configService.get<string>('smtp.user');
    const pass = this.configService.get<string>('smtp.password');

    if (!host || !user || !pass) {
      throw new ServiceUnavailableException('SMTP 설정이 필요합니다.');
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
    return this.transporter;
  }

  async sendEmailVerification(to: string, token: string, name?: string) {
    const baseUrl = this.configService.get<string>('app.baseUrl') ?? 'http://localhost:3100';
    const verifyUrl = `${baseUrl.replace(/\/$/, '')}/verify-email?token=${encodeURIComponent(token)}`;

    const from = this.configService.get<string>('smtp.from') || this.configService.get<string>('smtp.user')!;
    const subject = '[Cowrite] 이메일 인증을 완료해 주세요';

    const greeting = name ? `${name}님` : '안녕하세요';
    const text = `${greeting}\n\nCowrite 이메일 인증을 위해 아래 링크를 클릭해 주세요.\n\n${verifyUrl}\n\n이 링크는 24시간 동안 유효합니다.\n\n감사합니다.\nCowrite`;

    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.5">
        <p>${greeting},</p>
        <p>Cowrite 이메일 인증을 위해 아래 버튼을 클릭해 주세요.</p>
        <p style="margin:24px 0">
          <a href="${verifyUrl}" style="background:#111827;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;display:inline-block">
            이메일 인증하기
          </a>
        </p>
        <p style="color:#6b7280;font-size:12px">이 링크는 24시간 동안 유효합니다.</p>
      </div>
    `.trim();

    try {
      await this.getTransporter().sendMail({
        from,
        to,
        subject,
        text,
        html,
      });
    } catch (error) {
      this.logger.error('SMTP 메일 발송 실패');
      throw new ServiceUnavailableException('인증 메일을 발송할 수 없습니다.');
    }
  }

  async sendPasswordReset(to: string, token: string, name?: string) {
    const baseUrl = this.configService.get<string>('app.baseUrl') ?? 'http://localhost:3100';
    const resetUrl = `${baseUrl.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`;

    const from = this.configService.get<string>('smtp.from') || this.configService.get<string>('smtp.user')!;
    const subject = '[Cowrite] 비밀번호 재설정 안내';

    const greeting = name ? `${name}님` : '안녕하세요';
    const text = `${greeting}\n\n비밀번호 재설정을 위해 아래 링크를 클릭해 주세요.\n\n${resetUrl}\n\n이 링크는 1시간 동안 유효합니다.\n\n감사합니다.\nCowrite`;

    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.5">
        <p>${greeting},</p>
        <p>비밀번호 재설정을 위해 아래 버튼을 클릭해 주세요.</p>
        <p style="margin:24px 0">
          <a href="${resetUrl}" style="background:#111827;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;display:inline-block">
            비밀번호 재설정하기
          </a>
        </p>
        <p style="color:#6b7280;font-size:12px">이 링크는 1시간 동안 유효합니다.</p>
      </div>
    `.trim();

    try {
      await this.getTransporter().sendMail({
        from,
        to,
        subject,
        text,
        html,
      });
    } catch (error) {
      this.logger.error('SMTP 메일 발송 실패');
      throw new ServiceUnavailableException('비밀번호 재설정 메일을 발송할 수 없습니다.');
    }
  }

  async sendEmailChange(to: string, token: string, name?: string) {
    const baseUrl = this.configService.get<string>('app.baseUrl') ?? 'http://localhost:3100';
    const confirmUrl = `${baseUrl.replace(/\/$/, '')}/confirm-email-change?token=${encodeURIComponent(token)}`;

    const from = this.configService.get<string>('smtp.from') || this.configService.get<string>('smtp.user')!;
    const subject = '[Cowrite] 이메일 변경 확인';

    const greeting = name ? `${name}님` : '안녕하세요';
    const text = `${greeting}\n\n이메일 변경을 완료하려면 아래 링크를 클릭해 주세요.\n\n${confirmUrl}\n\n이 링크는 24시간 동안 유효합니다.\n\n감사합니다.\nCowrite`;

    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.5">
        <p>${greeting},</p>
        <p>이메일 변경을 완료하려면 아래 버튼을 클릭해 주세요.</p>
        <p style="margin:24px 0">
          <a href="${confirmUrl}" style="background:#111827;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;display:inline-block">
            이메일 변경 확인
          </a>
        </p>
        <p style="color:#6b7280;font-size:12px">이 링크는 24시간 동안 유효합니다.</p>
      </div>
    `.trim();

    try {
      await this.getTransporter().sendMail({
        from,
        to,
        subject,
        text,
        html,
      });
    } catch (error) {
      this.logger.error('SMTP 메일 발송 실패');
      throw new ServiceUnavailableException('이메일 변경 메일을 발송할 수 없습니다.');
    }
  }
}
