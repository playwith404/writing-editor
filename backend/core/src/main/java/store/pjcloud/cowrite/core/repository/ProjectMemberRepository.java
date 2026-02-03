package store.pjcloud.cowrite.core.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import store.pjcloud.cowrite.core.common.ProjectScopedRepository;
import store.pjcloud.cowrite.core.entity.ProjectMember;

public interface ProjectMemberRepository extends ProjectScopedRepository<ProjectMember> {
    List<ProjectMember> findByUserId(UUID userId);
    List<ProjectMember> findByProjectId(UUID projectId);
    Optional<ProjectMember> findByProjectIdAndUserId(UUID projectId, UUID userId);
    boolean existsByUserIdAndProjectId(UUID userId, UUID projectId);
    void deleteByProjectIdAndUserId(UUID projectId, UUID userId);
}
