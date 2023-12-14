package com.data_numbers_iot.device_manager.controllers;

import java.util.List;
import java.util.Optional;

import org.apache.pulsar.client.api.PulsarClientException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.data_numbers_iot.device_manager.controllers.DTOs.Template.RequestPutTemplateDTO;
import com.data_numbers_iot.device_manager.controllers.DTOs.Template.RequestTemplateDTO;
import com.data_numbers_iot.device_manager.controllers.DTOs.TemplateField.RequestFieldDTO;
import com.data_numbers_iot.device_manager.domain.device.Device;
import com.data_numbers_iot.device_manager.domain.device.DeviceRepository;
import com.data_numbers_iot.device_manager.domain.pulsar.ApachePulsarClient;
import com.data_numbers_iot.device_manager.domain.pulsar.ApachePulsarProducer;
import com.data_numbers_iot.device_manager.domain.template.Template;
import com.data_numbers_iot.device_manager.domain.template.TemplateRepository;
import com.data_numbers_iot.device_manager.domain.templateField.TemplateField;
import com.data_numbers_iot.device_manager.domain.templateField.TemplateFieldRepository;

import jakarta.transaction.Transactional;
import jakarta.validation.Valid;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PathVariable;

@RestController
@RequestMapping("/template")
public class TemplateController {

    private ApachePulsarProducer pulsarProducer;

    public TemplateController() {
        ApachePulsarClient pulsar;
        try {
            pulsar = new ApachePulsarClient("pulsar://localhost:6650");
            this.pulsarProducer = new ApachePulsarProducer(pulsar.getClient(), "create-template");
        } catch (PulsarClientException e) {
            e.printStackTrace();
        }
    }

    @Autowired
    private TemplateRepository templateRepository;

    @Autowired
    private TemplateFieldRepository templateFieldRepository;

    @Autowired
    private DeviceRepository deviceRepository;

    @GetMapping(value = "/user/{createdBy}")
    public ResponseEntity<List<Template>> getAllTemplates(@PathVariable String createdBy) {
        var allTemplates = templateRepository.findByCreatedBy(createdBy);
        return ResponseEntity.ok(allTemplates);
    }

    @GetMapping(value = "/{id}")
    public ResponseEntity<Template> getTemplateById(@PathVariable String id) {
        Optional<Template> optinalTemplate = templateRepository.findById(id);

        if (!optinalTemplate.isPresent()) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(optinalTemplate.get());
    }

    @PostMapping
    public ResponseEntity<Template> createTemplate(@RequestBody @Valid RequestTemplateDTO data) {
        Template newTemplate = new Template(data);

        try {
            this.pulsarProducer.send(newTemplate);
        } catch (PulsarClientException e) {
            e.printStackTrace();
        }

        return ResponseEntity.ok(templateRepository.save(newTemplate));
    }

    @PutMapping(value = "/{id}")
    @Transactional
    public ResponseEntity<Template> putTemplate(@PathVariable String id, @RequestBody RequestPutTemplateDTO data) {
        Optional<Template> optionalTemplate = templateRepository.findById(id);

        if (!optionalTemplate.isPresent()) {
            return ResponseEntity.notFound().build();
        }

        Template template = optionalTemplate.get();

        if (data.template_name() != null) {
            template.setTemplateName(data.template_name());
        }

        if (data.description() != null) {
            template.setDescription(data.description());
        }

        return ResponseEntity.ok(template);
    }

    @DeleteMapping(value = "{templateId}")
    @Transactional
    public ResponseEntity<?> deleteTemplate(@PathVariable String templateId) {
        Optional<Template> optionalTemplate = templateRepository.findById(templateId);

        if (!optionalTemplate.isPresent()) {
            return ResponseEntity.notFound().build();
        }

        List<Device> devices = deviceRepository.findByTemplate_TemplateId(templateId);
        if (!devices.isEmpty()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body("Não é possível excluir o template, pois ele está sendo referenciado por dispositivos.");
        }

        Template template = optionalTemplate.get();

        templateRepository.delete(template);

        return ResponseEntity.ok().build();
    }

    @PostMapping(value = "/field")
    public ResponseEntity<Template> createTemplateField(@RequestBody @Valid RequestFieldDTO data) {
        Optional<Template> optionalTemplate = templateRepository.findById(data.template_id());

        if (!optionalTemplate.isPresent()) {
            return ResponseEntity.notFound().build();
        }

        Template template = optionalTemplate.get();

        TemplateField field = new TemplateField(data, template);

        templateFieldRepository.save(field);

        return ResponseEntity.ok(template);
    }

    @DeleteMapping(value = "{templateId}/field/{fieldId}")
    public ResponseEntity<Template> deleteTemplateField(@PathVariable String templateId, @PathVariable String fieldId) {
        Optional<Template> optionalTemplate = templateRepository.findById(templateId);

        if (!optionalTemplate.isPresent()) {
            return ResponseEntity.notFound().build();
        }

        Optional<TemplateField> optionalField = templateFieldRepository.findById(fieldId);

        if (!optionalField.isPresent()) {
            return ResponseEntity.notFound().build();
        }

        templateFieldRepository.delete(optionalField.get());

        return ResponseEntity.ok(optionalTemplate.get());
    }
}
