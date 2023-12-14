package com.data_numbers_iot.device_manager.controllers.DTOs.Template;

import jakarta.validation.constraints.NotBlank;

public record RequestTemplateDTO(@NotBlank String template_name, String description, @NotBlank String created_by ) {}