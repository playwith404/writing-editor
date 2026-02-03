package store.pjcloud.cowrite.core.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Date;
import javax.crypto.SecretKey;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import store.pjcloud.cowrite.core.config.JwtProperties;

@Service
public class JwtTokenService {
    private static final Logger log = LoggerFactory.getLogger(JwtTokenService.class);
    private final JwtProperties properties;
    private final SecretKey key;

    public JwtTokenService(JwtProperties properties) {
        this.properties = properties;
        byte[] secretBytes = properties.getSecret() == null ? new byte[0] : properties.getSecret().getBytes(StandardCharsets.UTF_8);
        if (secretBytes.length == 0) {
            throw new IllegalArgumentException("JWT_SECRET가 필요합니다.");
        }
        // HS256은 최소 256-bit key가 필요합니다. (사용자 설정이 짧아도 서버가 기동되도록 SHA-256으로 확장)
        if (secretBytes.length < 32) {
            log.warn("JWT_SECRET 길이가 짧습니다(현재 {} bytes). SHA-256으로 확장된 키를 사용합니다.", secretBytes.length);
            secretBytes = sha256(secretBytes);
        }
        this.key = Keys.hmacShaKeyFor(secretBytes);
    }

    private byte[] sha256(byte[] input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return md.digest(input);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256을 사용할 수 없습니다.");
        }
    }

    public String generateAccessToken(String userId, String email, String role) {
        long expiresMs = parseExpiryMs(properties.getExpiresIn());
        Instant now = Instant.now();
        return Jwts.builder()
            .setSubject(userId)
            .claim("email", email)
            .claim("role", role)
            .setIssuedAt(Date.from(now))
            .setExpiration(Date.from(now.plusMillis(expiresMs)))
            .signWith(key)
            .compact();
    }

    public String generateRefreshToken(String userId) {
        long expiresMs = parseExpiryMs(properties.getRefreshExpiresIn());
        Instant now = Instant.now();
        return Jwts.builder()
            .setSubject(userId)
            .claim("type", "refresh")
            .setIssuedAt(Date.from(now))
            .setExpiration(Date.from(now.plusMillis(expiresMs)))
            .signWith(key)
            .compact();
    }

    public Jws<Claims> parseToken(String token) {
        return Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token);
    }

    public long parseExpiryMs(String value) {
        if (value == null || value.isBlank()) {
            return 7L * 24 * 60 * 60 * 1000;
        }
        String trimmed = value.trim();
        if (!trimmed.matches("\\d+[smhd]")) {
            try {
                return Long.parseLong(trimmed);
            } catch (NumberFormatException ex) {
                return 7L * 24 * 60 * 60 * 1000;
            }
        }
        long amount = Long.parseLong(trimmed.substring(0, trimmed.length() - 1));
        char unit = trimmed.charAt(trimmed.length() - 1);
        return switch (unit) {
            case 's' -> amount * 1000L;
            case 'm' -> amount * 60 * 1000L;
            case 'h' -> amount * 60 * 60 * 1000L;
            case 'd' -> amount * 24 * 60 * 60 * 1000L;
            default -> amount;
        };
    }

    public long accessExpiryMs() {
        return parseExpiryMs(properties.getExpiresIn());
    }

    public long refreshExpiryMs() {
        return parseExpiryMs(properties.getRefreshExpiresIn());
    }
}
