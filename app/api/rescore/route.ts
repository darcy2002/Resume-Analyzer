import { NextRequest, NextResponse } from "next/server";
import { callGemini } from "@/lib/gemini";
import { checkRateLimit, rescoreLimit } from "@/lib/rate-limit";
import { RESCORE_PROMPT } from "@/lib/prompts";
import { RescoreSchema } from "@/lib/schemas";
import type { z } from "zod";

type Rescore = z.infer<typeof RescoreSchema>;

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  try {
    const rateLimitResult = await checkRateLimit(rescoreLimit, ip);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { updatedBullets, jd, previousScore } = body as {
      updatedBullets: string[];
      jd: string;
      previousScore: number;
    };

    if (
      !Array.isArray(updatedBullets) ||
      typeof jd !== "string" ||
      typeof previousScore !== "number"
    ) {
      return NextResponse.json(
        { error: "Missing or invalid fields" },
        { status: 400 }
      );
    }

    const prompt = RESCORE_PROMPT(updatedBullets, jd, previousScore);
    const { data, error } = await callGemini<Rescore>(prompt, RescoreSchema);

    if (error || !data) {
      return NextResponse.json(
        { error: error ?? "Rescore failed" },
        { status: 502 }
      );
    }

    const delta = data.matchScore - previousScore;
    return NextResponse.json({ ...data, delta });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error: " + message },
      { status: 500 }
    );
  }
}
