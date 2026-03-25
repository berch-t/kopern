import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  isKeyAvailable,
  cooldownKey,
  isRetryableError,
  executeWithKeyRotation,
} from "../key-rotation";

describe("key-rotation", () => {
  beforeEach(() => {
    // Reset cooldown cache by setting all cooldowns to the past
    // (no exported clear, so we just let tests be independent via unique keys)
  });

  describe("isRetryableError", () => {
    it("detects 429 errors", () => {
      expect(isRetryableError(new Error("429 Too Many Requests"))).toBe(true);
      expect(isRetryableError(new Error("rate_limit_exceeded"))).toBe(true);
      expect(isRetryableError(new Error("overloaded"))).toBe(true);
      expect(isRetryableError(new Error("capacity"))).toBe(true);
      expect(isRetryableError(new Error("too many requests"))).toBe(true);
    });

    it("rejects non-retryable errors", () => {
      expect(isRetryableError(new Error("403 Forbidden"))).toBe(false);
      expect(isRetryableError(new Error("invalid_api_key"))).toBe(false);
      expect(isRetryableError(new Error("Unknown error"))).toBe(false);
    });
  });

  describe("cooldownKey / isKeyAvailable", () => {
    it("key is available by default", () => {
      expect(isKeyAvailable("fresh-key-123")).toBe(true);
    });

    it("key is unavailable after cooldown", () => {
      cooldownKey("cd-key-1", 60_000);
      expect(isKeyAvailable("cd-key-1")).toBe(false);
    });

    it("key becomes available after cooldown expires", () => {
      cooldownKey("cd-key-2", 1); // 1ms cooldown
      // Wait just a tiny bit
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(isKeyAvailable("cd-key-2")).toBe(true);
          resolve();
        }, 10);
      });
    });
  });

  describe("executeWithKeyRotation", () => {
    it("uses first key when it works", async () => {
      const execute = vi.fn().mockResolvedValue("ok");
      const result = await executeWithKeyRotation(["k1", "k2"], execute);
      expect(result).toBe("ok");
      expect(execute).toHaveBeenCalledTimes(1);
      expect(execute).toHaveBeenCalledWith("k1");
    });

    it("rotates to second key on 429", async () => {
      const execute = vi.fn()
        .mockRejectedValueOnce(new Error("429 rate_limit"))
        .mockResolvedValueOnce("ok-from-k2");

      const onRetry = vi.fn();
      const result = await executeWithKeyRotation(["rot-k1", "rot-k2"], execute, onRetry);

      expect(result).toBe("ok-from-k2");
      expect(execute).toHaveBeenCalledTimes(2);
      expect(execute).toHaveBeenNthCalledWith(1, "rot-k1");
      expect(execute).toHaveBeenNthCalledWith(2, "rot-k2");
      expect(onRetry).toHaveBeenCalledOnce();
    });

    it("does NOT rotate on non-retryable error (403)", async () => {
      const execute = vi.fn().mockRejectedValue(new Error("403 Forbidden"));

      await expect(
        executeWithKeyRotation(["nr-k1", "nr-k2", "nr-k3"], execute)
      ).rejects.toThrow("403 Forbidden");

      expect(execute).toHaveBeenCalledTimes(1);
    });

    it("throws last error when all keys fail", async () => {
      const execute = vi.fn()
        .mockRejectedValueOnce(new Error("429 rate_limit"))
        .mockRejectedValueOnce(new Error("429 rate_limit"))
        .mockRejectedValueOnce(new Error("429 final"));

      await expect(
        executeWithKeyRotation(["af-k1", "af-k2", "af-k3"], execute)
      ).rejects.toThrow("429 final");

      expect(execute).toHaveBeenCalledTimes(3);
    });

    it("tries all keys even when all in cooldown", async () => {
      // Put all keys in cooldown
      cooldownKey("cd-all-1", 60_000);
      cooldownKey("cd-all-2", 60_000);

      const execute = vi.fn()
        .mockRejectedValueOnce(new Error("429"))
        .mockResolvedValueOnce("recovered");

      const result = await executeWithKeyRotation(["cd-all-1", "cd-all-2"], execute);
      expect(result).toBe("recovered");
      expect(execute).toHaveBeenCalledTimes(2);
    });

    it("skips cooled-down keys when others available", async () => {
      cooldownKey("skip-k1", 60_000); // k1 in cooldown
      // k2 is fresh

      const execute = vi.fn().mockResolvedValue("ok-k2");
      const result = await executeWithKeyRotation(["skip-k1", "skip-k2"], execute);

      expect(result).toBe("ok-k2");
      expect(execute).toHaveBeenCalledTimes(1);
      expect(execute).toHaveBeenCalledWith("skip-k2"); // skipped k1
    });
  });
});
