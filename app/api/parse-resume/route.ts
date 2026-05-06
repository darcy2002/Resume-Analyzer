import { NextRequest, NextResponse } from "next/server";
import { parsePdf } from "@/lib/parse-pdf";
import { callGemini } from "@/lib/gemini";
import { checkRateLimit, parseResumeLimit } from "@/lib/rate-limit";
import { PARSE_RESUME_PROMPT } from "@/lib/prompts";
import { ParsedResumeSchema } from "@/lib/schemas";
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
    const rateLimitResult = await checkRateLimit(parseResumeLimit, ip);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!file.type.includes("pdf")) {
      return NextResponse.json(
        { error: "File must be a PDF" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await parsePdf(buffer);

    if (!text.trim()) {
      return NextResponse.json(
        { error: "Could not extract text from PDF" },
        { status: 400 }
      );
    }

    const prompt = PARSE_RESUME_PROMPT(text);
    const result = await callGemini<ParsedResume>(prompt, ParsedResumeSchema);

    if (result.error) {
      return NextResponse.json(
        { error: "Failed to parse resume: " + result.error },
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