package store.pjcloud.cowrite.core.controller;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import store.pjcloud.cowrite.core.entity.AudioAsset;
import store.pjcloud.cowrite.core.security.SecurityUtils;
import store.pjcloud.cowrite.core.service.AiService;
import store.pjcloud.cowrite.core.service.AudioAssetsService;

@RestController
@RequestMapping("/audio-assets")
public class AudioAssetsController {
    private final AudioAssetsService service;

    public AudioAssetsController(AudioAssetsService service) {
        this.service = service;
    }

    @GetMapping
    public List<AudioAsset> findAll(@RequestParam(value = "documentId", required = false) UUID documentId) {
        UUID userId = SecurityUtils.requireUserId();
        if (documentId == null) return List.of();
        return service.findAllForUser(userId, documentId);
    }

    @GetMapping("/{id}")
    public AudioAsset findOne(@PathVariable("id") UUID id) {
        UUID userId = SecurityUtils.requireUserId();
        return service.findOneForUser(userId, id);
    }

    @PostMapping
    public AudioAsset create(@RequestBody AudioAsset body) {
        UUID userId = SecurityUtils.requireUserId();
        return service.createForUser(userId, body);
    }

    @PostMapping("/generate")
    public AudioAsset generate(@RequestBody Map<String, Object> body) {
        UUID userId = SecurityUtils.requireUserId();
        String role = SecurityUtils.getRole();
        return service.generateForUser(new AiService.UserContext(userId, role), body);
    }

    @DeleteMapping("/{id}")
    public Map<String, Object> remove(@PathVariable("id") UUID id) {
        UUID userId = SecurityUtils.requireUserId();
        service.removeForUser(userId, id);
        return Map.of("success", true);
    }
}
