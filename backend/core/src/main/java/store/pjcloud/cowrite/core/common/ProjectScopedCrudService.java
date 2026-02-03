package store.pjcloud.cowrite.core.common;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.jpa.domain.Specification;
import store.pjcloud.cowrite.core.service.ProjectAccessService;

public class ProjectScopedCrudService<T extends ProjectScoped> {
    private final ProjectScopedRepository<T> repository;
    private final ProjectAccessService projectAccessService;
    private final ObjectMapper objectMapper;
    private final Class<T> entityClass;

    public ProjectScopedCrudService(ProjectScopedRepository<T> repository,
                                    ProjectAccessService projectAccessService,
                                    ObjectMapper objectMapper,
                                    Class<T> entityClass) {
        this.repository = repository;
        this.projectAccessService = projectAccessService;
        this.objectMapper = objectMapper;
        this.entityClass = entityClass;
    }

    public List<T> findAllForUser(UUID userId, UUID projectId) {
        if (userId == null) return List.of();
        List<UUID> projectIds = projectAccessService.filterAccessibleProjectIds(userId, projectId);
        if (projectIds.isEmpty()) return List.of();
        Specification<T> spec = (root, query, cb) -> root.get("projectId").in(projectIds);
        return repository.findAll(spec);
    }

    public T findOneForUser(UUID userId, UUID id) {
        if (userId == null) return null;
        T record = repository.findById(id).orElse(null);
        if (record == null) return null;
        projectAccessService.assertProjectAccess(userId, record.getProjectId());
        return record;
    }

    public T createForUser(UUID userId, Map<String, Object> body) {
        if (userId == null) throw new IllegalArgumentException("유저 정보가 필요합니다.");
        T entity = objectMapper.convertValue(body, entityClass);
        if (entity.getProjectId() == null) throw new IllegalArgumentException("projectId가 필요합니다.");
        projectAccessService.assertProjectAccess(userId, entity.getProjectId());
        return repository.save(entity);
    }

    public T updateForUser(UUID userId, UUID id, Map<String, Object> body) {
        if (userId == null) return null;
        T existing = repository.findById(id).orElse(null);
        if (existing == null) return null;
        projectAccessService.assertProjectAccess(userId, existing.getProjectId());
        try {
            objectMapper.updateValue(existing, body);
        } catch (com.fasterxml.jackson.databind.JsonMappingException ex) {
            throw new IllegalArgumentException("수정할 값이 올바르지 않습니다.");
        }
        return repository.save(existing);
    }

    public void removeForUser(UUID userId, UUID id) {
        if (userId == null) return;
        T existing = repository.findById(id).orElse(null);
        if (existing == null) return;
        projectAccessService.assertProjectAccess(userId, existing.getProjectId());
        repository.deleteById(id);
    }

    public ProjectScopedRepository<T> repository() {
        return repository;
    }
}
