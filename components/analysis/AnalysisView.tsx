"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ParsedResume, Analysis } from "@/types";
import AnalysisStream from "./AnalysisStream";

interface AnalysisViewProps {
  resume: ParsedResume;
  jd: string;
  updatedBullets?: string[] | null;
  onReset: () => void;
  onEditResume: (analysis: Analysis) => void;
  onCoverLetter: () => void;
}

function PulsingDot() {
  return (
    <motion.span
      animate={{ opacity: [1, 0.3, 1] }}
      transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
      style={{
        display: "inline-block",
        width: 6,
        height: 6,
        borderRadius: "50%",
        background: "var(--accent)",
        flexShrink: 0,
      }}
    />
  );
}

function PanelHeader({ label, showDot, sticky }: { label: string; showDot?: boolean; sticky?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        paddingBottom: sticky ? 12 : 16,
        paddingTop: sticky ? 12 : 0,
        paddingLeft: sticky ? 24 : 0,
        paddingRight: sticky ? 24 : 0,
        borderBottom: "1px solid var(--border)",
        marginBottom: sticky ? 0 : 20,
        flexShrink: 0,
        ...(sticky ? { position: "sticky", top: 0, background: "var(--bg)", zIndex: 2 } : {}),
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-jetbrains-mono), monospace",
          fontSize: 11,
          letterSpacing: "0.12em",
          color: "var(--muted)",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      {showDot && <PulsingDot />}
    </div>
  );
}

