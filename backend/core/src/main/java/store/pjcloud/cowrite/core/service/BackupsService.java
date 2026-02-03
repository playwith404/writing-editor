package store.pjcloud.cowrite.core.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.util.zip.ZipOutputStream;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import store.pjcloud.cowrite.core.entity.AudioAsset;
import store.pjcloud.cowrite.core.entity.Character;
import store.pjcloud.cowrite.core.entity.CharacterStat;
import store.pjcloud.cowrite.core.entity.Document;
import store.pjcloud.cowrite.core.entity.DocumentComment;
import store.pjcloud.cowrite.core.entity.DocumentVersion;
import store.pjcloud.cowrite.core.entity.MediaAsset;
import store.pjcloud.cowrite.core.entity.Plot;
import store.pjcloud.cowrite.core.entity.PlotPoint;
import store.pjcloud.cowrite.core.entity.Project;
import store.pjcloud.cowrite.core.entity.ReaderPrediction;
import store.pjcloud.cowrite.core.entity.Relationship;
import store.pjcloud.cowrite.core.entity.ResearchItem;
import store.pjcloud.cowrite.core.entity.Storyboard;
import store.pjcloud.cowrite.core.entity.Translation;
import store.pjcloud.cowrite.core.entity.WorldSetting;
import store.pjcloud.cowrite.core.entity.WritingGoal;
import store.pjcloud.cowrite.core.repository.AudioAssetRepository;
import store.pjcloud.cowrite.core.repository.CharacterRepository;
import store.pjcloud.cowrite.core.repository.CharacterStatRepository;
import store.pjcloud.cowrite.core.repository.DocumentCommentRepository;
import store.pjcloud.cowrite.core.repository.DocumentRepository;
import store.pjcloud.cowrite.core.repository.DocumentVersionRepository;
import store.pjcloud.cowrite.core.repository.MediaAssetRepository;
import store.pjcloud.cowrite.core.repository.PlotPointRepository;
import store.pjcloud.cowrite.core.repository.PlotRepository;
import store.pjcloud.cowrite.core.repository.ProjectRepository;
import store.pjcloud.cowrite.core.repository.ReaderPredictionRepository;
import store.pjcloud.cowrite.core.repository.RelationshipRepository;
import store.pjcloud.cowrite.core.repository.ResearchItemRepository;
import store.pjcloud.cowrite.core.repository.StoryboardRepository;
import store.pjcloud.cowrite.core.repository.TranslationRepository;
import store.pjcloud.cowrite.core.repository.WorldSettingRepository;
import store.pjcloud.cowrite.core.repository.WritingGoalRepository;

@Service
public class BackupsService {
    private static final Pattern MEDIA_REF_PATTERN = Pattern.compile("/media/([0-9a-fA-F-]{36})");

    private final ProjectAccessService projectAccessService;
    private final SearchService searchService;
    private final ObjectMapper objectMapper;
    private final ProjectRepository projectsRepo;
    private final DocumentRepository documentsRepo;
    private final DocumentVersionRepository versionsRepo;
    private final CharacterRepository charactersRepo;
    private final CharacterStatRepository characterStatsRepo;
    private final WorldSettingRepository worldSettingsRepo;
    private final RelationshipRepository relationshipsRepo;
    private final PlotRepository plotsRepo;
    private final PlotPointRepository plotPointsRepo;
    private final WritingGoalRepository writingGoalsRepo;
    private final ResearchItemRepository researchItemsRepo;
    private final TranslationRepository translationsRepo;
    private final AudioAssetRepository audioAssetsRepo;
    private final StoryboardRepository storyboardsRepo;
    private final ReaderPredictionRepository readerPredictionsRepo;
    private final DocumentCommentRepository documentCommentsRepo;
    private final MediaAssetRepository mediaAssetsRepo;

    public BackupsService(ProjectAccessService projectAccessService,
                          SearchService searchService,
                          ObjectMapper objectMapper,
                          ProjectRepository projectsRepo,
                          DocumentRepository documentsRepo,
                          DocumentVersionRepository versionsRepo,
                          CharacterRepository charactersRepo,
                          CharacterStatRepository characterStatsRepo,
                          WorldSettingRepository worldSettingsRepo,
                          RelationshipRepository relationshipsRepo,
                          PlotRepository plotsRepo,
                          PlotPointRepository plotPointsRepo,
                          WritingGoalRepository writingGoalsRepo,
                          ResearchItemRepository researchItemsRepo,
                          TranslationRepository translationsRepo,
                          AudioAssetRepository audioAssetsRepo,
                          StoryboardRepository storyboardsRepo,
                          ReaderPredictionRepository readerPredictionsRepo,
                          DocumentCommentRepository documentCommentsRepo,
                          MediaAssetRepository mediaAssetsRepo) {
        this.projectAccessService = projectAccessService;
        this.searchService = searchService;
        this.objectMapper = objectMapper;
        this.projectsRepo = projectsRepo;
        this.documentsRepo = documentsRepo;
        this.versionsRepo = versionsRepo;
        this.charactersRepo = charactersRepo;
        this.characterStatsRepo = characterStatsRepo;
        this.worldSettingsRepo = worldSettingsRepo;
        this.relationshipsRepo = relationshipsRepo;
        this.plotsRepo = plotsRepo;
        this.plotPointsRepo = plotPointsRepo;
        this.writingGoalsRepo = writingGoalsRepo;
        this.researchItemsRepo = researchItemsRepo;
        this.translationsRepo = translationsRepo;
        this.audioAssetsRepo = audioAssetsRepo;
        this.storyboardsRepo = storyboardsRepo;
        this.readerPredictionsRepo = readerPredictionsRepo;
        this.documentCommentsRepo = documentCommentsRepo;
        this.mediaAssetsRepo = mediaAssetsRepo;
    }

