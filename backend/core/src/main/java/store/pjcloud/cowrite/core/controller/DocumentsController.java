package store.pjcloud.cowrite.core.controller;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;
import store.pjcloud.cowrite.core.entity.Document;
import store.pjcloud.cowrite.core.security.SecurityUtils;
import store.pjcloud.cowrite.core.service.DocumentsService;

@RestController
@RequestMapping("/documents")
public class DocumentsController {
    private final DocumentsService documentsService;

    public DocumentsController(DocumentsService documentsService) {
        this.documentsService = documentsService;
    }

    @GetMapping
    public List<Document> list(@RequestParam(value = "projectId", required = false) UUID projectId) {
        UUID userId = SecurityUtils.requireUserId();
        return documentsService.findAllForUser(userId, projectId);
    }

    @GetMapping("/{id}")
    public Document get(@PathVariable("id") UUID id) {
        UUID userId = SecurityUtils.requireUserId();
        return documentsService.findOneForUser(userId, id);
    }

    @PostMapping
    public Document create(@RequestBody Map<String, Object> body) {
        UUID userId = SecurityUtils.requireUserId();
        return documentsService.createForUser(userId, body);
    }

    @PatchMapping("/{id}")
    public Document update(@PathVariable("id") UUID id, @RequestBody Map<String, Object> body) {
        UUID userId = SecurityUtils.requireUserId();
        return documentsService.updateForUser(userId, id, body);
    }

    @DeleteMapping("/{id}")
    public Map<String, Object> delete(@PathVariable("id") UUID id) {
        UUID userId = SecurityUtils.requireUserId();
        documentsService.removeForUser(userId, id);
        return Map.of("success", true);
    }
}
