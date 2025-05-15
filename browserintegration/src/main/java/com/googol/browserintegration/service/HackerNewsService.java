package com.googol.browserintegration.service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.stereotype.Service;

/**
 * Service class that interfaces with the Hacker News API to retrieve and filter stories.
 * This service can fetch top stories from Hacker News and filter them based on provided search terms.
 */
@Service
public class HackerNewsService {
    /** Maximum number of stories to process from the top stories list */
    private static final int MAX_STORIES = 20;

    /**
     * Default constructor for the HackerNewsService.
     */
    public HackerNewsService() {
    }

    /**
     * Retrieves URLs from Hacker News top stories that contain any of the provided search terms.
     *
     * @param searchTerms List of search terms to filter stories by
     * @return List of URLs for stories that match any of the search terms
     */
    public static List<String> getUrlsToIndex(List<String> searchTerms) {
        List<String> relevantUrls = new ArrayList<>();

        try {
            // Fetch the IDs of top stories from Hacker News API
            JSONArray topStoriesIds = fetchTopStories();

            // Process only up to MAX_STORIES stories, not exceeding the actual number of stories
            int limit = Math.min(MAX_STORIES, topStoriesIds.length());
            for (int i = 0; i < limit; i++) {
                int storyId = topStoriesIds.getInt(i);

                try {
                    // Fetch the details of each story
                    JSONObject story = fetchStoryDetails(storyId);

                    // Check if the story contains any of the search terms
                    if (containsAnySearchTerm(story, searchTerms)) {
                        // Use the story URL if available, otherwise use the Hacker News item URL
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

    /**
     * Fetches the list of top story IDs from the Hacker News API.
     *
     * @return JSONArray containing the IDs of top stories
     * @throws Exception If there is an error during the API request or response processing
     */
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

    /**
     * Fetches the details of a specific story from the Hacker News API.
     *
     * @param storyId The ID of the story to fetch
     * @return JSONObject containing the story details
     * @throws Exception If there is an error during the API request or response processing
     */
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

    /**
     * Checks if a story contains any of the provided search terms in its text content.
     *
     * @param story The story details as a JSONObject
     * @param searchTerms List of search terms to check against the story text
     * @return true if the story contains any of the search terms, false otherwise
     */
    private static boolean containsAnySearchTerm(JSONObject story, List<String> searchTerms) {
        String text = story.optString("text", "").toLowerCase();

        // Check if any search term is present in the story text
        for (String term : searchTerms) {
            String lowerTerm = term.toLowerCase();
            if (text.contains(lowerTerm)) {
                return true;
            }
        }
        return false;
    }
}