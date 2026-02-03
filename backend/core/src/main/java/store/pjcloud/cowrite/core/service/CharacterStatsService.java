package store.pjcloud.cowrite.core.service;

import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import store.pjcloud.cowrite.core.entity.Character;
import store.pjcloud.cowrite.core.entity.CharacterStat;
import store.pjcloud.cowrite.core.repository.CharacterRepository;
import store.pjcloud.cowrite.core.repository.CharacterStatRepository;

@Service
public class CharacterStatsService {
    private final CharacterStatRepository statsRepo;
    private final CharacterRepository charactersRepo;
    private final ProjectAccessService projectAccessService;

    public CharacterStatsService(CharacterStatRepository statsRepo,
                                 CharacterRepository charactersRepo,
                                 ProjectAccessService projectAccessService) {
        this.statsRepo = statsRepo;
        this.charactersRepo = charactersRepo;
        this.projectAccessService = projectAccessService;
    }

    private Character assertCharacterAccess(UUID userId, UUID characterId) {
        Character character = charactersRepo.findById(characterId).orElse(null);
        if (character == null) {
            throw new IllegalArgumentException("캐릭터를 찾을 수 없습니다.");
        }
        projectAccessService.assertProjectAccess(userId, character.getProjectId());
        return character;
    }

    public List<CharacterStat> findAllForUser(UUID userId, UUID characterId) {
        assertCharacterAccess(userId, characterId);
        return statsRepo.findByCharacterIdOrderByCreatedAtDesc(characterId);
    }

    public CharacterStat findOneForUser(UUID userId, UUID id) {
        CharacterStat stat = statsRepo.findById(id).orElse(null);
        if (stat == null) return null;
        assertCharacterAccess(userId, stat.getCharacterId());
        return stat;
    }

    @Transactional
    public CharacterStat createForUser(UUID userId, CharacterStat dto) {
        if (dto.getCharacterId() == null) throw new IllegalArgumentException("characterId가 필요합니다.");
        assertCharacterAccess(userId, dto.getCharacterId());
        return statsRepo.save(dto);
    }

    @Transactional
    public CharacterStat updateForUser(UUID userId, UUID id, CharacterStat dto) {
        CharacterStat existing = statsRepo.findById(id).orElse(null);
        if (existing == null) return null;
        assertCharacterAccess(userId, existing.getCharacterId());
        if (dto.getTemplateType() != null) existing.setTemplateType(dto.getTemplateType());
        if (dto.getStats() != null) existing.setStats(dto.getStats());
        if (dto.getEpisodeNum() != null) existing.setEpisodeNum(dto.getEpisodeNum());
        return statsRepo.save(existing);
    }

    @Transactional
    public void removeForUser(UUID userId, UUID id) {
        CharacterStat existing = statsRepo.findById(id).orElse(null);
        if (existing == null) return;
        assertCharacterAccess(userId, existing.getCharacterId());
        statsRepo.deleteById(id);
    }
}
