import { NextRequest, NextResponse } from "next/server";
import { callGemini } from "@/lib/gemini";
import { checkRateLimit, regenerateLimit } from "@/lib/rate-limit";
import { REGENERATE_PROMPT } from "@/lib/prompts";
import { ParsedResumeSchema } from "@/lib/schemas";
import type { ParsedResume, Analysis } from "@/types";

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
    const rateLimitResult = await checkRateLimit(regenerateLimit, ip);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { resume, analysis } = body as {
      resume: ParsedResume;
      analysis: Analysis;
    };

    if (!resume || !analysis) {
      return NextResponse.json(
        { error: "Missing resume or analysis" },
        { status: 400 }
      );
    }

    const analysisStr = JSON.stringify(analysis);
    const prompt = REGENERATE_PROMPT(resume, analysisStr);
    const result = await callGemini<ParsedResume>(prompt, ParsedResumeSchema);

    if (result.error) {
      return NextResponse.json(
        { error: "Failed to regenerate resume: " + result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ resume: result.data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error: " + message },
      { status: 500 }
    );
  }
}