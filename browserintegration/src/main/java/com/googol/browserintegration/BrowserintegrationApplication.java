package com.googol.browserintegration;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import search.GatewayInterface;

import java.rmi.registry.Registry;
import java.rmi.registry.LocateRegistry;


@SpringBootApplication
public class BrowserintegrationApplication {

	public static void main(String[] args) {
		SpringApplication.run(BrowserintegrationApplication.class, args);

	}


	@Bean
	public GatewayInterface gateway() throws Exception {
		Registry registry = LocateRegistry.getRegistry("localhost", 8185);
		return (GatewayInterface) registry.lookup("GatewayService");
	}


}
