package store.pjcloud.cowrite.core.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import store.pjcloud.cowrite.core.common.UserScopedCrudService;
import store.pjcloud.cowrite.core.entity.AiRequest;
import store.pjcloud.cowrite.core.repository.AiRequestRepository;

@Service
public class AiRequestsService extends UserScopedCrudService<AiRequest> {
    public AiRequestsService(AiRequestRepository repository, ObjectMapper mapper) {
        super(repository, mapper, AiRequest.class);
    }
}
