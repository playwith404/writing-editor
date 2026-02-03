package store.pjcloud.cowrite.core.service;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import store.pjcloud.cowrite.core.entity.BetaReaderProfile;
import store.pjcloud.cowrite.core.entity.Project;
import store.pjcloud.cowrite.core.entity.User;
import store.pjcloud.cowrite.core.repository.BetaReaderProfileRepository;
import store.pjcloud.cowrite.core.repository.ProjectRepository;
import store.pjcloud.cowrite.core.repository.UserRepository;

@Service
public class BetaReadersService {
    private final BetaReaderProfileRepository profilesRepo;
    private final ProjectRepository projectsRepo;
    private final UserRepository usersRepo;
    private final ProjectAccessService projectAccessService;

    public BetaReadersService(BetaReaderProfileRepository profilesRepo,
                              ProjectRepository projectsRepo,
                              UserRepository usersRepo,
                              ProjectAccessService projectAccessService) {
        this.profilesRepo = profilesRepo;
        this.projectsRepo = projectsRepo;
        this.usersRepo = usersRepo;
        this.projectAccessService = projectAccessService;
    }

    public BetaReaderProfile getMyProfile(UUID userId) {
        if (userId == null) return null;
        return profilesRepo.findByUserId(userId).orElse(null);
    }

    @Transactional
    public BetaReaderProfile upsertMyProfile(UUID userId, Map<String, Object> body) {
        if (userId == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "로그인이 필요합니다.");
        BetaReaderProfile existing = profilesRepo.findByUserId(userId).orElse(null);

        String[] preferredGenres = null;
        Object genresObj = body.get("preferredGenres");
        if (genresObj instanceof List<?> list) {
            preferredGenres = list.stream().map(Object::toString).map(String::trim).filter(s -> !s.isBlank()).limit(20).toArray(String[]::new);
        }

        if (existing == null) {
            BetaReaderProfile created = new BetaReaderProfile();
            created.setUserId(userId);
            created.setPreferredGenres(preferredGenres == null ? new String[0] : preferredGenres);
            if (body.get("readingVolume") instanceof Number n) created.setReadingVolume(n.intValue());
            if (body.get("feedbackStyle") instanceof String s) created.setFeedbackStyle(s);
            if (body.get("bio") instanceof String s) created.setBio(s);
            if (body.get("isActive") instanceof Boolean b) created.setIsActive(b);
            return profilesRepo.save(created);
        }

        if (preferredGenres != null) existing.setPreferredGenres(preferredGenres);
        if (body.containsKey("readingVolume") && body.get("readingVolume") instanceof Number n) existing.setReadingVolume(n.intValue());
        if (body.containsKey("feedbackStyle")) existing.setFeedbackStyle(body.get("feedbackStyle") instanceof String s ? s : null);
        if (body.containsKey("bio")) existing.setBio(body.get("bio") instanceof String s ? s : null);
        if (body.containsKey("isActive") && body.get("isActive") instanceof Boolean b) existing.setIsActive(b);
        return profilesRepo.save(existing);
    }

    public List<Map<String, Object>> recommendForProject(UUID userId, UUID projectId) {
        if (userId == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "로그인이 필요합니다.");
        if (projectId == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "projectId가 필요합니다.");
        projectAccessService.assertProjectAccess(userId, projectId);

        Project project = projectsRepo.findById(projectId).orElse(null);
        if (project == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "프로젝트를 찾을 수 없습니다.");

        String genre = project.getGenre() == null ? null : project.getGenre().trim();
        List<BetaReaderProfile> profiles = profilesRepo.recommend(genre == null || genre.isBlank() ? null : genre);
        if (profiles.isEmpty()) return List.of();

        List<UUID> userIds = profiles.stream().map(BetaReaderProfile::getUserId).toList();
        Map<UUID, User> userMap = usersRepo.findAllById(userIds).stream().collect(java.util.stream.Collectors.toMap(User::getId, u -> u));

        return profiles.stream().map(p -> Map.of(
            "id", p.getId(),
            "userId", p.getUserId(),
            "preferredGenres", p.getPreferredGenres(),
            "readingVolume", p.getReadingVolume(),
            "feedbackStyle", p.getFeedbackStyle(),
            "bio", p.getBio(),
            "isActive", p.getIsActive(),
            "createdAt", p.getCreatedAt(),
            "updatedAt", p.getUpdatedAt(),
            "user", userMap.getOrDefault(p.getUserId(), null)
        )).toList();
    }
}
