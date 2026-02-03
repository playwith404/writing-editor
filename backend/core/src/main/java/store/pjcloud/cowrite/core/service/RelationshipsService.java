package store.pjcloud.cowrite.core.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import store.pjcloud.cowrite.core.common.ProjectScopedCrudService;
import store.pjcloud.cowrite.core.entity.Relationship;
import store.pjcloud.cowrite.core.repository.RelationshipRepository;

@Service
public class RelationshipsService extends ProjectScopedCrudService<Relationship> {
    public RelationshipsService(RelationshipRepository repository,
                                ProjectAccessService projectAccessService,
                                ObjectMapper objectMapper) {
        super(repository, projectAccessService, objectMapper, Relationship.class);
    }
}
