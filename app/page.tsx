"use client";

import { useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import IntakeView from "@/components/upload/IntakeView";
import AnalysisView from "@/components/analysis/AnalysisView";
import type { ParsedResume } from "@/types";

type Phase = "intake" | "analyzing" | "editing" | "coverLetter";

function ComingSoon({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <motion.div
      key={title}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      style={{
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        padding: 24,
        boxSizing: "border-box",
      }}
    >
      <p
        style={{
          fontFamily: "var(--font-inter), sans-serif",
          fontWeight: 700,
          fontSize: 28,
          letterSpacing: "-0.5px",
          color: "var(--text)",
          margin: 0,
        }}
      >
        {title}
      </p>
      <p
        style={{
          fontFamily: "var(--font-inter), sans-serif",
          fontSize: 15,
          color: "var(--muted)",
          margin: 0,
        }}
      >
        Coming soon.
      </p>
      <button
        onClick={onBack}
        style={{
          background: "none",
          border: "1px solid var(--border-strong)",
          borderRadius: 6,
          padding: "8px 20px",
          fontFamily: "var(--font-jetbrains-mono), monospace",
          fontSize: 12,
          color: "var(--muted)",
          cursor: "pointer",
          letterSpacing: "0.04em",
        }}
      >
        ← Back to analysis
      </button>
    </motion.div>
  );
}

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

  const handleEditResume = useCallback(() => setPhase("editing"), []);
  const handleCoverLetter = useCallback(() => setPhase("coverLetter"), []);
  const handleBackToAnalysis = useCallback(() => setPhase("analyzing"), []);

  return (
    <AnimatePresence mode="wait">
      {phase === "intake" || !resume ? (
        <IntakeView key="intake" onAnalyze={handleAnalyze} />
      ) : phase === "editing" ? (
        <ComingSoon
          key="editing"
          title="Generate improved resume"
          onBack={handleBackToAnalysis}
        />
      ) : phase === "coverLetter" ? (
        <ComingSoon
          key="coverLetter"
          title="Write cover letter"
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
