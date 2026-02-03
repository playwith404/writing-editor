package store.pjcloud.cowrite.core.repository;

import org.springframework.stereotype.Repository;
import store.pjcloud.cowrite.core.common.UserScopedRepository;
import store.pjcloud.cowrite.core.entity.AiUsage;

@Repository
public interface AiUsageRepository extends UserScopedRepository<AiUsage> {
}
