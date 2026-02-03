package store.pjcloud.cowrite.core.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import store.pjcloud.cowrite.core.common.ProjectScopedCrudService;
import store.pjcloud.cowrite.core.entity.WritingGoal;
import store.pjcloud.cowrite.core.repository.WritingGoalRepository;

@Service
public class WritingGoalsService extends ProjectScopedCrudService<WritingGoal> {
    public WritingGoalsService(WritingGoalRepository repository,
                               ProjectAccessService projectAccessService,
                               ObjectMapper objectMapper) {
        super(repository, projectAccessService, objectMapper, WritingGoal.class);
    }
}
