package store.pjcloud.cowrite.core.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import store.pjcloud.cowrite.core.common.ProjectScopedCrudService;
import store.pjcloud.cowrite.core.entity.WorldSetting;
import store.pjcloud.cowrite.core.repository.WorldSettingRepository;

@Service
public class WorldSettingsService extends ProjectScopedCrudService<WorldSetting> {
    private final SearchService searchService;

    public WorldSettingsService(WorldSettingRepository repository,
                                ProjectAccessService projectAccessService,
                                ObjectMapper objectMapper,
                                SearchService searchService) {
        super(repository, projectAccessService, objectMapper, WorldSetting.class);
        this.searchService = searchService;
    }

    @Override
    public WorldSetting createForUser(UUID userId, Map<String, Object> body) {
        WorldSetting setting = super.createForUser(userId, body);
        index(setting);
        return setting;
    }

    @Override
    public WorldSetting updateForUser(UUID userId, UUID id, Map<String, Object> body) {
        WorldSetting setting = super.updateForUser(userId, id, body);
        if (setting != null) index(setting);
        return setting;
    }

    private void index(WorldSetting setting) {
        searchService.indexDocument("world_settings", setting.getId().toString(), Map.of(
            "id", setting.getId().toString(),
            "projectId", setting.getProjectId().toString(),
            "title", setting.getTitle(),
            "content", setting.getContent(),
            "category", setting.getCategory()
        ));
    }
}
