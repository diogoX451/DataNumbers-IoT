package com.datanumbersiot.service;

import org.apache.pulsar.shade.org.jvnet.hk2.annotations.Service;
import org.springframework.beans.factory.annotation.Autowired;

import com.datanumbersiot.repository.postgres.IPersisterRepository;

@Service
public class PersisterService {

    @Autowired
    private final IPersisterRepository repository;

    public PersisterService(IPersisterRepository repository) {
        this.repository = repository;
    }

    public void savePersister(String data) {
        System.out.println("Persister data: " + data);
        // this.repository.save(data);
    }

}
