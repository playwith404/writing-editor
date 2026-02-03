package store.pjcloud.cowrite.core.controller;

import java.util.Map;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;
import store.pjcloud.cowrite.core.common.ProjectScopedCrudController;
import store.pjcloud.cowrite.core.entity.ResearchItem;
import store.pjcloud.cowrite.core.security.SecurityUtils;
import store.pjcloud.cowrite.core.service.AiService;
import store.pjcloud.cowrite.core.service.ResearchItemsService;

@RestController
@RequestMapping("/research-items")
public class ResearchItemsController extends ProjectScopedCrudController<ResearchItem> {
    private final ResearchItemsService researchItemsService;

    public ResearchItemsController(ResearchItemsService service) {
        super(service);
        this.researchItemsService = service;
    }

    @PostMapping("/generate")
    public ResearchItem generate(@RequestBody Map<String, Object> body) {
        UUID userId = SecurityUtils.requireUserId();
        String role = SecurityUtils.getRole();
        return researchItemsService.generateForUser(new AiService.UserContext(userId, role), body);
    }
}
