package store.pjcloud.cowrite.core.service;

import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import store.pjcloud.cowrite.core.entity.Plot;
import store.pjcloud.cowrite.core.entity.PlotPoint;
import store.pjcloud.cowrite.core.repository.PlotPointRepository;
import store.pjcloud.cowrite.core.repository.PlotRepository;

@Service
public class PlotPointsService {
    private final PlotPointRepository pointsRepo;
    private final PlotRepository plotsRepo;
    private final ProjectAccessService projectAccessService;

    public PlotPointsService(PlotPointRepository pointsRepo,
                             PlotRepository plotsRepo,
                             ProjectAccessService projectAccessService) {
        this.pointsRepo = pointsRepo;
        this.plotsRepo = plotsRepo;
        this.projectAccessService = projectAccessService;
    }

    private Plot assertPlotAccess(UUID userId, UUID plotId) {
        Plot plot = plotsRepo.findById(plotId).orElse(null);
        if (plot == null) {
            throw new IllegalArgumentException("플롯을 찾을 수 없습니다.");
        }
        projectAccessService.assertProjectAccess(userId, plot.getProjectId());
        return plot;
    }

    public List<PlotPoint> findAllForUser(UUID userId, UUID plotId) {
        assertPlotAccess(userId, plotId);
        return pointsRepo.findByPlotIdOrderByOrderIndexAscCreatedAtAsc(plotId);
    }

    public PlotPoint findOneForUser(UUID userId, UUID id) {
        PlotPoint point = pointsRepo.findById(id).orElse(null);
        if (point == null) return null;
        assertPlotAccess(userId, point.getPlotId());
        return point;
    }

    @Transactional
    public PlotPoint createForUser(UUID userId, PlotPoint dto) {
        if (dto.getPlotId() == null) throw new IllegalArgumentException("plotId가 필요합니다.");
        assertPlotAccess(userId, dto.getPlotId());
        return pointsRepo.save(dto);
    }

    @Transactional
    public PlotPoint updateForUser(UUID userId, UUID id, PlotPoint dto) {
        PlotPoint existing = pointsRepo.findById(id).orElse(null);
        if (existing == null) return null;
        assertPlotAccess(userId, existing.getPlotId());
        if (dto.getTitle() != null) existing.setTitle(dto.getTitle());
        if (dto.getDescription() != null) existing.setDescription(dto.getDescription());
        if (dto.getDocumentId() != null) existing.setDocumentId(dto.getDocumentId());
        if (dto.getOrderIndex() != null) existing.setOrderIndex(dto.getOrderIndex());
        if (dto.getMetadata() != null) existing.setMetadata(dto.getMetadata());
        return pointsRepo.save(existing);
    }

    @Transactional
    public void removeForUser(UUID userId, UUID id) {
        PlotPoint existing = pointsRepo.findById(id).orElse(null);
        if (existing == null) return;
        assertPlotAccess(userId, existing.getPlotId());
        pointsRepo.deleteById(id);
    }
}
