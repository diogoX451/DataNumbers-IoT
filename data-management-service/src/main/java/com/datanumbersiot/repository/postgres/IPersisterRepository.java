package com.datanumbersiot.repository.postgres;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.datanumbersiot.entity.Persister;

@Repository
public interface IPersisterRepository extends JpaRepository<Persister, Long> {

}
