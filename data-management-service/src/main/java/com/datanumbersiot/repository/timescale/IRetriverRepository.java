package com.datanumbersiot.repository.timescale;

import org.springframework.data.jpa.repository.JpaRepository;

import com.datanumbersiot.entity.Retriver;

public interface IRetriverRepository extends JpaRepository<Retriver, Long> {

}