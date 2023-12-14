package com.data_numbers_iot.device_manager.domain.device;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Column;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import com.data_numbers_iot.device_manager.controllers.DTOs.Device.RequestDeviceDTO;
import com.data_numbers_iot.device_manager.domain.template.Template;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "device")
@Entity(name = "device")
@EqualsAndHashCode(of = "deviceId")
public class Device {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "device_id", updatable = false, nullable = false)
    private String deviceId;

    @Column(name = "user_id")
    private String userId;

    @ManyToOne
    @JoinColumn(name = "template_id")
    private Template template;

    @Column(name = "device_name")
    private String deviceName;

    @Enumerated(EnumType.STRING)
    @Column(name = "device_status")
    private DeviceStatus deviceStatus;

    @Column(name = "mqtt_topic")
    private String mqttTopic;

    public Device(RequestDeviceDTO data, Template template){
        this.deviceName = data.device_name();
        this.deviceStatus = DeviceStatus.OFFLINE;
        this.template = template;
        this.userId = data.created_by();
    }
}
