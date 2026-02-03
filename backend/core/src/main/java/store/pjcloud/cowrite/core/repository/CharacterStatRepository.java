package store.pjcloud.cowrite.core.repository;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import store.pjcloud.cowrite.core.entity.CharacterStat;

public interface CharacterStatRepository extends JpaRepository<CharacterStat, UUID> {
    List<CharacterStat> findByCharacterIdOrderByCreatedAtDesc(UUID characterId);
    List<CharacterStat> findByCharacterIdInOrderByCreatedAtAsc(List<UUID> characterIds);
}
