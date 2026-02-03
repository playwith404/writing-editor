package store.pjcloud.cowrite.core.controller;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import store.pjcloud.cowrite.core.common.UserScopedCrudController;
import store.pjcloud.cowrite.core.entity.AiUsage;
import store.pjcloud.cowrite.core.service.AiUsageService;

@RestController
@RequestMapping("/ai-usage")
public class AiUsageController extends UserScopedCrudController<AiUsage> {
    public AiUsageController(AiUsageService service) {
        super(service);
    }
}
