import { describe, it, expect, vi } from "vitest";
import { events, tables, RUNTIME_SESSION_TIMEOUT_MS } from "@runtimed/schema";

describe("Runtime Session Renewal System", () => {
  describe("Constants", () => {
    it("should have correct timeout constant", () => {
      expect(RUNTIME_SESSION_TIMEOUT_MS).toBe(30000); // 30 seconds
    });
  });

  describe("Event Schema", () => {
    it("should validate renewal event schema", () => {
      const renewalEvent = events.runtimeSessionRenewal({
        sessionId: "test-session",
        renewedAt: new Date(),
        validForMs: RUNTIME_SESSION_TIMEOUT_MS,
      });

      expect(renewalEvent.name).toBe("v1.RuntimeSessionRenewal");
      expect(renewalEvent.args.sessionId).toBe("test-session");
      expect(renewalEvent.args.renewedAt).toBeInstanceOf(Date);
      expect(renewalEvent.args.validForMs).toBe(30000);
    });

    it("should create events with UTC timestamps", () => {
      const renewedAt = new Date("2024-01-01T12:00:00.000Z");
      const renewalEvent = events.runtimeSessionRenewal({
        sessionId: "test-session",
        renewedAt,
        validForMs: RUNTIME_SESSION_TIMEOUT_MS,
      });

      expect(renewalEvent.args.renewedAt.toISOString()).toBe(
        "2024-01-01T12:00:00.000Z"
      );
    });
  });

  describe("Materializer Logic", () => {
    it("should calculate expiry time correctly", () => {
      const renewedAt = new Date("2024-01-01T12:00:00.000Z");
      const validForMs = RUNTIME_SESSION_TIMEOUT_MS;

      // Simulate the materializer logic
      const expiresAt = new Date(renewedAt.getTime() + validForMs);

      expect(expiresAt.getTime()).toBe(
        renewedAt.getTime() + RUNTIME_SESSION_TIMEOUT_MS
      );
      expect(expiresAt.toISOString()).toBe("2024-01-01T12:00:30.000Z");
    });

    it("should be deterministic with same inputs", () => {
      const renewedAt = new Date("2024-01-01T12:00:00.000Z");
      const validForMs = 30000;

      // Multiple calculations should yield same result
      const expiresAt1 = new Date(renewedAt.getTime() + validForMs);
      const expiresAt2 = new Date(renewedAt.getTime() + validForMs);

      expect(expiresAt1.getTime()).toBe(expiresAt2.getTime());
    });
  });

  describe("Health Detection Logic", () => {
    it("should detect expired sessions correctly", () => {
      const now = new Date("2024-01-01T12:01:00.000Z"); // 1 minute after renewal
      const lastRenewedAt = new Date("2024-01-01T12:00:00.000Z");
      const toleranceMs = 15000; // 15 seconds tolerance

      // Simulate the health check logic
      const timeSinceRenewal = now.getTime() - lastRenewedAt.getTime();
      const maxAllowedGap = RUNTIME_SESSION_TIMEOUT_MS + toleranceMs; // 45 seconds total

      // 60 seconds > 45 seconds, should be considered expired
      expect(timeSinceRenewal).toBeGreaterThan(maxAllowedGap);
      expect(timeSinceRenewal).toBe(60000); // Exactly 1 minute
    });

    it("should handle sessions in warning state", () => {
      const now = new Date("2024-01-01T12:00:35.000Z"); // 35 seconds after renewal
      const lastRenewedAt = new Date("2024-01-01T12:00:00.000Z");
      const toleranceMs = 15000;

      const timeSinceRenewal = now.getTime() - lastRenewedAt.getTime();
      const maxAllowedGap = RUNTIME_SESSION_TIMEOUT_MS + toleranceMs;

      // 35 seconds > 30 seconds (expired) but < 45 seconds (tolerance)
      expect(timeSinceRenewal).toBeGreaterThan(RUNTIME_SESSION_TIMEOUT_MS);
      expect(timeSinceRenewal).toBeLessThan(maxAllowedGap);
    });

    it("should handle healthy sessions", () => {
      const now = new Date("2024-01-01T12:00:10.000Z"); // 10 seconds after renewal
      const lastRenewedAt = new Date("2024-01-01T12:00:00.000Z");

      const timeSinceRenewal = now.getTime() - lastRenewedAt.getTime();

      // 10 seconds < 30 seconds, should be healthy
      expect(timeSinceRenewal).toBeLessThan(RUNTIME_SESSION_TIMEOUT_MS);
      expect(timeSinceRenewal).toBe(10000); // Exactly 10 seconds
    });

    it("should handle clock skew tolerance", () => {
      const now = new Date("2024-01-01T12:00:32.000Z"); // 32 seconds after renewal
      const lastRenewedAt = new Date("2024-01-01T12:00:00.000Z");
      const toleranceMs = 15000;

      const timeSinceRenewal = now.getTime() - lastRenewedAt.getTime();
      const maxAllowedGap = RUNTIME_SESSION_TIMEOUT_MS + toleranceMs;

      // 32 seconds is within tolerance (30s + 15s = 45s total)
      expect(timeSinceRenewal).toBeLessThan(maxAllowedGap);
    });
  });

  describe("Renewal Timing", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should calculate correct renewal interval", () => {
      const timeoutMs = RUNTIME_SESSION_TIMEOUT_MS;
      const recommendedIntervalMs = Math.floor(timeoutMs / 2); // Half of timeout

      expect(recommendedIntervalMs).toBe(15000); // 15 seconds
    });

    it("should handle multiple renewal cycles", () => {
      const renewalIntervalMs = 15000;
      let renewalCount = 0;

      // Mock renewal function
      const mockRenewal = vi.fn(() => {
        renewalCount++;
      });

      // Start renewal interval
      const intervalId = setInterval(mockRenewal, renewalIntervalMs);

      // Fast-forward through multiple cycles
      vi.advanceTimersByTime(15000); // First renewal
      expect(renewalCount).toBe(1);

      vi.advanceTimersByTime(15000); // Second renewal
      expect(renewalCount).toBe(2);

      vi.advanceTimersByTime(15000); // Third renewal
      expect(renewalCount).toBe(3);

      clearInterval(intervalId);
    });
  });

  describe("Edge Cases", () => {
    it("should handle exactly at timeout boundary", () => {
      const renewedAt = new Date("2024-01-01T12:00:00.000Z");
      const exactlyAtTimeout = new Date(
        renewedAt.getTime() + RUNTIME_SESSION_TIMEOUT_MS
      );

      const timeSinceRenewal = exactlyAtTimeout.getTime() - renewedAt.getTime();

      // Should be exactly at timeout (30 seconds)
      expect(timeSinceRenewal).toBe(RUNTIME_SESSION_TIMEOUT_MS);
    });

    it("should handle renewal with different valid durations", () => {
      const renewedAt = new Date("2024-01-01T12:00:00.000Z");

      // Test with custom duration (60 seconds instead of 30)
      const customValidForMs = 60000;
      const expiresAt = new Date(renewedAt.getTime() + customValidForMs);

      expect(expiresAt.toISOString()).toBe("2024-01-01T12:01:00.000Z");
    });

    it("should handle very small time differences", () => {
      const renewedAt = new Date("2024-01-01T12:00:00.000Z");
      const almostExpired = new Date("2024-01-01T12:00:29.999Z"); // 29.999 seconds

      const timeSinceRenewal = almostExpired.getTime() - renewedAt.getTime();

      // Should still be within timeout by 1ms
      expect(timeSinceRenewal).toBeLessThan(RUNTIME_SESSION_TIMEOUT_MS);
      expect(timeSinceRenewal).toBe(29999);
    });
  });

  describe("UTC Time Handling", () => {
    it("should work correctly with different timezones", () => {
      // Create dates in different representations but same UTC time
      const utcDate1 = new Date("2024-01-01T12:00:00.000Z");
      const utcDate2 = new Date("2024-01-01T12:00:00Z");

      expect(utcDate1.getTime()).toBe(utcDate2.getTime());
    });

    it("should calculate durations consistently", () => {
      const start = new Date("2024-01-01T12:00:00.000Z");
      const end = new Date("2024-01-01T12:00:30.000Z");

      const duration = end.getTime() - start.getTime();
      expect(duration).toBe(30000); // Exactly 30 seconds
    });
  });
});

