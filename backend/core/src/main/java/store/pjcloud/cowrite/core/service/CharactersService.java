package store.pjcloud.cowrite.core.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import store.pjcloud.cowrite.core.common.ProjectScopedCrudService;
import store.pjcloud.cowrite.core.entity.Character;
import store.pjcloud.cowrite.core.repository.CharacterRepository;

@Service
public class CharactersService extends ProjectScopedCrudService<Character> {
    private final SearchService searchService;

    public CharactersService(CharacterRepository repository,
                             ProjectAccessService projectAccessService,
                             ObjectMapper objectMapper,
                             SearchService searchService) {
        super(repository, projectAccessService, objectMapper, Character.class);
        this.searchService = searchService;
    }

    @Override
    public Character createForUser(UUID userId, Map<String, Object> body) {
        Character character = super.createForUser(userId, body);
        index(character);
        return character;
    }

    @Override
    public Character updateForUser(UUID userId, UUID id, Map<String, Object> body) {
        Character character = super.updateForUser(userId, id, body);
        if (character != null) index(character);
        return character;
    }

    private void index(Character character) {
        Map<String, Object> doc = new java.util.HashMap<>();
        doc.put("id", character.getId() == null ? null : character.getId().toString());
        doc.put("projectId", character.getProjectId() == null ? null : character.getProjectId().toString());
        doc.put("name", character.getName());
        doc.put("role", character.getRole());
        doc.put("backstory", character.getBackstory());
        searchService.indexDocument("characters", character.getId().toString(), doc);
    }
}
