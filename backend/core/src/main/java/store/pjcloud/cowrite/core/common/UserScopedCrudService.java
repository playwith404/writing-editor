package store.pjcloud.cowrite.core.common;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public class UserScopedCrudService<T extends UserScoped> {
    private final UserScopedRepository<T> repository;
    private final ObjectMapper objectMapper;
    private final Class<T> entityClass;

    public UserScopedCrudService(UserScopedRepository<T> repository, ObjectMapper objectMapper, Class<T> entityClass) {
        this.repository = repository;
        this.objectMapper = objectMapper;
        this.entityClass = entityClass;
    }

    public List<T> findAllForUser(UUID userId) {
        if (userId == null) return List.of();
        return repository.findAll((root, query, cb) -> cb.equal(root.get("userId"), userId));
    }

    public T findOneForUser(UUID userId, UUID id) {
        if (userId == null) return null;
        T record = repository.findById(id).orElse(null);
        if (record == null) return null;
        if (!userId.equals(record.getUserId())) {
            throw new org.springframework.security.access.AccessDeniedException("권한이 없습니다.");
        }
        return record;
    }

    public T createForUser(UUID userId, Map<String, Object> body) {
        if (userId == null) throw new IllegalArgumentException("유저 정보가 필요합니다.");
        body.put("userId", userId);
        T entity = objectMapper.convertValue(body, entityClass);
        return repository.save(entity);
    }

    public T updateForUser(UUID userId, UUID id, Map<String, Object> body) {
        if (userId == null) return null;
        T existing = repository.findById(id).orElse(null);
        if (existing == null) return null;
        if (!userId.equals(existing.getUserId())) {
            throw new org.springframework.security.access.AccessDeniedException("권한이 없습니다.");
        }
        body.remove("userId");
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
        if (!userId.equals(existing.getUserId())) {
            throw new org.springframework.security.access.AccessDeniedException("권한이 없습니다.");
        }
        repository.deleteById(id);
    }

    public UserScopedRepository<T> repository() {
        return repository;
    }
}
