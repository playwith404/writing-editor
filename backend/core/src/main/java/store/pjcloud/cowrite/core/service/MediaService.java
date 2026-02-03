package store.pjcloud.cowrite.core.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.multipart.MultipartFile;
import store.pjcloud.cowrite.core.entity.MediaAsset;
import store.pjcloud.cowrite.core.repository.MediaAssetRepository;

@Service
public class MediaService {
    private final ProjectAccessService projectAccessService;
    private final MediaAssetRepository mediaRepo;

    public MediaService(ProjectAccessService projectAccessService, MediaAssetRepository mediaRepo) {
        this.projectAccessService = projectAccessService;
        this.mediaRepo = mediaRepo;
    }

    private String uploadDir() {
        String dir = System.getenv("MEDIA_UPLOAD_DIR");
        return dir == null || dir.isBlank() ? "/app/uploads" : dir;
    }

    private String extFromMime(String mimeType) {
        if (mimeType == null) return "";
        return switch (mimeType) {
            case "image/png" -> ".png";
            case "image/jpeg" -> ".jpg";
            case "image/webp" -> ".webp";
            case "image/gif" -> ".gif";
            case "image/svg+xml" -> ".svg";
            default -> "";
        };
    }

    public MediaAsset upload(AiService.UserContext user, MultipartFile file, String projectId) {
        if (user == null || user.userId() == null) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "로그인이 필요합니다.");
        if (file == null || file.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "file이 필요합니다.");

        UUID projectUuid = null;
        if (projectId != null && !projectId.isBlank()) {
            projectUuid = UUID.fromString(projectId);
            projectAccessService.assertProjectAccess(user.userId(), projectUuid);
        }

        try {
            Files.createDirectories(Paths.get(uploadDir()));
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "업로드 폴더를 생성할 수 없습니다.");
        }

        UUID id = UUID.randomUUID();
        String ext = extFromMime(file.getContentType());
        if (ext.isBlank() && file.getOriginalFilename() != null) {
            String original = file.getOriginalFilename();
            int idx = original.lastIndexOf('.');
            if (idx >= 0) ext = original.substring(idx);
        }

        String filename = id + ext;
        Path storagePath = Paths.get(uploadDir(), filename);
        String url = "/api/media/" + id;

        try {
            Files.write(storagePath, file.getBytes());
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "파일을 저장할 수 없습니다.");
        }

        MediaAsset asset = new MediaAsset();
        asset.setId(id);
        asset.setUserId(user.userId());
        asset.setProjectId(projectUuid);
        asset.setOriginalName(file.getOriginalFilename());
        asset.setMimeType(file.getContentType());
        asset.setSize((int) file.getSize());
        asset.setStoragePath(storagePath.toString());
        asset.setUrl(url);
        return mediaRepo.save(asset);
    }

    public MediaAsset findById(UUID id) {
        return mediaRepo.findById(id).orElse(null);
    }

    public void assertOwnership(AiService.UserContext user, MediaAsset asset) {
        if (user == null || user.userId() == null) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "로그인이 필요합니다.");
        if ("admin".equalsIgnoreCase(user.role())) return;
        if (!user.userId().equals(asset.getUserId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "권한이 없습니다.");
        }
    }

    public Object delete(AiService.UserContext user, UUID id) {
        MediaAsset asset = findById(id);
        if (asset == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "파일을 찾을 수 없습니다.");
        assertOwnership(user, asset);

        mediaRepo.deleteById(id);
        try {
            Files.deleteIfExists(Path.of(asset.getStoragePath()));
        } catch (IOException ex) {
            // ignore
        }
        return java.util.Map.of("success", true);
    }
}
