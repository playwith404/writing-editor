package store.pjcloud.cowrite.core.controller;

import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import store.pjcloud.cowrite.core.security.SecurityUtils;
import store.pjcloud.cowrite.core.service.BackupsService;

@RestController
@RequestMapping("/backups")
public class BackupsController {
    private final BackupsService backupsService;

    public BackupsController(BackupsService backupsService) {
        this.backupsService = backupsService;
    }

    @GetMapping("/projects/{projectId}/export")
    public ResponseEntity<byte[]> exportProject(@PathVariable("projectId") UUID projectId) {
        UUID userId = SecurityUtils.requireUserId();
        BackupsService.DownloadResult result = backupsService.exportProjectForUser(userId, projectId);
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(result.mimeType()))
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + result.filename() + "\"")
            .body(result.content());
    }

    @PostMapping("/import")
    public Map<String, Object> importBackup(@RequestParam("file") MultipartFile file) {
        UUID userId = SecurityUtils.requireUserId();
        return backupsService.importForUser(userId, file);
    }
}
