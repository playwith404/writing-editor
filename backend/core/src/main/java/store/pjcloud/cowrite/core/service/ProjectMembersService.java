package store.pjcloud.cowrite.core.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import store.pjcloud.cowrite.core.common.ProjectScopedCrudService;
import store.pjcloud.cowrite.core.entity.ProjectMember;
import store.pjcloud.cowrite.core.repository.ProjectMemberRepository;

@Service
public class ProjectMembersService extends ProjectScopedCrudService<ProjectMember> {
    public ProjectMembersService(ProjectMemberRepository repository,
                                 ProjectAccessService projectAccessService,
                                 ObjectMapper objectMapper) {
        super(repository, projectAccessService, objectMapper, ProjectMember.class);
    }
}
