package store.pjcloud.cowrite.core.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import store.pjcloud.cowrite.core.config.AuthProperties;
import store.pjcloud.cowrite.core.entity.EmailChangeToken;
import store.pjcloud.cowrite.core.entity.EmailVerificationToken;
import store.pjcloud.cowrite.core.entity.PasswordResetToken;
import store.pjcloud.cowrite.core.entity.RefreshToken;
import store.pjcloud.cowrite.core.entity.User;
import store.pjcloud.cowrite.core.repository.EmailChangeTokenRepository;
import store.pjcloud.cowrite.core.repository.EmailVerificationTokenRepository;
import store.pjcloud.cowrite.core.repository.PasswordResetTokenRepository;
import store.pjcloud.cowrite.core.repository.RefreshTokenRepository;
import store.pjcloud.cowrite.core.security.JwtTokenService;

@Service
public class AuthService {
    private final UsersService usersService;
    private final JwtTokenService jwtTokenService;
    private final AuthProperties authProperties;
    private final MailService mailService;
    private final RefreshTokenRepository refreshTokenRepository;
    private final EmailVerificationTokenRepository verifyRepo;
    private final PasswordResetTokenRepository passwordResetRepo;
    private final EmailChangeTokenRepository emailChangeRepo;
    private final PasswordEncoder passwordEncoder;

    public AuthService(
        UsersService usersService,
        JwtTokenService jwtTokenService,
        AuthProperties authProperties,
        MailService mailService,
        RefreshTokenRepository refreshTokenRepository,
        EmailVerificationTokenRepository verifyRepo,
        PasswordResetTokenRepository passwordResetRepo,
        EmailChangeTokenRepository emailChangeRepo,
        PasswordEncoder passwordEncoder
    ) {
        this.usersService = usersService;
        this.jwtTokenService = jwtTokenService;
        this.authProperties = authProperties;
        this.mailService = mailService;
        this.refreshTokenRepository = refreshTokenRepository;
        this.verifyRepo = verifyRepo;
        this.passwordResetRepo = passwordResetRepo;
        this.emailChangeRepo = emailChangeRepo;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public Object register(String email, String name, String password, String avatarUrl, SessionMeta meta) {
        if (email == null || email.isBlank() || password == null || password.isBlank()) {
            throw new IllegalArgumentException("이메일과 비밀번호가 필요합니다.");
        }
        if (usersService.findByEmail(email).isPresent()) {
            throw new IllegalStateException("이미 사용 중인 이메일입니다.");
        }

        User user = new User();
        user.setEmail(email);
        user.setName(name);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setAvatarUrl(avatarUrl);
        user = usersService.create(user);

        if (!authProperties.isEmailVerificationEnabled()) {
            User patch = new User();
            patch.setEmailVerifiedAt(OffsetDateTime.now());
            usersService.updateAllowNulls(user.getId(), patch);
            return issueTokens(user.getId(), user.getEmail(), user.getRole(), meta);
        }

        sendVerification(user.getId(), user.getEmail(), user.getName());
        return new SimpleMessage(true, "인증 메일을 발송했습니다. 메일함을 확인해 주세요.");
    }

    public Object login(String email, String password, SessionMeta meta) {
        if (email == null || password == null) {
            throw new BadCredentialsException("이메일 또는 비밀번호가 올바르지 않습니다.");
        }
        User user = usersService.findByEmail(email).orElse(null);
        if (user == null || user.getPasswordHash() == null) {
            throw new BadCredentialsException("이메일 또는 비밀번호가 올바르지 않습니다.");
        }
        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new BadCredentialsException("이메일 또는 비밀번호가 올바르지 않습니다.");
        }
        if (authProperties.isEmailVerificationEnabled() && user.getEmailVerifiedAt() == null) {
            throw new BadCredentialsException("이메일 인증이 필요합니다.");
        }
        return issueTokens(user.getId(), user.getEmail(), user.getRole(), meta);
    }

    @Transactional
    public Object verifyEmail(String token) {
        if (token == null || token.isBlank()) {
            throw new BadCredentialsException("유효하지 않은 인증 토큰입니다.");
        }
        String hash = hashToken(token);
        EmailVerificationToken record = verifyRepo.findByTokenHashAndUsedAtIsNullAndExpiresAtAfter(hash, OffsetDateTime.now())
            .orElseThrow(() -> new BadCredentialsException("유효하지 않거나 만료된 인증 토큰입니다."));

        record.setUsedAt(OffsetDateTime.now());
        verifyRepo.save(record);

        User patch = new User();
        patch.setEmailVerifiedAt(OffsetDateTime.now());
        usersService.updateAllowNulls(record.getUserId(), patch);

        User user = usersService.findById(record.getUserId()).orElseThrow(() -> new BadCredentialsException("유저 정보를 찾을 수 없습니다."));
        return issueTokens(user.getId(), user.getEmail(), user.getRole(), null);
    }

