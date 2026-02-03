package store.pjcloud.cowrite.core.controller;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import store.pjcloud.cowrite.core.common.ProjectScopedCrudController;
import store.pjcloud.cowrite.core.entity.WorldSetting;
import store.pjcloud.cowrite.core.service.WorldSettingsService;

@RestController
@RequestMapping("/world-settings")
public class WorldSettingsController extends ProjectScopedCrudController<WorldSetting> {
    public WorldSettingsController(WorldSettingsService service) {
        super(service);
    }
}
