package store.pjcloud.cowrite.sync.handler;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import store.pjcloud.cowrite.sync.config.SyncProperties;

@Component
public class SyncWebSocketHandler extends TextWebSocketHandler {
    private static final Logger log = LoggerFactory.getLogger(SyncWebSocketHandler.class);

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate = new RestTemplate();
    private final SyncProperties properties;

    private final Set<ClientMeta> clients = ConcurrentHashMap.newKeySet();

    public SyncWebSocketHandler(SyncProperties properties) {
        this.properties = properties;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        ClientMeta meta = new ClientMeta(session, extractToken(session.getUri()));
        clients.add(meta);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        ClientMeta meta = findBySession(session);
        if (meta == null) return;

        try {
            Map<String, Object> data = objectMapper.readValue(message.getPayload(), new TypeReference<>() {});
            String type = data.get("type") instanceof String ? (String) data.get("type") : null;
            if (type == null) return;

            if ("join".equals(type)) {
                handleJoin(meta, data);
                return;
            }

            if ("leave".equals(type)) {
                broadcast(meta.projectId, Map.of("type", "presence:leave", "userId", meta.userId), meta);
                meta.projectId = null;
                return;
            }

            if (meta.projectId == null || meta.userId == null) {
                return;
            }

            if ("content:op".equals(type)) {
                broadcast(meta.projectId, Map.of(
                    "type", "content:sync",
                    "payload", data.get("payload"),
                    "userId", meta.userId
                ), meta);
                return;
            }

            if ("cursor:move".equals(type) || "presence:update".equals(type)) {
                String event = "cursor:move".equals(type) ? "cursor:update" : "presence:change";
                broadcast(meta.projectId, Map.of(
                    "type", event,
                    "payload", data.get("payload"),
                    "userId", meta.userId
                ), meta);
            }
        } catch (Exception ex) {
            log.warn("유효하지 않은 메시지입니다.");
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        ClientMeta meta = findBySession(session);
        if (meta != null) {
            if (meta.projectId != null && meta.userId != null) {
                broadcast(meta.projectId, Map.of("type", "presence:leave", "userId", meta.userId), meta);
            }
            clients.remove(meta);
        }
    }

    private void handleJoin(ClientMeta meta, Map<String, Object> data) throws Exception {
        String projectId = data.get("projectId") instanceof String ? (String) data.get("projectId") : null;
        String token = data.get("token") instanceof String ? (String) data.get("token") : meta.token;

        if (projectId == null || token == null) {
            send(meta, Map.of("type", "error", "message", "projectId와 token이 필요합니다."));
            return;
        }

        AccessResult access = verifyProjectAccess(projectId, token);
        if (!access.ok || access.userId == null) {
            send(meta, Map.of("type", "error", "message", "프로젝트 접근 권한이 없습니다."));
            meta.session.close();
            return;
        }

        meta.projectId = projectId;
        meta.userId = access.userId;
        meta.token = token;

        broadcast(meta.projectId, Map.of("type", "presence:join", "userId", meta.userId), null);
    }

    private AccessResult verifyProjectAccess(String projectId, String token) {
        String base = properties.getCoreApiInternalUrl();
        if (base == null || base.isBlank()) {
            base = "http://core-api:3000";
        }
        String url = base.replaceAll("/$", "") + "/projects/" + projectId + "/access";

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(token);
            ResponseEntity<Map> resp = restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(headers), Map.class);
            if (!resp.getStatusCode().is2xxSuccessful() || resp.getBody() == null) {
                return new AccessResult(false, null);
            }
            Object ok = resp.getBody().get("ok");
            Object userId = resp.getBody().get("userId");
            if (!(ok instanceof Boolean) || !(Boolean) ok || !(userId instanceof String)) {
                return new AccessResult(false, null);
            }
            return new AccessResult(true, (String) userId);
        } catch (Exception ex) {
            return new AccessResult(false, null);
        }
    }

    private void broadcast(String projectId, Map<String, Object> payload, ClientMeta exclude) {
        if (projectId == null) return;
        for (ClientMeta client : clients) {
            if (exclude != null && client == exclude) continue;
            if (projectId.equals(client.projectId)) {
                send(client, payload);
            }
        }
    }

    private void send(ClientMeta client, Map<String, Object> payload) {
        try {
            client.session.sendMessage(new TextMessage(objectMapper.writeValueAsString(payload)));
        } catch (Exception ex) {
            // ignore
        }
    }

    private ClientMeta findBySession(WebSocketSession session) {
        for (ClientMeta client : clients) {
            if (client.session.equals(session)) return client;
        }
        return null;
    }

    private String extractToken(URI uri) {
        if (uri == null || uri.getQuery() == null) return null;
        String[] parts = uri.getQuery().split("&");
        for (String part : parts) {
            if (part.startsWith("token=")) {
                return part.substring("token=".length());
            }
        }
        return null;
    }

    private static class ClientMeta {
        private final WebSocketSession session;
        private String projectId;
        private String userId;
        private String token;

        private ClientMeta(WebSocketSession session, String token) {
            this.session = session;
            this.token = token;
        }
    }

    private record AccessResult(boolean ok, String userId) {}
}
