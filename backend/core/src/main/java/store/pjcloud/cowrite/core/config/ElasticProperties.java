package store.pjcloud.cowrite.core.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Data
@ConfigurationProperties(prefix = "elastic")
public class ElasticProperties {
    private String node;
    private String apiKey;
}
