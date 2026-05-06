"use client";

import { useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import IntakeView from "@/components/upload/IntakeView";
import AnalysisView from "@/components/analysis/AnalysisView";
import type { ParsedResume } from "@/types";

type Phase = "intake" | "analyzing" | "editing" | "coverLetter";

export default function Home() {
  const [phase, setPhase] = useState<Phase>("intake");
  const [resume, setResume] = useState<ParsedResume | null>(null);
  const [jd, setJd] = useState<string>("");

  const handleAnalyze = useCallback((parsed: ParsedResume, jobDesc: string) => {
    setResume(parsed);
    setJd(jobDesc);
    setPhase("analyzing");
  }, []);

  const handleReset = useCallback(() => {
    setPhase("intake");
    setResume(null);
    setJd("");
  }, []);

  return (
    <AnimatePresence mode="wait">
      {phase === "intake" || !resume ? (
        <IntakeView key="intake" onAnalyze={handleAnalyze} />
      ) : (
        <AnalysisView
          key="analysis"
          resume={resume}
          jd={jd}
          onReset={handleReset}
        />
      )}
    </AnimatePresence>
  );
}
