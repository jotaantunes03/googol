package com.googol.browserintegration.controller;

import com.googol.browserintegration.service.GeminiService;
import com.googol.browserintegration.service.HackerNewsService;
import com.googol.browserintegration.service.IndexService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;
import search.SearchResult;

import java.io.IOException;
import java.rmi.RemoteException;
import java.util.List;
import java.util.Map;

/**
 * REST controller that handles API endpoints for web page indexing, searching,
 * and related functionality.
 * <p>
 * This controller provides endpoints for adding URLs to the search index,
 * performing web searches, retrieving backlinks, and managing notifications
 * via WebSockets.
 */
@RestController
@RequestMapping("/api")
public class IndexController {

    private final IndexService indexService;
    private final GeminiService geminiService;
    private final SimpMessagingTemplate messagingTemplate;
    private final HackerNewsService hackerNewsService;

    /**
     * Constructor for the IndexController with all required dependencies.
     *
     * @param indexService Service for managing the URL index and search operations
     * @param geminiService Service for AI-powered content explanations
     * @param messagingTemplate Template for WebSocket messaging
     * @param hackerNewsService Service for retrieving and processing Hacker News content
     */
    @Autowired
    public IndexController(IndexService indexService, GeminiService geminiService, SimpMessagingTemplate messagingTemplate, HackerNewsService hackerNewsService) {
        this.indexService = indexService;
        this.geminiService = geminiService;
        this.messagingTemplate = messagingTemplate;
        this.hackerNewsService = hackerNewsService;
    }

    /**
     * Endpoint for adding a URL to the search index.
     * <p>
     * Accepts a URL in the request body, adds it to the indexing queue,
     * and sends a WebSocket notification about the indexing status.
     *
     * @param payload Map containing the URL to be indexed (key: "url")
     * @return ResponseEntity with status 200 if successful, or 500 with error details if failed
     */
    @PostMapping("/index")
    public ResponseEntity<?> indexUrl(@RequestBody Map<String, String> payload) {
        try {
            String url = payload.get("url");
            indexService.addUrl(url);

            // WebSocket notification
            messagingTemplate.convertAndSend("/topic/notifications",
                    Map.of("type", "INDEXING", "url", url, "status", "QUEUED"));

            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Performs a web search based on the provided query and pagination parameters.
     * <p>
     * If the Hacker News toggle is enabled, it also retrieves relevant URLs from
     * Hacker News and adds them to the indexing queue. Additionally, it provides
     * an AI-generated explanation for the search query using the Gemini service.
     *
     * @param q The search query string
     * @param page The page number for pagination (default: 0)
     * @param hn Boolean flag to enable Hacker News integration (default: false)
     * @return ResponseEntity containing search results, pagination information, and AI explanation
     * @throws RemoteException If there's an error during the remote service call
     */
    @GetMapping("/web-search")
    public ResponseEntity<?> webSearch(
            @RequestParam String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "false") boolean hn) throws RemoteException {

        List<SearchResult> allResults = indexService.webSearch(q);

        // If Hacker News toggle is active, add URLs to the index
        if (hn) {
            List<String> hackerNewsUrls = hackerNewsService.getUrlsToIndex(List.of(q));
            for (String url : hackerNewsUrls) {
                try {
                    indexService.addUrlToQueue(url);
                } catch (RemoteException e) {
                    throw new RuntimeException("Failed to queue Hacker News URL", e);
                }
            }
        }

        // Pagination (10 results per page)
        int pageSize = 10;
        int totalPages = (int) Math.ceil((double) allResults.size() / pageSize);
        int start = page * pageSize;
        int end = Math.min(start + pageSize, allResults.size());

        List<SearchResult> paginatedResults = allResults.subList(start, end);

        // Get AI explanation for the search term
        String aiExplanation = "";
        try {
            aiExplanation = geminiService.getAIExplanation(q);
        } catch (IOException e) {
            // If there's a failure getting the explanation, just log and continue
            System.err.println("Error obtaining explanation from Gemini: " + e.getMessage());
        }

        return ResponseEntity.ok(Map.of(
                "results", paginatedResults,
                "currentPage", page,
                "totalPages", totalPages,
                "aiExplanation", aiExplanation
        ));
    }

    /**
     * Test endpoint for sending WebSocket notifications.
     * <p>
     * This method sends a simple test notification to all connected clients
     * to verify that the WebSocket connection is working properly.
     */
    @GetMapping("/test-notification")
    public void sendTestNotification() {
        messagingTemplate.convertAndSend("/topic/notifications",
                Map.of("message", "Test notification", "type", "success")
        );
    }

    /**
     * Retrieves and returns a paginated list of backlinks for a specified URL.
     * <p>
     * Backlinks are URLs that link to the specified URL. This method
     * implements the same pagination logic as the search endpoint.
     *
     * @param url The URL for which to find backlinks
     * @param page The page number for pagination (default: 0)
     * @return ResponseEntity containing the paginated backlinks and pagination metadata
     * @throws RemoteException If there's an error during the remote service call
     */
    @GetMapping("/backlinks")
    public ResponseEntity<?> getBacklinks(
            @RequestParam String url,
            @RequestParam(defaultValue = "0") int page) throws RemoteException {

        List<String> allBacklinks = indexService.getBacklinks(url);

        // Pagination identical to search
        int pageSize = 10;
        int totalPages = (int) Math.ceil((double) allBacklinks.size() / pageSize);
        int start = page * pageSize;
        int end = Math.min(start + pageSize, allBacklinks.size());

        List<String> paginatedResults = allBacklinks.subList(start, end);

        return ResponseEntity.ok(Map.of(
                "results", paginatedResults,
                "currentPage", page,
                "totalPages", totalPages,
                "query", url // Maintain search pattern
        ));
    }

    /**
     * WebSocket endpoint for handling client requests for system statistics.
     * <p>
     * When a client sends a message to this endpoint, it triggers the broadcast
     * of the current system statistics to all connected clients.
     *
     * @throws RemoteException If there's an error during the remote service call
     */
    @MessageMapping("/stats")
    public void handleStatsRequest() throws RemoteException {
        // Immediately broadcast current system stats
        indexService.broadcastSystemStats();
    }
}