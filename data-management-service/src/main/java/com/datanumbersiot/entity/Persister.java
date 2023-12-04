package com.datanumbersiot.entity;

import org.apache.pulsar.shade.com.google.gson.JsonObject;

import jakarta.persistence.Entity;

@Entity
public class Persister {
    private String topic;
    private JsonObject data;

}
