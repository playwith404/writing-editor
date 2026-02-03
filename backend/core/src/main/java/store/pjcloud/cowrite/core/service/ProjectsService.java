package store.pjcloud.cowrite.core.service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import store.pjcloud.cowrite.core.entity.Project;
import store.pjcloud.cowrite.core.entity.ProjectMember;
import store.pjcloud.cowrite.core.repository.ProjectMemberRepository;
import store.pjcloud.cowrite.core.repository.ProjectRepository;

@Service
public class ProjectsService {
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository memberRepository;
    private final SearchService searchService;

    public ProjectsService(ProjectRepository projectRepository, ProjectMemberRepository memberRepository, SearchService searchService) {
        this.projectRepository = projectRepository;
        this.memberRepository = memberRepository;
        this.searchService = searchService;
    }

    public List<Project> findAllForUser(UUID userId) {
        List<Project> owned = projectRepository.findByOwnerId(userId);
        List<ProjectMember> memberOf = memberRepository.findByUserId(userId);
        List<Project> projects = new java.util.ArrayList<>(owned);
        for (ProjectMember m : memberOf) {
            projectRepository.findById(m.getProjectId()).ifPresent(projects::add);
        }
        projects.removeIf(p -> p.getDeletedAt() != null);
        projects.sort((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()));
        return projects;
    }

    public long countOwnedActiveProjects(UUID userId) {
        if (userId == null) return 0;
        return projectRepository.countByOwnerIdAndDeletedAtIsNull(userId);
    }

    public Project findOneForUser(UUID userId, UUID projectId) {
        Project project = projectRepository.findById(projectId).orElse(null);
        if (project == null || project.getDeletedAt() != null) return null;
        if (project.getOwnerId().equals(userId)) return project;
        boolean isMember = memberRepository.existsByUserIdAndProjectId(userId, projectId);
        return isMember ? project : null;
    }

    public void assertAccess(UUID userId, UUID projectId) {
        if (findOneForUser(userId, projectId) == null) {
            throw new AccessDeniedException("프로젝트 접근 권한이 없습니다.");
        }
    }

    public void assertOwner(UUID userId, UUID projectId) {
        Project project = projectRepository.findById(projectId).orElse(null);
        if (project == null || project.getDeletedAt() != null || !project.getOwnerId().equals(userId)) {
            throw new AccessDeniedException("프로젝트 소유자만 수행할 수 있습니다.");
        }
    }

    @Transactional
    public Project create(Project project) {
        Project saved = projectRepository.save(project);
        java.util.Map<String, Object> doc = new java.util.HashMap<>();
        doc.put("id", saved.getId().toString());
        doc.put("title", saved.getTitle());
        doc.put("description", saved.getDescription());
        doc.put("genre", saved.getGenre());
        doc.put("ownerId", saved.getOwnerId() == null ? null : saved.getOwnerId().toString());
        searchService.indexDocument("projects", saved.getId().toString(), doc);
        return saved;
    }

    @Transactional
    public Project update(UUID id, Project patch) {
        Project project = projectRepository.findById(id).orElseThrow();
        if (patch.getTitle() != null) project.setTitle(patch.getTitle());
        if (patch.getDescription() != null) project.setDescription(patch.getDescription());
        if (patch.getGenre() != null) project.setGenre(patch.getGenre());
        if (patch.getCoverUrl() != null) project.setCoverUrl(patch.getCoverUrl());
        if (patch.getSettings() != null) project.setSettings(patch.getSettings());
        if (patch.getIsPublic() != null) project.setIsPublic(patch.getIsPublic());
        Project saved = projectRepository.save(project);
        java.util.Map<String, Object> doc = new java.util.HashMap<>();
        doc.put("id", saved.getId().toString());
        doc.put("title", saved.getTitle());
        doc.put("description", saved.getDescription());
        doc.put("genre", saved.getGenre());
        doc.put("ownerId", saved.getOwnerId() == null ? null : saved.getOwnerId().toString());
        searchService.indexDocument("projects", saved.getId().toString(), doc);
        return saved;
    }

    @Transactional
    public Project updateForUser(UUID userId, UUID id, Project patch) {
        assertAccess(userId, id);
        return update(id, patch);
    }

    @Transactional
    public void removeForUser(UUID userId, UUID id) {
        assertOwner(userId, id);
        Project project = projectRepository.findById(id).orElseThrow();
        project.setDeletedAt(OffsetDateTime.now());
        projectRepository.save(project);
    }
}
