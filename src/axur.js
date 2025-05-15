package com.axreng.backend.model;

import java.util.Set;
import java.util.concurrent.*;

import static com.axreng.backend.model.enums.StatusSearchEnum.ACTIVE;

public class SearchResult {
    private final String id;
    private volatile String status;
    private final Set<String> urls;

    public SearchResult(String id, String keyword) {
        this.id = id;
        this.urls = ConcurrentHashMap.newKeySet();
        this.status = ACTIVE.name().toLowerCase();
    }

    public String getId() {
        return id;
    }


    public Set<String> getUrls() {
        return urls;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public void addUrl(String url) {
        urls.add(url);
    }

}