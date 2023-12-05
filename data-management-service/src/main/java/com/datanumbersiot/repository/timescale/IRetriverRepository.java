package com.datanumbersiot.repository.timescale;

import java.time.Instant;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.datanumbersiot.entity.timescale.Persister;

public interface IRetriverRepository extends JpaRepository<Persister, Long> {
    List<Persister> findByTimeBetween(Instant start, Instant end);
}
