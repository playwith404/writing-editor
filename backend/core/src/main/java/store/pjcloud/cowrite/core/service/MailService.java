package store.pjcloud.cowrite.core.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import store.pjcloud.cowrite.core.config.AppProperties;
import store.pjcloud.cowrite.core.config.SmtpProperties;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

@Service
public class MailService {
    private static final Logger log = LoggerFactory.getLogger(MailService.class);

    private final JavaMailSender mailSender;
    private final AppProperties appProperties;
    private final SmtpProperties smtpProperties;

    public MailService(JavaMailSender mailSender, AppProperties appProperties, SmtpProperties smtpProperties) {
        this.mailSender = mailSender;
        this.appProperties = appProperties;
        this.smtpProperties = smtpProperties;
    }

    public void sendEmailVerification(String to, String token, String name) {
        String baseUrl = appProperties.getBaseUrl() == null ? "http://localhost:3100" : appProperties.getBaseUrl();
        String verifyUrl = baseUrl.replaceAll("/$", "") + "/verify-email?token=" + token;
        String from = smtpProperties.getFrom() != null && !smtpProperties.getFrom().isBlank()
            ? smtpProperties.getFrom()
            : smtpProperties.getUser();
        String subject = "[Cowrite] 이메일 인증을 완료해 주세요";

        String greeting = (name != null && !name.isBlank()) ? name + "님" : "안녕하세요";
        String text = greeting + "\n\nCowrite 이메일 인증을 위해 아래 링크를 클릭해 주세요.\n\n" + verifyUrl
            + "\n\n이 링크는 24시간 동안 유효합니다.\n\n감사합니다.\nCowrite";

        String html = """
          <div style=\"font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.5\">
            <p>%s,</p>
            <p>Cowrite 이메일 인증을 위해 아래 버튼을 클릭해 주세요.</p>
            <p style=\"margin:24px 0\">
              <a href=\"%s\" style=\"background:#111827;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;display:inline-block\">
                이메일 인증하기
              </a>
            </p>
            <p style=\"color:#6b7280;font-size:12px\">이 링크는 24시간 동안 유효합니다.</p>
          </div>
        """.formatted(greeting, verifyUrl).trim();

        sendHtml(from, to, subject, text, html);
    }

    public void sendPasswordReset(String to, String token, String name) {
        String baseUrl = appProperties.getBaseUrl() == null ? "http://localhost:3100" : appProperties.getBaseUrl();
        String resetUrl = baseUrl.replaceAll("/$", "") + "/reset-password?token=" + token;
        String from = smtpProperties.getFrom() != null && !smtpProperties.getFrom().isBlank()
            ? smtpProperties.getFrom()
            : smtpProperties.getUser();
        String subject = "[Cowrite] 비밀번호 재설정 안내";

        String greeting = (name != null && !name.isBlank()) ? name + "님" : "안녕하세요";
        String text = greeting + "\n\n비밀번호 재설정을 위해 아래 링크를 클릭해 주세요.\n\n" + resetUrl
            + "\n\n이 링크는 1시간 동안 유효합니다.\n\n감사합니다.\nCowrite";

        String html = """
          <div style=\"font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.5\">
            <p>%s,</p>
            <p>비밀번호 재설정을 위해 아래 버튼을 클릭해 주세요.</p>
            <p style=\"margin:24px 0\">
              <a href=\"%s\" style=\"background:#111827;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;display:inline-block\">
                비밀번호 재설정하기
              </a>
            </p>
            <p style=\"color:#6b7280;font-size:12px\">이 링크는 1시간 동안 유효합니다.</p>
          </div>
        """.formatted(greeting, resetUrl).trim();

        sendHtml(from, to, subject, text, html);
    }

    public void sendEmailChange(String to, String token, String name) {
        String baseUrl = appProperties.getBaseUrl() == null ? "http://localhost:3100" : appProperties.getBaseUrl();
        String confirmUrl = baseUrl.replaceAll("/$", "") + "/confirm-email-change?token=" + token;
        String from = smtpProperties.getFrom() != null && !smtpProperties.getFrom().isBlank()
            ? smtpProperties.getFrom()
            : smtpProperties.getUser();
        String subject = "[Cowrite] 이메일 변경 확인";

        String greeting = (name != null && !name.isBlank()) ? name + "님" : "안녕하세요";
        String text = greeting + "\n\n이메일 변경을 완료하려면 아래 링크를 클릭해 주세요.\n\n" + confirmUrl
            + "\n\n이 링크는 24시간 동안 유효합니다.\n\n감사합니다.\nCowrite";

        String html = """
          <div style=\"font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.5\">
            <p>%s,</p>
            <p>이메일 변경을 완료하려면 아래 버튼을 클릭해 주세요.</p>
            <p style=\"margin:24px 0\">
              <a href=\"%s\" style=\"background:#111827;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;display:inline-block\">
                이메일 변경 확인
              </a>
            </p>
            <p style=\"color:#6b7280;font-size:12px\">이 링크는 24시간 동안 유효합니다.</p>
          </div>
        """.formatted(greeting, confirmUrl).trim();

        sendHtml(from, to, subject, text, html);
    }

    private void sendHtml(String from, String to, String subject, String text, String html) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(from);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(text, html);
            mailSender.send(message);
        } catch (MessagingException ex) {
            log.error("SMTP 메일 발송 실패", ex);
            throw new IllegalStateException("메일을 발송할 수 없습니다.");
        }
    }

    public void sendAttachment(String to, String subject, String text, String filename, String mimeType, byte[] content) {
        if (to == null || to.isBlank()) throw new IllegalArgumentException("to가 필요합니다.");
        if (subject == null || subject.isBlank()) throw new IllegalArgumentException("subject가 필요합니다.");
        if (filename == null || filename.isBlank()) filename = "cowrite-export";
        if (mimeType == null || mimeType.isBlank()) mimeType = "application/octet-stream";
        if (content == null) content = new byte[0];

        String from = smtpProperties.getFrom() != null && !smtpProperties.getFrom().isBlank()
            ? smtpProperties.getFrom()
            : smtpProperties.getUser();

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(from);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(text == null ? "" : text, false);
            helper.addAttachment(filename, new ByteArrayResource(content), mimeType);
            mailSender.send(message);
        } catch (MessagingException ex) {
            log.error("SMTP 첨부메일 발송 실패", ex);
            throw new IllegalStateException("메일을 발송할 수 없습니다.");
        }
    }
}
