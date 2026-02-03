package store.pjcloud.cowrite.core.repository;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import store.pjcloud.cowrite.core.entity.EmailVerificationToken;

public interface EmailVerificationTokenRepository extends JpaRepository<EmailVerificationToken, UUID> {
    Optional<EmailVerificationToken> findTopByUserIdOrderByCreatedAtDesc(UUID userId);
    Optional<EmailVerificationToken> findByTokenHashAndUsedAtIsNullAndExpiresAtAfter(String tokenHash, OffsetDateTime now);
}
