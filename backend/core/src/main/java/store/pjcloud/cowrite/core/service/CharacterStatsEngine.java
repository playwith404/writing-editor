package store.pjcloud.cowrite.core.service;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import store.pjcloud.cowrite.core.entity.CharacterStat;

@Service
public class CharacterStatsEngine {
    private static final String TEMPLATE_RPG = "rpg";
    private static final String TEMPLATE_SYSTEM = "system";

    public List<Map<String, Object>> templates() {
        return List.of(
            Map.of(
                "id", TEMPLATE_RPG,
                "name", "게임판타지(RPG)",
                "required", List.of("str", "dex", "int", "vit"),
                "optional", List.of("level", "exp"),
                "derived", List.of("maxHp", "maxMp", "attack", "defense", "magic", "speed", "critChance")
            ),
            Map.of(
                "id", TEMPLATE_SYSTEM,
                "name", "상태창(System)",
                "required", List.of("str", "dex", "int", "vit"),
                "optional", List.of("level", "exp"),
                "derived", List.of("maxHp", "maxMp", "attack", "defense", "magic", "speed", "critChance")
            )
        );
    }

    public Map<String, Object> calculate(String templateType, Map<String, Object> stats) {
        String t = normalizeTemplate(templateType);
        if (!isSupportedTemplate(t)) {
            throw new IllegalArgumentException("지원하지 않는 templateType입니다.");
        }
        if (stats == null) stats = Map.of();

        int str = asInt(stats.get("str"), 0);
        int dex = asInt(stats.get("dex"), 0);
        int intel = asInt(stats.get("int"), 0);
        int vit = asInt(stats.get("vit"), 0);
        int exp = asInt(stats.get("exp"), 0);
        int level = asInt(stats.get("level"), 0);

        if (level <= 0) {
            level = Math.max(1, exp / 100 + 1);
        }
        if (exp <= 0) {
            exp = Math.max(0, (level - 1) * 100);
        }

        int maxHp = vit * 10 + level * 5;
        int maxMp = intel * 8 + level * 3;
        int attack = str * 2 + level;
        int defense = vit * 2 + level;
        int magic = intel * 2 + level;
        int speed = dex * 2 + level;
        double critChance = round1(Math.min(50.0, dex * 0.5));

        Map<String, Object> computed = new HashMap<>();
        computed.put("templateType", t);
        computed.put("level", level);
        computed.put("exp", exp);
        computed.put("str", str);
        computed.put("dex", dex);
        computed.put("int", intel);
        computed.put("vit", vit);

        computed.put("maxHp", maxHp);
        computed.put("maxMp", maxMp);
        computed.put("attack", attack);
        computed.put("defense", defense);
        computed.put("magic", magic);
        computed.put("speed", speed);
        computed.put("critChance", critChance);

        computed.put("computedAt", OffsetDateTime.now().toString());
        return computed;
    }

    public List<Map<String, Object>> progression(List<CharacterStat> rows) {
        if (rows == null || rows.isEmpty()) return List.of();
        List<CharacterStat> ordered = new ArrayList<>(rows);
        ordered.sort(Comparator.comparing(CharacterStat::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())));

        List<Map<String, Object>> result = new ArrayList<>();
        Map<String, Object> prevComputed = null;

        for (CharacterStat row : ordered) {
            String template = normalizeTemplate(row.getTemplateType());
            Map<String, Object> computed = calculate(template, row.getStats());
            Map<String, Object> delta = prevComputed == null ? Map.of() : diffNumeric(prevComputed, computed);

            Map<String, Object> out = new HashMap<>();
            out.put("id", row.getId() == null ? null : row.getId().toString());
            out.put("characterId", row.getCharacterId() == null ? null : row.getCharacterId().toString());
            out.put("episodeNum", row.getEpisodeNum());
            out.put("createdAt", row.getCreatedAt() == null ? null : row.getCreatedAt().toString());
            out.put("templateType", template);
            out.put("stats", row.getStats() == null ? Map.of() : row.getStats());
            out.put("computed", computed);
            out.put("delta", delta);
            result.add(out);

            prevComputed = computed;
        }

