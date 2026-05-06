"use client";

import IntakeView from "@/components/upload/IntakeView";
import type { ParsedResume } from "@/types";

export default function Home() {
  function handleAnalyze(resume: ParsedResume, jd: string) {
    // Phase 2 transition wired here
    console.log("analyze", { resume, jd });
  }

  return <IntakeView onAnalyze={handleAnalyze} />;
}