    private String uploadDir() {
        String dir = System.getenv("MEDIA_UPLOAD_DIR");
        return dir == null || dir.isBlank() ? "/app/uploads" : dir;
    }

    private void ensureUploadDir() throws IOException {
        Files.createDirectories(Paths.get(uploadDir()));
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

    private String safeFilename(String name) {
        String cleaned = name == null ? "" : name.trim().replaceAll("[\\\\/:*?\"<>|]", "_").replaceAll("\\s+", "_");
        if (cleaned.isBlank()) return "cowrite";
        return cleaned.length() > 80 ? cleaned.substring(0, 80) : cleaned;
    }

    private List<UUID> collectReferencedMediaIds(List<String> values) {
        if (values == null || values.isEmpty()) return List.of();
        Set<UUID> ids = new java.util.HashSet<>();
        for (String value : values) {
            if (value == null) continue;
            Matcher matcher = MEDIA_REF_PATTERN.matcher(value);
            while (matcher.find()) {
                String raw = matcher.group(1);
                try {
                    ids.add(UUID.fromString(raw));
                } catch (Exception ignored) {
                    // ignore invalid
                }
            }
        }
        return new ArrayList<>(ids);
    }

    private String replaceText(String input, Map<String, String> replacements) {
        if (input == null) return null;
        String out = input;
        if (replacements != null) {
            for (Map.Entry<String, String> entry : replacements.entrySet()) {
                out = out.replace(entry.getKey(), entry.getValue());
            }
        }
        return out;
    }

    private Object deepReplaceStrings(Object value, Map<String, String> replacements) {
        if (value == null) return null;
        if (value instanceof String s) {
            return replaceText(s, replacements);
        }
        if (value instanceof List<?> list) {
            return list.stream().map(v -> deepReplaceStrings(v, replacements)).collect(Collectors.toList());
        }
        if (value instanceof Map<?, ?> map) {
            Map<String, Object> out = new LinkedHashMap<>();
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                String key = String.valueOf(entry.getKey());
                out.put(key, deepReplaceStrings(entry.getValue(), replacements));
            }
            return out;
        }
        return value;
    }

    public DownloadResult exportProjectForUser(UUID userId, UUID projectId) {
        if (userId == null) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "로그인이 필요합니다.");
        projectAccessService.assertProjectAccess(userId, projectId);

