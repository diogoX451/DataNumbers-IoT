package com.data_numbers_iot.device_manager.controllers.DTOs.TemplateField;

import com.data_numbers_iot.device_manager.domain.templateField.FieldType;

public record RequestFieldDTO(String template_id, String field_name, FieldType field_type) {}
