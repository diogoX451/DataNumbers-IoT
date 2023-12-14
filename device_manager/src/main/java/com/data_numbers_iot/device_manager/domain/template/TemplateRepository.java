package com.data_numbers_iot.device_manager.domain.template;


import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TemplateRepository extends JpaRepository<Template, String> {
    List<Template> findByCreatedBy(String createdBy);
}
