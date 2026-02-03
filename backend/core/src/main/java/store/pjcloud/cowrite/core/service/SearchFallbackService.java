package store.pjcloud.cowrite.core.service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import store.pjcloud.cowrite.core.entity.Character;
import store.pjcloud.cowrite.core.entity.Document;
import store.pjcloud.cowrite.core.entity.Plot;
import store.pjcloud.cowrite.core.entity.Project;
import store.pjcloud.cowrite.core.entity.WorldSetting;

@Service
public class SearchFallbackService {
    private static final int DEFAULT_LIMIT = 30;

    @PersistenceContext
    private EntityManager em;

    public List<SearchService.SearchHit> search(String q, List<UUID> projectIds, String type) {
        if (q == null || q.isBlank()) return List.of();
        if (projectIds == null || projectIds.isEmpty()) return List.of();

        String normalizedType = type == null ? null : type.trim().toLowerCase(Locale.ROOT);
        List<String> types = switch (normalizedType == null ? "" : normalizedType) {
            case "documents", "characters", "world_settings", "plots" -> List.of(normalizedType);
            default -> List.of("documents", "characters", "world_settings", "plots");
        };

        String like = "%" + q.toLowerCase(Locale.ROOT) + "%";
        List<SearchService.SearchHit> hits = new ArrayList<>();
        for (String t : types) {
            hits.addAll(searchOneType(t, projectIds, like));
        }
        return hits;
    }

    public List<SearchService.SearchHit> searchProjects(String q, List<UUID> projectIds) {
        if (q == null || q.isBlank()) return List.of();
        if (projectIds == null || projectIds.isEmpty()) return List.of();

        String like = "%" + q.toLowerCase(Locale.ROOT) + "%";
        List<Project> rows = em.createQuery(
                "select p from Project p where p.deletedAt is null and p.id in :ids and (" +
                    "lower(p.title) like :q or lower(coalesce(p.description,'')) like :q or lower(coalesce(p.genre,'')) like :q" +
                ") order by p.updatedAt desc",
                Project.class
            )
            .setParameter("ids", projectIds)
            .setParameter("q", like)
            .setMaxResults(DEFAULT_LIMIT)
            .getResultList();

        List<SearchService.SearchHit> hits = new ArrayList<>();
        for (Project p : rows) {
            Map<String, Object> source = new HashMap<>();
            source.put("id", p.getId().toString());
            source.put("title", p.getTitle());
            source.put("description", safeExcerpt(p.getDescription()));
            source.put("genre", p.getGenre());
            source.put("wordCount", p.getWordCount());
            source.put("isPublic", p.getIsPublic());
            hits.add(new SearchService.SearchHit(p.getId().toString(), "projects", null, source));
        }
        return hits;
    }

    private List<SearchService.SearchHit> searchOneType(String type, List<UUID> projectIds, String like) {
        return switch (type) {
            case "documents" -> searchDocuments(projectIds, like);
            case "characters" -> searchCharacters(projectIds, like);
            case "world_settings" -> searchWorldSettings(projectIds, like);
            case "plots" -> searchPlots(projectIds, like);
            default -> List.of();
        };
    }

    private List<SearchService.SearchHit> searchDocuments(List<UUID> projectIds, String like) {
        List<Document> rows = em.createQuery(
                "select d from Document d where d.projectId in :pids and (" +
                    "lower(d.title) like :q or lower(coalesce(d.content,'')) like :q" +
                ") order by d.updatedAt desc",
                Document.class
            )
            .setParameter("pids", projectIds)
            .setParameter("q", like)
            .setMaxResults(DEFAULT_LIMIT)
            .getResultList();

        List<SearchService.SearchHit> hits = new ArrayList<>();
        for (Document d : rows) {
            Map<String, Object> source = new HashMap<>();
            source.put("id", d.getId().toString());
            source.put("projectId", d.getProjectId() == null ? null : d.getProjectId().toString());
            source.put("title", d.getTitle());
            source.put("type", d.getType());
            source.put("excerpt", safeExcerpt(stripHtml(d.getContent())));
            hits.add(new SearchService.SearchHit(d.getId().toString(), "documents", null, source));
        }
        return hits;
    }

