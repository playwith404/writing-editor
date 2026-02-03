package store.pjcloud.cowrite.core.service;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import store.pjcloud.cowrite.core.entity.Project;
import store.pjcloud.cowrite.core.entity.ProjectMember;
import store.pjcloud.cowrite.core.repository.ProjectMemberRepository;
import store.pjcloud.cowrite.core.repository.ProjectRepository;

@Service
public class ProjectAccessService {
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository memberRepository;

    public ProjectAccessService(ProjectRepository projectRepository, ProjectMemberRepository memberRepository) {
        this.projectRepository = projectRepository;
        this.memberRepository = memberRepository;
    }

    public List<UUID> getAccessibleProjectIds(UUID userId) {
        List<Project> owned = projectRepository.findByOwnerId(userId);
        List<ProjectMember> memberOf = memberRepository.findByUserId(userId);

        Set<UUID> ids = new HashSet<>();
        for (Project p : owned) ids.add(p.getId());
        for (ProjectMember m : memberOf) ids.add(m.getProjectId());
        return new ArrayList<>(ids);
    }

    public String getProjectRole(UUID userId, UUID projectId) {
        Project project = projectRepository.findById(projectId).orElse(null);
        if (project == null) return null;
        if (project.getOwnerId() != null && project.getOwnerId().equals(userId)) return "owner";

        return memberRepository.findByProjectIdAndUserId(projectId, userId)
            .map(ProjectMember::getRole)
            .orElse(null);
    }

    public boolean hasProjectAccess(UUID userId, UUID projectId) {
        return getProjectRole(userId, projectId) != null;
    }

    public void assertProjectAccess(UUID userId, UUID projectId) {
        if (!hasProjectAccess(userId, projectId)) {
            throw new AccessDeniedException("프로젝트 접근 권한이 없습니다.");
        }
    }

    public void assertProjectOwner(UUID userId, UUID projectId) {
        String role = getProjectRole(userId, projectId);
        if (!"owner".equals(role)) {
            throw new AccessDeniedException("프로젝트 소유자만 수행할 수 있습니다.");
        }
    }

    public List<UUID> filterAccessibleProjectIds(UUID userId, UUID requestedProjectId) {
        if (requestedProjectId == null) {
            return getAccessibleProjectIds(userId);
        }
        assertProjectAccess(userId, requestedProjectId);
        return List.of(requestedProjectId);
    }

    public boolean isMember(UUID userId, UUID projectId) {
        return memberRepository.existsByUserIdAndProjectId(userId, projectId);
    }

    public boolean isOwner(UUID userId, UUID projectId) {
        return projectRepository.existsByIdAndOwnerId(projectId, userId);
    }

    public List<ProjectMember> findMembers(UUID projectId) {
        return memberRepository.findByProjectId(projectId);
    }

    public ProjectMember addMember(UUID projectId, UUID userId, String role) {
        return memberRepository.findByProjectIdAndUserId(projectId, userId)
            .orElseGet(() -> {
                ProjectMember member = new ProjectMember();
                member.setProjectId(projectId);
                member.setUserId(userId);
                member.setRole(role == null ? "editor" : role);
                return memberRepository.save(member);
            });
    }

    public void removeMember(UUID projectId, UUID userId) {
        memberRepository.deleteByProjectIdAndUserId(projectId, userId);
    }

    public void removeMemberById(UUID projectId, UUID memberId) {
        ProjectMember member = memberRepository.findById(memberId).orElse(null);
        if (member == null || !projectId.equals(member.getProjectId())) return;
        memberRepository.deleteById(memberId);
    }

    public List<Project> projectsByIds(List<UUID> projectIds) {
        if (projectIds == null || projectIds.isEmpty()) return List.of();
        return projectRepository.findAllById(projectIds);
    }
}
