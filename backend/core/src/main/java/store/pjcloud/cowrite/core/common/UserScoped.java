package store.pjcloud.cowrite.core.common;

import java.util.UUID;

public interface UserScoped {
    UUID getUserId();
    void setUserId(UUID userId);
}
