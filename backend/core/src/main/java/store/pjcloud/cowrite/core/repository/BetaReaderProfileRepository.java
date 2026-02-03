package store.pjcloud.cowrite.core.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import store.pjcloud.cowrite.core.entity.BetaReaderProfile;

public interface BetaReaderProfileRepository extends JpaRepository<BetaReaderProfile, UUID> {
    Optional<BetaReaderProfile> findByUserId(UUID userId);

    @Query(value = "select * from beta_reader_profiles p where p.is_active = true and (:genre is null or :genre = any(p.preferred_genres)) order by p.reading_volume desc, p.updated_at desc limit 30", nativeQuery = true)
    List<BetaReaderProfile> recommend(@Param("genre") String genre);
}
