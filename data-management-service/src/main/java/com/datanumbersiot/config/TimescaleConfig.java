package com.datanumbersiot.config;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.transaction.PlatformTransactionManager;

import jakarta.persistence.EntityManagerFactory;

import javax.sql.DataSource;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.boot.orm.jpa.EntityManagerFactoryBuilder;

@Configuration
@EnableJpaRepositories(basePackages = "com.datanumbersiot.repository.timescale", entityManagerFactoryRef = "timescaleEntityManagerFactory", transactionManagerRef = "timescaleTransactionManager")
public class TimescaleConfig {

    @Bean
    @ConfigurationProperties(prefix = "spring.timescale.datasource")
    public DataSource timescaleDataSource() {
        return DataSourceBuilder.create().build();
    }

    @Bean(name = "timescaleEntityManagerFactory")
    public LocalContainerEntityManagerFactoryBean entityManagerFactory(
            EntityManagerFactoryBuilder builder,
            @Qualifier("timescaleDataSource") DataSource dataSource) {
        return builder.dataSource(dataSource).packages("com.datanumbersiot.entity.timescale")
                .persistenceUnit("timescale").build();
    }

    @Bean(name = "timescaleTransactionManager")
    public PlatformTransactionManager timescaleTransactionManager(
            @Qualifier("timescaleEntityManagerFactory") EntityManagerFactory entityManagerFactory) {
        return new JpaTransactionManager(entityManagerFactory);
    }

}