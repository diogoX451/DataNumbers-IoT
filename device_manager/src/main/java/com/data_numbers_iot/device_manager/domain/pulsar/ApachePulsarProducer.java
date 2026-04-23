package com.data_numbers_iot.device_manager.domain.pulsar;

import org.apache.pulsar.client.api.Producer;
import org.apache.pulsar.client.api.PulsarClient;
import org.apache.pulsar.client.api.PulsarClientException;

import com.fasterxml.jackson.databind.ObjectMapper;

public class ApachePulsarProducer {
    private Producer<byte[]> producer;
    private ObjectMapper objectMapper;


    public ApachePulsarProducer(PulsarClient client, String topic) throws PulsarClientException {
        this.producer = client.newProducer()
                .topic(topic)
                .producerName(topic+"-device-manager")
                .create();
        this.objectMapper = new ObjectMapper();
    }

    public void send(Object message) throws PulsarClientException {
        try {
            String messageJson = objectMapper.writeValueAsString(message);
            producer.send(messageJson.getBytes());
        } catch (Exception e) {
            throw new PulsarClientException(e);
        }
    }

    public void close() throws PulsarClientException {
        if (producer != null) {
            producer.close();
        }
    }
}
