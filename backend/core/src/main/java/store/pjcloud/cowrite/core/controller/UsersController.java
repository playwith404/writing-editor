package store.pjcloud.cowrite.core.controller;

import java.util.List;
import java.util.UUID;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;
import store.pjcloud.cowrite.core.entity.User;
import store.pjcloud.cowrite.core.security.SecurityUtils;
import store.pjcloud.cowrite.core.service.UsersService;

@RestController
@RequestMapping("/users")
public class UsersController {
    private final UsersService usersService;

    public UsersController(UsersService usersService) {
        this.usersService = usersService;
    }

    @GetMapping
    public List<User> findAll() {
        requireAdmin();
        return usersService.findAll();
    }

    @GetMapping("/{id}")
    public User findOne(@PathVariable("id") UUID id) {
        assertSelfOrAdmin(id);
        return usersService.findById(id).orElseThrow();
    }

    @PostMapping
    public User create(@RequestBody CreateUserRequest request) {
        requireAdmin();
        User user = new User();
        user.setEmail(request.email());
        user.setName(request.name());
        user.setPasswordHash(request.passwordHash());
        user.setAvatarUrl(request.avatarUrl());
        user.setRole(request.role());
        user.setOauthProvider(request.oauthProvider());
        user.setOauthId(request.oauthId());
        return usersService.create(user);
    }

    @PatchMapping("/{id}")
    public User update(@PathVariable("id") UUID id, @RequestBody UpdateUserRequest request) {
        if (isAdmin()) {
            User patch = new User();
            patch.setEmail(request.email());
            patch.setName(request.name());
            patch.setAvatarUrl(request.avatarUrl());
            patch.setRole(request.role());
            patch.setOauthProvider(request.oauthProvider());
            patch.setOauthId(request.oauthId());
            return usersService.updateAllowNulls(id, patch);
        }

        assertSelfOrAdmin(id);
        User patch = new User();
        patch.setName(request.name());
        patch.setAvatarUrl(request.avatarUrl());
        return usersService.updateAllowNulls(id, patch);
    }

    @DeleteMapping("/{id}")
    public Object remove(@PathVariable("id") UUID id) {
        assertSelfOrAdmin(id);
        usersService.remove(id);
        return java.util.Map.of("success", true);
    }

    private void assertSelfOrAdmin(UUID userId) {
        if (isAdmin()) return;
        UUID me = SecurityUtils.requireUserId();
        if (!me.equals(userId)) {
            throw new AccessDeniedException("권한이 없습니다.");
        }
    }

    private void requireAdmin() {
        if (!isAdmin()) {
            throw new AccessDeniedException("관리자만 접근할 수 있습니다.");
        }
    }

    private boolean isAdmin() {
        return "admin".equalsIgnoreCase(SecurityUtils.getRole());
    }

    public record CreateUserRequest(String email, String name, String passwordHash, String avatarUrl, String role, String oauthProvider, String oauthId) {}
    public record UpdateUserRequest(String email, String name, String avatarUrl, String role, String oauthProvider, String oauthId) {}
}
