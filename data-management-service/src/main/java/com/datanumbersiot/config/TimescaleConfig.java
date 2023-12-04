package com.datanumbersiot.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import javax.sql.DataSource;
import org.springframework.boot.jdbc.DataSourceBuilder;

@Configuration
public class TimescaleConfig {

    @Bean
    @ConfigurationProperties(prefix = "spring.datasource.timescale")
    public DataSource timescaleDataSource() {
        return DataSourceBuilder.create().build();
    }
}