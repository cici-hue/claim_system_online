package com.otto.cms.service;

import org.springframework.stereotype.Service;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

@Service
public class RateLimiterService {

    private static final int MAX_ATTEMPTS = 5;
    private static final long WINDOW_MS = TimeUnit.MINUTES.toMillis(15);

    private final ConcurrentHashMap<String, Attempt> attempts = new ConcurrentHashMap<>();

    public boolean isBlocked(String key) {
        cleanup();
        Attempt attempt = attempts.get(key);
        if (attempt == null) {
            return false;
        }
        if (System.currentTimeMillis() - attempt.firstAttemptTime > WINDOW_MS) {
            attempts.remove(key);
            return false;
        }
        return attempt.count > MAX_ATTEMPTS;
    }

    public void recordAttempt(String key) {
        cleanup();
        Attempt attempt = attempts.computeIfAbsent(key, k -> new Attempt());
        attempt.count++;
        if (attempt.firstAttemptTime == 0) {
            attempt.firstAttemptTime = System.currentTimeMillis();
        }
    }

    public void reset(String key) {
        attempts.remove(key);
    }

    private void cleanup() {
        long now = System.currentTimeMillis();
        attempts.entrySet().removeIf(e -> now - e.getValue().firstAttemptTime > WINDOW_MS);
    }

    private static class Attempt {
        long firstAttemptTime;
        int count;
    }
}
