package com.datanumbersiot.datamanagementservice;

import java.time.Instant;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.pulsar.annotation.EnablePulsar;

import com.datanumbersiot.service.PulsarService;
import com.datanumbersiot.service.RetriverService;

@ComponentScan(basePackages = "com.datanumbersiot")
@EntityScan({ "com.datanumbersiot.entity", "com.datanumbersiot.entity.timescale" })
@EnablePulsar
@SpringBootApplication

public class DataManagementServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(DataManagementServiceApplication.class, args);
	}

	@Bean
	public CommandLineRunner testPulsarService(PulsarService pulsarService) {
		return args -> {
			System.out.println("Testando PulsarService após a inicialização da aplicação.");
		};
	}

	@Bean
	public CommandLineRunner testRetriveService(RetriverService retriverService) {
		return args -> {
			retriverService.findAll().forEach(System.out::println);
		};
	}
}
