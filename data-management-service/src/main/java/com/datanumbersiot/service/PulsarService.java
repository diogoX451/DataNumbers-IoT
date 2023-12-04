package com.datanumbersiot.service;

import org.apache.pulsar.client.api.Consumer;
import org.apache.pulsar.client.api.PulsarClient;
import org.apache.pulsar.client.api.PulsarClientException;
import org.apache.pulsar.client.api.Schema;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;

import org.springframework.beans.factory.annotation.Value;
import org.apache.pulsar.client.api.Message;

@Service
public class PulsarService {
    private final PulsarClient client;
    private final RetriverService retriver;

    @Value("${spring.pulsar.topic}")
    private String pulsarTopic;

    public PulsarService(PulsarClient client, RetriverService retriver) {
        this.client = client;
        this.retriver = retriver;
    }

    @PostConstruct
    public void init() {
        loadConsumer();
    }

    public void loadConsumer() {
        try {
            Consumer<String> consumer = client.newConsumer(Schema.STRING)
                    .topic(pulsarTopic)
                    .subscriptionName("consumer-data")
                    .subscribe();

            while (!Thread.currentThread().isInterrupted()) {
                Message<String> message = consumer.receive();
                try {
    
                    System.out.printf("Message received: %s", message.getValue());
                    retriver.data(message.getValue());
                    consumer.acknowledge(message);
                } catch (Exception e) {
                    consumer.negativeAcknowledge(message);
                }
            }
        } catch (PulsarClientException e) {
            e.printStackTrace();
        }
    }

}
