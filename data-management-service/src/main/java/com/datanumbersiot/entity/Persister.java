package com.datanumbersiot.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;

@Entity
public class Persister {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;

    private String topic;
    private String data;

    public Persister(String topic, String data) {
        this.topic = topic;
        this.data = data;
    }

    public String getTopic() {
        return this.topic;
    }

    public String getData() {
        return this.data;
    }

    public Long getId() {
        return id;
    }

    @Override
    public String toString() {
        return "Persister{" +
                "id=" + id +
                ", topic='" + topic + '\'' +
                ", data='" + data + '\'' +
                '}';
    }

}
