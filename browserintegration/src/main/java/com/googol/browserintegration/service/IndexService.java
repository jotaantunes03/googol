package com.googol.browserintegration.service;

import search.GatewayInterface;
import org.springframework.stereotype.Service;
import search.SearchResult;

import java.rmi.RemoteException;
import java.util.List;

@Service
public class IndexService {

    private final GatewayInterface gateway;

    public IndexService(GatewayInterface gateway) {
        this.gateway = gateway;
    }

    public void addUrl(String url) throws RemoteException {
        gateway.addUrl(url);
    }

    public List<SearchResult> webSearch(String q) throws RemoteException {
        return gateway.webSearch(q);
    }

    public List<String> getBacklinks(String url) throws RemoteException {
        return gateway.getBacklinks(url);
    }

    public void addUrlToQueue(String url) throws RemoteException {
        gateway.addUrl(url);
    }
}