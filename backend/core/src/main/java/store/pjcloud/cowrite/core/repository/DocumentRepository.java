package store.pjcloud.cowrite.core.repository;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import store.pjcloud.cowrite.core.entity.Document;

public interface DocumentRepository extends JpaRepository<Document, UUID> {
    List<Document> findByProjectIdOrderByOrderIndexAscCreatedAtAsc(UUID projectId);
    List<Document> findByProjectId(UUID projectId);

    @Query("select coalesce(sum(d.wordCount), 0) from Document d where d.projectId = :projectId")
    Long sumWordCount(@Param("projectId") UUID projectId);
}
