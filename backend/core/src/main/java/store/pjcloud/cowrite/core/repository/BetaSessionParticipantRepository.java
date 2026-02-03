package store.pjcloud.cowrite.core.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import store.pjcloud.cowrite.core.entity.BetaSessionParticipant;

public interface BetaSessionParticipantRepository extends JpaRepository<BetaSessionParticipant, UUID> {
    Optional<BetaSessionParticipant> findBySessionIdAndUserId(UUID sessionId, UUID userId);
    boolean existsByUserIdAndSessionIdAndStatus(UUID userId, UUID sessionId, String status);
    List<BetaSessionParticipant> findBySessionIdOrderByJoinedAtAsc(UUID sessionId);
}
