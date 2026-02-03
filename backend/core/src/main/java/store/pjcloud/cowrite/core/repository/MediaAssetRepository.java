package store.pjcloud.cowrite.core.repository;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import store.pjcloud.cowrite.core.entity.MediaAsset;

public interface MediaAssetRepository extends JpaRepository<MediaAsset, UUID> {
    List<MediaAsset> findByProjectIdOrderByCreatedAtDesc(UUID projectId);
    List<MediaAsset> findByIdIn(List<UUID> ids);
}