    @Transactional
    public Object resendVerification(String email) {
        if (!authProperties.isEmailVerificationEnabled()) {
            return new SimpleMessage(true, "");
        }

        String message = "인증 메일을 발송했습니다. 메일함을 확인해 주세요. (추가 발송은 10분마다 가능합니다.)";
        if (email == null || email.isBlank()) return new SimpleMessage(true, message);

        User user = usersService.findByEmail(email).orElse(null);
        if (user == null || user.getEmailVerifiedAt() != null) return new SimpleMessage(true, message);

        Optional<EmailVerificationToken> latest = verifyRepo.findTopByUserIdOrderByCreatedAtDesc(user.getId());
        if (latest.isPresent()) {
            OffsetDateTime last = latest.get().getCreatedAt();
            if (last != null && last.plusMinutes(10).isAfter(OffsetDateTime.now())) {
                return new SimpleMessage(true, message);
            }
        }

        sendVerification(user.getId(), user.getEmail(), user.getName());
        return new SimpleMessage(true, message);
    }

    @Transactional
    public Object refresh(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new BadCredentialsException("유효하지 않은 리프레시 토큰입니다.");
        }

        var parsed = jwtTokenService.parseToken(refreshToken);
        String type = parsed.getBody().get("type", String.class);
        if (!"refresh".equals(type)) {
            throw new BadCredentialsException("유효하지 않은 리프레시 토큰입니다.");
        }
        UUID userId = UUID.fromString(parsed.getBody().getSubject());

        List<RefreshToken> tokens = refreshTokenRepository.findByUserIdAndRevokedAtIsNullOrderByCreatedAtDesc(userId);
        RefreshToken matched = null;
        for (RefreshToken token : tokens) {
            if (passwordEncoder.matches(refreshToken, token.getTokenHash())) {
                matched = token;
                break;
            }
        }
        if (matched == null || matched.getExpiresAt().isBefore(OffsetDateTime.now())) {
            throw new BadCredentialsException("리프레시 토큰이 만료되었습니다.");
        }

        matched.setRevokedAt(OffsetDateTime.now());
        refreshTokenRepository.save(matched);

