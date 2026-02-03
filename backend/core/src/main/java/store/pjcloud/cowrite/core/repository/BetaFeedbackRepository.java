package store.pjcloud.cowrite.core.repository;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import store.pjcloud.cowrite.core.entity.BetaFeedback;

public interface BetaFeedbackRepository extends JpaRepository<BetaFeedback, UUID> {
    List<BetaFeedback> findBySessionIdOrderByCreatedAtDesc(UUID sessionId);
    List<BetaFeedback> findBySessionIdAndUserIdOrderByCreatedAtDesc(UUID sessionId, UUID userId);
}
