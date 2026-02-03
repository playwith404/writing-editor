package store.pjcloud.cowrite.core.controller;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import store.pjcloud.cowrite.core.common.UserScopedCrudController;
import store.pjcloud.cowrite.core.entity.AiRequest;
import store.pjcloud.cowrite.core.service.AiRequestsService;

@RestController
@RequestMapping("/ai-requests")
public class AiRequestsController extends UserScopedCrudController<AiRequest> {
    public AiRequestsController(AiRequestsService service) {
        super(service);
    }
}