        return issueTokens(userId, null, null, null);
    }

    @Transactional
    public Object logout(UUID userId) {
        List<RefreshToken> tokens = refreshTokenRepository.findByUserIdAndRevokedAtIsNull(userId);
        for (RefreshToken token : tokens) {
            token.setRevokedAt(OffsetDateTime.now());
        }
        refreshTokenRepository.saveAll(tokens);
        return new SimpleMessage(true, "");
    }

    public User me(UUID userId) {
        return usersService.findById(userId).orElseThrow(() -> new BadCredentialsException("로그인이 필요합니다."));
    }

    @Transactional
    public User updateProfile(UUID userId, String name, String avatarUrl) {
        User patch = new User();
        patch.setName(name);
        patch.setAvatarUrl(avatarUrl);
        usersService.updateAllowNulls(userId, patch);
        return usersService.findById(userId).orElseThrow();
    }

    @Transactional
    public List<SessionInfo> listSessions(UUID userId) {
        List<RefreshToken> sessions = refreshTokenRepository.findByUserIdOrderByCreatedAtDesc(userId);
        return sessions.stream().map(s -> new SessionInfo(
            s.getId(),
            s.getCreatedAt(),
            s.getExpiresAt(),
            s.getRevokedAt(),
            s.getUserAgent(),
            s.getIpAddress()
        )).toList();
    }

    @Transactional
    public Object revokeSession(UUID userId, UUID sessionId) {
        List<RefreshToken> tokens = refreshTokenRepository.findByUserIdAndRevokedAtIsNull(userId);
        for (RefreshToken token : tokens) {
            if (token.getId().equals(sessionId)) {
                token.setRevokedAt(OffsetDateTime.now());
                refreshTokenRepository.save(token);
                break;
            }
        }
        return new SimpleMessage(true, "");
    }

    @Transactional
    public Object requestPasswordReset(String email) {
        String message = "비밀번호 재설정 링크를 발송했습니다. 메일함을 확인해 주세요.";
        if (email == null || email.isBlank()) return new SimpleMessage(true, message);

        User user = usersService.findByEmail(email).orElse(null);
        if (user == null) return new SimpleMessage(true, message);

        List<PasswordResetToken> existing = passwordResetRepo.findAll();
        for (PasswordResetToken token : existing) {
            if (token.getUserId().equals(user.getId()) && token.getUsedAt() == null) {
                token.setUsedAt(OffsetDateTime.now());
                passwordResetRepo.save(token);
            }
        }

        String rawToken = java.util.UUID.randomUUID().toString().replace("-", "") + java.util.UUID.randomUUID().toString().replace("-", "");
        PasswordResetToken record = new PasswordResetToken();
        record.setUserId(user.getId());
        record.setTokenHash(hashToken(rawToken));
        record.setExpiresAt(OffsetDateTime.now().plusHours(1));
        passwordResetRepo.save(record);

        mailService.sendPasswordReset(user.getEmail(), rawToken, user.getName());
        return new SimpleMessage(true, message);
    }

    @Transactional
    public Object resetPassword(String token, String newPassword) {
        if (token == null || token.isBlank() || newPassword == null || newPassword.isBlank()) {
            throw new IllegalArgumentException("token과 newPassword가 필요합니다.");
        }

        String hash = hashToken(token);
        PasswordResetToken record = passwordResetRepo.findByTokenHashAndUsedAtIsNullAndExpiresAtAfter(hash, OffsetDateTime.now())
            .orElseThrow(() -> new BadCredentialsException("유효하지 않거나 만료된 토큰입니다."));

        User user = usersService.findByIdWithPassword(record.getUserId())
            .orElseThrow(() -> new BadCredentialsException("유저 정보를 찾을 수 없습니다."));

        User patch = new User();
        patch.setPasswordHash(passwordEncoder.encode(newPassword));
        usersService.updateAllowNulls(user.getId(), patch);

        record.setUsedAt(OffsetDateTime.now());
        passwordResetRepo.save(record);

        revokeAllRefreshTokens(user.getId());
        return new SimpleMessage(true, "");
    }

    @Transactional
    public Object changePassword(UUID userId, String currentPassword, String newPassword) {
        if (currentPassword == null || newPassword == null) {
            throw new IllegalArgumentException("currentPassword와 newPassword가 필요합니다.");
        }
        User user = usersService.findByIdWithPassword(userId)
            .orElseThrow(() -> new BadCredentialsException("비밀번호를 변경할 수 없습니다."));

        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw new BadCredentialsException("현재 비밀번호가 올바르지 않습니다.");
        }

        User patch = new User();
        patch.setPasswordHash(passwordEncoder.encode(newPassword));
        usersService.updateAllowNulls(userId, patch);
        revokeAllRefreshTokens(userId);
        return new SimpleMessage(true, "");
    }

    @Transactional
    public Object requestEmailChange(UUID userId, String newEmail) {
        if (newEmail == null || newEmail.isBlank()) {
            throw new IllegalArgumentException("newEmail이 필요합니다.");
        }

        User user = usersService.findByIdWithPassword(userId)
            .orElseThrow(() -> new BadCredentialsException("유저 정보를 찾을 수 없습니다."));

        if (user.getEmail().equals(newEmail)) {
            return new SimpleMessage(true, "이메일 변경 확인 메일을 발송했습니다. 메일함을 확인해 주세요.");
        }

        User existing = usersService.findByEmail(newEmail).orElse(null);
        if (existing != null && !existing.getId().equals(user.getId())) {
            throw new IllegalStateException("이미 사용 중인 이메일입니다.");
        }

        List<EmailChangeToken> allTokens = emailChangeRepo.findAll();
        for (EmailChangeToken token : allTokens) {
            if (token.getUserId().equals(user.getId()) && token.getUsedAt() == null) {
                token.setUsedAt(OffsetDateTime.now());
                emailChangeRepo.save(token);
            }
        }

        String rawToken = java.util.UUID.randomUUID().toString().replace("-", "") + java.util.UUID.randomUUID().toString().replace("-", "");
        EmailChangeToken record = new EmailChangeToken();
        record.setUserId(user.getId());
        record.setTokenHash(hashToken(rawToken));
        record.setNewEmail(newEmail);
        record.setExpiresAt(OffsetDateTime.now().plusDays(1));
        emailChangeRepo.save(record);

        mailService.sendEmailChange(newEmail, rawToken, user.getName());
        return new SimpleMessage(true, "이메일 변경 확인 메일을 발송했습니다. 메일함을 확인해 주세요.");
    }

    @Transactional
    public Object confirmEmailChange(String token) {
        if (token == null || token.isBlank()) {
            throw new BadCredentialsException("유효하지 않은 토큰입니다.");
        }

        String hash = hashToken(token);
        EmailChangeToken record = emailChangeRepo.findByTokenHashAndUsedAtIsNullAndExpiresAtAfter(hash, OffsetDateTime.now())
            .orElseThrow(() -> new BadCredentialsException("유효하지 않거나 만료된 토큰입니다."));

        User user = usersService.findByIdWithPassword(record.getUserId())
            .orElseThrow(() -> new BadCredentialsException("유저 정보를 찾을 수 없습니다."));

        User existing = usersService.findByEmail(record.getNewEmail()).orElse(null);
        if (existing != null && !existing.getId().equals(user.getId())) {
            throw new IllegalStateException("이미 사용 중인 이메일입니다.");
        }

        User patch = new User();
        patch.setEmail(record.getNewEmail());
        patch.setEmailVerifiedAt(OffsetDateTime.now());
        usersService.updateAllowNulls(user.getId(), patch);

        record.setUsedAt(OffsetDateTime.now());
        emailChangeRepo.save(record);

        revokeAllRefreshTokens(user.getId());
        return issueTokens(user.getId(), record.getNewEmail(), user.getRole(), null);
    }

    @Transactional
    public Object deleteAccount(UUID userId, String password) {
        User user = usersService.findByIdWithPassword(userId)
            .orElseThrow(() -> new BadCredentialsException("유저 정보를 찾을 수 없습니다."));

        if (user.getPasswordHash() != null) {
            if (password == null || password.isBlank()) {
                throw new IllegalArgumentException("비밀번호가 필요합니다.");
            }
            if (!passwordEncoder.matches(password, user.getPasswordHash())) {
                throw new BadCredentialsException("비밀번호가 올바르지 않습니다.");
            }
        }

        revokeAllRefreshTokens(userId);

        String anonymizedEmail = "deleted+" + user.getId() + "@cowrite.local";
        User patch = new User();
        patch.setEmail(anonymizedEmail);
        patch.setName("탈퇴한 사용자");
        patch.setPasswordHash(null);
        patch.setOauthProvider(null);
        patch.setOauthId(null);
        patch.setEmailVerifiedAt(null);
        usersService.updateAllowNulls(userId, patch);
        usersService.softDelete(userId);
        return new SimpleMessage(true, "");
    }

    private void sendVerification(UUID userId, String email, String name) {
        verifyRepo.findAll().stream()
            .filter(token -> token.getUserId().equals(userId) && token.getUsedAt() == null)
            .forEach(token -> {
                token.setUsedAt(OffsetDateTime.now());
                verifyRepo.save(token);
            });

        String rawToken = java.util.UUID.randomUUID().toString().replace("-", "") + java.util.UUID.randomUUID().toString().replace("-", "");
        EmailVerificationToken record = new EmailVerificationToken();
        record.setUserId(userId);
        record.setTokenHash(hashToken(rawToken));
        record.setExpiresAt(OffsetDateTime.now().plusDays(1));
        verifyRepo.save(record);

        mailService.sendEmailVerification(email, rawToken, name);
    }

    private Object issueTokens(UUID userId, String email, String role, SessionMeta meta) {
        if (email == null || role == null) {
            User user = usersService.findById(userId).orElseThrow();
            if (email == null) email = user.getEmail();
            if (role == null) role = user.getRole();
        }
        String accessToken = jwtTokenService.generateAccessToken(userId.toString(), email, role);
        String refreshToken = jwtTokenService.generateRefreshToken(userId.toString());

        RefreshToken token = new RefreshToken();
        token.setUserId(userId);
        token.setTokenHash(passwordEncoder.encode(refreshToken));
        token.setUserAgent(meta == null ? null : meta.userAgent());
        token.setIpAddress(meta == null ? null : meta.ipAddress());

        long refreshMs = jwtTokenService.refreshExpiryMs();
        token.setExpiresAt(OffsetDateTime.now().plusSeconds(Math.max(1, refreshMs / 1000)));

        refreshTokenRepository.save(token);

        return new TokenResponse(accessToken, refreshToken);
    }

    private void revokeAllRefreshTokens(UUID userId) {
        List<RefreshToken> tokens = refreshTokenRepository.findByUserIdAndRevokedAtIsNull(userId);
        for (RefreshToken token : tokens) {
            token.setRevokedAt(OffsetDateTime.now());
        }
        refreshTokenRepository.saveAll(tokens);
    }

    private String hashToken(String raw) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 not available", ex);
        }
    }

    public record SessionMeta(String userAgent, String ipAddress) {}
    public record TokenResponse(String accessToken, String refreshToken) {}
    public record SimpleMessage(boolean success, String message) {}
    public record SessionInfo(UUID id, OffsetDateTime createdAt, OffsetDateTime expiresAt, OffsetDateTime revokedAt, String userAgent, String ipAddress) {}
}