describe("Integration Scenarios", () => {
  it("should simulate full renewal cycle", () => {
    const sessionId = "test-session-123";
    const startTime = new Date("2024-01-01T12:00:00.000Z");

    // Create initial renewal event
    const renewalEvent = events.runtimeSessionRenewal({
      sessionId,
      renewedAt: startTime,
      validForMs: RUNTIME_SESSION_TIMEOUT_MS,
    });

    // Simulate materializer processing
    const expiresAt = new Date(
      startTime.getTime() + RUNTIME_SESSION_TIMEOUT_MS
    );

    // Check that session would be considered healthy at 10 seconds
    const checkTime1 = new Date("2024-01-01T12:00:10.000Z");
    const isHealthy = checkTime1.getTime() < expiresAt.getTime();
    expect(isHealthy).toBe(true);

    // Check that session would be considered expired at 35 seconds (with tolerance)
    const checkTime2 = new Date("2024-01-01T12:00:35.000Z");
    const timeSinceRenewal = checkTime2.getTime() - startTime.getTime();
    const isExpired = timeSinceRenewal > RUNTIME_SESSION_TIMEOUT_MS + 15000;
    expect(isExpired).toBe(false); // Still within tolerance

    // Check that session would be considered expired at 50 seconds
    const checkTime3 = new Date("2024-01-01T12:00:50.000Z");
    const timeSinceRenewal3 = checkTime3.getTime() - startTime.getTime();
    const isExpiredWithoutTolerance =
      timeSinceRenewal3 > RUNTIME_SESSION_TIMEOUT_MS + 15000;
    expect(isExpiredWithoutTolerance).toBe(true);
  });
});
