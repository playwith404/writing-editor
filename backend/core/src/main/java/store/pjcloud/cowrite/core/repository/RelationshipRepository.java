package store.pjcloud.cowrite.core.repository;

import org.springframework.stereotype.Repository;
import store.pjcloud.cowrite.core.common.ProjectScopedRepository;
import store.pjcloud.cowrite.core.entity.Relationship;

@Repository
public interface RelationshipRepository extends ProjectScopedRepository<Relationship> {
}
