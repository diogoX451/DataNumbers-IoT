package com.data_numbers_iot.device_manager.domain.templateField;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import com.data_numbers_iot.device_manager.controllers.DTOs.TemplateField.RequestFieldDTO;
import com.data_numbers_iot.device_manager.domain.template.Template;
import com.fasterxml.jackson.annotation.JsonBackReference;

import jakarta.persistence.Column;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "template_field")
@Entity(name = "field")
@EqualsAndHashCode(of = "fieldId")
public class TemplateField {

    @Id
    @Column(name = "field_id", updatable = false, nullable = false)
    @GeneratedValue(strategy = GenerationType.UUID)
    private String fieldId;

    @Column(name = "field_name")
    private String fieldName;

    @Enumerated(EnumType.STRING)
    @Column(name = "field_type")
    private FieldType fieldType;

    @ManyToOne
    @JoinColumn(name = "template_id")
    @JsonBackReference
    private Template template;

    public TemplateField(RequestFieldDTO data, Template template){
        this.fieldName = data.field_name();
        this.fieldType = data.field_type();
        this.template = template;
    }
}