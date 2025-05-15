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

                    if (context.shouldStop()) break;

                    if (html.contains(context.getKeyword())) {
                        synchronized (context.getResult()) {
                            int currentSize = context.getResult().getUrls().size();

                            if (currentSize < MAX_RESULTS) {
                                context.getResult().addUrl(current);
                                log.info("Keyword found at: {}", current);
                                currentSize++; // Simula o incremento ao adicionar
                            }

                            if (currentSize >= MAX_RESULTS) {
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
