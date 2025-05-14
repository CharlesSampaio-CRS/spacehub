package com.axreng.backend.model.enums;

public enum StatusSearchEnum {
    ACTIVE("active"),
    DONE("done");

    private final String value;

    StatusSearchEnum(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }
}
 

package com.axreng.backend.model;

import java.util.Queue;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicBoolean;

public class CrawlContext {

    private final String keyword;
    private final SearchResult result;
    private final Queue<String> toVisit;
    private final Set<String> visited;
    private final Set<String> enqueued;
    private final CountDownLatch latch;
    private final String baseUrl;
    private final AtomicBoolean stopFlag = new AtomicBoolean(false);

    public CrawlContext(String keyword, SearchResult result, Queue<String> toVisit,
                        Set<String> visited, Set<String> enqueued, CountDownLatch latch, String baseUrl) {
        this.keyword = keyword;
        this.result = result;
        this.toVisit = toVisit;
        this.visited = visited;
        this.enqueued = enqueued;
        this.latch = latch;
        this.baseUrl = baseUrl;
    }

    public void stop() {
        stopFlag.set(true);
    }

    public boolean shouldStop() {
        return stopFlag.get();
    }

    public String getKeyword() {
        return keyword;
    }

    public SearchResult getResult() {
        return result;
    }

    public Queue<String> getToVisit() {
        return toVisit;
    }

    public Set<String> getVisited() {
        return visited;
    }

    public Set<String> getEnqueued() {
        return enqueued;
    }

    public CountDownLatch getLatch() {
        return latch;
    }

    public String getBaseUrl() {
        return baseUrl;
    }
}

package com.axreng.backend.model;

import com.axreng.backend.model.enums.*;

import java.util.Set;
import java.util.concurrent.*;

import static com.axreng.backend.model.enums.StatusSearchEnum.ACTIVE;
import static com.axreng.backend.util.Utils.DateFormatter;

public class SearchResult {
    private final String id;
    private final String keyword;
    private final Set<String> urls;
    private volatile StatusSearchEnum status;
    private final String started;
    private volatile String finished;

    public SearchResult(String id, String keyword) {
        this.id = id;
        this.keyword = keyword;
        this.started = DateFormatter();
        this.urls = ConcurrentHashMap.newKeySet();
        this.status = ACTIVE;
    }

    public String getId() {
        return id;
    }

    public String getKeyword() {
        return keyword;
    }

    public Set<String> getUrls() {
        return urls;
    }

    public StatusSearchEnum getStatus() {
        return status;
    }

    public void setStatus(StatusSearchEnum status) {
        this.status = status;
    }

    public void addUrl(String url) {
        urls.add(url);
    }

    public String getStarted() {
        return started;
    }

    public String getFinished() {
        return finished;
    }

    public void setFinished(String finished) {
        this.finished = finished;
    }
}

package com.axreng.backend.service;

import com.axreng.backend.model.CrawlContext;
import com.axreng.backend.model.SearchResult;
import com.axreng.backend.util.Utils;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import org.slf4j.Logger;

import java.io.IOException;
import java.net.MalformedURLException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.URL;
import java.time.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Queue;
import java.util.Set;
import java.util.concurrent.*;


import org.slf4j.LoggerFactory;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static com.axreng.backend.model.enums.StatusSearchEnum.DONE;
import static com.axreng.backend.util.Constants.BASE_URL;
import static com.axreng.backend.util.Constants.ERROR_KEYWORD_LENGTH;
import static com.axreng.backend.util.Constants.ERROR_MISSING_KEYWORD;
import static com.axreng.backend.util.Constants.KEYWORD;
import static com.axreng.backend.util.Constants.MAX_RETRIES;
import static com.axreng.backend.util.Utils.DateFormatter;

public class CrawlerService {

    private static final Logger log = LoggerFactory.getLogger(CrawlerService.class);
    private final Map<String, SearchResult> searches = new ConcurrentHashMap<>();
    private final ExecutorService executor = createExecutorService();
    private final String baseUrl = System.getenv(BASE_URL);
    private static final HttpClient client = createHttpClient();


    public SearchResult getResult(String id) {
        return searches.get(id);
    }

