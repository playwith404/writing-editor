package store.pjcloud.cowrite.core.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import store.pjcloud.cowrite.core.common.ProjectScopedCrudService;
import store.pjcloud.cowrite.core.entity.ResearchItem;
import store.pjcloud.cowrite.core.repository.ResearchItemRepository;

@Service
public class ResearchItemsService extends ProjectScopedCrudService<ResearchItem> {
    private final ProjectAccessService projectAccessService;
    private final AiService aiService;
    private final ObjectMapper objectMapper;

    public ResearchItemsService(ResearchItemRepository repository,
                                ProjectAccessService projectAccessService,
                                ObjectMapper objectMapper,
                                AiService aiService) {
        super(repository, projectAccessService, objectMapper, ResearchItem.class);
        this.projectAccessService = projectAccessService;
        this.aiService = aiService;
        this.objectMapper = objectMapper;
    }

    public ResearchItem generateForUser(AiService.UserContext user, Map<String, Object> body) {
        Object projectIdObj = body.get("projectId");
        Object queryObj = body.get("query");
        if (!(projectIdObj instanceof String) || ((String) projectIdObj).isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "projectId가 필요합니다.");
        }
        if (!(queryObj instanceof String) || ((String) queryObj).isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "query가 필요합니다.");
        }
        UUID projectId = UUID.fromString((String) projectIdObj);
        projectAccessService.assertProjectAccess(user.userId(), projectId);

        Object ai = aiService.proxy(user, "research", "/ai/research", body);
        ResearchItem item = new ResearchItem();
        item.setProjectId(projectId);
        item.setQuery((String) queryObj);
        item.setResult(objectMapper.convertValue(ai, Map.class));
        return repository().save(item);
    }
}
