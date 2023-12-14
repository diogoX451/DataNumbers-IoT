package com.data_numbers_iot.device_manager.domain.pulsar;

import org.apache.pulsar.client.api.PulsarClient;
import org.apache.pulsar.client.api.PulsarClientException;

public class ApachePulsarClient {
    private PulsarClient client;

    public ApachePulsarClient(String serviceUrl) throws PulsarClientException {
        this.client = PulsarClient.builder()
                .serviceUrl(serviceUrl)
                .build();
    }

    public PulsarClient getClient() {
        return client;
    }
}
