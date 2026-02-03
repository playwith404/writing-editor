package store.pjcloud.cowrite.core.repository;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import store.pjcloud.cowrite.core.entity.PlotPoint;

public interface PlotPointRepository extends JpaRepository<PlotPoint, UUID> {
    List<PlotPoint> findByPlotIdOrderByOrderIndexAscCreatedAtAsc(UUID plotId);
    List<PlotPoint> findByPlotIdInOrderByOrderIndexAscCreatedAtAsc(List<UUID> plotIds);
}
