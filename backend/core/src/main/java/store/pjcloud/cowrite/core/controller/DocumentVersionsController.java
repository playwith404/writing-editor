package store.pjcloud.cowrite.core.controller;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;
import store.pjcloud.cowrite.core.entity.Document;
import store.pjcloud.cowrite.core.entity.DocumentVersion;
import store.pjcloud.cowrite.core.security.SecurityUtils;
import store.pjcloud.cowrite.core.service.DocumentVersionsService;

@RestController
@RequestMapping("/document-versions")
public class DocumentVersionsController {
    private final DocumentVersionsService service;

    public DocumentVersionsController(DocumentVersionsService service) {
        this.service = service;
    }

    @GetMapping
    public List<DocumentVersion> list(@RequestParam("documentId") UUID documentId) {
        UUID userId = SecurityUtils.requireUserId();
        return service.findAllForUser(userId, documentId);
    }

    @GetMapping("/{id}")
    public DocumentVersion get(@PathVariable("id") UUID id) {
        UUID userId = SecurityUtils.requireUserId();
        return service.findOneForUser(userId, id);
    }

    @PostMapping
    public DocumentVersion create(@RequestBody DocumentVersion body) {
        UUID userId = SecurityUtils.requireUserId();
        return service.createForUser(userId, body);
    }

    @PostMapping("/{id}/restore")
    public Document restore(@PathVariable("id") UUID id) {
        UUID userId = SecurityUtils.requireUserId();
        return service.restoreForUser(userId, id);
    }

    @DeleteMapping("/{id}")
    public Map<String, Object> delete(@PathVariable("id") UUID id) {
        UUID userId = SecurityUtils.requireUserId();
        service.removeForUser(userId, id);
        return Map.of("success", true);
    }
}
