package com.googol.browserintegration.service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;

public class HackerNewsService {
    private static final int MAX_STORIES = 20;

    public HackerNewsService() {
    }

    public static List<String> getUrlsToIndex(List<String> searchTerms) {
        List<String> relevantUrls = new ArrayList<>();

        try {
            JSONArray topStoriesIds = fetchTopStories();

            // Processar apenas as primeiras MAX_STORIES histórias, não ultrapassando o número de stories
            int limit = Math.min(MAX_STORIES, topStoriesIds.length());
            for (int i = 0; i < limit; i++) {
                int storyId = topStoriesIds.getInt(i);

                try {
                    JSONObject story = fetchStoryDetails(storyId);

                    // Verificar todos os termos de pesquisa
                    if (containsAnySearchTerm(story, searchTerms)) {
                        String url = story.optString("url", "https://news.ycombinator.com/item?id=" + storyId);
                        relevantUrls.add(url);
                    }
                } catch (Exception e) {
                    System.err.println("Erro ao processar história ID " + storyId + ": " + e.getMessage());
                }
            }

        } catch (Exception e) {
            System.err.println("Erro fatal ao buscar top stories: " + e.getMessage());
        }

        return relevantUrls;
    }

    private static JSONArray fetchTopStories() throws Exception {
        URL url = new URL("https://hacker-news.firebaseio.com/v0/topstories.json");
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("GET");

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()))) {
            StringBuilder response = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                response.append(line);
            }
            return new JSONArray(response.toString());
        }
    }

    private static JSONObject fetchStoryDetails(int storyId) throws Exception {
        URL url = new URL("https://hacker-news.firebaseio.com/v0/item/" + storyId + ".json");
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("GET");

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()))) {
            StringBuilder response = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                response.append(line);
            }
            return new JSONObject(response.toString());
        }
    }

    private static boolean containsAnySearchTerm(JSONObject story, List<String> searchTerms) {
        String text = story.optString("text", "").toLowerCase();


        for (String term : searchTerms) {
            String lowerTerm = term.toLowerCase();
            if (text.contains(lowerTerm)) {
                return true;
            }
        }
        return false;
    }
}