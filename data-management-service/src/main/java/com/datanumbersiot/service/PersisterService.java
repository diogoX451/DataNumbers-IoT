package com.datanumbersiot.service;

import org.springframework.stereotype.Service;

import com.datanumbersiot.repository.postgres.IPersisterRepository;

@Service
public class PersisterService {

    private final IPersisterRepository repository;

    public PersisterService(IPersisterRepository repository) {
        this.repository = repository;
    }

    public void savePersister(String data) {
        System.out.println("Persister data: " + data);
        // this.repository.save(data);
    }

}
