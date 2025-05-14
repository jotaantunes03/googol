package com.googol.browserintegration.service;

import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

@Service
public class GeminiService {

    @Value("${gemini.api.key:AIzaSyAeXd_jLgJA2Y1uNjiznGRVYCxo1KgSXVw}")
    private String apiKey;

    @Value("${gemini.api.url:https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent}")
    private String apiBaseUrl;

    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Consulta a API Gemini para obter explicação sobre a pesquisa
     */
    public String getAIExplanation(String searchQuery) throws IOException {
        String apiUrl = apiBaseUrl + "?key=" + apiKey;

        URL url = new URL(apiUrl);
        HttpURLConnection con = (HttpURLConnection) url.openConnection();
        con.setRequestMethod("POST");
        con.setRequestProperty("Content-Type", "application/json");
        con.setDoOutput(true);

        // Construir um prompt melhorado para a Gemini
        String prompt = String.format(
                "O usuário pesquisou por '%s'. Por favor, forneça uma breve explicação sobre este tema, " +
                        "destacando os principais aspectos e informações que seriam úteis para entender melhor este assunto. " +
                        "Limite sua resposta a 3-4 parágrafos curtos. Devolve sempre uma resposta independentemente do tema.",
                searchQuery
        );

        String jsonInputString = String.format("""
        {
          "contents": [{
            "parts": [{"text": "%s"}]
          }]
        }
        """, prompt.replace("\"", "\\\""));  // Escapando aspas para evitar problemas no JSON

        try (OutputStream os = con.getOutputStream()) {
            byte[] input = jsonInputString.getBytes("utf-8");
            os.write(input, 0, input.length);
        }

        // Processar resposta
        StringBuilder response = new StringBuilder();
        int responseCode = con.getResponseCode();

        // Usar o stream correto com base no código de resposta
        try (BufferedReader br = new BufferedReader(
                new InputStreamReader(
                        responseCode >= 400 ? con.getErrorStream() : con.getInputStream(),
                        "utf-8"))) {
            String responseLine;
            while ((responseLine = br.readLine()) != null) {
                response.append(responseLine);
            }
        }

        // Verificar se a resposta foi bem-sucedida
        if (responseCode >= 400) {
            System.err.println("Erro ao consultar Gemini API: " + response.toString());
            return "Não foi possível obter uma explicação para este termo.";
        }

        // Extrair o texto da resposta JSON do Gemini usando um parser JSON adequado
        return extractTextFromGeminiResponse(response.toString());
    }

    /**
     * Extrai o texto da resposta JSON retornada pela API Gemini usando Jackson
     */
    private String extractTextFromGeminiResponse(String jsonResponse) {
        try {
            // Usar Jackson para processar o JSON corretamente
            JsonNode rootNode = objectMapper.readTree(jsonResponse);

            // Navegando na estrutura JSON conforme documentação da API Gemini
            if (rootNode.has("candidates") && rootNode.get("candidates").isArray() &&
                    rootNode.get("candidates").size() > 0) {

                JsonNode firstCandidate = rootNode.get("candidates").get(0);
                if (firstCandidate.has("content") &&
                        firstCandidate.get("content").has("parts") &&
                        firstCandidate.get("content").get("parts").isArray() &&
                        firstCandidate.get("content").get("parts").size() > 0) {

                    JsonNode firstPart = firstCandidate.get("content").get("parts").get(0);
                    if (firstPart.has("text")) {
                        return firstPart.get("text").asText();
                    }
                }
            }

            // Fallback para caso a estrutura seja diferente
            return findTextInJsonNode(rootNode);

        } catch (Exception e) {
            System.err.println("Erro ao processar resposta JSON: " + e.getMessage());
            e.printStackTrace();
            return "Não foi possível processar a explicação.";
        }
    }

    /**
     * Método de fallback que procura recursivamente por um campo "text" no JSON
     */
    private String findTextInJsonNode(JsonNode node) {
        if (node.has("text")) {
            return node.get("text").asText();
        }

        // Procurar em campos de objeto
        for (String fieldName : (Iterable<String>) node::fieldNames) {
            JsonNode fieldValue = node.get(fieldName);
            if (fieldValue.isObject() || fieldValue.isArray()) {
                String result = findTextInJsonNode(fieldValue);
                if (result != null && !result.isEmpty()) {
                    return result;
                }
            }
        }

        // Procurar em arrays
        if (node.isArray()) {
            for (JsonNode element : node) {
                String result = findTextInJsonNode(element);
                if (result != null && !result.isEmpty()) {
                    return result;
                }
            }
        }

        return "";
    }
}