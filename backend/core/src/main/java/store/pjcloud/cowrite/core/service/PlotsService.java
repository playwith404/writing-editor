package store.pjcloud.cowrite.core.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import store.pjcloud.cowrite.core.common.ProjectScopedCrudService;
import store.pjcloud.cowrite.core.entity.Plot;
import store.pjcloud.cowrite.core.repository.PlotRepository;

@Service
public class PlotsService extends ProjectScopedCrudService<Plot> {
    private final SearchService searchService;

    public PlotsService(PlotRepository repository,
                        ProjectAccessService projectAccessService,
                        ObjectMapper objectMapper,
                        SearchService searchService) {
        super(repository, projectAccessService, objectMapper, Plot.class);
        this.searchService = searchService;
    }

    @Override
    public Plot createForUser(UUID userId, Map<String, Object> body) {
        Plot plot = super.createForUser(userId, body);
        index(plot);
        return plot;
    }

    @Override
    public Plot updateForUser(UUID userId, UUID id, Map<String, Object> body) {
        Plot plot = super.updateForUser(userId, id, body);
        if (plot != null) index(plot);
        return plot;
    }

    private void index(Plot plot) {
        Map<String, Object> doc = new java.util.HashMap<>();
        doc.put("id", plot.getId() == null ? null : plot.getId().toString());
        doc.put("projectId", plot.getProjectId() == null ? null : plot.getProjectId().toString());
        doc.put("title", plot.getTitle());
        doc.put("description", plot.getDescription());
        searchService.indexDocument("plots", plot.getId().toString(), doc);
    }
}
