package store.pjcloud.cowrite.core.controller;

import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import store.pjcloud.cowrite.core.entity.Project;
import store.pjcloud.cowrite.core.entity.ProjectMember;
import store.pjcloud.cowrite.core.security.SecurityUtils;
import store.pjcloud.cowrite.core.service.ProjectAccessService;
import store.pjcloud.cowrite.core.service.ProjectsService;

@RestController
@RequestMapping("/projects")
public class ProjectsController {
    private final ProjectsService projectsService;
    private final ProjectAccessService projectAccessService;

    public ProjectsController(ProjectsService projectsService, ProjectAccessService projectAccessService) {
        this.projectsService = projectsService;
        this.projectAccessService = projectAccessService;
    }

    @GetMapping
    public List<Project> findAll() {
        UUID userId = SecurityUtils.requireUserId();
        return projectsService.findAllForUser(userId);
    }

    @GetMapping("/{id}")
    public Project findOne(@PathVariable("id") UUID id) {
        UUID userId = SecurityUtils.requireUserId();
        Project project = projectsService.findOneForUser(userId, id);
        if (project == null) {
            throw new IllegalStateException("프로젝트를 찾을 수 없습니다.");
        }
        return project;
    }

    @PostMapping
    public Project create(@RequestBody ProjectCreateRequest request) {
        UUID userId = SecurityUtils.requireUserId();
        String role = SecurityUtils.getRole();
        if (role == null || "user".equals(role)) {
            long owned = projectsService.countOwnedActiveProjects(userId);
            if (owned >= 1) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Free 플랜은 프로젝트를 1개까지만 생성할 수 있습니다.");
            }
        }
        Project project = new Project();
        project.setOwnerId(userId);
        project.setTitle(request.title());
        project.setDescription(request.description());
        project.setGenre(request.genre());
        project.setCoverUrl(request.coverUrl());
        project.setSettings(request.settings());
        return projectsService.create(project);
    }

    @PatchMapping("/{id}")
    public Project update(@PathVariable("id") UUID id, @RequestBody ProjectUpdateRequest request) {
        UUID userId = SecurityUtils.requireUserId();
        Project patch = new Project();
        patch.setTitle(request.title());
        patch.setDescription(request.description());
        patch.setGenre(request.genre());
        patch.setCoverUrl(request.coverUrl());
        patch.setSettings(request.settings());
        patch.setIsPublic(request.isPublic());
        return projectsService.updateForUser(userId, id, patch);
    }

    @DeleteMapping("/{id}")
    public Object remove(@PathVariable("id") UUID id) {
        UUID userId = SecurityUtils.requireUserId();
        projectsService.removeForUser(userId, id);
        return java.util.Map.of("success", true);
    }

    @GetMapping("/{id}/access")
    public Object access(@PathVariable("id") UUID id) {
        UUID userId = SecurityUtils.requireUserId();
        projectAccessService.assertProjectAccess(userId, id);
        java.util.Map<String, Object> res = new java.util.HashMap<>();
        res.put("ok", true);
        res.put("userId", userId.toString());
        res.put("role", SecurityUtils.getRole());
        return res;
    }

    @GetMapping("/{id}/members")
    public List<ProjectMember> members(@PathVariable("id") UUID id) {
        UUID userId = SecurityUtils.requireUserId();
        projectAccessService.assertProjectAccess(userId, id);
        return projectAccessService.findMembers(id);
    }

    @PostMapping("/{id}/members")
    public ProjectMember addMember(@PathVariable("id") UUID id, @RequestBody ProjectMemberRequest request) {
        UUID userId = SecurityUtils.requireUserId();
        projectAccessService.assertProjectOwner(userId, id);
        return projectAccessService.addMember(id, request.userId(), request.role());
    }

    @DeleteMapping("/{id}/members/{memberId}")
    public Object removeMember(@PathVariable("id") UUID id, @PathVariable("memberId") UUID memberId) {
        UUID userId = SecurityUtils.requireUserId();
        projectAccessService.assertProjectOwner(userId, id);
        projectAccessService.removeMemberById(id, memberId);
        return java.util.Map.of("success", true);
    }

    public record ProjectCreateRequest(String title, String description, String genre, String coverUrl, java.util.Map<String, Object> settings) {}
    public record ProjectUpdateRequest(String title, String description, String genre, String coverUrl, Boolean isPublic, java.util.Map<String, Object> settings) {}
    public record ProjectMemberRequest(UUID userId, String role) {}
}
