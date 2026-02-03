package store.pjcloud.cowrite.core.repository;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import store.pjcloud.cowrite.core.entity.BetaSession;

public interface BetaSessionRepository extends JpaRepository<BetaSession, UUID> {
    List<BetaSession> findByProjectIdInOrderByCreatedAtDesc(List<UUID> projectIds);
}
