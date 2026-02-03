package store.pjcloud.cowrite.core.service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import store.pjcloud.cowrite.core.entity.User;
import store.pjcloud.cowrite.core.repository.UserRepository;

@Service
public class UsersService {
    private final UserRepository userRepository;

    public UsersService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public List<User> findAll() {
        return userRepository.findAll();
    }

    public Optional<User> findById(UUID id) {
        return userRepository.findById(id);
    }

    public Optional<User> findByIdWithPassword(UUID id) {
        return userRepository.findById(id);
    }

    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    @Transactional
    public User create(User user) {
        return userRepository.save(user);
    }

    @Transactional
    public User update(UUID id, User update) {
        return applyUpdate(id, update);
    }

    @Transactional
    public User updateAllowNulls(UUID id, User update) {
        // NOTE: We cannot reliably distinguish "field omitted" vs "explicit null" with our current DTOs.
        // Treat this as a partial update that ignores nulls to avoid accidentally wiping required columns.
        return applyUpdate(id, update);
    }

    private User applyUpdate(UUID id, User update) {
        User user = userRepository.findById(id).orElseThrow();
        if (update.getEmail() != null) user.setEmail(update.getEmail());
        if (update.getName() != null) user.setName(update.getName());
        if (update.getPasswordHash() != null) user.setPasswordHash(update.getPasswordHash());
        if (update.getAvatarUrl() != null) user.setAvatarUrl(update.getAvatarUrl());
        if (update.getOauthProvider() != null) user.setOauthProvider(update.getOauthProvider());
        if (update.getOauthId() != null) user.setOauthId(update.getOauthId());
        if (update.getSettings() != null) user.setSettings(update.getSettings());
        if (update.getRole() != null) user.setRole(update.getRole());
        if (update.getEmailVerifiedAt() != null) user.setEmailVerifiedAt(update.getEmailVerifiedAt());
        if (update.getDeletedAt() != null) user.setDeletedAt(update.getDeletedAt());
        return userRepository.save(user);
    }

    @Transactional
    public void remove(UUID id) {
        userRepository.deleteById(id);
    }

    @Transactional
    public void softDelete(UUID id) {
        User user = userRepository.findById(id).orElseThrow();
        user.setDeletedAt(OffsetDateTime.now());
        userRepository.save(user);
    }
}
