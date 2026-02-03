package store.pjcloud.cowrite.core.controller;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import store.pjcloud.cowrite.core.common.ProjectScopedCrudController;
import store.pjcloud.cowrite.core.entity.Plot;
import store.pjcloud.cowrite.core.service.PlotsService;

@RestController
@RequestMapping("/plots")
public class PlotsController extends ProjectScopedCrudController<Plot> {
    public PlotsController(PlotsService service) {
        super(service);
    }
}