    public String startSearch(String keyword) {
        validateKeyword(keyword);
        validateBaseURL(baseUrl);

        String normalizedKeyword = keyword.toLowerCase();
        String searchId = Utils.generateId();
        SearchResult result = new SearchResult(searchId, normalizedKeyword);

        searches.put(searchId, result);
        log.info("Starting new search. ID: {}, Keyword: {}, Base URL: {}", searchId, normalizedKeyword, baseUrl);
        executor.submit(() -> crawl(baseUrl, normalizedKeyword, result));
        return searchId;
    }

    public String extractKeyword(String requestBody) {
        JsonObject body = JsonParser.parseString(requestBody).getAsJsonObject();

        if (!body.has(KEYWORD)) {
            log.warn("Missing '{}' field in request body", KEYWORD);
            throw new IllegalArgumentException(ERROR_MISSING_KEYWORD);
        }

        String keyword = body.get(KEYWORD).getAsString().trim();
        validateKeyword(keyword);
        log.debug("Extracted and validated keyword: {}", keyword);
        return keyword.toLowerCase();
    }

    private void validateBaseURL(String baseUrl) {
        if (baseUrl == null || baseUrl.isEmpty()) {
            log.error("Base URL is not set in environment variables");
            throw new IllegalStateException("Base URL is not set");
        }
    }

    private void validateKeyword(String keyword) {
        if (keyword == null || keyword.length() < 4 || keyword.length() > 32) {
            log.warn("Invalid keyword length: {}", keyword);
            throw new IllegalArgumentException(ERROR_KEYWORD_LENGTH);
        }
    }

    private void crawl(String startUrl, String keyword, SearchResult result) {
        Set<String> visited = ConcurrentHashMap.newKeySet();
        Set<String> enqueued = ConcurrentHashMap.newKeySet();
        Queue<String> toVisit = new ConcurrentLinkedQueue<>();
        toVisit.add(startUrl);

        CountDownLatch latch = new CountDownLatch(1);
        CrawlContext context = new CrawlContext(keyword, result, toVisit, visited, enqueued, latch, baseUrl);

        executor.submit(new CrawlerTask(context, executor, this));

        try {
            latch.await();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Crawling interrupted");
        }
        result.setStatus(DONE);
        result.setFinished(DateFormatter());
        log.info("Crawling completed for ID: {}. Found {} results.", result.getId(), result.getUrls().size());
    }

    public String fetchHtmlWithRetries(String urlString) throws Exception {
        int attempts = 0;
        Exception lastException = null;

        while (attempts < MAX_RETRIES) {
            try {
                URI uri = new URI(urlString);
                HttpRequest request = HttpRequest.newBuilder(uri)
                        .GET()
                        .timeout(Duration.ofSeconds(3))
                        .build();

                HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

                if (response.statusCode() == 200) {
                    return response.body();
                } else {
                    throw new IOException("HTTP status: " + response.statusCode());
                }
            } catch (IOException | InterruptedException | URISyntaxException e) {
                lastException = e;
                attempts++;
                Thread.sleep(1000);
            }
        }

        throw new Exception("Failed to fetch after " + MAX_RETRIES + " attempts", lastException);
    }

    public List<String> extractLinks(String html, String currentUrl) {
        List<String> links = new ArrayList<>();
        Pattern pattern = Pattern.compile("<a\\s+[^>]*href=[\"']([^\"']+)[\"']", Pattern.CASE_INSENSITIVE);
        Matcher matcher = pattern.matcher(html);

        while (matcher.find()) {
            try {
                String link = matcher.group(1);
                URL base = new URL(currentUrl);
                URL absolute = new URL(base, link);
                links.add(absolute.toString());
                log.debug("Link extracted: {}", absolute);
            } catch (MalformedURLException e) {
                log.debug("Malformed URL skipped: {}", matcher.group(1));
            }
        }

        return links;
    }

    private static ExecutorService createExecutorService() {
        return new ThreadPoolExecutor(
                50,
                200,
                60L, TimeUnit.SECONDS,
                new LinkedBlockingQueue<>(500),
                Executors.defaultThreadFactory(),
                new ThreadPoolExecutor.CallerRunsPolicy()
        );
    }

