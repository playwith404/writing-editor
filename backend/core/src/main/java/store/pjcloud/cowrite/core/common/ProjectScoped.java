package store.pjcloud.cowrite.core.common;

import java.util.UUID;

public interface ProjectScoped {
    UUID getProjectId();
    void setProjectId(UUID projectId);
}
