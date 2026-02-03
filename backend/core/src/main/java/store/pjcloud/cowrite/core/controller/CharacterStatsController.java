package store.pjcloud.cowrite.core.controller;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;
import store.pjcloud.cowrite.core.entity.CharacterStat;
import store.pjcloud.cowrite.core.security.SecurityUtils;
import store.pjcloud.cowrite.core.service.CharacterStatsService;

@RestController
@RequestMapping("/character-stats")
public class CharacterStatsController {
    private final CharacterStatsService service;

    public CharacterStatsController(CharacterStatsService service) {
        this.service = service;
    }

    @GetMapping
    public List<CharacterStat> list(@RequestParam("characterId") UUID characterId) {
        UUID userId = SecurityUtils.requireUserId();
        return service.findAllForUser(userId, characterId);
    }

    @GetMapping("/{id}")
    public CharacterStat get(@PathVariable("id") UUID id) {
        UUID userId = SecurityUtils.requireUserId();
        return service.findOneForUser(userId, id);
    }

    @PostMapping
    public CharacterStat create(@RequestBody CharacterStat body) {
        UUID userId = SecurityUtils.requireUserId();
        return service.createForUser(userId, body);
    }

    @PatchMapping("/{id}")
    public CharacterStat update(@PathVariable("id") UUID id, @RequestBody CharacterStat body) {
        UUID userId = SecurityUtils.requireUserId();
        return service.updateForUser(userId, id, body);
    }

    @DeleteMapping("/{id}")
    public Map<String, Object> delete(@PathVariable("id") UUID id) {
        UUID userId = SecurityUtils.requireUserId();
        service.removeForUser(userId, id);
        return Map.of("success", true);
    }
}
