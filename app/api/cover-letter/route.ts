import { NextRequest, NextResponse } from "next/server";
import { callGemini } from "@/lib/gemini";
import { checkRateLimit, coverLetterLimit } from "@/lib/rate-limit";
import { COVER_LETTER_PROMPT, type CoverLetterTone } from "@/lib/prompts";
import { CoverLetterSchema } from "@/lib/schemas";
import { getClientIp } from "@/lib/get-ip";
import type { ParsedResume, CoverLetter } from "@/types";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  try {
    const rateLimitResult = await checkRateLimit(coverLetterLimit, ip);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { resume, jd, tone } = body as { resume: ParsedResume; jd: string; tone?: CoverLetterTone };

    if (!resume || !jd) {
      return NextResponse.json(
        { error: "Missing resume or job description" },
        { status: 400 }
      );
    }

    const prompt = COVER_LETTER_PROMPT(resume, jd, tone ?? "confident");
    const result = await callGemini<CoverLetter>(prompt, CoverLetterSchema);

    if (result.error) {
      return NextResponse.json(
        { error: "Failed to generate cover letter: " + result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ coverLetter: result.data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error: " + message },
      { status: 500 }
    );
  }
}