export default function AnalysisView({
  resume,
  jd,
  updatedBullets,
  onReset,
  onEditResume,
  onCoverLetter,
}: AnalysisViewProps) {
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [displayMatch, setDisplayMatch] = useState<number | null>(null);
  const [atsScore, setAtsScore] = useState<number | null>(null);
  const [displayAts, setDisplayAts] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [rescoring, setRescoring] = useState(false);
  const [delta, setDelta] = useState<number | null>(null);
  const [rescoreSummary, setRescoreSummary] = useState<string | null>(null);
  const rescoreFiredRef = useRef(false);

  useEffect(() => {
    if (atsScore === null) return;
    const target = atsScore;
    const startTime = performance.now();
    const duration = 1000;
    let raf = 0;
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayAts(Math.round(target * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [atsScore]);

  const atsColor =
    atsScore === null
      ? "var(--muted)"
      : atsScore >= 80
        ? "var(--match)"
        : atsScore >= 60
          ? "var(--suggest)"
          : "var(--gap)";

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const handleScoreReady = useCallback((score: number) => {
    setMatchScore(score);
    setDisplayMatch(score);
  }, []);

  // Trigger rescore when returning from editor with accepted bullets
  useEffect(() => {
    if (rescoreFiredRef.current) return;
    if (!updatedBullets || updatedBullets.length === 0) return;
    if (matchScore === null) return;

    rescoreFiredRef.current = true;
    const previousScore = matchScore;
    setRescoring(true);

    fetch("/api/rescore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updatedBullets, jd, previousScore }),
    })
      .then((res) => res.json())
      .then((data: { matchScore?: number; delta?: number; summary?: string; error?: string }) => {
        if (data.error || typeof data.matchScore !== "number") {
          setRescoring(false);
          return;
        }
        const newScore = data.matchScore;
        setDelta(data.delta ?? newScore - previousScore);
        setRescoreSummary(data.summary ?? null);
        setMatchScore(newScore);

        const startTime = performance.now();
        const duration = 1200;
        let raf = 0;
        const tick = (now: number) => {
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          const v = previousScore + (newScore - previousScore) * eased;
          setDisplayMatch(Math.round(v));
          if (progress < 1) raf = requestAnimationFrame(tick);
          else setRescoring(false);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
      })
      .catch(() => setRescoring(false));
  }, [updatedBullets, matchScore, jd]);

  const handleAtsScoreReady = useCallback((score: number) => {
    setAtsScore(score);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.25 } }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      style={{
        width: "100%",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          height: 56,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          background: "var(--bg)",
          borderBottom: "1px solid var(--border)",
          zIndex: 10,
        }}
      >
        {/* Left: logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 28,
              height: 28,
              background: "var(--accent)",
              borderRadius: 4,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-jetbrains-mono), monospace",
                fontWeight: 700,
                fontSize: 11,
                color: "#000",
                letterSpacing: "-0.3px",
              }}
            >
              RJ
            </span>
          </div>
        </div>

        {/* Center: status (hidden on mobile) */}
        {!isMobile && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {matchScore === null ? (
              <>
                <PulsingDot />
                <span
                  style={{
                    fontFamily: "var(--font-jetbrains-mono), monospace",
                    fontSize: 11,
                    letterSpacing: "0.15em",
                    color: "var(--muted)",
                    textTransform: "uppercase",
                  }}
                >
                  Analyzing...
                </span>
              </>
            ) : (
              <span
                style={{
                  fontFamily: "var(--font-jetbrains-mono), monospace",
                  fontSize: 11,
                  letterSpacing: "0.15em",
                  color: "var(--accent)",
                  textTransform: "uppercase",
                }}
              >
                Complete
              </span>
            )}
          </div>
        )}

        {/* Right: scores + reset */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
            {/* MATCH score block */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, position: "relative" }}>
              <span
                style={{
                  fontFamily: "var(--font-jetbrains-mono), monospace",
                  fontSize: 9,
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  lineHeight: 1,
                }}
              >
                MATCH
              </span>
              <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
                {rescoring && (
                  <motion.span
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: "50%",
                      background: "var(--accent)",
                      marginRight: 6,
                      alignSelf: "center",
                    }}
                  />
                )}
                <span
                  style={{
                    fontFamily: "var(--font-inter), sans-serif",
                    fontSize: 28,
                    fontWeight: 700,
                    color: matchScore !== null ? "var(--accent)" : "var(--muted)",
                    lineHeight: 1,
                    transition: "color 300ms ease",
                  }}
                >
                  {displayMatch !== null ? displayMatch : "—"}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-inter), sans-serif",
                    fontSize: 14,
                    fontWeight: 400,
                    color: "var(--muted)",
                  }}
                >
                  /100
                </span>
              </div>

              <AnimatePresence>
                {delta !== null && delta !== 0 && !rescoring && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{
                      position: "absolute",
                      top: "100%",
                      right: 0,
                      marginTop: 6,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      background: delta > 0 ? "var(--accent-dim)" : "rgba(255,77,77,0.12)",
                      border: `1px solid ${delta > 0 ? "var(--match)" : "var(--gap)"}`,
                      borderRadius: 4,
                      padding: "3px 8px",
                      whiteSpace: "nowrap",
                      pointerEvents: "none",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-jetbrains-mono), monospace",
                        fontSize: 10,
                        fontWeight: 700,
                        color: delta > 0 ? "var(--match)" : "var(--gap)",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {delta > 0 ? "↑" : "↓"} {delta > 0 ? "+" : ""}{delta}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-jetbrains-mono), monospace",
                        fontSize: 10,
                        color: "var(--muted)",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {rescoreSummary ?? "from bullet rewrites"}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Divider */}
            <div
              style={{
                width: 1,
                height: 28,
                background: "var(--border)",
                margin: "0 12px",
              }}
            />

            {/* ATS score block */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
              <span
                style={{
                  fontFamily: "var(--font-jetbrains-mono), monospace",
                  fontSize: 9,
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  lineHeight: 1,
                }}
              >
                ATS
              </span>
              <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
                <span
                  style={{
                    fontFamily: "var(--font-inter), sans-serif",
                    fontSize: 28,
                    fontWeight: 700,
                    color: atsColor,
                    lineHeight: 1,
                    transition: "color 300ms ease",
                  }}
                >
                  {atsScore !== null ? displayAts : "—"}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-inter), sans-serif",
                    fontSize: 14,
                    fontWeight: 400,
                    color: "var(--muted)",
                  }}
                >
                  /100
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onReset}
            style={{
              background: "none",
              border: "1px solid var(--border-strong)",
              borderRadius: 6,
              padding: "5px 12px",
              fontFamily: "var(--font-jetbrains-mono), monospace",
              fontSize: 11,
              color: "var(--muted)",
              cursor: "pointer",
              letterSpacing: "0.04em",
              transition: "color 150ms ease, border-color 150ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--text)";
              e.currentTarget.style.borderColor = "var(--border-strong)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--muted)";
              e.currentTarget.style.borderColor = "var(--border-strong)";
            }}
          >
            ← Start over
          </button>
        </div>
      </div>

      {/* 3-column grid (single column on mobile) */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",
          gap: 1,
          background: "var(--border)",
          overflow: isMobile ? "auto" : "hidden",
        }}
      >
        {/* Left panel: resume */}
        <motion.div
          initial={{ opacity: 0, x: isMobile ? 0 : -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, ease: "easeOut", delay: 0.1 }}
          style={{
            background: "var(--bg)",
            padding: isMobile ? 0 : 24,
            height: isMobile ? "auto" : "calc(100vh - 56px)",
            maxHeight: isMobile ? "50vh" : undefined,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <PanelHeader label="Your Resume" sticky={isMobile} />
          <div style={{ flex: 1, padding: isMobile ? "0 24px 24px" : 0 }}>
            <p
              style={{
                fontFamily: "var(--font-inter), sans-serif",
                fontWeight: 600,
                fontSize: 16,
                color: "var(--text)",
                margin: "0 0 2px",
              }}
            >
              {resume.name}
            </p>
            {resume.email && (
              <p
                style={{
                  fontFamily: "var(--font-jetbrains-mono), monospace",
                  fontSize: 12,
                  color: "var(--muted)",
                  margin: "0 0 16px",
                }}
              >
                {resume.email}
              </p>
            )}
            {resume.summary && (
              <p
                style={{
                  fontFamily: "var(--font-inter), sans-serif",
                  fontSize: 13,
                  color: "var(--text-dim)",
                  lineHeight: 1.6,
                  margin: "0 0 24px",
                }}
              >
                {resume.summary}
              </p>
            )}
            {resume.experience.map((exp, i) => (
              <div key={i} style={{ marginBottom: 20 }}>
                <p
                  style={{
                    fontFamily: "var(--font-inter), sans-serif",
                    fontWeight: 600,
                    fontSize: 13,
                    color: "var(--text)",
                    margin: "0 0 1px",
                  }}
                >
                  {exp.role}
                </p>
                <p
                  style={{
                    fontFamily: "var(--font-jetbrains-mono), monospace",
                    fontSize: 11,
                    color: "var(--muted)",
                    margin: "0 0 8px",
                    letterSpacing: "0.04em",
                  }}
                >
                  {exp.company} · {exp.startDate} – {exp.endDate}
                </p>
                <ul style={{ margin: 0, paddingLeft: 16 }}>
                  {exp.bullets.map((b, j) => (
                    <li
                      key={j}
                      style={{
                        fontFamily: "var(--font-inter), sans-serif",
                        fontSize: 12,
                        color: "var(--text-dim)",
                        lineHeight: 1.55,
                        marginBottom: 4,
                      }}
                    >
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {resume.skills.length > 0 && (
              <div>
                <p
                  style={{
                    fontFamily: "var(--font-jetbrains-mono), monospace",
                    fontSize: 11,
                    color: "var(--muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    margin: "0 0 8px",
                  }}
                >
                  Skills
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {resume.skills.map((s, i) => (
                    <span
                      key={i}
                      style={{
                        fontFamily: "var(--font-jetbrains-mono), monospace",
                        fontSize: 11,
                        color: "var(--text-dim)",
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: 4,
                        padding: "2px 7px",
                      }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Center panel: JD */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut", delay: 0.2 }}
          style={{
            background: "var(--bg)",
            padding: isMobile ? 0 : 24,
            height: isMobile ? "auto" : "calc(100vh - 56px)",
            maxHeight: isMobile ? "50vh" : undefined,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <PanelHeader label="Job Description" sticky={isMobile} />
          <p
            style={{
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: 13,
              color: "var(--text-dim)",
              lineHeight: 1.7,
              margin: 0,
              whiteSpace: "pre-wrap",
              padding: isMobile ? "16px 24px 24px" : 0,
            }}
          >
            {jd}
          </p>
        </motion.div>

        {/* Right panel: analysis stream */}
        <motion.div
          initial={{ opacity: 0, x: isMobile ? 0 : 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.35 }}
          style={{
            background: "var(--bg)",
            height: isMobile ? "auto" : "calc(100vh - 56px)",
            maxHeight: isMobile ? "none" : undefined,
            overflow: isMobile ? "visible" : "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ padding: "24px 24px 0", flexShrink: 0 }}>
            <PanelHeader label="Analysis" showDot={matchScore === null} sticky={isMobile} />
          </div>
          <AnalysisStream
            resume={resume}
            jd={jd}
            onScoreReady={handleScoreReady}
            onAtsScoreReady={handleAtsScoreReady}
            onGenerateResume={(a) => onEditResume(a)}
            onCoverLetter={onCoverLetter}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
