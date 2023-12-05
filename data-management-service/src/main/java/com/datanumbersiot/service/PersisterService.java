package com.datanumbersiot.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.datanumbersiot.entity.timescale.Persister;
import com.datanumbersiot.repository.timescale.IPersisterRepository;

@Service
public class PersisterService {

    private final IPersisterRepository repository;

    public PersisterService(IPersisterRepository repository) {
        this.repository = repository;
    }

    public Persister save(Persister persister) {
        return repository.save(persister);
    }

}
