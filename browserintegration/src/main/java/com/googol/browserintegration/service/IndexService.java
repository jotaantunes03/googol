package com.googol.browserintegration.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import search.GatewayInterface;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import search.SearchResult;

import java.rmi.RemoteException;
import java.util.List;

/**
 * Service for managing web page indexing and search functionality.
 * This service acts as a bridge between the frontend and the search backend,
 * handling RMI calls to the search gateway and broadcasting system stats.
 */
@Service
public class IndexService {

    /** Interface for communicating with the search backend via RMI */
    private final GatewayInterface gateway;

    /** Template for sending messages to WebSocket destinations */
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Constructs an IndexService with the specified dependencies.
     *
     * @param gateway The RMI gateway interface to the search backend
     * @param messagingTemplate The template for sending messages to WebSocket clients
     */
    @Autowired
    public IndexService(GatewayInterface gateway, SimpMessagingTemplate messagingTemplate) {
        this.gateway = gateway;
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * Fetches system statistics from the backend and broadcasts them to all
     * connected clients via WebSocket.
     */
    public void broadcastSystemStats() {
        try {
            String stats = getSystemStats(); // RMI
            messagingTemplate.convertAndSend("/topic/system-stats", stats);
        } catch (RemoteException e) {
            e.printStackTrace();
        }
    }

    /**
     * Adds a URL to the indexing system and broadcasts updated system stats.
     *
     * @param url The URL to add to the index
     * @throws RemoteException If there is an error in the RMI communication
     */
    public void addUrl(String url) throws RemoteException {
        gateway.addUrl(url);
        broadcastSystemStats();
    }

    /**
     * Performs a web search using the provided query and broadcasts updated system stats.
     *
     * @param q The search query
     * @return A list of search results matching the query
     * @throws RemoteException If there is an error in the RMI communication
     */
    public List<SearchResult> webSearch(String q) throws RemoteException {
        List<SearchResult> results = gateway.webSearch(q);
        broadcastSystemStats();
        return results;
    }

    /**
     * Retrieves the list of backlinks for a specified URL.
     *
     * @param url The URL to get backlinks for
     * @return A list of URLs that link to the specified URL
     * @throws RemoteException If there is an error in the RMI communication
     */
    public List<String> getBacklinks(String url) throws RemoteException {
        return gateway.getBacklinks(url);
    }

    /**
     * Adds a URL to the indexing queue and broadcasts updated system stats.
     * This is an alternative method name for addUrl.
     *
     * @param url The URL to add to the indexing queue
     * @throws RemoteException If there is an error in the RMI communication
     */
    public void addUrlToQueue(String url) throws RemoteException {
        gateway.addUrl(url);
        broadcastSystemStats();
    }

    /**
     * Retrieves the current system statistics from the backend.
     *
     * @return A string representation of the system state
     * @throws RemoteException If there is an error in the RMI communication
     */
    public String getSystemStats() throws RemoteException {
        return gateway.getSystemState();
    }
}