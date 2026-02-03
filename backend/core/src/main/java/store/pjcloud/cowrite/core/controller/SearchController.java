package store.pjcloud.cowrite.core.controller;

import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import store.pjcloud.cowrite.core.security.SecurityUtils;
import store.pjcloud.cowrite.core.service.ProjectAccessService;
import store.pjcloud.cowrite.core.service.SearchService;

@RestController
@RequestMapping("/search")
public class SearchController {
    private final SearchService searchService;
    private final ProjectAccessService projectAccessService;

    public SearchController(SearchService searchService, ProjectAccessService projectAccessService) {
        this.searchService = searchService;
        this.projectAccessService = projectAccessService;
    }

    @GetMapping
    public List<SearchService.SearchHit> search(@RequestParam(value = "q", required = false) String q,
                                                @RequestParam(value = "projectId", required = false) UUID projectId,
                                                @RequestParam(value = "type", required = false) String type) {
        if (q == null || q.isBlank()) return List.of();
        UUID userId = SecurityUtils.requireUserId();

        if ("projects".equals(type)) {
            List<UUID> projectIds = projectAccessService.getAccessibleProjectIds(userId);
            return searchService.searchProjects(q, projectIds.stream().map(UUID::toString).toList());
        }

        List<UUID> projectIds = projectAccessService.filterAccessibleProjectIds(userId, projectId);
        return searchService.search(q, projectIds.stream().map(UUID::toString).toList(), type);
    }
}
