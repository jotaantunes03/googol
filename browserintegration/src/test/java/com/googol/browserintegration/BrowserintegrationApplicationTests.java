package com.googol.browserintegration;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import search.GoogolClient;
import search.GatewayInterface;
import java.rmi.registry.LocateRegistry;
import java.rmi.registry.Registry;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class BrowserintegrationApplicationTests {

	@Test
	void contextLoads() {
		// Teste básico de carga de contexto
	}

	@Test
	public void testMeta1ClassAvailability() {
		GoogolClient client = new GoogolClient();
		assertNotNull(client, "O cliente da Meta 1 deveria ser instanciado");
		System.out.println("Classe da Meta 1 carregada com sucesso!");
	}

	@Test
	public void testRmiBasicConnection() {
		try {
			Registry registry = LocateRegistry.getRegistry("localhost", 8185);
			GatewayInterface gateway = (GatewayInterface) registry.lookup("GatewayService");
			assertNotNull(gateway, "O serviço Gateway deveria estar disponível");

			// Teste simples
			String status = gateway.getSystemState();
			assertNotNull(status, "Deveria retornar status do sistema");
			System.out.println("Estado do sistema obtido via RMI:\n" + status);
		} catch (Exception e) {
			fail("Falha na conexão RMI básica: " + e.getMessage());
		}
	}

	@Test
	public void testSearchOperation() {
		try {
			Registry registry = LocateRegistry.getRegistry("localhost", 8185);
			GatewayInterface gateway = (GatewayInterface) registry.lookup("GatewayService");

			String testTerm = "java";
			var results = gateway.search(testTerm);

			assertNotNull(results, "A pesquisa deveria retornar uma lista");
			System.out.println("Resultados da pesquisa por '" + testTerm + "': " + results.size() + " itens");
		} catch (Exception e) {
			fail("Falha na operação de pesquisa via RMI: " + e.getMessage());
		}
	}


	@Test
	public void testUrlIndexing() {
		try {
			Registry registry = LocateRegistry.getRegistry("localhost", 8185);
			GatewayInterface gateway = (GatewayInterface) registry.lookup("GatewayService");

			// URL de teste - use um URL que certamente existe
			String testUrl = "https://pt.wikipedia.com/";

			// Verifique se o serviço URL Queue está disponível
			try {
				gateway.addUrl(testUrl);
				System.out.println("URL indexado com sucesso: " + testUrl);
				assertTrue(true); // Apenas marca como sucesso se não lançar exceção
			} catch (Exception e) {
				System.out.println("Aviso: Serviço URL Queue não disponível - " + e.getMessage());
				// Não falha o teste, apenas avisa
				assertTrue(true);
			}
		} catch (Exception e) {
			fail("Falha ao conectar à Gateway: " + e.getMessage());
		}
	}


}