package com.data_numbers_iot.device_manager.domain.templateField;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TemplateFieldRepository extends JpaRepository<TemplateField, String> {}

