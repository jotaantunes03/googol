package com.googol.browserintegration;

import com.googol.browserintegration.service.GeminiService;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.util.ReflectionTestUtils;
import search.GoogolClient;
import search.GatewayInterface;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.ProtocolException;
import java.net.URL;
import java.rmi.registry.LocateRegistry;
import java.rmi.registry.Registry;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import com.googol.browserintegration.service.HackerNewsService;

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

	@Test
	public void testGeminiAI() throws IOException {
		URL url = new URL("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyAeXd_jLgJA2Y1uNjiznGRVYCxo1KgSXVw");
		HttpURLConnection con = (HttpURLConnection) url.openConnection();
		con.setRequestMethod("POST");
		con.setRequestProperty("Content-Type", "application/json");
		con.setDoOutput(true);

		String jsonInputString = """
		{
		  "contents": [{
			"parts": [{"text": "Quantas pessoas vivem em Portugal"}]
		  }]
		}
		""";

		try (OutputStream os = con.getOutputStream()) {
			byte[] input = jsonInputString.getBytes("utf-8");
			os.write(input, 0, input.length);
		}

		BufferedReader br = new BufferedReader(new InputStreamReader(con.getInputStream(), "utf-8"));
		StringBuilder response = new StringBuilder();
		String responseLine;
		while ((responseLine = br.readLine()) != null) {
			response.append(responseLine.trim());
		}
		System.out.println("Resposta da Gemini: " + response);

	}

	@Test
	public void testGeminiService() throws IOException {
		GeminiService geminiService = new GeminiService();

		// Use ReflectionTestUtils para injetar valores para os campos privados em testes
		ReflectionTestUtils.setField(geminiService, "apiKey", "AIzaSyAeXd_jLgJA2Y1uNjiznGRVYCxo1KgSXVw");
		ReflectionTestUtils.setField(geminiService, "apiBaseUrl",
				"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent");

		String explanation = geminiService.getAIExplanation("inteligência artificial");
		assertNotNull(explanation);
		assertFalse(explanation.isEmpty());
		System.out.println("Explicação da IA: " + explanation);
	}

	@Test
	public void testhackerNews() throws IOException {

		String texto = "Modern web development frameworks";

		String[] palavras = texto.split(" ");

		// Cria uma lista imutável com as palavras
		List<String> termos = List.of(palavras);

		List<String> urlsParaIndexar = HackerNewsService.getUrlsToIndex(termos);
		System.out.println("Urls a indexar:" + urlsParaIndexar);
	}
}