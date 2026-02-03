package store.pjcloud.cowrite.core.controller;

import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import store.pjcloud.cowrite.core.common.ProjectScopedCrudController;
import store.pjcloud.cowrite.core.entity.PublishingExport;
import store.pjcloud.cowrite.core.security.SecurityUtils;
import store.pjcloud.cowrite.core.service.PublishingExportsService;

@RestController
@RequestMapping("/publishing-exports")
public class PublishingExportsController extends ProjectScopedCrudController<PublishingExport> {
    private final PublishingExportsService publishingExportsService;

    public PublishingExportsController(PublishingExportsService service) {
        super(service);
        this.publishingExportsService = service;
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<byte[]> download(@PathVariable("id") UUID id) {
        UUID userId = SecurityUtils.requireUserId();
        PublishingExportsService.DownloadResult result = publishingExportsService.getDownloadForUser(userId, id);
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(result.mimeType()))
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + result.filename() + "\"")
            .body(result.content());
    }
}
