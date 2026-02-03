package store.pjcloud.cowrite.sync.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "sync")
public class SyncProperties {
    private String coreApiInternalUrl;

    public String getCoreApiInternalUrl() {
        return coreApiInternalUrl;
    }

    public void setCoreApiInternalUrl(String coreApiInternalUrl) {
        this.coreApiInternalUrl = coreApiInternalUrl;
    }
}
