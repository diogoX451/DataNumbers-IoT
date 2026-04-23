package com.datanumbersiot.service;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.datanumbersiot.entity.timescale.Persister;
import com.datanumbersiot.repository.timescale.IRetriverRepository;

@Service
public class RetriverService {

    private final IRetriverRepository repository;

    public RetriverService(IRetriverRepository repository) {
        this.repository = repository;
    }

    public List<Persister> findAll() {
        return repository.findAll();
    }

    public Optional<Persister> findById(Long id) {
        return repository.findById(id);
    }

    public List<Persister> findByTimeBetween(Instant start, Instant end) {
        return repository.findByTimeBetween(start, end);
    }
}
