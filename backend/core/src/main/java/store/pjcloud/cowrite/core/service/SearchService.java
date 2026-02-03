package store.pjcloud.cowrite.core.service;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch._types.ElasticsearchException;
import co.elastic.clients.elasticsearch._types.FieldValue;
import co.elastic.clients.elasticsearch._types.Refresh;
import co.elastic.clients.elasticsearch.core.SearchRequest;
import co.elastic.clients.elasticsearch.core.SearchResponse;
import co.elastic.clients.elasticsearch.core.search.Hit;
import co.elastic.clients.elasticsearch.indices.ExistsRequest;
import co.elastic.clients.elasticsearch.indices.CreateIndexRequest;
import co.elastic.clients.json.JsonData;
import co.elastic.clients.transport.ElasticsearchTransport;
import co.elastic.clients.transport.rest_client.RestClientTransport;
import co.elastic.clients.json.jackson.JacksonJsonpMapper;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.apache.http.Header;
import org.apache.http.HttpHost;
import org.apache.http.message.BasicHeader;
import org.elasticsearch.client.RestClient;
import org.elasticsearch.client.RestClientBuilder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import store.pjcloud.cowrite.core.config.ElasticProperties;

@Service
public class SearchService {
    private static final Logger log = LoggerFactory.getLogger(SearchService.class);

    private final ElasticsearchClient client;
    private final List<String> indices = List.of("documents", "characters", "world_settings", "plots", "projects");
    private volatile boolean elasticEnabled = true;

    public SearchService(ElasticProperties properties) {
        RestClientBuilder builder = RestClient.builder(HttpHost.create(properties.getNode()));
        if (properties.getApiKey() != null && !properties.getApiKey().isBlank()) {
            Header[] headers = new Header[] { new BasicHeader("Authorization", "ApiKey " + properties.getApiKey()) };
            builder.setDefaultHeaders(headers);
        }
        RestClient restClient = builder.build();
        ElasticsearchTransport transport = new RestClientTransport(restClient, new JacksonJsonpMapper());
        this.client = new ElasticsearchClient(transport);

        try {
            ensureIndices();
        } catch (Exception ex) {
            elasticEnabled = false;
            log.warn("검색(Elasticsearch)을 사용할 수 없습니다. DB 검색으로 폴백합니다.");
        }
    }

    public boolean isElasticEnabled() {
        return elasticEnabled;
    }

    public void ensureIndices() throws IOException {
        for (String index : indices) {
            boolean exists = client.indices().exists(ExistsRequest.of(b -> b.index(index))).value();
            if (!exists) {
                client.indices().create(CreateIndexRequest.of(b -> b.index(index)));
            }
        }
    }

    public void indexDocument(String index, String id, Map<String, Object> body) {
        if (!elasticEnabled) return;
        try {
            client.index(b -> b.index(index).id(id).document(body).refresh(Refresh.WaitFor));
        } catch (Exception ex) {
            elasticEnabled = false;
            log.warn("Indexing failed for {}:{}", index, id);
        }
    }

    public List<SearchHit> search(String query, List<String> projectIds, String type) {
        if (!elasticEnabled) return List.of();
        if (projectIds == null || projectIds.isEmpty()) return List.of();
        List<String> searchIndices = type != null && indices.contains(type)
            ? List.of(type)
            : List.of("documents", "characters", "world_settings", "plots");

        try {
            SearchRequest request = SearchRequest.of(b -> b
                .index(searchIndices)
                .query(q -> q.bool(bb -> bb
                    .must(m -> m.multiMatch(mm -> mm
                        .query(query)
                        .fields("title^3", "name^2", "content", "description", "genre")
                        .fuzziness("AUTO")
                    ))
                    .filter(f -> f.terms(t -> t.field("projectId").terms(tt -> tt.value(projectIds.stream().map(FieldValue::of).toList()))))
                ))
            );

            SearchResponse<Map> response = client.search(request, Map.class);
            List<SearchHit> hits = new ArrayList<>();
            for (Hit<Map> hit : response.hits().hits()) {
                hits.add(new SearchHit(hit.id(), hit.index(), hit.score(), hit.source()));
            }
            return hits;
        } catch (Exception ex) {
            elasticEnabled = false;
            return List.of();
        }
    }

    public List<SearchHit> searchProjects(String query, List<String> projectIds) {
        if (!elasticEnabled) return List.of();
        if (projectIds == null || projectIds.isEmpty()) return List.of();
        try {
            SearchRequest request = SearchRequest.of(b -> b
                .index("projects")
                .query(q -> q.bool(bb -> bb
                    .must(m -> m.multiMatch(mm -> mm
                        .query(query)
                        .fields("title^3", "description", "genre")
                        .fuzziness("AUTO")
                    ))
                    .filter(f -> f.ids(i -> i.values(projectIds)))
                ))
            );
            SearchResponse<Map> response = client.search(request, Map.class);
            List<SearchHit> hits = new ArrayList<>();
            for (Hit<Map> hit : response.hits().hits()) {
                hits.add(new SearchHit(hit.id(), hit.index(), hit.score(), hit.source()));
            }
            return hits;
        } catch (Exception ex) {
            elasticEnabled = false;
            return List.of();
        }
    }

    public record SearchHit(String id, String index, Double score, Map source) {}
}
