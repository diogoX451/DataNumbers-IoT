package com.datanumbersiot.repository.timescale;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.datanumbersiot.entity.timescale.Persister;

@Repository
public interface IPersisterRepository extends JpaRepository<Persister, Long> {

}
