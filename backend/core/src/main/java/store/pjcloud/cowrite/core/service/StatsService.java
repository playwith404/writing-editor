package store.pjcloud.cowrite.core.service;

import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import store.pjcloud.cowrite.core.repository.CharacterRepository;
import store.pjcloud.cowrite.core.repository.DocumentRepository;
import store.pjcloud.cowrite.core.repository.PlotRepository;
import store.pjcloud.cowrite.core.repository.WorldSettingRepository;

@Service
public class StatsService {
    private final DocumentRepository documentRepo;
    private final CharacterRepository characterRepo;
    private final WorldSettingRepository worldRepo;
    private final PlotRepository plotRepo;

    public StatsService(DocumentRepository documentRepo,
                        CharacterRepository characterRepo,
                        WorldSettingRepository worldRepo,
                        PlotRepository plotRepo) {
        this.documentRepo = documentRepo;
        this.characterRepo = characterRepo;
        this.worldRepo = worldRepo;
        this.plotRepo = plotRepo;
    }

    public Map<String, Object> projectStats(UUID projectId) {
        long documents = documentRepo.findByProjectId(projectId).size();
        long characters = characterRepo.count((root, query, cb) -> cb.equal(root.get("projectId"), projectId));
        long worldSettings = worldRepo.count((root, query, cb) -> cb.equal(root.get("projectId"), projectId));
        long plots = plotRepo.count((root, query, cb) -> cb.equal(root.get("projectId"), projectId));
        Long sum = documentRepo.sumWordCount(projectId);

        return Map.of(
            "projectId", projectId,
            "documents", documents,
            "characters", characters,
            "worldSettings", worldSettings,
            "plots", plots,
            "wordCount", sum == null ? 0 : sum
        );
    }
}
