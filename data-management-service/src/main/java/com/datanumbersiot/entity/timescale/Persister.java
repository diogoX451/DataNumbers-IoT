package com.datanumbersiot.entity.timescale;

import java.time.Instant;

import org.apache.pulsar.shade.com.google.gson.JsonObject;
import org.apache.pulsar.shade.com.google.gson.JsonParser;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.SequenceGenerator;
import jakarta.persistence.Table;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;

@Entity
@Table(name = "devices_data", schema = "public")
public class Persister {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "device_data_id_seq")
    @SequenceGenerator(name = "device_data_id_seq", sequenceName = "device_data_id_seq", allocationSize = 1)
    private Long id;

    @Column(name = "time")
    private Instant time;

    private String topic;

    @JsonIgnore
    @Column(name = "data", columnDefinition = "json")
    private String data;

    public Persister() {
    }

    public Persister(String jsonData) {
        JsonObject jsonObject = JsonParser.parseString(jsonData).getAsJsonObject();
        this.topic = jsonObject.get("topic").getAsString();
        this.data = jsonObject.get("payload").toString();
        this.time = Instant.now();
    }

    // Getters e setters
    public Long getId() {
        return id;
    }

    public String getTopic() {
        return topic;
    }

    public void setTopic(String topic) {
        this.topic = topic;
    }

    public String getData() {
        return data;
    }

    public void setData(String data) {
        this.data = data;
    }

    public Instant getTime() {
        return time;
    }

    public void setTime(Instant time) {
        this.time = time;
    }

    @Override
    public String toString() {
        return "Persister{" +
                "id=" + id +
                ", time=" + time +
                ", topic='" + topic + '\'' +
                ", data='" + data + '\'' +
                '}';
    }
}