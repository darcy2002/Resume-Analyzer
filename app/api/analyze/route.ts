import { NextRequest, NextResponse } from "next/server";
import { streamGemini } from "@/lib/gemini";
import { checkRateLimit, analyzeLimit } from "@/lib/rate-limit";
import { ANALYZE_PROMPT } from "@/lib/prompts";
import { AnalysisSchema } from "@/lib/schemas";
import type { ParsedResume } from "@/types";

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
    const rateLimitResult = await checkRateLimit(analyzeLimit, ip);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { resume, jd } = body as { resume: ParsedResume; jd: string };

    if (!resume || !jd) {
      return NextResponse.json(
        { error: "Missing resume or job description" },
        { status: 400 }
      );
    }

    const prompt = ANALYZE_PROMPT(resume, jd);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let buffer = "";
          for await (const chunk of streamGemini(prompt)) {
            buffer += chunk;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`)
            );
          }

          try {
            // Strip markdown fences — Gemini sometimes wraps JSON in ```json...```
            const jsonStart = buffer.indexOf("{");
            const jsonEnd = buffer.lastIndexOf("}");
            const jsonStr =
              jsonStart !== -1 && jsonEnd !== -1
                ? buffer.slice(jsonStart, jsonEnd + 1)
                : buffer;
            const parsed = JSON.parse(jsonStr);
            const validated = await AnalysisSchema.parseAsync(parsed);
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ done: true, data: validated })}\n\n`
              )
            );
          } catch (err) {
            const detail = err instanceof Error ? err.message : "Parse failed";
            console.error("[analyze] final parse error:", detail);
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ error: `Invalid response format: ${detail}` })}\n\n`
              )
            );
          }

          controller.close();
        } catch (err) {
          const message = err instanceof Error ? err.message : "Analysis failed";
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error: " + message },
      { status: 500 }
    );
  }
}