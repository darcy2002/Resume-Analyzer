"use client";

import { useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import IntakeView from "@/components/upload/IntakeView";
import AnalysisView from "@/components/analysis/AnalysisView";
import ResumeEditor from "@/components/editor/ResumeEditor";
import CoverLetterEditor from "@/components/editor/CoverLetterEditor";
import type { ParsedResume, Analysis } from "@/types";

type Phase = "intake" | "analyzing" | "editing" | "coverLetter";

export default function Home() {
  const [phase, setPhase] = useState<Phase>("intake");
  const [resume, setResume] = useState<ParsedResume | null>(null);
  const [jd, setJd] = useState<string>("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  const handleAnalyze = useCallback((parsed: ParsedResume, jobDesc: string) => {
    setResume(parsed);
    setJd(jobDesc);
    setPhase("analyzing");
  }, []);

  const handleReset = useCallback(() => {
    setPhase("intake");
    setResume(null);
    setJd("");
    setAnalysis(null);
  }, []);

  const handleEditResume = useCallback((a: Analysis) => {
    setAnalysis(a);
    setPhase("editing");
  }, []);

  const handleCoverLetter = useCallback(() => setPhase("coverLetter"), []);
  const handleBackToAnalysis = useCallback(() => setPhase("analyzing"), []);

  const handleEditorDone = useCallback((acceptedResume: ParsedResume) => {
    setResume(acceptedResume);
    setPhase("coverLetter");
  }, []);

  return (
    <AnimatePresence mode="wait">
      {phase === "intake" || !resume ? (
        <IntakeView key="intake" onAnalyze={handleAnalyze} />
      ) : phase === "editing" && analysis ? (
        <ResumeEditor
          key="editing"
          resume={resume}
          analysis={analysis}
          onBack={handleBackToAnalysis}
          onDone={handleEditorDone}
        />
      ) : phase === "coverLetter" ? (
        <CoverLetterEditor
          key="coverLetter"
          resume={resume}
          jd={jd}
          onBack={handleBackToAnalysis}
        />
      ) : (
        <AnalysisView
          key="analysis"
          resume={resume}
          jd={jd}
          onReset={handleReset}
          onEditResume={handleEditResume}
          onCoverLetter={handleCoverLetter}
        />
      )}
    </AnimatePresence>
  );
}
