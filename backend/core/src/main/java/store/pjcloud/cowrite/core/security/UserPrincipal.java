package store.pjcloud.cowrite.core.security;

import java.util.Collection;
import java.util.List;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

public record UserPrincipal(String userId, String email, String role) {
    public Collection<? extends GrantedAuthority> authorities() {
        if (role == null || role.isBlank()) {
            return List.of();
        }
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.toUpperCase()));
    }
}
