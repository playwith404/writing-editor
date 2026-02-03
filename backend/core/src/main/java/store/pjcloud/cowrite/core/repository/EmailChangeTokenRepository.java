package store.pjcloud.cowrite.core.repository;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import store.pjcloud.cowrite.core.entity.EmailChangeToken;

public interface EmailChangeTokenRepository extends JpaRepository<EmailChangeToken, UUID> {
    Optional<EmailChangeToken> findByTokenHashAndUsedAtIsNullAndExpiresAtAfter(String tokenHash, OffsetDateTime now);
}