    private List<SearchService.SearchHit> searchCharacters(List<UUID> projectIds, String like) {
        List<Character> rows = em.createQuery(
                "select c from Character c where c.projectId in :pids and (" +
                    "lower(c.name) like :q or lower(coalesce(c.role,'')) like :q or lower(coalesce(c.backstory,'')) like :q" +
                ") order by c.updatedAt desc",
                Character.class
            )
            .setParameter("pids", projectIds)
            .setParameter("q", like)
            .setMaxResults(DEFAULT_LIMIT)
            .getResultList();

        List<SearchService.SearchHit> hits = new ArrayList<>();
        for (Character c : rows) {
            Map<String, Object> source = new HashMap<>();
            source.put("id", c.getId().toString());
            source.put("projectId", c.getProjectId() == null ? null : c.getProjectId().toString());
            source.put("name", c.getName());
            source.put("role", c.getRole());
            source.put("excerpt", safeExcerpt(c.getBackstory()));
            hits.add(new SearchService.SearchHit(c.getId().toString(), "characters", null, source));
        }
        return hits;
    }

    private List<SearchService.SearchHit> searchWorldSettings(List<UUID> projectIds, String like) {
        List<WorldSetting> rows = em.createQuery(
                "select w from WorldSetting w where w.projectId in :pids and (" +
                    "lower(w.title) like :q or lower(coalesce(w.category,'')) like :q or lower(coalesce(w.content,'')) like :q" +
                ") order by w.createdAt desc",
                WorldSetting.class
            )
            .setParameter("pids", projectIds)
            .setParameter("q", like)
            .setMaxResults(DEFAULT_LIMIT)
            .getResultList();

        List<SearchService.SearchHit> hits = new ArrayList<>();
        for (WorldSetting w : rows) {
            Map<String, Object> source = new HashMap<>();
            source.put("id", w.getId().toString());
            source.put("projectId", w.getProjectId() == null ? null : w.getProjectId().toString());
            source.put("title", w.getTitle());
            source.put("category", w.getCategory());
            source.put("excerpt", safeExcerpt(w.getContent()));
            hits.add(new SearchService.SearchHit(w.getId().toString(), "world_settings", null, source));
        }
        return hits;
    }

    private List<SearchService.SearchHit> searchPlots(List<UUID> projectIds, String like) {
        List<Plot> rows = em.createQuery(
                "select p from Plot p where p.projectId in :pids and (" +
                    "lower(p.title) like :q or lower(coalesce(p.description,'')) like :q" +
                ") order by p.updatedAt desc",
                Plot.class
            )
            .setParameter("pids", projectIds)
            .setParameter("q", like)
            .setMaxResults(DEFAULT_LIMIT)
            .getResultList();

        List<SearchService.SearchHit> hits = new ArrayList<>();
        for (Plot p : rows) {
            Map<String, Object> source = new HashMap<>();
            source.put("id", p.getId().toString());
            source.put("projectId", p.getProjectId() == null ? null : p.getProjectId().toString());
            source.put("title", p.getTitle());
            source.put("excerpt", safeExcerpt(p.getDescription()));
            hits.add(new SearchService.SearchHit(p.getId().toString(), "plots", null, source));
        }
        return hits;
    }

    private String safeExcerpt(String value) {
        if (value == null) return "";
        String trimmed = value.trim();
        if (trimmed.isBlank()) return "";
        if (trimmed.length() <= 280) return trimmed;
        return trimmed.substring(0, 280) + "…";
    }

    private String stripHtml(String html) {
        if (html == null || html.isBlank()) return "";
        return html
            .replaceAll("<[^>]*>", " ")
            .replace("&nbsp;", " ")
            .replaceAll("\\s+", " ")
            .trim();
    }
}
