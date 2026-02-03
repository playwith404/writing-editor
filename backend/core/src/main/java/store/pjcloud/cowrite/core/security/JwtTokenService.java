package store.pjcloud.cowrite.core.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Service;
import store.pjcloud.cowrite.core.config.JwtProperties;

@Service
public class JwtTokenService {
    private final JwtProperties properties;
    private final SecretKey key;

    public JwtTokenService(JwtProperties properties) {
        this.properties = properties;
        this.key = Keys.hmacShaKeyFor(properties.getSecret().getBytes(StandardCharsets.UTF_8));
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
