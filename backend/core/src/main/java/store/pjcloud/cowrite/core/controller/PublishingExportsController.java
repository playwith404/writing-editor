package store.pjcloud.cowrite.core.controller;

import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import store.pjcloud.cowrite.core.common.ProjectScopedCrudController;
import store.pjcloud.cowrite.core.entity.PublishingExport;
import store.pjcloud.cowrite.core.security.SecurityUtils;
import store.pjcloud.cowrite.core.service.MailService;
import store.pjcloud.cowrite.core.service.PublishingExportsService;

@RestController
@RequestMapping("/publishing-exports")
public class PublishingExportsController extends ProjectScopedCrudController<PublishingExport> {
    private final PublishingExportsService publishingExportsService;
    private final MailService mailService;

    public PublishingExportsController(PublishingExportsService service, MailService mailService) {
        super(service);
        this.publishingExportsService = service;
        this.mailService = mailService;
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

    @PostMapping("/{id}/deliver")
    public Map<String, Object> deliver(@PathVariable("id") UUID id, @RequestBody Map<String, Object> body) {
        UUID userId = SecurityUtils.requireUserId();
        PublishingExportsService.DownloadResult file = publishingExportsService.getDownloadForUser(userId, id);

        String type = body.get("type") instanceof String s ? s.trim() : "email";
        if (!"email".equalsIgnoreCase(type)) {
            throw new IllegalArgumentException("지원하지 않는 전달 방식입니다. (email만 지원)");
        }

        String to = body.get("to") instanceof String s ? s.trim() : null;
        if (to == null || to.isBlank()) throw new IllegalArgumentException("to가 필요합니다.");

        String subject = body.get("subject") instanceof String s && !s.isBlank()
            ? s
            : "[Cowrite] 원고 내보내기 파일";
        String message = body.get("message") instanceof String s ? s : "Cowrite에서 내보낸 원고 파일을 첨부합니다.";

        mailService.sendAttachment(to, subject, message, file.filename(), file.mimeType(), file.content());
        return Map.of("success", true);
    }
}
