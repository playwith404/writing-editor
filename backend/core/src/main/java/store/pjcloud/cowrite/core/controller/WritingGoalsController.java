package store.pjcloud.cowrite.core.controller;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import store.pjcloud.cowrite.core.common.ProjectScopedCrudController;
import store.pjcloud.cowrite.core.entity.WritingGoal;
import store.pjcloud.cowrite.core.service.WritingGoalsService;

@RestController
@RequestMapping("/writing-goals")
public class WritingGoalsController extends ProjectScopedCrudController<WritingGoal> {
    public WritingGoalsController(WritingGoalsService service) {
        super(service);
    }
}
