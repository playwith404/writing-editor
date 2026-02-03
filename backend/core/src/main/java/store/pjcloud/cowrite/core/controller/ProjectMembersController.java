package store.pjcloud.cowrite.core.controller;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import store.pjcloud.cowrite.core.common.ProjectScopedCrudController;
import store.pjcloud.cowrite.core.entity.ProjectMember;
import store.pjcloud.cowrite.core.service.ProjectMembersService;

@RestController
@RequestMapping("/project-members")
public class ProjectMembersController extends ProjectScopedCrudController<ProjectMember> {
    public ProjectMembersController(ProjectMembersService service) {
        super(service);
    }
}
