"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { CheckCircle, AlertCircle, ChevronDown } from "lucide-react";
import { tryParsePartial } from "@/lib/partial-json";
import type { ParsedResume, Analysis } from "@/types";

interface AnalysisStreamProps {
  resume: ParsedResume;
  jd: string;
  onScoreReady: (score: number) => void;
  onAtsScoreReady: (score: number) => void;
  onGenerateResume: (analysis: Analysis) => void;
  onCoverLetter: () => void;
}

function atsColor(score: number): string {
  if (score >= 80) return "var(--match)";
  if (score >= 60) return "var(--suggest)";
  return "var(--gap)";
}

const SEVERITY_COLORS: Record<"high" | "medium" | "low", string> = {
  high: "var(--gap)",
  medium: "var(--suggest)",
  low: "var(--muted)",
};

const IMPACT_COLORS: Record<"high" | "medium" | "low", string> = {
  high: "var(--gap)",
  medium: "var(--suggest)",
  low: "var(--muted)",
};

function Skeleton({ width = "100%" }: { width?: string }) {
  return (
    <motion.div
      animate={{ opacity: [0.4, 0.8, 0.4] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      style={{
        height: 12,
        background: "var(--surface)",
        borderRadius: 4,
        width,
        marginBottom: 8,
      }}
    />
  );
}

function SectionHeader({ label, color }: { label: string; color: string }) {
  return (
    <p
      style={{
        fontFamily: "var(--font-jetbrains-mono), monospace",
        fontSize: 11,
        color,
        textTransform: "uppercase",
        letterSpacing: "0.12em",
        margin: "0 0 12px",
      }}
    >
      {label}
    </p>
  );
}

export default function AnalysisStream({
  resume,
  jd,
  onScoreReady,
  onAtsScoreReady,
  onGenerateResume,
  onCoverLetter,
}: AnalysisStreamProps) {
  const [status, setStatus] = useState<"loading" | "streaming" | "done" | "error">("loading");
  const [partial, setPartial] = useState<Partial<Analysis> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [displayScore, setDisplayScore] = useState(0);

  const scoreAnimatedRef = useRef(false);
  const atsScoreReportedRef = useRef(false);
  const onScoreReadyRef = useRef(onScoreReady);
  onScoreReadyRef.current = onScoreReady;
  const onAtsScoreReadyRef = useRef(onAtsScoreReady);
  onAtsScoreReadyRef.current = onAtsScoreReady;
  const controllerRef = useRef<AbortController | null>(null);

  const runFetch = useCallback(async () => {
    if (controllerRef.current) controllerRef.current.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setStatus("loading");
    setError(null);
    setPartial(null);
    scoreAnimatedRef.current = false;
    atsScoreReportedRef.current = false;

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume, jd }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        if (res.status === 429) {
          setError("Too many requests. Try again in an hour.");
        } else if (res.status === 503) {
          setError("AI is busy. Retrying in a moment…");
        } else {
          setError(data.error ?? "Analysis failed. Click to retry.");
        }
        setStatus("error");
        return;
      }

      setStatus("streaming");

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = "";
      let jsonBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });
        const lines = sseBuffer.split("\n");
        sseBuffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;
          try {
            const event = JSON.parse(raw) as {
              chunk?: string;
              done?: boolean;
              data?: Analysis;
              error?: string;
            };
            if (event.error) {
              setError(event.error);
              setStatus("error");
              return;
            }
            if (event.done && event.data) {
              setPartial(event.data);
              setStatus("done");
              return;
            }
            if (event.chunk) {
              jsonBuffer += event.chunk;
              const p = tryParsePartial<Partial<Analysis>>(jsonBuffer);
              if (p) setPartial(p);
            }
          } catch {
            // skip malformed event line
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Connection failed");
      setStatus("error");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Animate score counter when score first arrives
  useEffect(() => {
    const score = partial?.matchScore;
    if (score === undefined || scoreAnimatedRef.current) return;
    scoreAnimatedRef.current = true;
    onScoreReadyRef.current(score);

    const target = score;
    const startTime = performance.now();
    const duration = 1200;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [partial?.matchScore]);

  // Report ATS score once it arrives
  useEffect(() => {
    const ats = partial?.atsScore;
    if (ats === undefined || atsScoreReportedRef.current) return;
    atsScoreReportedRef.current = true;
    onAtsScoreReadyRef.current(ats);
  }, [partial?.atsScore]);

  // SSE connection — runs once on mount
  useEffect(() => {
    runFetch();
    return () => controllerRef.current?.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "error") {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          padding: 24,
        }}
      >
        <AlertCircle size={24} color="var(--gap)" />
        <p
          style={{
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: 14,
            color: "var(--gap)",
            textAlign: "center",
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          {error ?? "Analysis failed. Please try again."}
        </p>
        <button
          onClick={runFetch}
          style={{
            background: "none",
            border: "1px solid var(--accent)",
            borderRadius: 6,
            padding: "7px 18px",
            fontFamily: "var(--font-jetbrains-mono), monospace",
            fontSize: 11,
            color: "var(--accent)",
            cursor: "pointer",
            letterSpacing: "0.06em",
          }}
        >
          Try again →
        </button>
      </div>
    );
  }

  const hasScore = partial?.matchScore !== undefined;
  const hasKeywords = partial?.matchedKeywords !== undefined;
  const hasAts = partial?.atsScore !== undefined;
  const hasMissing = (partial?.missingKeywords?.length ?? 0) > 0;
  const hasBullets = (partial?.bulletRewrites?.length ?? 0) > 0;
  const hasStrengths = (partial?.strengths?.length ?? 0) > 0;
  const hasConcerns = (partial?.concerns?.length ?? 0) > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 24px 24px" }}>

        {/* Match score */}
        <div style={{ marginBottom: 28 }}>
          {hasScore ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                <span
                  style={{
                    fontFamily: "var(--font-inter), sans-serif",
                    fontWeight: 700,
                    fontSize: 64,
                    letterSpacing: "-3px",
                    color: "var(--accent)",
                    lineHeight: 1,
                  }}
                >
                  {displayScore}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-jetbrains-mono), monospace",
                    fontSize: 16,
                    color: "var(--muted)",
                  }}
                >
                  / 100
                </span>
              </div>
              {partial?.oneLineVerdict && (
                <p
                  style={{
                    fontFamily: "var(--font-inter), sans-serif",
                    fontWeight: 500,
                    fontSize: 16,
                    color: "var(--text)",
                    margin: "0 0 12px",
                    lineHeight: 1.4,
                  }}
                >
                  {partial.oneLineVerdict}
                </p>
              )}
              <div
                style={{
                  width: "100%",
                  height: 4,
                  background: "var(--surface)",
                  borderRadius: 2,
                  overflow: "hidden",
                }}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${partial?.matchScore ?? 0}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  style={{ height: "100%", background: "var(--accent)", borderRadius: 2 }}
                />
              </div>
            </motion.div>
          ) : (
            <>
              <Skeleton width="40%" />
              <Skeleton width="70%" />
              <Skeleton width="100%" />
            </>
          )}
        </div>

        {/* Keyword breakdown */}
        <div style={{ marginBottom: 28 }}>
          {hasKeywords ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35 }}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 1,
                background: "var(--border)",
                borderRadius: 6,
                overflow: "hidden",
              }}
            >
              {[
                { label: "Matched", color: "var(--match)", count: partial?.matchedKeywords?.length ?? 0 },
                { label: "Missing", color: "var(--gap)", count: partial?.missingKeywords?.length ?? 0 },
                { label: "Suggested", color: "var(--suggest)", count: partial?.suggestedKeywords?.length ?? 0 },
              ].map(({ label, color, count }) => (
                <div
                  key={label}
                  style={{
                    background: "var(--surface)",
                    padding: "12px 16px",
                    borderTop: `2px solid ${color}`,
                  }}
                >
                  <p
                    style={{
                      fontFamily: "var(--font-jetbrains-mono), monospace",
                      fontSize: 24,
                      fontWeight: 700,
                      color,
                      margin: "0 0 2px",
                      lineHeight: 1,
                    }}
                  >
                    {count}
                  </p>
                  <p
                    style={{
                      fontFamily: "var(--font-jetbrains-mono), monospace",
                      fontSize: 11,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      margin: 0,
                    }}
                  >
                    {label}
                  </p>
                </div>
              ))}
            </motion.div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <Skeleton width="100%" />
              <Skeleton width="100%" />
              <Skeleton width="100%" />
            </div>
          )}
        </div>

        {/* ATS compatibility */}
        <div style={{ marginBottom: 28 }}>
          {hasAts ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35 }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-jetbrains-mono), monospace",
                    fontSize: 11,
                    color: atsColor(partial!.atsScore!),
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                  }}
                >
                  ATS Compatibility
                </span>
                <span style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
                  <span
                    style={{
                      fontFamily: "var(--font-jetbrains-mono), monospace",
                      fontWeight: 700,
                      fontSize: 20,
                      color: atsColor(partial!.atsScore!),
                      lineHeight: 1,
                    }}
                  >
                    {partial!.atsScore}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-jetbrains-mono), monospace",
                      fontSize: 11,
                      color: "var(--muted)",
                    }}
                  >
                    /100
                  </span>
                </span>
              </div>

              {(partial?.atsIssues?.length ?? 0) === 0 ? (
                <p
                  style={{
                    fontFamily: "var(--font-inter), sans-serif",
                    fontSize: 13,
                    color: "var(--match)",
                    margin: 0,
                  }}
                >
                  ✓ No ATS issues detected
                </p>
              ) : (
                (partial?.atsIssues ?? []).map((iss, i) => (
                  <div
                    key={i}
                    style={{
                      background: "var(--elevated)",
                      borderLeft: `2px solid ${SEVERITY_COLORS[iss.severity]}`,
                      padding: "12px 14px",
                      marginBottom: 8,
                      borderRadius: 4,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <p
                        style={{
                          fontFamily: "var(--font-inter), sans-serif",
                          fontSize: 13,
                          fontWeight: 500,
                          color: "var(--text)",
                          margin: 0,
                          lineHeight: 1.5,
                          flex: 1,
                        }}
                      >
                        {iss.issue}
                      </p>
                      <span
                        style={{
                          fontFamily: "var(--font-jetbrains-mono), monospace",
                          fontSize: 9,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          color: SEVERITY_COLORS[iss.severity],
                          border: `1px solid ${SEVERITY_COLORS[iss.severity]}`,
                          borderRadius: 3,
                          padding: "2px 6px",
                          flexShrink: 0,
                        }}
                      >
                        {iss.severity}
                      </span>
                    </div>

                    <p
                      style={{
                        fontFamily: "var(--font-jetbrains-mono), monospace",
                        fontSize: 9,
                        color: "var(--muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        margin: "8px 0 4px",
                      }}
                    >
                      Why this matters
                    </p>
                    <p
                      style={{
                        fontFamily: "var(--font-inter), sans-serif",
                        fontSize: 12,
                        color: "var(--text-dim)",
                        fontStyle: "italic",
                        margin: 0,
                        lineHeight: 1.55,
                      }}
                    >
                      {iss.why}
                    </p>

                    <p
                      style={{
                        fontFamily: "var(--font-jetbrains-mono), monospace",
                        fontSize: 9,
                        color: "var(--accent)",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        margin: "8px 0 4px",
                      }}
                    >
                      How to fix
                    </p>
                    <p
                      style={{
                        fontFamily: "var(--font-inter), sans-serif",
                        fontSize: 12,
                        color: "var(--text)",
                        background: "var(--accent-dim)",
                        borderLeft: "2px solid var(--accent)",
                        padding: "8px 10px",
                        margin: 0,
                        lineHeight: 1.6,
                        borderRadius: 3,
                      }}
                    >
                      {iss.fix}
                    </p>
                  </div>
                ))
              )}
            </motion.div>
          ) : (
            <>
              <SectionHeader label="ATS Compatibility" color="var(--muted)" />
              <Skeleton width="100%" />
              <Skeleton width="90%" />
            </>
          )}
        </div>

        {/* Missing keywords */}
        <div style={{ marginBottom: 28 }}>
          <SectionHeader label="Must Add" color="var(--gap)" />
          {hasMissing ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35 }}
              style={{ display: "flex", flexWrap: "wrap", gap: 6 }}
            >
              {(partial?.missingKeywords ?? []).map((kw) => (
                <span
                  key={kw}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--gap)";
                    window.dispatchEvent(new CustomEvent("keyword-hover", { detail: kw }));
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,77,77,0.3)";
                    window.dispatchEvent(new CustomEvent("keyword-hover", { detail: null }));
                  }}
                  style={{
                    fontFamily: "var(--font-jetbrains-mono), monospace",
                    fontSize: 12,
                    color: "var(--text)",
                    background: "var(--surface)",
                    border: "1px solid rgba(255,77,77,0.3)",
                    borderRadius: 4,
                    padding: "4px 10px",
                    cursor: "default",
                    transition: "border-color 150ms ease",
                  }}
                >
                  {kw}
                </span>
              ))}
            </motion.div>
          ) : (
            <>
              <Skeleton width="60%" />
              <Skeleton width="80%" />
            </>
          )}
        </div>

        {/* Bullet rewrites */}
        <div style={{ marginBottom: 28 }}>
          <SectionHeader label="Rewrite These Bullets" color="var(--suggest)" />
          {hasBullets ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35 }}
            >
              {(partial?.bulletRewrites ?? []).map((item, i) => (
                <div
                  key={i}
                  style={{
                    background: "var(--elevated)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    padding: 16,
                    marginBottom: 8,
                  }}
                >
                  <p
                    style={{
                      fontFamily: "var(--font-inter), sans-serif",
                      fontSize: 13,
                      color: "var(--muted)",
                      textDecoration: "line-through",
                      margin: "0 0 6px",
                      lineHeight: 1.5,
                    }}
                  >
                    {item.original}
                  </p>
                  <div style={{ marginBottom: 6 }}>
                    <ChevronDown size={14} color="var(--muted)" />
                  </div>
                  <p
                    style={{
                      fontFamily: "var(--font-inter), sans-serif",
                      fontSize: 13,
                      color: "var(--text)",
                      background: "var(--accent-dim)",
                      padding: "6px 10px",
                      borderRadius: 4,
                      margin: "0 0 8px",
                      lineHeight: 1.5,
                    }}
                  >
                    {item.rewritten}
                  </p>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <p
                      style={{
                        fontFamily: "var(--font-inter), sans-serif",
                        fontSize: 12,
                        color: "var(--text-dim)",
                        fontStyle: "italic",
                        margin: 0,
                        flex: 1,
                        lineHeight: 1.5,
                      }}
                    >
                      {item.reasoning}
                    </p>
                    <span
                      style={{
                        fontFamily: "var(--font-jetbrains-mono), monospace",
                        fontSize: 9,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        color: IMPACT_COLORS[item.impact],
                        border: `1px solid ${IMPACT_COLORS[item.impact]}`,
                        borderRadius: 3,
                        padding: "2px 6px",
                        flexShrink: 0,
                      }}
                    >
                      {item.impact}
                    </span>
                  </div>
                </div>
              ))}
            </motion.div>
          ) : (
            <>
              <Skeleton width="100%" />
              <Skeleton width="85%" />
              <Skeleton width="45%" />
            </>
          )}
        </div>

        {/* Strengths */}
        <div style={{ marginBottom: 28 }}>
          <SectionHeader label="Strengths" color="var(--match)" />
          {hasStrengths ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35 }}
              style={{ display: "flex", flexDirection: "column", gap: 8 }}
            >
              {(partial?.strengths ?? []).map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <CheckCircle
                    size={14}
                    color="var(--match)"
                    style={{ flexShrink: 0, marginTop: 2 }}
                  />
                  <span
                    style={{
                      fontFamily: "var(--font-inter), sans-serif",
                      fontSize: 13,
                      color: "var(--text)",
                      lineHeight: 1.5,
                    }}
                  >
                    {s}
                  </span>
                </div>
              ))}
            </motion.div>
          ) : (
            <>
              <Skeleton width="80%" />
              <Skeleton width="60%" />
            </>
          )}
        </div>

        {/* Concerns */}
        <div style={{ marginBottom: 8 }}>
          <SectionHeader label="Concerns" color="var(--gap)" />
          {hasConcerns ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35 }}
              style={{ display: "flex", flexDirection: "column", gap: 8 }}
            >
              {(partial?.concerns ?? []).map((c, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <AlertCircle
                    size={14}
                    color="var(--gap)"
                    style={{ flexShrink: 0, marginTop: 2 }}
                  />
                  <span
                    style={{
                      fontFamily: "var(--font-inter), sans-serif",
                      fontSize: 13,
                      color: "var(--text-dim)",
                      lineHeight: 1.5,
                    }}
                  >
                    {c}
                  </span>
                </div>
              ))}
            </motion.div>
          ) : (
            <>
              <Skeleton width="70%" />
              <Skeleton width="50%" />
            </>
          )}
        </div>
      </div>

      {/* Sticky action buttons */}
      <div
        style={{
          flexShrink: 0,
          borderTop: "1px solid var(--border)",
          padding: 16,
          background: "var(--bg)",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <button
          onClick={() => partial && onGenerateResume(partial as Analysis)}
          disabled={status !== "done"}
          style={{
            width: "100%",
            background: "var(--accent)",
            color: "#000",
            border: "none",
            borderRadius: 8,
            padding: "12px",
            fontFamily: "var(--font-inter), sans-serif",
            fontWeight: 600,
            fontSize: 14,
            cursor: status !== "done" ? "not-allowed" : "pointer",
            opacity: status !== "done" ? 0.5 : 1,
            pointerEvents: status !== "done" ? "none" : "auto",
            transition: "opacity 150ms ease",
          }}
          onMouseEnter={(e) => { if (status === "done") e.currentTarget.style.opacity = "0.88"; }}
          onMouseLeave={(e) => { if (status === "done") e.currentTarget.style.opacity = "1"; }}
        >
          Generate improved resume →
        </button>
        <button
          onClick={onCoverLetter}
          disabled={status !== "done"}
          style={{
            width: "100%",
            background: "none",
            border: "1px solid var(--accent)",
            color: "var(--accent)",
            borderRadius: 8,
            padding: "12px",
            fontFamily: "var(--font-inter), sans-serif",
            fontWeight: 600,
            fontSize: 14,
            cursor: status !== "done" ? "not-allowed" : "pointer",
            opacity: status !== "done" ? 0.5 : 1,
            pointerEvents: status !== "done" ? "none" : "auto",
            transition: "opacity 150ms ease",
          }}
          onMouseEnter={(e) => { if (status === "done") e.currentTarget.style.opacity = "0.75"; }}
          onMouseLeave={(e) => { if (status === "done") e.currentTarget.style.opacity = "1"; }}
        >
          Write cover letter →
        </button>
      </div>
    </div>
  );
}
