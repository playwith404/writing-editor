package store.pjcloud.cowrite.core.common;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;
import store.pjcloud.cowrite.core.security.SecurityUtils;

public abstract class UserScopedCrudController<T extends UserScoped> {
    protected final UserScopedCrudService<T> service;

    protected UserScopedCrudController(UserScopedCrudService<T> service) {
        this.service = service;
    }

    @GetMapping
    public List<T> findAll() {
        UUID userId = SecurityUtils.requireUserId();
        return service.findAllForUser(userId);
    }

    @GetMapping("/{id}")
    public T findOne(@PathVariable("id") UUID id) {
        UUID userId = SecurityUtils.requireUserId();
        return service.findOneForUser(userId, id);
    }

    @PostMapping
    public T create(@RequestBody Map<String, Object> body) {
        UUID userId = SecurityUtils.requireUserId();
        return service.createForUser(userId, body);
    }

    @PatchMapping("/{id}")
    public T update(@PathVariable("id") UUID id, @RequestBody Map<String, Object> body) {
        UUID userId = SecurityUtils.requireUserId();
        return service.updateForUser(userId, id, body);
    }

    @DeleteMapping("/{id}")
    public Map<String, Object> remove(@PathVariable("id") UUID id) {
        UUID userId = SecurityUtils.requireUserId();
        service.removeForUser(userId, id);
        return Map.of("success", true);
    }
}
