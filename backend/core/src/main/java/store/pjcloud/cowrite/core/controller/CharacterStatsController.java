package store.pjcloud.cowrite.core.controller;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;
import store.pjcloud.cowrite.core.entity.CharacterStat;
import store.pjcloud.cowrite.core.security.SecurityUtils;
import store.pjcloud.cowrite.core.service.CharacterStatsEngine;
import store.pjcloud.cowrite.core.service.CharacterStatsService;

@RestController
@RequestMapping("/character-stats")
public class CharacterStatsController {
    private final CharacterStatsService service;
    private final CharacterStatsEngine engine;

    public CharacterStatsController(CharacterStatsService service, CharacterStatsEngine engine) {
        this.service = service;
        this.engine = engine;
    }

    @GetMapping("/templates")
    public List<Map<String, Object>> templates() {
        return engine.templates();
    }

    @PostMapping("/calculate")
    public Map<String, Object> calculate(@RequestBody Map<String, Object> body) {
        String templateType = body.get("templateType") instanceof String s ? s : null;
        Map<String, Object> stats = body.get("stats") instanceof Map<?, ?> m ? (Map<String, Object>) m : Map.of();
        return engine.calculate(templateType, stats);
    }

    @GetMapping("/progression")
    public List<Map<String, Object>> progression(@RequestParam("characterId") UUID characterId) {
        UUID userId = SecurityUtils.requireUserId();
        List<CharacterStat> rows = service.findAllForUser(userId, characterId);
        return engine.progression(rows);
    }

    @GetMapping("/consistency")
    public List<Map<String, Object>> consistency(@RequestParam("characterId") UUID characterId) {
        UUID userId = SecurityUtils.requireUserId();
        List<CharacterStat> rows = service.findAllForUser(userId, characterId);
        return engine.validateHistory(rows);
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
