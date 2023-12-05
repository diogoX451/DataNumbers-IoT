package com.datanumbersiot.service;

import java.util.Base64;

import org.apache.pulsar.client.api.SubscriptionType;
import org.springframework.stereotype.Service;

import com.datanumbersiot.entity.timescale.Persister;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.pulsar.annotation.PulsarListener;

@Service
public class PulsarService {
    private final PersisterService persister;

    @Value("${spring.pulsar.topic}")
    private static final String TOPICS = "devices-data";

    public PulsarService(PersisterService persister) {
        this.persister = persister;
    }

    @PulsarListener(topics = TOPICS, subscriptionName = "MICROSERVICE-CLIENT", subscriptionType = SubscriptionType.Shared)
    public void loadConsumer(String data) {
        String sanitizedData = data;
        if (data.startsWith("\"") && data.endsWith("\"")) {
            sanitizedData = data.substring(1, data.length() - 1);
        }

        byte[] bytes = Base64.getDecoder().decode(sanitizedData);
        String decodedMessage = new String(bytes);

        Persister persisterData = new Persister(decodedMessage);
        persister.save(persisterData);
    }
}
