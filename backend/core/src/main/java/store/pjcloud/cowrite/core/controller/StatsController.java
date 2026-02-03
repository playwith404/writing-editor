package store.pjcloud.cowrite.core.controller;

import java.util.Map;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import store.pjcloud.cowrite.core.security.SecurityUtils;
import store.pjcloud.cowrite.core.service.ProjectAccessService;
import store.pjcloud.cowrite.core.service.StatsService;

@RestController
@RequestMapping("/stats")
public class StatsController {
    private final StatsService statsService;
    private final ProjectAccessService projectAccessService;

    public StatsController(StatsService statsService, ProjectAccessService projectAccessService) {
        this.statsService = statsService;
        this.projectAccessService = projectAccessService;
    }

    @GetMapping("/projects/{projectId}")
    public Map<String, Object> projectStats(@PathVariable("projectId") UUID projectId) {
        UUID userId = SecurityUtils.requireUserId();
        projectAccessService.assertProjectAccess(userId, projectId);
        return statsService.projectStats(projectId);
    }
}
