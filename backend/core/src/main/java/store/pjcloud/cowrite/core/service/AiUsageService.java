package store.pjcloud.cowrite.core.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import store.pjcloud.cowrite.core.common.UserScopedCrudService;
import store.pjcloud.cowrite.core.entity.AiUsage;
import store.pjcloud.cowrite.core.repository.AiUsageRepository;

@Service
public class AiUsageService extends UserScopedCrudService<AiUsage> {
    public AiUsageService(AiUsageRepository repository, ObjectMapper mapper) {
        super(repository, mapper, AiUsage.class);
    }
}
