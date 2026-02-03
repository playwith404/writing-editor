package store.pjcloud.cowrite.core.controller;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;
import store.pjcloud.cowrite.core.entity.DocumentComment;
import store.pjcloud.cowrite.core.security.SecurityUtils;
import store.pjcloud.cowrite.core.service.DocumentCommentsService;

@RestController
@RequestMapping("/document-comments")
public class DocumentCommentsController {
    private final DocumentCommentsService service;

    public DocumentCommentsController(DocumentCommentsService service) {
        this.service = service;
    }

    @GetMapping
    public List<DocumentComment> list(@RequestParam("documentId") UUID documentId) {
        UUID userId = SecurityUtils.requireUserId();
        return service.findAllForUser(userId, documentId);
    }

    @GetMapping("/{id}")
    public DocumentComment get(@PathVariable("id") UUID id) {
        UUID userId = SecurityUtils.requireUserId();
        return service.findOneForUser(userId, id);
    }

    @PostMapping
    public DocumentComment create(@RequestBody DocumentComment body) {
        UUID userId = SecurityUtils.requireUserId();
        return service.createForUser(userId, body);
    }

    @PatchMapping("/{id}")
    public DocumentComment update(@PathVariable("id") UUID id, @RequestBody DocumentComment body) {
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
