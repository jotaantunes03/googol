package com.googol.browserintegration.controller;

import com.googol.browserintegration.service.GeminiService;
import com.googol.browserintegration.service.HackerNewsService;
import com.googol.browserintegration.service.IndexService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;
import search.SearchResult;

import java.io.IOException;
import java.rmi.RemoteException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class IndexController {

    private final IndexService indexService;
    private final GeminiService geminiService;
    private final SimpMessagingTemplate messagingTemplate;
    private final HackerNewsService hackerNewsService;

    @Autowired
    public IndexController(IndexService indexService, GeminiService geminiService, SimpMessagingTemplate messagingTemplate, HackerNewsService hackerNewsService) {
        this.indexService = indexService;
        this.geminiService = geminiService;
        this.messagingTemplate = messagingTemplate;
        this.hackerNewsService = hackerNewsService;
    }

    @PostMapping("/index")
    public ResponseEntity<?> indexUrl(@RequestBody Map<String, String> payload) {
        try {
            String url = payload.get("url");
            indexService.addUrl(url);

            // Notificação via WebSocket
            messagingTemplate.convertAndSend("/topic/notifications",
                    Map.of("type", "INDEXING", "url", url, "status", "QUEUED"));

            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }


    @GetMapping("/web-search")
    public ResponseEntity<?> webSearch(
            @RequestParam String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "false") boolean hn) throws RemoteException {

        List<SearchResult> allResults = indexService.webSearch(q);

        // Se o toggle Hacker News estiver ativo, adiciona URLs ao índice
        if (hn) {
            List<String> hackerNewsUrls = hackerNewsService.getUrlsToIndex(List.of(q));
            for (String url : hackerNewsUrls) {
                try {
                    indexService.addUrlToQueue(url);
                } catch (RemoteException e) {
                    throw new RuntimeException("Falha ao enfileirar URL do Hacker News", e);
                }
            }
        }

        // Paginação (10 resultados por página)
        int pageSize = 10;
        int totalPages = (int) Math.ceil((double) allResults.size() / pageSize);
        int start = page * pageSize;
        int end = Math.min(start + pageSize, allResults.size());

        List<SearchResult> paginatedResults = allResults.subList(start, end);

        // Obter explicação da IA para o termo de pesquisa
        String aiExplanation = "";
        try {
            aiExplanation = geminiService.getAIExplanation(q);
        } catch (IOException e) {
            // Se houver falha na obtenção da explicação, apenas log e continua
            System.err.println("Erro ao obter explicação da Gemini: " + e.getMessage());
        }

        return ResponseEntity.ok(Map.of(
                "results", paginatedResults,
                "currentPage", page,
                "totalPages", totalPages,
                "aiExplanation", aiExplanation
        ));
    }


    @GetMapping("/test-notification")
    public void sendTestNotification() {
        messagingTemplate.convertAndSend("/topic/notifications",
                Map.of("message", "Teste de notificação", "type", "success")
        );
    }

    @GetMapping("/backlinks")
    public ResponseEntity<?> getBacklinks(
            @RequestParam String url,
            @RequestParam(defaultValue = "0") int page) throws RemoteException {

        List<String> allBacklinks = indexService.getBacklinks(url);

        // Paginação idêntica à pesquisa
        int pageSize = 10;
        int totalPages = (int) Math.ceil((double) allBacklinks.size() / pageSize);
        int start = page * pageSize;
        int end = Math.min(start + pageSize, allBacklinks.size());

        List<String> paginatedResults = allBacklinks.subList(start, end);

        return ResponseEntity.ok(Map.of(
                "results", paginatedResults,
                "currentPage", page,
                "totalPages", totalPages,
                "query", url // Mantemos o padrão de search
        ));
    }
}