package com.data_numbers_iot.device_manager.controllers;

import org.apache.pulsar.client.api.PulsarClientException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.data_numbers_iot.device_manager.controllers.DTOs.Device.RequestDeviceDTO;
import com.data_numbers_iot.device_manager.controllers.DTOs.Device.RequestPutDeviceDTO;
import com.data_numbers_iot.device_manager.domain.device.Device;
import com.data_numbers_iot.device_manager.domain.device.DeviceRepository;
import com.data_numbers_iot.device_manager.domain.device.DeviceStatus;
import com.data_numbers_iot.device_manager.domain.pulsar.ApachePulsarClient;
import com.data_numbers_iot.device_manager.domain.pulsar.ApachePulsarProducer;
import com.data_numbers_iot.device_manager.domain.template.Template;
import com.data_numbers_iot.device_manager.domain.template.TemplateRepository;

import jakarta.annotation.PreDestroy;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/device")
public class DeviceController {
    private ApachePulsarProducer pulsarProducer;

    public DeviceController() {
        ApachePulsarClient pulsar;
        try {
            pulsar = new ApachePulsarClient("pulsar://localhost:6650");
            this.pulsarProducer = new ApachePulsarProducer(pulsar.getClient(), "create-device");
        } catch (PulsarClientException e) {
            e.printStackTrace();
        }
    }

    @Autowired
    private DeviceRepository deviceRepository;

    @Autowired
    private TemplateRepository templateRepository;

    @GetMapping(value = "/{id}")
    public ResponseEntity<Device> getDeviceById(@PathVariable String id) {
        Optional<Device> device = deviceRepository.findById(id);
        return device.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping(value = "/user/{userId}")
    public ResponseEntity<List<Device>> getDevicesByUser(@PathVariable String userId) {
        List<Device> devices = deviceRepository.findByUserId(userId);
        return ResponseEntity.ok(devices);
    }

    @PostMapping
    @Transactional
    public ResponseEntity<Device> createDevice(@RequestBody @Valid RequestDeviceDTO data) {
        Optional<Template> optionalTemplate = this.templateRepository.findById(data.template_id());

        if (!optionalTemplate.isPresent()) {
            return ResponseEntity.notFound().build();
        }

        Device device = new Device(data, optionalTemplate.get());

        this.deviceRepository.save(device);

        try {
            this.pulsarProducer.send(device);
        } catch (PulsarClientException e) {
            e.printStackTrace();
        }

        return ResponseEntity.ok(device);
    }

    @PutMapping(value = "/{id}")
    @Transactional
    public ResponseEntity<Device> putDevice(@PathVariable String id, @RequestBody RequestPutDeviceDTO data) {
        Optional<Device> optionalDevice = deviceRepository.findById(id);

        if (!optionalDevice.isPresent()) {
            return ResponseEntity.notFound().build();
        }

        Device device = optionalDevice.get();

        if (data.device_name() != null) {
            device.setDeviceName(data.device_name());
        }

        if (data.device_status() != null) {
            switch (data.device_status()) {
                case "ONLINE":
                    device.setDeviceStatus(DeviceStatus.ONLINE);
                    break;
                case "OFFLINE":
                    device.setDeviceStatus(DeviceStatus.OFFLINE);
                    break;
            }
        }

        if (data.template_id() != null) {
            Optional<Template> optionalTemplate = this.templateRepository.findById(data.template_id());

            if (optionalTemplate.isPresent()) {
                device.setTemplate(optionalTemplate.get());
            }
        }

        return ResponseEntity.ok(device);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Device> deleteDevice(@PathVariable String id) {
        Optional<Device> optionalDevice = deviceRepository.findById(id);

        if (!optionalDevice.isPresent()) {
            return ResponseEntity.notFound().build();
        }

        Device device = optionalDevice.get();

        this.deviceRepository.delete(device);

        return ResponseEntity.ok(device);
    }

    @PreDestroy
    public void destroy() {
        try {
            if (this.pulsarProducer != null) {
                pulsarProducer.close();
            }
        } catch (PulsarClientException e) {
            e.printStackTrace();
        }
    }

}
