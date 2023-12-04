package com.datanumbersiot.service;

import org.springframework.stereotype.Service;

import com.datanumbersiot.entity.Retriver;

@Service
public class RetriverService {

    private final PersisterService persister;

    public RetriverService(PersisterService persister) {
        this.persister = persister;
    }

    public void data(String data) {
        System.out.println("data: " + data);
        this.persister.savePersister(data);
    }
}
