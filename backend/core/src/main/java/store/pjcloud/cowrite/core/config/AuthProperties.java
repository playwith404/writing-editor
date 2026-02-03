package store.pjcloud.cowrite.core.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Data
@ConfigurationProperties(prefix = "auth")
public class AuthProperties {
    private boolean emailVerificationEnabled;
}
