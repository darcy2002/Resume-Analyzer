import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

export const parseResumeLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "1 h"),
});

export const analyzeLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "1 h"),
});

export const regenerateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 h"),
});

export const coverLetterLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 h"),
});

export const rescoreLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(15, "1 h"),
});

export async function checkRateLimit(
  limiter: Ratelimit,
  ip: string
): Promise<{ success: boolean; remaining: number; reset: number }> {
  // Skip rate limiting in local development
  if (process.env.NODE_ENV === "development") {
    return { success: true, remaining: 999, reset: 0 };
  }
  const { success, remaining, reset } = await limiter.limit(ip);
  return { success, remaining, reset };
}