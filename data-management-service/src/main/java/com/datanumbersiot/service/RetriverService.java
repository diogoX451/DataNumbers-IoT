package com.datanumbersiot.service;

import org.springframework.beans.factory.annotation.Autowired;

import com.datanumbersiot.entity.Retriver;
import com.datanumbersiot.repository.timescale.IRetriverRepository;

public class RetriverService {

    @Autowired
    private final IRetriverRepository repository;
    private final PersisterService persister;

    public RetriverService(IRetriverRepository repository, PersisterService persister) {
        this.repository = repository;
        this.persister = persister;
    }

    public void save(Retriver retriver) {
        repository.save(retriver);
    }

    public void data(String data) {
        System.out.println("data: " + data);
        this.persister.savePersister(data);
    }
}
