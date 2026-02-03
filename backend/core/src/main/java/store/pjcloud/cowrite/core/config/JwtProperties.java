package store.pjcloud.cowrite.core.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Data
@ConfigurationProperties(prefix = "jwt")
public class JwtProperties {
    private String secret;
    private String expiresIn;
    private String refreshExpiresIn;
}
