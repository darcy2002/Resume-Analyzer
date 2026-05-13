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
  const [coverLetterResume, setCoverLetterResume] = useState<ParsedResume | null>(null);
  const [jd, setJd] = useState<string>("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [acceptedBullets, setAcceptedBullets] = useState<string[] | null>(null);

  const handleAnalyze = useCallback((parsed: ParsedResume, jobDesc: string) => {
    setResume(parsed);
    setJd(jobDesc);
    setAnalysis(null);
    setAcceptedBullets(null);
    setPhase("analyzing");
  }, []);

  const handleReset = useCallback(() => {
    setPhase("intake");
    setResume(null);
    setCoverLetterResume(null);
    setJd("");
    setAnalysis(null);
    setAcceptedBullets(null);
  }, []);

  const handleEditResume = useCallback((a: Analysis) => {
    setAnalysis(a);
    setPhase("editing");
  }, []);

  const handleCoverLetter = useCallback(() => setPhase("coverLetter"), []);

  const handleBackFromEditor = useCallback((acceptedResume: ParsedResume) => {
    const flat = acceptedResume.experience.flatMap((e) => e.bullets);
    setAcceptedBullets(flat);
    setPhase("analyzing");
  }, []);

  const handleBackFromCoverLetter = useCallback(() => {
    setPhase("analyzing");
  }, []);

  const handleEditorDone = useCallback((acceptedResume: ParsedResume) => {
    // Don't overwrite the original resume — keep it for re-editing.
    // Pass accepted version to cover letter separately.
    setCoverLetterResume(acceptedResume);
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
          onBack={handleBackFromEditor}
          onDone={handleEditorDone}
        />
      ) : phase === "coverLetter" ? (
        <CoverLetterEditor
          key="coverLetter"
          resume={coverLetterResume ?? resume}
          jd={jd}
          onBack={handleBackFromCoverLetter}
        />
      ) : (
        <AnalysisView
          key="analysis"
          resume={resume}
          jd={jd}
          updatedBullets={acceptedBullets}
          onReset={handleReset}
          onEditResume={handleEditResume}
          onCoverLetter={handleCoverLetter}
        />
      )}
    </AnimatePresence>
  );
}
