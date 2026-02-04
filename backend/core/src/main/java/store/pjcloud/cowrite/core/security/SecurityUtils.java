package store.pjcloud.cowrite.core.security;

import java.util.UUID;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class SecurityUtils {
    private SecurityUtils() {}

    public static UUID requireUserId() {
        String userId = getUserId();
        if (userId == null) {
            throw new BadCredentialsException("로그인이 필요합니다.");
        }
        try {
            return UUID.fromString(userId);
        } catch (IllegalArgumentException ex) {
            throw new BadCredentialsException("로그인이 필요합니다.");
        }
    }

    public static String getUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getPrincipal() == null) return null;
        Object principal = auth.getPrincipal();
        if (principal instanceof UserPrincipal user) {
            return user.userId();
        }
        if (principal instanceof String str) {
            if ("anonymousUser".equals(str)) return null;
            return str;
        }
        return null;
    }

    public static String getRole() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getPrincipal() == null) return null;
        Object principal = auth.getPrincipal();
        if (principal instanceof UserPrincipal user) {
            return user.role();
        }
        return null;
    }
}
