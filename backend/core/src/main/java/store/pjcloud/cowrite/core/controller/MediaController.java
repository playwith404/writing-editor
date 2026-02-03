package store.pjcloud.cowrite.core.controller;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.UUID;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import store.pjcloud.cowrite.core.entity.MediaAsset;
import store.pjcloud.cowrite.core.security.SecurityUtils;
import store.pjcloud.cowrite.core.service.AiService;
import store.pjcloud.cowrite.core.service.MediaService;

@RestController
@RequestMapping("/media")
public class MediaController {
    private final MediaService mediaService;

    public MediaController(MediaService mediaService) {
        this.mediaService = mediaService;
    }

    @PostMapping("/upload")
    public Map<String, Object> upload(@RequestParam("file") MultipartFile file,
                                      @RequestParam(value = "projectId", required = false) String projectId) {
        UUID userId = SecurityUtils.requireUserId();
        String role = SecurityUtils.getRole();

        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "file이 필요합니다.");
        }
        if (file.getSize() > 10 * 1024 * 1024) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "10MB 이하 파일만 업로드할 수 있습니다.");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이미지 파일만 업로드할 수 있습니다.");
        }

        MediaAsset asset = mediaService.upload(new AiService.UserContext(userId, role), file, projectId);
        return Map.of(
            "id", asset.getId(),
            "url", asset.getUrl(),
            "mimeType", asset.getMimeType(),
            "size", asset.getSize()
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<Resource> getFile(@PathVariable("id") UUID id) {
        MediaAsset asset = mediaService.findById(id);
        if (asset == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        Path path = Path.of(asset.getStoragePath());
        if (!Files.exists(path)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }

        Resource resource = new FileSystemResource(path);
        MediaType mediaType = MediaType.APPLICATION_OCTET_STREAM;
        if (asset.getMimeType() != null && !asset.getMimeType().isBlank()) {
            mediaType = MediaType.parseMediaType(asset.getMimeType());
        }

        return ResponseEntity.ok()
            .contentType(mediaType)
            .cacheControl(CacheControl.maxAge(365, java.util.concurrent.TimeUnit.DAYS).cachePublic().immutable())
            .header(HttpHeaders.CONTENT_LENGTH, String.valueOf(asset.getSize() == null ? path.toFile().length() : asset.getSize()))
            .body(resource);
    }

    @DeleteMapping("/{id}")
    public Object remove(@PathVariable("id") UUID id) {
        UUID userId = SecurityUtils.requireUserId();
        String role = SecurityUtils.getRole();
        return mediaService.delete(new AiService.UserContext(userId, role), id);
    }
}
