package store.pjcloud.cowrite.core.repository;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import store.pjcloud.cowrite.core.entity.Storyboard;

public interface StoryboardRepository extends JpaRepository<Storyboard, UUID> {
    List<Storyboard> findByDocumentIdOrderByCreatedAtDesc(UUID documentId);
    List<Storyboard> findByDocumentIdInOrderByCreatedAtDesc(List<UUID> documentIds);
}
