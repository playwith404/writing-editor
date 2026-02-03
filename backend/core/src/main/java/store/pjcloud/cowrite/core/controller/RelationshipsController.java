package store.pjcloud.cowrite.core.controller;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import store.pjcloud.cowrite.core.common.ProjectScopedCrudController;
import store.pjcloud.cowrite.core.entity.Relationship;
import store.pjcloud.cowrite.core.service.RelationshipsService;

@RestController
@RequestMapping("/relationships")
public class RelationshipsController extends ProjectScopedCrudController<Relationship> {
    public RelationshipsController(RelationshipsService service) {
        super(service);
    }
}
