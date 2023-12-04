package com.datanumbersiot.config;

import org.apache.pulsar.client.api.PulsarClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.transaction.annotation.EnableTransactionManagement;

@Configuration
@EnableTransactionManagement
@EnableJpaRepositories(basePackages = "com.datanumbersiot.repository.timescale", entityManagerFactoryRef = "postgresEntityManagerFactory", transactionManagerRef = "postgresTransactionManager")

public class PulsarConfig {
    @Value("${pulsar.service-url}")
    private String pulsarServiceUrl;

    public PulsarClient client() throws Exception {
        return PulsarClient.builder()
                .serviceUrl(pulsarServiceUrl)
                .build();
    }
}
