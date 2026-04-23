package com.data_numbers_iot.device_manager.controllers.DTOs.Device;

import jakarta.validation.constraints.NotBlank;

public record RequestDeviceDTO(
        @NotBlank(message = "O campo 'created_by' não deve estar em branco")
        String created_by,

        @NotBlank(message = "O campo 'device_name' não deve estar em branco")
        String device_name,

        @NotBlank(message = "O campo 'template_id' não deve estar em branco")
        String template_id
) {}
