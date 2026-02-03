package store.pjcloud.cowrite.core.repository;

import java.time.OffsetDateTime;
import java.util.UUID;
import store.pjcloud.cowrite.core.common.UserScopedRepository;
import store.pjcloud.cowrite.core.entity.AiRequest;

public interface AiRequestRepository extends UserScopedRepository<AiRequest> {
    long countByUserIdAndCreatedAtAfter(UUID userId, OffsetDateTime createdAt);
}
