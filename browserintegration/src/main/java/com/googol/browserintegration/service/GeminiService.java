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

/**
 * Service for interacting with Google's Gemini AI API.
 * This service handles requests to the Gemini API to provide AI-generated explanations
 * for search queries.
 */
@Service
public class GeminiService {

    @Value("${gemini.api.key:AIzaSyBnbdW3DCbka4leFSN4cm_M9J5B1YhfKiQ}")
    private String apiKey;

    @Value("${gemini.api.url:https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent}")
    private String apiBaseUrl;

    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Queries the Gemini API to get an explanation about a search term.
     *
     * @param searchQuery The search term to explain
     * @return A brief explanation of the search term provided by Gemini AI
     * @throws IOException If there is an error in the HTTP connection or JSON processing
     */
    public String getAIExplanation(String searchQuery) throws IOException {
        // Construct the full API URL with the API key
        String apiUrl = apiBaseUrl + "?key=" + apiKey;

        URL url = new URL(apiUrl);
        HttpURLConnection con = (HttpURLConnection) url.openConnection();
        con.setRequestMethod("POST");
        con.setRequestProperty("Content-Type", "application/json");
        con.setDoOutput(true);

        // Construct an enhanced prompt for Gemini that asks for a concise explanation
        String prompt = String.format(
                "O usuário pesquisou por '%s'. Por favor, forneça uma breve explicação sobre este tema, " +
                        "destacando os principais aspectos e informações que seriam úteis para entender melhor este assunto. " +
                        "Limite sua resposta a 3-4 parágrafos curtos. Devolve sempre uma resposta independentemente do tema.",
                searchQuery
        );

        // Create the JSON payload with the prompt
        String jsonInputString = String.format("""
        {
          "contents": [{
            "parts": [{"text": "%s"}]
          }]
        }
        """, prompt.replace("\"", "\\\""));  // Escape quotes to avoid JSON formatting issues

        // Send the request body
        try (OutputStream os = con.getOutputStream()) {
            byte[] input = jsonInputString.getBytes("utf-8");
            os.write(input, 0, input.length);
        }

        // Process the API response
        StringBuilder response = new StringBuilder();
        int responseCode = con.getResponseCode();

        // Use the appropriate stream based on the response code
        try (BufferedReader br = new BufferedReader(
                new InputStreamReader(
                        responseCode >= 400 ? con.getErrorStream() : con.getInputStream(),
                        "utf-8"))) {
            String responseLine;
            while ((responseLine = br.readLine()) != null) {
                response.append(responseLine);
            }
        }

        // Check if the response was successful
        if (responseCode >= 400) {
            System.err.println("Erro ao consultar Gemini API: " + response.toString());
            return "Não foi possível obter uma explicação para este termo.";
        }

        // Extract the text from Gemini's JSON response
        return extractTextFromGeminiResponse(response.toString());
    }

    /**
     * Extracts the text content from the Gemini API JSON response.
     *
     * @param jsonResponse The JSON response from the Gemini API
     * @return The extracted text explanation or an error message if extraction fails
     */
    private String extractTextFromGeminiResponse(String jsonResponse) {
        try {
            // Use Jackson to properly parse the JSON
            JsonNode rootNode = objectMapper.readTree(jsonResponse);

            // Navigate through the JSON structure according to Gemini API documentation
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

            // Fallback in case the structure is different
            return findTextInJsonNode(rootNode);

        } catch (Exception e) {
            System.err.println("Erro ao processar resposta JSON: " + e.getMessage());
            e.printStackTrace();
            return "Não foi possível processar a explicação.";
        }
    }

    /**
     * Recursively searches for a "text" field in a JSON node structure.
     * This is a fallback method to handle potential variations in the Gemini API response format.
     *
     * @param node The JSON node to search in
     * @return The found text or an empty string if no text field is found
     */
    private String findTextInJsonNode(JsonNode node) {
        // Check if the current node has a "text" field
        if (node.has("text")) {
            return node.get("text").asText();
        }

        // Recursively search in object fields
        for (String fieldName : (Iterable<String>) node::fieldNames) {
            JsonNode fieldValue = node.get(fieldName);
            if (fieldValue.isObject() || fieldValue.isArray()) {
                String result = findTextInJsonNode(fieldValue);
                if (result != null && !result.isEmpty()) {
                    return result;
                }
            }
        }

        // Recursively search in arrays
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