        return result;
    }

    public List<Map<String, Object>> validateHistory(List<CharacterStat> rows) {
        if (rows == null || rows.isEmpty()) return List.of();
        List<Map<String, Object>> issues = new ArrayList<>();

        List<CharacterStat> ordered = new ArrayList<>(rows);
        ordered.sort(Comparator.comparing(CharacterStat::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())));

        Integer prevLevel = null;
        Integer prevExp = null;
        String expectedTemplate = null;

        for (CharacterStat row : ordered) {
            String template = normalizeTemplate(row.getTemplateType());
            if (expectedTemplate == null) expectedTemplate = template;
            if (expectedTemplate != null && template != null && !expectedTemplate.equals(template)) {
                issues.add(issue("warning", row, "templateType", "templateType가 일관되지 않습니다."));
            }

            Map<String, Object> raw = row.getStats() == null ? Map.of() : row.getStats();
            List<String> required = List.of("str", "dex", "int", "vit");
            for (String key : required) {
                if (!isNumberLike(raw.get(key))) {
                    issues.add(issue("error", row, key, "필수 능력치가 누락되었습니다."));
                } else if (asInt(raw.get(key), 0) < 0) {
                    issues.add(issue("error", row, key, "능력치는 0 이상이어야 합니다."));
                }
            }

            Map<String, Object> computed = calculate(template, raw);
            // Derived consistency check (only if raw already has those keys).
            for (String key : List.of("maxHp", "maxMp", "attack", "defense", "magic", "speed")) {
                if (raw.containsKey(key) && isNumberLike(raw.get(key))) {
                    int actual = asInt(raw.get(key), 0);
                    int expected = asInt(computed.get(key), 0);
                    if (actual != expected) {
                        issues.add(issue("warning", row, key, "자동 계산 값과 다릅니다. expected=" + expected + ", actual=" + actual));
                    }
                }
            }
            if (raw.containsKey("critChance") && isNumberLike(raw.get("critChance"))) {
                double actual = asDouble(raw.get("critChance"), 0);
                double expected = asDouble(computed.get("critChance"), 0);
                if (Math.abs(actual - expected) > 0.11) {
                    issues.add(issue("warning", row, "critChance", "자동 계산 값과 다릅니다. expected=" + expected + ", actual=" + actual));
                }
            }

            Integer level = asIntOrNull(raw.get("level"));
            Integer exp = asIntOrNull(raw.get("exp"));
            if (level != null && level < 1) {
                issues.add(issue("error", row, "level", "level은 1 이상이어야 합니다."));
            }
            if (exp != null && exp < 0) {
                issues.add(issue("error", row, "exp", "exp는 0 이상이어야 합니다."));
            }

            if (prevLevel != null && level != null && level < prevLevel) {
                issues.add(issue("warning", row, "level", "레벨이 이전 기록보다 낮습니다."));
            }
            if (prevExp != null && exp != null && exp < prevExp) {
                issues.add(issue("warning", row, "exp", "경험치가 이전 기록보다 낮습니다."));
            }

            if (level != null) prevLevel = level;
            if (exp != null) prevExp = exp;
        }

        return issues;
    }

    private Map<String, Object> issue(String severity, CharacterStat row, String field, String message) {
        UUID id = row.getId();
        Map<String, Object> out = new HashMap<>();
        out.put("severity", severity);
        out.put("id", id == null ? null : id.toString());
        out.put("episodeNum", row.getEpisodeNum());
        out.put("createdAt", row.getCreatedAt() == null ? null : row.getCreatedAt().toString());
        out.put("field", field);
        out.put("message", message);
        return out;
    }

    private boolean isSupportedTemplate(String template) {
        if (template == null) return false;
        return TEMPLATE_RPG.equals(template) || TEMPLATE_SYSTEM.equals(template);
    }

    private String normalizeTemplate(String templateType) {
        if (templateType == null || templateType.isBlank()) return TEMPLATE_RPG;
        String t = templateType.trim().toLowerCase(Locale.ROOT);
        return switch (t) {
            case "system", "status", "status_window" -> TEMPLATE_SYSTEM;
            default -> TEMPLATE_RPG;
        };
    }

    private Map<String, Object> diffNumeric(Map<String, Object> prev, Map<String, Object> next) {
        Map<String, Object> delta = new HashMap<>();
        for (String key : next.keySet()) {
            if (!isNumberLike(next.get(key)) || !isNumberLike(prev.get(key))) continue;
            double d = asDouble(next.get(key), 0) - asDouble(prev.get(key), 0);
            if (Math.abs(d) < 0.0001) continue;
            if (Math.abs(d - Math.round(d)) < 0.0001) delta.put(key, (int) Math.round(d));
            else delta.put(key, round1(d));
        }
        return delta;
    }

    private boolean isNumberLike(Object value) {
        return value instanceof Number || value instanceof String;
    }

    private Integer asIntOrNull(Object value) {
        if (value == null) return null;
        if (value instanceof Number n) return n.intValue();
        if (value instanceof String s) {
            String t = s.trim();
            if (t.isBlank()) return null;
            try {
                return Integer.parseInt(t);
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    private int asInt(Object value, int defaultValue) {
        Integer v = asIntOrNull(value);
        return v == null ? defaultValue : v;
    }

    private double asDouble(Object value, double defaultValue) {
        if (value == null) return defaultValue;
        if (value instanceof Number n) return n.doubleValue();
        if (value instanceof String s) {
            String t = s.trim();
            if (t.isBlank()) return defaultValue;
            try {
                return Double.parseDouble(t);
            } catch (NumberFormatException ignored) {
                return defaultValue;
            }
        }
        return defaultValue;
    }

    private double round1(double v) {
        return Math.round(v * 10.0) / 10.0;
    }
}
