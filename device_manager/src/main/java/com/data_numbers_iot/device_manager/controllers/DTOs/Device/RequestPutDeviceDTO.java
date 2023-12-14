package com.data_numbers_iot.device_manager.controllers.DTOs.Device;

public record RequestPutDeviceDTO(
    String device_name,

    String device_status,

    String template_id
) {}
