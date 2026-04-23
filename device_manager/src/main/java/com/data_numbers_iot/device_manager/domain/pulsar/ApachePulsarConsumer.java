package com.data_numbers_iot.device_manager.domain.pulsar;

import org.apache.pulsar.client.api.Consumer;
import org.apache.pulsar.client.api.Message;
import org.apache.pulsar.client.api.PulsarClient;
import org.apache.pulsar.client.api.PulsarClientException;
import org.apache.pulsar.client.api.SubscriptionType;

public class ApachePulsarConsumer {
    private Consumer<byte[]> consumer;

    public void PulsarConsumer(PulsarClient client, String topic, String subscriptionName)
            throws PulsarClientException {
        this.consumer = client.newConsumer()
                .topic(topic)
                .subscriptionName(subscriptionName)
                .subscriptionType(SubscriptionType.Shared)
                .subscribe();
    }

    public String receive() throws PulsarClientException {
        Message<byte[]> msg = consumer.receive();
        try {
            String content = new String(msg.getData());
            return content;
        } finally {
            consumer.acknowledge(msg);
        }
    }

    public void close() throws PulsarClientException {
        if (consumer != null) {
            consumer.close();
        }
    }
}