package store.pjcloud.cowrite.core.service;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import store.pjcloud.cowrite.core.entity.Document;
import store.pjcloud.cowrite.core.entity.DocumentVersion;
import store.pjcloud.cowrite.core.repository.CharacterRepository;
import store.pjcloud.cowrite.core.repository.DocumentRepository;
import store.pjcloud.cowrite.core.repository.DocumentVersionRepository;
import store.pjcloud.cowrite.core.repository.PlotRepository;
import store.pjcloud.cowrite.core.repository.WorldSettingRepository;

@Service
public class StatsService {
    private final DocumentRepository documentRepo;
    private final DocumentVersionRepository versionRepo;
    private final CharacterRepository characterRepo;
    private final WorldSettingRepository worldRepo;
    private final PlotRepository plotRepo;

    public StatsService(DocumentRepository documentRepo,
                        DocumentVersionRepository versionRepo,
                        CharacterRepository characterRepo,
                        WorldSettingRepository worldRepo,
                        PlotRepository plotRepo) {
        this.documentRepo = documentRepo;
        this.versionRepo = versionRepo;
        this.characterRepo = characterRepo;
        this.worldRepo = worldRepo;
        this.plotRepo = plotRepo;
    }

    public Map<String, Object> projectStats(UUID projectId) {
        long documents = documentRepo.findByProjectId(projectId).size();
        long characters = characterRepo.count((root, query, cb) -> cb.equal(root.get("projectId"), projectId));
        long worldSettings = worldRepo.count((root, query, cb) -> cb.equal(root.get("projectId"), projectId));
        long plots = plotRepo.count((root, query, cb) -> cb.equal(root.get("projectId"), projectId));
        Long sum = documentRepo.sumWordCount(projectId);

        return Map.of(
            "projectId", projectId,
            "documents", documents,
            "characters", characters,
            "worldSettings", worldSettings,
            "plots", plots,
            "wordCount", sum == null ? 0 : sum
        );
    }

    public List<Map<String, Object>> dailyWords(UUID projectId, int days) {
        int safeDays = Math.max(1, Math.min(days, 365));
        LocalDate today = OffsetDateTime.now(ZoneOffset.UTC).toLocalDate();
        LocalDate start = today.minusDays(safeDays - 1L);

        List<Document> docs = documentRepo.findByProjectId(projectId);
        List<UUID> docIds = docs.stream().map(Document::getId).filter(v -> v != null).toList();
        if (docIds.isEmpty()) {
            return dateSeries(start, today);
        }

        List<DocumentVersion> versions = versionRepo.findByDocumentIdInOrderByCreatedAtDesc(docIds);
        if (versions.isEmpty()) {
            return dateSeries(start, today);
        }
        versions = new ArrayList<>(versions);
        versions.sort(Comparator.comparing(DocumentVersion::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())));

        Map<LocalDate, Map<UUID, int[]>> perDay = new LinkedHashMap<>();
        for (DocumentVersion v : versions) {
            if (v.getCreatedAt() == null) continue;
            LocalDate day = v.getCreatedAt().atZoneSameInstant(ZoneOffset.UTC).toLocalDate();
            if (day.isBefore(start) || day.isAfter(today)) continue;
            perDay.computeIfAbsent(day, __ -> new HashMap<>());
            Map<UUID, int[]> perDoc = perDay.get(day);
            UUID docId = v.getDocumentId();
            if (docId == null) continue;
            int wc = v.getWordCount() == null ? 0 : v.getWordCount();
            int[] pair = perDoc.computeIfAbsent(docId, __ -> new int[] { wc, wc });
            pair[1] = wc; // update last
        }

        List<Map<String, Object>> series = new ArrayList<>();
        LocalDate cursor = start;
        while (!cursor.isAfter(today)) {
            Map<UUID, int[]> perDoc = perDay.get(cursor);
            long delta = 0;
            if (perDoc != null) {
                for (int[] pair : perDoc.values()) {
                    delta += (pair[1] - pair[0]);
                }
            }
            series.add(Map.of(
                "date", cursor.toString(),
                "wordsDelta", delta
            ));
            cursor = cursor.plusDays(1);
        }
        return series;
    }

    private List<Map<String, Object>> dateSeries(LocalDate start, LocalDate end) {
        List<Map<String, Object>> series = new ArrayList<>();
        LocalDate cursor = start;
        while (!cursor.isAfter(end)) {
            series.add(Map.of("date", cursor.toString(), "wordsDelta", 0));
            cursor = cursor.plusDays(1);
        }
        return series;
    }
}
