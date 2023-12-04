package com.datanumbersiot.repository.postgres;

import org.springframework.data.jpa.repository.JpaRepository;

import com.datanumbersiot.entity.Persister;

public interface IPersisterRepository extends JpaRepository<Persister, Long> {

}
