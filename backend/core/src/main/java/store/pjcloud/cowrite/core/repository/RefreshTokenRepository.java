package store.pjcloud.cowrite.core.repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import store.pjcloud.cowrite.core.entity.RefreshToken;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {
    List<RefreshToken> findByUserIdOrderByCreatedAtDesc(UUID userId);
    List<RefreshToken> findByUserIdAndRevokedAtIsNullOrderByCreatedAtDesc(UUID userId);
    long countByUserIdAndRevokedAtIsNull(UUID userId);
    List<RefreshToken> findByUserIdAndRevokedAtIsNull(UUID userId);
    List<RefreshToken> findByUserId(UUID userId);
    void deleteByUserId(UUID userId);
    long countByUserIdAndRevokedAtIsNullAndExpiresAtAfter(UUID userId, OffsetDateTime now);
}
