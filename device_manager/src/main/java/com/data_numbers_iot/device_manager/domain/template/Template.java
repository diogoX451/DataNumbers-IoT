package com.data_numbers_iot.device_manager.domain.template;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Column;
import jakarta.persistence.OneToMany;
import jakarta.persistence.CascadeType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.Set;

import com.data_numbers_iot.device_manager.controllers.DTOs.Template.RequestTemplateDTO;
import com.data_numbers_iot.device_manager.domain.templateField.TemplateField;
import com.fasterxml.jackson.annotation.JsonManagedReference;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "device_template")
@Entity(name = "template")
@EqualsAndHashCode(of = "templateId")
public class Template {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "template_id", updatable = false, nullable = false)
    private String templateId;

    @Column(name = "template_name")
    private String templateName;

    @Column(name = "description")
    private String description;

    @Column(name = "created_by")
    private String createdBy;

    @OneToMany(mappedBy = "template", cascade = CascadeType.ALL)
    @JsonManagedReference
    private Set<TemplateField> fields;

    public Template(RequestTemplateDTO requestTemplateDTO) {
        this.templateName = requestTemplateDTO.template_name();
        this.description = requestTemplateDTO.description();
        this.createdBy = requestTemplateDTO.created_by();
    }
}