        Project project = projectsRepo.findById(projectId).orElse(null);
        if (project == null || project.getDeletedAt() != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "프로젝트를 찾을 수 없습니다.");
        }

        List<Document> documents = documentsRepo.findByProjectIdOrderByOrderIndexAscCreatedAtAsc(projectId);
        List<UUID> documentIds = documents.stream().map(Document::getId).toList();

        List<DocumentVersion> documentVersions = documentIds.isEmpty()
            ? List.of()
            : versionsRepo.findByDocumentIdInOrderByCreatedAtDesc(documentIds);

        List<Character> characters = charactersRepo.findAll(
            (root, query, cb) -> cb.equal(root.get("projectId"), projectId),
            Sort.by(Sort.Direction.ASC, "createdAt")
        );

        List<WorldSetting> worldSettings = worldSettingsRepo.findAll(
            (root, query, cb) -> cb.equal(root.get("projectId"), projectId),
            Sort.by(Sort.Direction.ASC, "createdAt")
        );

        List<Relationship> relationships = relationshipsRepo.findAll(
            (root, query, cb) -> cb.equal(root.get("projectId"), projectId)
        );

        List<Plot> plots = plotsRepo.findAll(
            (root, query, cb) -> cb.equal(root.get("projectId"), projectId),
            Sort.by(Sort.Order.asc("orderIndex"), Sort.Order.asc("createdAt"))
        );

        List<WritingGoal> writingGoals = writingGoalsRepo.findAll(
            (root, query, cb) -> cb.equal(root.get("projectId"), projectId),
            Sort.by(Sort.Direction.ASC, "createdAt")
        );

        List<ResearchItem> researchItems = researchItemsRepo.findAll(
            (root, query, cb) -> cb.equal(root.get("projectId"), projectId),
            Sort.by(Sort.Direction.DESC, "createdAt")
        );

        List<DocumentComment> documentComments = documentIds.isEmpty()
            ? List.of()
            : documentCommentsRepo.findByDocumentIdInOrderByCreatedAtAsc(documentIds);

        List<UUID> characterIds = characters.stream().map(Character::getId).toList();
        List<CharacterStat> characterStats = characterIds.isEmpty()
            ? List.of()
            : characterStatsRepo.findByCharacterIdInOrderByCreatedAtAsc(characterIds);

        List<UUID> plotIds = plots.stream().map(Plot::getId).toList();
        List<PlotPoint> plotPoints = plotIds.isEmpty()
            ? List.of()
            : plotPointsRepo.findByPlotIdInOrderByOrderIndexAscCreatedAtAsc(plotIds);

        List<Translation> translations = documentIds.isEmpty()
            ? List.of()
            : translationsRepo.findByDocumentIdInOrderByCreatedAtDesc(documentIds);
        List<AudioAsset> audioAssets = documentIds.isEmpty()
            ? List.of()
            : audioAssetsRepo.findByDocumentIdInOrderByCreatedAtDesc(documentIds);
        List<Storyboard> storyboards = documentIds.isEmpty()
            ? List.of()
            : storyboardsRepo.findByDocumentIdInOrderByCreatedAtDesc(documentIds);
        List<ReaderPrediction> readerPredictions = documentIds.isEmpty()
            ? List.of()
            : readerPredictionsRepo.findByDocumentIdInOrderByCreatedAtDesc(documentIds);

        List<MediaAsset> projectMedia = mediaAssetsRepo.findByProjectIdOrderByCreatedAtDesc(projectId);
        List<String> refCandidates = new ArrayList<>();
        refCandidates.add(project.getCoverUrl());
        for (Character c : characters) refCandidates.add(c.getImageUrl());
        List<UUID> referencedIds = collectReferencedMediaIds(refCandidates);
        List<MediaAsset> referenced = referencedIds.isEmpty() ? List.of() : mediaAssetsRepo.findByIdIn(referencedIds);

        Map<UUID, MediaAsset> mediaMap = new LinkedHashMap<>();
        for (MediaAsset asset : projectMedia) {
            if (asset != null && asset.getId() != null) mediaMap.put(asset.getId(), asset);
        }
        for (MediaAsset asset : referenced) {
            if (asset != null && asset.getId() != null) mediaMap.put(asset.getId(), asset);
        }

        List<MediaAssetPayload> mediaEntries = new ArrayList<>();
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(baos)) {
            for (MediaAsset asset : mediaMap.values()) {
                if (asset.getStoragePath() == null) continue;
                Path path = Path.of(asset.getStoragePath());
                if (!Files.exists(path)) continue;

                String ext = extFromMime(asset.getMimeType());
                if (ext.isBlank()) {
                    String name = path.getFileName().toString();
                    int idx = name.lastIndexOf('.');
                    if (idx >= 0) ext = name.substring(idx);
                }
                String zipPath = "media/" + asset.getId() + (ext == null ? "" : ext);

                byte[] bytes = Files.readAllBytes(path);
                zos.putNextEntry(new ZipEntry(zipPath));
                zos.write(bytes);
                zos.closeEntry();

                mediaEntries.add(new MediaAssetPayload(
                    asset.getId(),
                    asset.getProjectId(),
                    asset.getOriginalName(),
                    asset.getMimeType(),
                    asset.getSize(),
                    asset.getUrl(),
                    zipPath,
                    ext == null ? "" : ext
                ));
            }

            BackupPayload payload = new BackupPayload(
                1,
                OffsetDateTime.now().toString(),
                new ProjectPayload(
                    project.getId(),
                    project.getTitle(),
                    project.getDescription(),
                    project.getGenre(),
                    project.getCoverUrl(),
                    project.getSettings() == null ? Map.of() : project.getSettings(),
                    project.getWordCount() == null ? 0 : project.getWordCount(),
                    Boolean.TRUE.equals(project.getIsPublic())
                ),
                documents.stream().map(d -> new DocumentPayload(
                    d.getId(),
                    d.getParentId(),
                    d.getType(),
                    d.getTitle(),
                    d.getContent(),
                    d.getOrderIndex(),
                    d.getWordCount(),
                    d.getStatus(),
                    d.getNotes()
                )).toList(),
                documentVersions.stream().map(v -> new DocumentVersionPayload(
                    v.getId(),
                    v.getDocumentId(),
                    v.getContent(),
                    v.getWordCount(),
                    v.getVersionName(),
                    v.getCreatedAt()
                )).toList(),
                characters.stream().map(c -> new CharacterPayload(
                    c.getId(),
                    c.getName(),
                    c.getRole(),
                    c.getProfile(),
                    c.getAppearance(),
                    c.getPersonality(),
                    c.getBackstory(),
                    c.getSpeechSample(),
                    c.getImageUrl()
                )).toList(),
                characterStats.stream().map(s -> new CharacterStatPayload(
                    s.getId(),
                    s.getCharacterId(),
                    s.getTemplateType(),
                    s.getStats(),
                    s.getEpisodeNum()
                )).toList(),
                worldSettings.stream().map(w -> new WorldSettingPayload(
                    w.getId(),
                    w.getParentId(),
                    w.getCategory(),
                    w.getTitle(),
                    w.getContent(),
                    w.getMetadata()
                )).toList(),
                relationships.stream().map(r -> new RelationshipPayload(
                    r.getId(),
                    r.getCharacterAId(),
                    r.getCharacterBId(),
                    r.getRelationType(),
                    r.getDescription(),
                    r.getIsBidirectional(),
                    r.getMetadata()
                )).toList(),
                plots.stream().map(p -> new PlotPayload(
                    p.getId(),
                    p.getTitle(),
                    p.getDescription(),
                    p.getOrderIndex(),
                    p.getMetadata()
                )).toList(),
                plotPoints.stream().map(pp -> new PlotPointPayload(
                    pp.getId(),
                    pp.getPlotId(),
                    pp.getDocumentId(),
                    pp.getTitle(),
                    pp.getDescription(),
                    pp.getOrderIndex(),
                    pp.getMetadata()
                )).toList(),
                writingGoals.stream().map(g -> new WritingGoalPayload(
                    g.getId(),
                    g.getGoalType(),
                    g.getTargetWords(),
                    g.getCurrentWords(),
                    g.getDueDate()
                )).toList(),
                researchItems.stream().map(ri -> new ResearchItemPayload(
                    ri.getId(),
                    ri.getQuery(),
                    ri.getResult()
                )).toList(),
                translations.stream().map(t -> new TranslationPayload(
                    t.getId(),
                    t.getDocumentId(),
                    t.getTargetLanguage(),
                    t.getProvider(),
                    t.getContent()
                )).toList(),
                audioAssets.stream().map(a -> new AudioAssetPayload(
                    a.getId(),
                    a.getDocumentId(),
                    a.getVoice(),
                    a.getProvider(),
                    a.getScript(),
                    a.getAudioUrl()
                )).toList(),
                storyboards.stream().map(s -> new StoryboardPayload(
                    s.getId(),
                    s.getDocumentId(),
                    s.getProvider(),
                    s.getContent()
                )).toList(),
                readerPredictions.stream().map(rp -> new ReaderPredictionPayload(
                    rp.getId(),
                    rp.getDocumentId(),
                    rp.getProvider(),
                    rp.getResult()
                )).toList(),
                documentComments.stream().map(c -> new DocumentCommentPayload(
                    c.getId(),
                    c.getDocumentId(),
                    c.getContent(),
                    c.getPosition(),
                    c.getCreatedAt()
                )).toList(),
                mediaEntries
            );

            byte[] jsonBytes = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsBytes(payload);
            ZipEntry backupEntry = new ZipEntry("backup.json");
            zos.putNextEntry(backupEntry);
            zos.write(jsonBytes);
            zos.closeEntry();
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "백업 파일을 생성할 수 없습니다.");
        }

        String timestamp = OffsetDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        String filename = safeFilename(project.getTitle()) + "_backup_" + timestamp + ".zip";
        return new DownloadResult(filename, "application/zip", baos.toByteArray());
    }

    @Transactional
    public Map<String, Object> importForUser(UUID userId, MultipartFile file) {
        if (userId == null) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "로그인이 필요합니다.");
        if (file == null || file.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "file이 필요합니다.");

        BackupPayload backup = null;
        Map<String, byte[]> zipEntries = new HashMap<>();
        byte[] raw;
        try {
            raw = file.getBytes();
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "업로드한 파일을 읽을 수 없습니다.");
        }

        try (ZipInputStream zis = new ZipInputStream(new ByteArrayInputStream(raw))) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                ByteArrayOutputStream entryBytes = new ByteArrayOutputStream();
                byte[] buffer = new byte[8192];
                int len;
                while ((len = zis.read(buffer)) > 0) {
                    entryBytes.write(buffer, 0, len);
                }
                zipEntries.put(entry.getName(), entryBytes.toByteArray());
            }
        } catch (Exception ignored) {
            zipEntries.clear();
        }

        if (zipEntries.containsKey("backup.json")) {
            try {
                backup = objectMapper.readValue(zipEntries.get("backup.json"), BackupPayload.class);
            } catch (Exception ex) {
                backup = null;
            }
        }

        if (backup == null) {
            try {
                backup = objectMapper.readValue(raw, BackupPayload.class);
            } catch (Exception ex) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "지원하지 않는 백업 파일입니다. (zip 또는 json)");
            }
        }

        if (backup == null || backup.version() != 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "지원하지 않는 백업 버전입니다.");
        }

        try {
            ensureUploadDir();
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "업로드 폴더를 생성할 수 없습니다.");
        }

        List<Path> createdPaths = new ArrayList<>();

        try {
            UUID newProjectId = UUID.randomUUID();

            Map<String, String> mediaIdMap = new HashMap<>();
            for (MediaAssetPayload m : listOrEmpty(backup.mediaAssets())) {
                if (m != null && m.id() != null) {
                    mediaIdMap.put(m.id().toString(), UUID.randomUUID().toString());
                }
            }

            Map<UUID, UUID> docIdMap = new HashMap<>();
            for (DocumentPayload d : listOrEmpty(backup.documents())) {
                if (d != null && d.id() != null) {
                    docIdMap.put(d.id(), UUID.randomUUID());
                }
            }

            Map<UUID, UUID> characterIdMap = new HashMap<>();
            for (CharacterPayload c : listOrEmpty(backup.characters())) {
                if (c != null && c.id() != null) {
                    characterIdMap.put(c.id(), UUID.randomUUID());
                }
            }

            Map<UUID, UUID> worldSettingIdMap = new HashMap<>();
            for (WorldSettingPayload w : listOrEmpty(backup.worldSettings())) {
                if (w != null && w.id() != null) {
                    worldSettingIdMap.put(w.id(), UUID.randomUUID());
                }
            }

            Map<UUID, UUID> plotIdMap = new HashMap<>();
            for (PlotPayload p : listOrEmpty(backup.plots())) {
                if (p != null && p.id() != null) {
                    plotIdMap.put(p.id(), UUID.randomUUID());
                }
            }

            Project project = new Project();
            project.setId(newProjectId);
            project.setOwnerId(userId);
            project.setTitle((backup.project() != null && backup.project().title() != null ? backup.project().title() : "프로젝트") + " (가져옴)");
            project.setDescription(replaceText(backup.project() == null ? null : backup.project().description(), mediaIdMap));
            project.setGenre(backup.project() == null ? null : backup.project().genre());
            project.setCoverUrl(replaceText(backup.project() == null ? null : backup.project().coverUrl(), mediaIdMap));
            Object settings = deepReplaceStrings(backup.project() == null ? Map.of() : backup.project().settings(), mediaIdMap);
            if (settings instanceof Map<?, ?> map) {
                project.setSettings((Map<String, Object>) map);
            } else {
                project.setSettings(Map.of());
            }
            project.setWordCount(0);
            project.setIsPublic(false);
            projectsRepo.save(project);

            List<Document> docsToInsert = new ArrayList<>();
            for (DocumentPayload d : listOrEmpty(backup.documents())) {
                UUID newDocId = d.id() != null ? docIdMap.getOrDefault(d.id(), UUID.randomUUID()) : UUID.randomUUID();
                Document doc = new Document();
                doc.setId(newDocId);
                doc.setProjectId(newProjectId);
                if (d.parentId() != null) doc.setParentId(docIdMap.get(d.parentId()));
                doc.setType(d.type());
                doc.setTitle(replaceText(d.title(), mediaIdMap));
                doc.setContent(replaceText(d.content(), mediaIdMap));
                doc.setOrderIndex(d.orderIndex() == null ? 0 : d.orderIndex());
                doc.setWordCount(d.wordCount() == null ? 0 : d.wordCount());
                doc.setStatus(d.status() == null ? "draft" : d.status());
                doc.setNotes(replaceText(d.notes(), mediaIdMap));
                docsToInsert.add(doc);
            }
            if (!docsToInsert.isEmpty()) documentsRepo.saveAll(docsToInsert);

            List<DocumentVersion> versionsToInsert = new ArrayList<>();
            for (DocumentVersionPayload v : listOrEmpty(backup.documentVersions())) {
                UUID newDocId = v.documentId() == null ? null : docIdMap.get(v.documentId());
                if (newDocId == null) continue;
                DocumentVersion version = new DocumentVersion();
                version.setId(UUID.randomUUID());
                version.setDocumentId(newDocId);
                version.setContent(replaceText(v.content(), mediaIdMap));
                version.setWordCount(v.wordCount());
                version.setVersionName(v.versionName());
                version.setCreatedBy(userId);
                versionsToInsert.add(version);
            }
            if (!versionsToInsert.isEmpty()) versionsRepo.saveAll(versionsToInsert);

            List<Character> charactersToInsert = new ArrayList<>();
            for (CharacterPayload c : listOrEmpty(backup.characters())) {
                UUID newCharId = c.id() == null ? UUID.randomUUID() : characterIdMap.getOrDefault(c.id(), UUID.randomUUID());
                Character character = new Character();
                character.setId(newCharId);
                character.setProjectId(newProjectId);
                character.setName(replaceText(c.name(), mediaIdMap));
                character.setRole(c.role());
                character.setProfile((Map<String, Object>) deepReplaceStrings(c.profile(), mediaIdMap));
                character.setAppearance((Map<String, Object>) deepReplaceStrings(c.appearance(), mediaIdMap));
                character.setPersonality((Map<String, Object>) deepReplaceStrings(c.personality(), mediaIdMap));
                character.setBackstory(replaceText(c.backstory(), mediaIdMap));
                character.setSpeechSample(replaceText(c.speechSample(), mediaIdMap));
                character.setImageUrl(replaceText(c.imageUrl(), mediaIdMap));
                charactersToInsert.add(character);
            }
            if (!charactersToInsert.isEmpty()) charactersRepo.saveAll(charactersToInsert);

            List<CharacterStat> statsToInsert = new ArrayList<>();
            for (CharacterStatPayload s : listOrEmpty(backup.characterStats())) {
                UUID newCharId = s.characterId() == null ? null : characterIdMap.get(s.characterId());
                if (newCharId == null) continue;
                CharacterStat stat = new CharacterStat();
                stat.setId(UUID.randomUUID());
                stat.setCharacterId(newCharId);
                stat.setTemplateType(s.templateType());
                stat.setStats((Map<String, Object>) deepReplaceStrings(s.stats(), mediaIdMap));
                stat.setEpisodeNum(s.episodeNum());
                statsToInsert.add(stat);
            }
            if (!statsToInsert.isEmpty()) characterStatsRepo.saveAll(statsToInsert);

            List<WorldSetting> worldSettingsToInsert = new ArrayList<>();
            for (WorldSettingPayload w : listOrEmpty(backup.worldSettings())) {
                UUID newWsId = w.id() == null ? UUID.randomUUID() : worldSettingIdMap.getOrDefault(w.id(), UUID.randomUUID());
                WorldSetting ws = new WorldSetting();
                ws.setId(newWsId);
                ws.setProjectId(newProjectId);
                if (w.parentId() != null) ws.setParentId(worldSettingIdMap.get(w.parentId()));
                ws.setCategory(w.category());
                ws.setTitle(replaceText(w.title(), mediaIdMap));
                ws.setContent(replaceText(w.content(), mediaIdMap));
                ws.setMetadata((Map<String, Object>) deepReplaceStrings(w.metadata(), mediaIdMap));
                worldSettingsToInsert.add(ws);
            }
            if (!worldSettingsToInsert.isEmpty()) worldSettingsRepo.saveAll(worldSettingsToInsert);

            List<Relationship> relationshipsToInsert = new ArrayList<>();
            for (RelationshipPayload r : listOrEmpty(backup.relationships())) {
                UUID a = r.characterAId() == null ? null : characterIdMap.get(r.characterAId());
                UUID b = r.characterBId() == null ? null : characterIdMap.get(r.characterBId());
                if (a == null || b == null) continue;
                Relationship rel = new Relationship();
                rel.setId(UUID.randomUUID());
                rel.setProjectId(newProjectId);
                rel.setCharacterAId(a);
                rel.setCharacterBId(b);
                rel.setRelationType(r.relationType());
                rel.setDescription(replaceText(r.description(), mediaIdMap));
                rel.setIsBidirectional(Boolean.TRUE.equals(r.isBidirectional()));
                rel.setMetadata((Map<String, Object>) deepReplaceStrings(r.metadata(), mediaIdMap));
                relationshipsToInsert.add(rel);
            }
            if (!relationshipsToInsert.isEmpty()) relationshipsRepo.saveAll(relationshipsToInsert);

            List<Plot> plotsToInsert = new ArrayList<>();
            for (PlotPayload p : listOrEmpty(backup.plots())) {
                UUID newPlotId = p.id() == null ? UUID.randomUUID() : plotIdMap.getOrDefault(p.id(), UUID.randomUUID());
                Plot plot = new Plot();
                plot.setId(newPlotId);
                plot.setProjectId(newProjectId);
                plot.setTitle(replaceText(p.title(), mediaIdMap));
                plot.setDescription(replaceText(p.description(), mediaIdMap));
                plot.setOrderIndex(p.orderIndex() == null ? 0 : p.orderIndex());
                plot.setMetadata((Map<String, Object>) deepReplaceStrings(p.metadata(), mediaIdMap));
                plotsToInsert.add(plot);
            }
            if (!plotsToInsert.isEmpty()) plotsRepo.saveAll(plotsToInsert);

            List<PlotPoint> plotPointsToInsert = new ArrayList<>();
            for (PlotPointPayload pp : listOrEmpty(backup.plotPoints())) {
                UUID newPlotId = pp.plotId() == null ? null : plotIdMap.get(pp.plotId());
                if (newPlotId == null) continue;
                UUID newDocId = pp.documentId() == null ? null : docIdMap.get(pp.documentId());
                PlotPoint plotPoint = new PlotPoint();
                plotPoint.setId(UUID.randomUUID());
                plotPoint.setPlotId(newPlotId);
                plotPoint.setDocumentId(newDocId);
                plotPoint.setTitle(replaceText(pp.title(), mediaIdMap));
                plotPoint.setDescription(replaceText(pp.description(), mediaIdMap));
                plotPoint.setOrderIndex(pp.orderIndex() == null ? 0 : pp.orderIndex());
                plotPoint.setMetadata((Map<String, Object>) deepReplaceStrings(pp.metadata(), mediaIdMap));
                plotPointsToInsert.add(plotPoint);
            }
            if (!plotPointsToInsert.isEmpty()) plotPointsRepo.saveAll(plotPointsToInsert);

            List<WritingGoal> goalsToInsert = new ArrayList<>();
            for (WritingGoalPayload g : listOrEmpty(backup.writingGoals())) {
                WritingGoal goal = new WritingGoal();
                goal.setId(UUID.randomUUID());
                goal.setProjectId(newProjectId);
                goal.setUserId(userId);
                goal.setGoalType(g.goalType());
                goal.setTargetWords(g.targetWords() == null ? 0 : g.targetWords());
                goal.setCurrentWords(g.currentWords() == null ? 0 : g.currentWords());
                goal.setDueDate(g.dueDate());
                goalsToInsert.add(goal);
            }
            if (!goalsToInsert.isEmpty()) writingGoalsRepo.saveAll(goalsToInsert);

            List<ResearchItem> researchToInsert = new ArrayList<>();
            for (ResearchItemPayload ri : listOrEmpty(backup.researchItems())) {
                ResearchItem item = new ResearchItem();
                item.setId(UUID.randomUUID());
                item.setProjectId(newProjectId);
                item.setQuery(replaceText(ri.query(), mediaIdMap));
                item.setResult((Map<String, Object>) deepReplaceStrings(ri.result(), mediaIdMap));
                researchToInsert.add(item);
            }
            if (!researchToInsert.isEmpty()) researchItemsRepo.saveAll(researchToInsert);

            List<Translation> translationsToInsert = new ArrayList<>();
            for (TranslationPayload t : listOrEmpty(backup.translations())) {
                UUID newDocId = t.documentId() == null ? null : docIdMap.get(t.documentId());
                if (newDocId == null) continue;
                Translation tr = new Translation();
                tr.setId(UUID.randomUUID());
                tr.setDocumentId(newDocId);
                tr.setTargetLanguage(t.targetLanguage());
                tr.setProvider(t.provider());
                tr.setContent(replaceText(t.content(), mediaIdMap));
                translationsToInsert.add(tr);
            }
            if (!translationsToInsert.isEmpty()) translationsRepo.saveAll(translationsToInsert);

            List<AudioAsset> audioToInsert = new ArrayList<>();
            for (AudioAssetPayload a : listOrEmpty(backup.audioAssets())) {
                UUID newDocId = a.documentId() == null ? null : docIdMap.get(a.documentId());
                if (newDocId == null) continue;
                AudioAsset asset = new AudioAsset();
                asset.setId(UUID.randomUUID());
                asset.setDocumentId(newDocId);
                asset.setVoice(a.voice());
                asset.setProvider(a.provider());
                asset.setScript(replaceText(a.script(), mediaIdMap));
                asset.setAudioUrl(a.audioUrl());
                audioToInsert.add(asset);
            }
            if (!audioToInsert.isEmpty()) audioAssetsRepo.saveAll(audioToInsert);

            List<Storyboard> storyboardsToInsert = new ArrayList<>();
            for (StoryboardPayload s : listOrEmpty(backup.storyboards())) {
                UUID newDocId = s.documentId() == null ? null : docIdMap.get(s.documentId());
                if (newDocId == null) continue;
                Storyboard storyboard = new Storyboard();
                storyboard.setId(UUID.randomUUID());
                storyboard.setDocumentId(newDocId);
                storyboard.setProvider(s.provider());
                storyboard.setContent((Map<String, Object>) deepReplaceStrings(s.content(), mediaIdMap));
                storyboardsToInsert.add(storyboard);
            }
            if (!storyboardsToInsert.isEmpty()) storyboardsRepo.saveAll(storyboardsToInsert);

            List<ReaderPrediction> predictionsToInsert = new ArrayList<>();
            for (ReaderPredictionPayload rp : listOrEmpty(backup.readerPredictions())) {
                UUID newDocId = rp.documentId() == null ? null : docIdMap.get(rp.documentId());
                if (newDocId == null) continue;
                ReaderPrediction prediction = new ReaderPrediction();
                prediction.setId(UUID.randomUUID());
                prediction.setDocumentId(newDocId);
                prediction.setProvider(rp.provider());
                prediction.setResult((Map<String, Object>) deepReplaceStrings(rp.result(), mediaIdMap));
                predictionsToInsert.add(prediction);
            }
            if (!predictionsToInsert.isEmpty()) readerPredictionsRepo.saveAll(predictionsToInsert);

            List<DocumentComment> commentsToInsert = new ArrayList<>();
            for (DocumentCommentPayload c : listOrEmpty(backup.documentComments())) {
                UUID newDocId = c.documentId() == null ? null : docIdMap.get(c.documentId());
                if (newDocId == null) continue;
                DocumentComment comment = new DocumentComment();
                comment.setId(UUID.randomUUID());
                comment.setDocumentId(newDocId);
                comment.setUserId(userId);
                comment.setContent(replaceText(c.content(), mediaIdMap));
                comment.setPosition((Map<String, Object>) deepReplaceStrings(c.position(), mediaIdMap));
                commentsToInsert.add(comment);
            }
            if (!commentsToInsert.isEmpty()) documentCommentsRepo.saveAll(commentsToInsert);

            List<MediaAsset> mediaToInsert = new ArrayList<>();
            for (MediaAssetPayload m : listOrEmpty(backup.mediaAssets())) {
                if (m.id() == null) continue;
                String newIdStr = mediaIdMap.get(m.id().toString());
                if (newIdStr == null) continue;
                UUID newId = UUID.fromString(newIdStr);

                byte[] entryBytes = null;
                if (!zipEntries.isEmpty() && m.zipPath() != null) {
                    entryBytes = zipEntries.get(m.zipPath());
                }
                if (entryBytes == null || entryBytes.length == 0) continue;

                String ext = m.ext();
                if (ext == null || ext.isBlank()) {
                    ext = extFromMime(m.mimeType());
                }
                String filename = newId + (ext == null ? "" : ext);
                Path storagePath = Paths.get(uploadDir(), filename);

                Files.write(storagePath, entryBytes);
                createdPaths.add(storagePath);

                MediaAsset asset = new MediaAsset();
                asset.setId(newId);
                asset.setUserId(userId);
                asset.setProjectId(m.projectId() == null ? null : newProjectId);
                asset.setOriginalName(m.originalName());
                asset.setMimeType(m.mimeType());
                asset.setSize(entryBytes.length);
                asset.setStoragePath(storagePath.toString());
                asset.setUrl("/api/media/" + newId);
                mediaToInsert.add(asset);
            }
            if (!mediaToInsert.isEmpty()) mediaAssetsRepo.saveAll(mediaToInsert);

            Map<String, Object> projectDoc = new HashMap<>();
            projectDoc.put("id", newProjectId.toString());
            projectDoc.put("title", project.getTitle());
            projectDoc.put("description", project.getDescription());
            projectDoc.put("genre", project.getGenre());
            projectDoc.put("ownerId", userId.toString());
            searchService.indexDocument("projects", newProjectId.toString(), projectDoc);

            for (Document d : docsToInsert) {
                Map<String, Object> docPayload = new HashMap<>();
                docPayload.put("id", d.getId().toString());
                docPayload.put("projectId", newProjectId.toString());
                docPayload.put("title", d.getTitle());
                docPayload.put("content", d.getContent() == null ? "" : d.getContent());
                searchService.indexDocument("documents", d.getId().toString(), docPayload);
            }

            for (Character c : charactersToInsert) {
                Map<String, Object> charPayload = new HashMap<>();
                charPayload.put("id", c.getId().toString());
                charPayload.put("projectId", newProjectId.toString());
                charPayload.put("name", c.getName());
                charPayload.put("role", c.getRole());
                searchService.indexDocument("characters", c.getId().toString(), charPayload);
            }

            for (WorldSetting w : worldSettingsToInsert) {
                Map<String, Object> worldPayload = new HashMap<>();
                worldPayload.put("id", w.getId().toString());
                worldPayload.put("projectId", newProjectId.toString());
                worldPayload.put("title", w.getTitle());
                worldPayload.put("content", w.getContent() == null ? "" : w.getContent());
                worldPayload.put("category", w.getCategory());
                searchService.indexDocument("world_settings", w.getId().toString(), worldPayload);
            }

            for (Plot p : plotsToInsert) {
                Map<String, Object> plotPayload = new HashMap<>();
                plotPayload.put("id", p.getId().toString());
                plotPayload.put("projectId", newProjectId.toString());
                plotPayload.put("title", p.getTitle());
                plotPayload.put("description", p.getDescription() == null ? "" : p.getDescription());
                searchService.indexDocument("plots", p.getId().toString(), plotPayload);
            }

            return Map.of("success", true, "projectId", newProjectId);
        } catch (Exception ex) {
            for (Path path : createdPaths) {
                try {
                    Files.deleteIfExists(path);
                } catch (Exception ignored) {
                    // ignore
                }
            }
            if (ex instanceof ResponseStatusException rse) throw rse;
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "백업 복원에 실패했습니다.");
        }
    }

    private static <T> List<T> listOrEmpty(List<T> list) {
        return list == null ? List.of() : list;
    }

    public record DownloadResult(String filename, String mimeType, byte[] content) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record BackupPayload(
        int version,
        String exportedAt,
        ProjectPayload project,
        List<DocumentPayload> documents,
        List<DocumentVersionPayload> documentVersions,
        List<CharacterPayload> characters,
        List<CharacterStatPayload> characterStats,
        List<WorldSettingPayload> worldSettings,
        List<RelationshipPayload> relationships,
        List<PlotPayload> plots,
        List<PlotPointPayload> plotPoints,
        List<WritingGoalPayload> writingGoals,
        List<ResearchItemPayload> researchItems,
        List<TranslationPayload> translations,
        List<AudioAssetPayload> audioAssets,
        List<StoryboardPayload> storyboards,
        List<ReaderPredictionPayload> readerPredictions,
        List<DocumentCommentPayload> documentComments,
        List<MediaAssetPayload> mediaAssets
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ProjectPayload(UUID id, String title, String description, String genre, String coverUrl, Map<String, Object> settings, Integer wordCount, Boolean isPublic) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record DocumentPayload(UUID id, UUID parentId, String type, String title, String content, Integer orderIndex, Integer wordCount, String status, String notes) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record DocumentVersionPayload(UUID id, UUID documentId, String content, Integer wordCount, String versionName, OffsetDateTime createdAt) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record CharacterPayload(UUID id, String name, String role, Map<String, Object> profile, Map<String, Object> appearance, Map<String, Object> personality, String backstory, String speechSample, String imageUrl) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record CharacterStatPayload(UUID id, UUID characterId, String templateType, Map<String, Object> stats, Integer episodeNum) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record WorldSettingPayload(UUID id, UUID parentId, String category, String title, String content, Map<String, Object> metadata) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record RelationshipPayload(UUID id, UUID characterAId, UUID characterBId, String relationType, String description, Boolean isBidirectional, Map<String, Object> metadata) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record PlotPayload(UUID id, String title, String description, Integer orderIndex, Map<String, Object> metadata) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record PlotPointPayload(UUID id, UUID plotId, UUID documentId, String title, String description, Integer orderIndex, Map<String, Object> metadata) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record WritingGoalPayload(UUID id, String goalType, Integer targetWords, Integer currentWords, java.time.LocalDate dueDate) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ResearchItemPayload(UUID id, String query, Map<String, Object> result) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record TranslationPayload(UUID id, UUID documentId, String targetLanguage, String provider, String content) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record AudioAssetPayload(UUID id, UUID documentId, String voice, String provider, String script, String audioUrl) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record StoryboardPayload(UUID id, UUID documentId, String provider, Map<String, Object> content) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ReaderPredictionPayload(UUID id, UUID documentId, String provider, Map<String, Object> result) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record DocumentCommentPayload(UUID id, UUID documentId, String content, Map<String, Object> position, OffsetDateTime createdAt) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record MediaAssetPayload(UUID id, UUID projectId, String originalName, String mimeType, Integer size, String url, String zipPath, String ext) {}
}
