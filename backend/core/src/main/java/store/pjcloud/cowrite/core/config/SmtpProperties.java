package store.pjcloud.cowrite.core.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Data
@ConfigurationProperties(prefix = "smtp")
public class SmtpProperties {
    private String host;
    private int port = 587;
    private boolean secure;
    private String user;
    private String password;
    private String from;
}
