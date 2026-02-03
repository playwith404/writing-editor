package store.pjcloud.cowrite.core.service;

import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import store.pjcloud.cowrite.core.config.AppProperties;
import store.pjcloud.cowrite.core.entity.BetaSession;
import store.pjcloud.cowrite.core.entity.BetaSessionInvite;
import store.pjcloud.cowrite.core.entity.BetaSessionParticipant;
import store.pjcloud.cowrite.core.entity.Document;
import store.pjcloud.cowrite.core.entity.User;
import store.pjcloud.cowrite.core.repository.BetaSessionInviteRepository;
import store.pjcloud.cowrite.core.repository.BetaSessionParticipantRepository;
import store.pjcloud.cowrite.core.repository.BetaSessionRepository;
import store.pjcloud.cowrite.core.repository.DocumentRepository;
import store.pjcloud.cowrite.core.repository.UserRepository;

@Service
public class BetaSessionsService {
    private final AppProperties appProperties;
    private final ProjectAccessService projectAccessService;
    private final BetaAccessService betaAccessService;
    private final BetaSessionRepository sessionsRepo;
    private final BetaSessionInviteRepository invitesRepo;
    private final BetaSessionParticipantRepository participantsRepo;
    private final DocumentRepository documentsRepo;
    private final UserRepository usersRepo;

    private final SecureRandom secureRandom = new SecureRandom();

    public BetaSessionsService(AppProperties appProperties,
                               ProjectAccessService projectAccessService,
                               BetaAccessService betaAccessService,
                               BetaSessionRepository sessionsRepo,
                               BetaSessionInviteRepository invitesRepo,
                               BetaSessionParticipantRepository participantsRepo,
                               DocumentRepository documentsRepo,
                               UserRepository usersRepo) {
        this.appProperties = appProperties;
        this.projectAccessService = projectAccessService;
        this.betaAccessService = betaAccessService;
        this.sessionsRepo = sessionsRepo;
        this.invitesRepo = invitesRepo;
        this.participantsRepo = participantsRepo;
        this.documentsRepo = documentsRepo;
        this.usersRepo = usersRepo;
    }

