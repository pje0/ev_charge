package com.boot.ev_charge;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class EvChargeApplication {

	public static void main(String[] args) {
		SpringApplication.run(EvChargeApplication.class, args);
	}

}