    private static HttpClient createHttpClient() {
        return HttpClient.newBuilder()
                .followRedirects(HttpClient.Redirect.NORMAL)
                .connectTimeout(Duration.ofSeconds(2))
                .build();
    }
}


package com.axreng.backend.service;

import com.axreng.backend.model.CrawlContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.concurrent.ExecutorService;

import static com.axreng.backend.util.Constants.MAX_RESULTS;

public class CrawlerTask implements Runnable {

    private static final Logger log = LoggerFactory.getLogger(CrawlerTask.class);

    private final CrawlContext context;
    private final ExecutorService executor;
    private final CrawlerService crawlerService;

    public CrawlerTask(CrawlContext context, ExecutorService executor, CrawlerService crawlerService) {
        this.context = context;
        this.executor = executor;
        this.crawlerService = crawlerService;
    }

    @Override
    public void run() {
        try {
            while (!context.shouldStop()) {
                String current = context.getToVisit().poll();
                if (current == null) break;

                if (!context.getVisited().add(current)) continue;

                try {
                    log.debug("Fetching HTML content for: {}", current);
                    String html = crawlerService.fetchHtmlWithRetries(current).toLowerCase();

                    if (html.contains(context.getKeyword())) {
                        synchronized (context.getResult()) {
                            if (context.getResult().getUrls().size() < MAX_RESULTS) {
                                context.getResult().addUrl(current);
                                log.info("Keyword found at: {}", current);
                            }

                            if (context.getResult().getUrls().size() >= MAX_RESULTS) {
                                System.out.println("Deu 100?");
                                context.stop();
                                break;
                            }
                        }
                    }

                    List<String> links = crawlerService.extractLinks(html, current);
                    for (String link : links) {
                        if (context.shouldStop()) break;

                        if (link.startsWith(context.getBaseUrl()) &&
                                context.getEnqueued().add(link)) {
                            context.getToVisit().add(link);
                        }
                    }

                    if (!context.shouldStop() && !context.getToVisit().isEmpty()) {
                        executor.submit(new CrawlerTask(context, executor, crawlerService));
                    }

                } catch (Exception e) {
                    log.warn("Error while processing URL: {} - {}", current, e.getMessage());
                }
            }
        } finally {
            context.getLatch().countDown();
        }
    }
}



package com.axreng.backend.util;

public final class Constants {

    public static final int MAX_RESULTS = 100;
    public static final String ERROR_MISSING_KEYWORD = "Missing 'keyword' field";
    public static final String ERROR_KEYWORD_LENGTH = "Keyword must be between 4 and 32 characters";
    public static final String KEYWORD = "keyword";
    public static final String BASE_URL = "BASE_URL";
    public static final int MAX_RETRIES = 3;

    private Constants() {
    }
}

package com.axreng.backend.util;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

public class Utils {

    public static String generateId() {
        return UUID.randomUUID()
                .toString()
                .replaceAll("[^a-zA-Z0-9]", "")
                .substring(0, 8);
    }

    public static String DateFormatter() {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        return LocalDateTime.now().format(formatter);
    }
}

package com.axreng.backend;

import com.axreng.backend.model.SearchResult;
import com.axreng.backend.service.CrawlerService;
import com.google.gson.Gson;

import static spark.Spark.*;

import java.util.Map;

public class Main {

    private static final Gson gson = new Gson();
    private static final CrawlerService crawlerService = new CrawlerService();

    public static void main(String[] args) {
        port(4567);

        post("/crawl", (req, res) -> {
            res.type("application/json");

            try {
                String keyword = crawlerService.extractKeyword(req.body());
                String id = crawlerService.startSearch(keyword);
                return gson.toJson(Map.of("id", id));
            } catch (IllegalArgumentException e) {
                res.status(400);
                return gson.toJson(Map.of("error", e.getMessage()));
            } catch (Exception e) {
                res.status(500);
                return gson.toJson(Map.of("error", e.getMessage()));
            }
        });

        get("/crawl/:id", (req, res) -> {
            res.type("application/json");

            SearchResult result = crawlerService.getResult(req.params(":id"));

            if (result == null) {
                res.status(404);
                return gson.toJson(Map.of("error", "Search not found"));
            }

            return gson.toJson(result);
        });
    }
}
