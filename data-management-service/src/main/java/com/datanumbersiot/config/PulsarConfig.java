package com.datanumbersiot.config;

import org.apache.pulsar.client.api.PulsarClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration

public class PulsarConfig {
    @Value("${spring.pulsar.service-url}")
    private String pulsarServiceUrl;

    public PulsarClient client() throws Exception {
        return PulsarClient.builder()
                .serviceUrl(pulsarServiceUrl)
                .build();
    }
}