    private String hashToken(String raw) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(raw.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception ex) {
            throw new IllegalStateException("hash failed", ex);
        }
    }

    private String randomToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }

    public List<BetaSession> listForUser(UUID userId, UUID projectId) {
        if (userId == null) return List.of();
        List<UUID> projectIds = projectAccessService.filterAccessibleProjectIds(userId, projectId);
        if (projectIds.isEmpty()) return List.of();
        return sessionsRepo.findByProjectIdInOrderByCreatedAtDesc(projectIds);
    }

    public BetaSession findOneForUser(UUID userId, UUID id) {
        if (userId == null) return null;
        return betaAccessService.getAccess(userId, id).session();
    }

    @Transactional
    public BetaSession createForUser(UUID userId, Map<String, Object> body) {
        if (userId == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "로그인이 필요합니다.");
        Object projectIdObj = body.get("projectId");
        Object titleObj = body.get("title");
        if (!(projectIdObj instanceof String) || ((String) projectIdObj).isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "projectId가 필요합니다.");
        }
        if (!(titleObj instanceof String) || ((String) titleObj).isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "title이 필요합니다.");
        }
        UUID projectId = UUID.fromString((String) projectIdObj);
        projectAccessService.assertProjectAccess(userId, projectId);

        BetaSession session = new BetaSession();
        session.setProjectId(projectId);
        if (body.get("documentId") instanceof String s && !s.isBlank()) session.setDocumentId(UUID.fromString(s));
        session.setTitle((String) titleObj);
        session.setDescription(body.get("description") instanceof String s ? s : null);
        session.setStatus(body.get("status") instanceof String s ? s : "open");
        session.setCreatedBy(userId);
        return sessionsRepo.save(session);
    }

    @Transactional
    public BetaSession updateForUser(UUID userId, UUID id, Map<String, Object> body) {
        if (userId == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "로그인이 필요합니다.");
        BetaSession session = betaAccessService.assertManageAccess(userId, id);
        if (body.containsKey("title")) session.setTitle((String) body.get("title"));
        if (body.containsKey("description")) session.setDescription((String) body.get("description"));
        if (body.containsKey("status")) session.setStatus((String) body.get("status"));
        return sessionsRepo.save(session);
    }

    @Transactional
    public void removeForUser(UUID userId, UUID id) {
        if (userId == null) return;
        BetaSession session = betaAccessService.assertManageAccess(userId, id);
        sessionsRepo.deleteById(session.getId());
    }

    @Transactional
    public Map<String, Object> createInviteForSession(UUID userId, UUID sessionId, Map<String, Object> body) {
        if (userId == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "로그인이 필요합니다.");
        betaAccessService.assertManageAccess(userId, sessionId);

        String rawToken = randomToken();
        String tokenHash = hashToken(rawToken);
        Integer expiresInHours = body.get("expiresInHours") instanceof Number n ? n.intValue() : null;
        Integer maxUses = body.get("maxUses") instanceof Number n ? n.intValue() : null;

        OffsetDateTime expiresAt = null;
        int hours = expiresInHours == null ? 24 * 7 : expiresInHours;
        if (hours > 0) expiresAt = OffsetDateTime.now().plusHours(hours);

        BetaSessionInvite invite = new BetaSessionInvite();
        invite.setSessionId(sessionId);
        invite.setTokenHash(tokenHash);
        invite.setExpiresAt(expiresAt);
        invite.setMaxUses(maxUses);
        invite.setCreatedBy(userId);
        invite = invitesRepo.save(invite);

        String baseUrl = appProperties.getBaseUrl() == null ? "http://localhost:3100" : appProperties.getBaseUrl();
        String inviteUrl = baseUrl.replaceAll("/$", "") + "/beta-invite?token=" + java.net.URLEncoder.encode(rawToken, java.nio.charset.StandardCharsets.UTF_8);

        return Map.of(
            "success", true,
            "inviteId", invite.getId(),
            "token", rawToken,
            "inviteUrl", inviteUrl,
            "expiresAt", invite.getExpiresAt(),
            "maxUses", invite.getMaxUses()
        );
    }

    public Map<String, Object> getInviteInfo(UUID userId, String token) {
        if (userId == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "로그인이 필요합니다.");
        if (token == null || token.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "token이 필요합니다.");

        String tokenHash = hashToken(token);
        BetaSessionInvite invite = invitesRepo.findByTokenHash(tokenHash)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "초대장을 찾을 수 없습니다."));

        if (invite.getExpiresAt() != null && invite.getExpiresAt().isBefore(OffsetDateTime.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "초대장이 만료되었습니다.");
        }
        if (invite.getMaxUses() != null && invite.getUses() >= invite.getMaxUses()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "초대장 사용 횟수를 초과했습니다.");
        }

        BetaSession session = sessionsRepo.findById(invite.getSessionId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "베타 세션을 찾을 수 없습니다."));

        return Map.of(
            "session", Map.of(
                "id", session.getId(),
                "projectId", session.getProjectId(),
                "documentId", session.getDocumentId(),
                "title", session.getTitle(),
                "description", session.getDescription(),
                "status", session.getStatus()
            ),
            "invite", Map.of(
                "id", invite.getId(),
                "expiresAt", invite.getExpiresAt(),
                "maxUses", invite.getMaxUses(),
                "uses", invite.getUses()
            )
        );
    }

    @Transactional
    public Map<String, Object> joinByInvite(UUID userId, String token) {
        if (userId == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "로그인이 필요합니다.");
        if (token == null || token.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "token이 필요합니다.");

        String tokenHash = hashToken(token);
        BetaSessionInvite invite = invitesRepo.findByTokenHash(tokenHash)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "초대장을 찾을 수 없습니다."));

        if (invite.getExpiresAt() != null && invite.getExpiresAt().isBefore(OffsetDateTime.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "초대장이 만료되었습니다.");
        }
        if (invite.getMaxUses() != null && invite.getUses() >= invite.getMaxUses()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "초대장 사용 횟수를 초과했습니다.");
        }

        BetaSession session = sessionsRepo.findById(invite.getSessionId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "베타 세션을 찾을 수 없습니다."));

        BetaSessionParticipant existing = participantsRepo.findBySessionIdAndUserId(session.getId(), userId).orElse(null);
        if (existing == null) {
            String displayName = usersRepo.findById(userId).map(User::getName).orElse(null);
            BetaSessionParticipant participant = new BetaSessionParticipant();
            participant.setSessionId(session.getId());
            participant.setUserId(userId);
            participant.setStatus("joined");
            participant.setDisplayName(displayName);
            participantsRepo.save(participant);

            invite.setUses(invite.getUses() + 1);
            invitesRepo.save(invite);
        }

        return Map.of("success", true, "sessionId", session.getId());
    }

    public List<Map<String, Object>> listParticipantsForSession(UUID userId, UUID sessionId) {
        if (userId == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "로그인이 필요합니다.");
        BetaSession session = betaAccessService.assertManageAccess(userId, sessionId);

        List<BetaSessionParticipant> participants = participantsRepo.findBySessionIdOrderByJoinedAtAsc(session.getId());
        if (participants.isEmpty()) return List.of();

        List<UUID> userIds = participants.stream().map(BetaSessionParticipant::getUserId).toList();
        Map<UUID, User> userMap = usersRepo.findAllById(userIds).stream().collect(java.util.stream.Collectors.toMap(User::getId, u -> u));

        return participants.stream().map(p -> Map.of(
            "id", p.getId(),
            "sessionId", p.getSessionId(),
            "userId", p.getUserId(),
            "status", p.getStatus(),
            "displayName", p.getDisplayName(),
            "joinedAt", p.getJoinedAt(),
            "user", userMap.getOrDefault(p.getUserId(), null)
        )).toList();
    }

    public Document getSessionDocumentForUser(UUID userId, UUID sessionId) {
        if (userId == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "로그인이 필요합니다.");
        BetaAccessService.AccessResult access = betaAccessService.getAccess(userId, sessionId);
        BetaSession session = access.session();
        if (session.getDocumentId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이 세션에는 documentId가 설정되어 있지 않습니다.");
        }
        Document doc = documentsRepo.findById(session.getDocumentId()).orElse(null);
        if (doc == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "문서를 찾을 수 없습니다.");
        if (!doc.getProjectId().equals(session.getProjectId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "문서 정보가 올바르지 않습니다.");
        }
        return doc;
    }
}
