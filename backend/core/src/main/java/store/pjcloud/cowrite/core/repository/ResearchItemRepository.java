package store.pjcloud.cowrite.core.repository;

import org.springframework.stereotype.Repository;
import store.pjcloud.cowrite.core.common.ProjectScopedRepository;
import store.pjcloud.cowrite.core.entity.ResearchItem;

@Repository
public interface ResearchItemRepository extends ProjectScopedRepository<ResearchItem> {
}
