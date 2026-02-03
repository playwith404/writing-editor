package store.pjcloud.cowrite.core.repository;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import store.pjcloud.cowrite.core.entity.BetaSessionInvite;

public interface BetaSessionInviteRepository extends JpaRepository<BetaSessionInvite, UUID> {
    Optional<BetaSessionInvite> findByTokenHash(String tokenHash);
}
