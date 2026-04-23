CREATE TABLE device_template (
    template_id VARCHAR(255) PRIMARY KEY,
    template_name VARCHAR(255),
    description VARCHAR(1000),
    created_by VARCHAR(255)
);

CREATE TABLE template_field (
    field_id VARCHAR(255) PRIMARY KEY,
    template_id VARCHAR(255),
    field_name VARCHAR(255),
    field_type VARCHAR(255),
    FOREIGN KEY (template_id) REFERENCES device_template(template_id)
);

CREATE TABLE device (
    device_id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255),
    template_id VARCHAR(255),
    device_name VARCHAR(255),
    device_status VARCHAR(255),
    mqtt_topic VARCHAR(255),
    FOREIGN KEY (template_id) REFERENCES device_template(template_id)
);
