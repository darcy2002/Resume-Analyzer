"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Loader2 } from "lucide-react";
import { jsPDF } from "jspdf";
import type { CSSProperties } from "react";
import type { ParsedResume, Analysis } from "@/types";

interface Props {
  resume: ParsedResume;
  analysis: Analysis;
  onBack: (acceptedResume: ParsedResume) => void;
  onDone: (acceptedResume: ParsedResume) => void;
}

type ChangeState = "pending" | "accepted" | "rejected";

const ACCEPT_BTN: CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  fontFamily: "var(--font-jetbrains-mono), monospace",
  fontSize: 11,
  color: "var(--match)",
  padding: 0,
  letterSpacing: "0.04em",
};

const REJECT_BTN: CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  fontFamily: "var(--font-jetbrains-mono), monospace",
  fontSize: 11,
  color: "var(--muted)",
  padding: 0,
  letterSpacing: "0.04em",
};

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

function SkelLine({ width = "100%" }: { width?: string }) {
  return (
    <motion.div
      animate={{ opacity: [0.3, 0.7, 0.3] }}
      transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
      style={{
        height: 14,
        background: "var(--surface)",
        borderRadius: 4,
        width,
        marginBottom: 8,
      }}
    />
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p
      style={{
        fontFamily: "var(--font-jetbrains-mono), monospace",
        fontSize: 11,
        color: "var(--muted)",
        textTransform: "uppercase",
        letterSpacing: "0.12em",
        margin: "32px 0 16px",
      }}
    >
      {label}
    </p>
  );
}

export default function ResumeEditor({ resume, analysis, onBack, onDone }: Props) {
  const [improved, setImproved] = useState<ParsedResume | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [changeStates, setChangeStates] = useState<Map<string, ChangeState>>(new Map());
  const [hasExported, setHasExported] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState<"left" | "right">("right");

  useLayoutEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Build rewrite lookup from analysis
  const bulletRewriteMap = new Map<string, string>();
  for (const rw of analysis.bulletRewrites) {
    bulletRewriteMap.set(rw.original, rw.rewritten);
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/regenerate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resume, analysis }),
        });
        const data = await res.json() as { resume?: ParsedResume; error?: string };
        if (cancelled) return;
        if (!res.ok || data.error) {
          setLoadError(data.error ?? "Failed to regenerate resume");
          setLoading(false);
          return;
        }
        const imp = data.resume!;
        setImproved(imp);

        const states = new Map<string, ChangeState>();
        for (const rw of analysis.bulletRewrites) {
          states.set(rw.original, "pending");
        }
        if (imp.summary && resume.summary && imp.summary !== resume.summary) {
          states.set("__summary__", "pending");
        }
        setChangeStates(states);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : "Network error");
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const accept = useCallback((key: string) => {
    setChangeStates((prev) => new Map(prev).set(key, "accepted"));
  }, []);

  const reject = useCallback((key: string) => {
    setChangeStates((prev) => new Map(prev).set(key, "rejected"));
  }, []);

  const acceptAll = useCallback(() => {
    setChangeStates((prev) => {
      const next = new Map(prev);
      for (const k of next.keys()) next.set(k, "accepted");
      return next;
    });
  }, []);

  function buildAcceptedResume(): ParsedResume {
    if (!improved) return resume;

    const summaryState = changeStates.get("__summary__");
    const summary =
      summaryState === "accepted" && improved.summary
        ? improved.summary
        : resume.summary;

    const experience = resume.experience.map((exp) => ({
      ...exp,
      bullets: exp.bullets.map((bullet) => {
        const rewritten = bulletRewriteMap.get(bullet);
        if (!rewritten) return bullet;
        return changeStates.get(bullet) === "accepted" ? rewritten : bullet;
      }),
    }));

    return { ...resume, summary, experience };
  }

  function exportPDF() {
    const r = buildAcceptedResume();
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const lm = 20;
    const pw = 210;
    const cw = pw - lm * 2;
    let y = lm;

    const lh = (size: number) => size * 0.352778 * 1.4;

    function guard(needed: number) {
      if (y + needed > 277) { doc.addPage(); y = lm; }
    }

    function txt(text: string, size: number, bold = false) {
      doc.setFontSize(size);
      doc.setFont("helvetica", bold ? "bold" : "normal");
      const lines = doc.splitTextToSize(text, cw) as string[];
      guard(lines.length * lh(size));
      doc.text(lines, lm, y);
      y += lines.length * lh(size) + 1;
    }

    function bullet(text: string) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(`\u2022 ${text}`, cw - 5) as string[];
      guard(lines.length * lh(10));
      doc.text(lines, lm + 5, y);
      y += lines.length * lh(10) + 1;
    }

    function hr() {
      doc.setDrawColor(180, 180, 180);
      doc.line(lm, y, pw - lm, y);
      y += 4;
    }

    function section(title: string) {
      y += 4;
      txt(title, 12, true);
      hr();
    }

    txt(r.name, 18, true);
    const contact = [r.email, r.phone, r.location].filter(Boolean);
    if (contact.length) txt(contact.join(" | "), 10);
    hr();

    if (r.summary) {
      section("SUMMARY");
      txt(r.summary, 10);
    }

    if (r.experience.length > 0) {
      section("EXPERIENCE");
      for (const exp of r.experience) {
        y += 2;
        txt(`${exp.role} \u2014 ${exp.company}`, 10, true);
        txt(`${exp.startDate} \u2013 ${exp.endDate}`, 10);
        for (const b of exp.bullets) bullet(b);
      }
    }

    if (r.education.length > 0) {
      section("EDUCATION");
      for (const edu of r.education) {
        txt(`${edu.degree} \u2014 ${edu.institution} (${edu.year})`, 10, true);
      }
    }

    if (r.skills.length > 0) {
      section("SKILLS");
      txt(r.skills.join(", "), 10);
    }

    doc.save("resume_improved.pdf");
    setHasExported(true);
    setExporting(false);
  }

  function handleExportPDF() {
    setExporting(true);
    // yield to browser paint, then generate
    setTimeout(exportPDF, 50);
  }

  const pendingCount = [...changeStates.values()].filter((s) => s === "pending").length;

  // ─── Skeleton loading ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        style={{ width: "100%", height: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)" }}
      >
        <div style={topBarStyle}>
          <button onClick={() => onBack(buildAcceptedResume())} style={backBtnStyle}>
            <ChevronLeft size={16} />
            Back to analysis
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <PulsingDot />
            <span style={{ fontFamily: "var(--font-jetbrains-mono), monospace", fontSize: 11, letterSpacing: "0.15em", color: "var(--muted)", textTransform: "uppercase" }}>
              Generating...
            </span>
          </div>
          <div style={{ width: 160 }} />
        </div>
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "var(--border)", overflow: "hidden" }}>
          {[0, 1].map((col) => (
            <div key={col} style={colStyle}>
              <SkelLine width="30%" />
              <div style={{ marginBottom: 12 }} />
              <SkelLine width="80%" />
              <SkelLine width="65%" />
              <SkelLine width="90%" />
              <SkelLine width="55%" />
              <div style={{ marginBottom: 20 }} />
              <SkelLine width="40%" />
              <SkelLine width="95%" />
              <SkelLine width="72%" />
              <SkelLine width="85%" />
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  // ─── Error ───────────────────────────────────────────────────────────────────
  if (loadError) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ width: "100%", height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, background: "var(--bg)" }}
      >
        <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: 15, color: "var(--gap)", margin: 0 }}>
          {loadError}
        </p>
        <button onClick={() => onBack(buildAcceptedResume())} style={{ background: "none", border: "1px solid var(--border-strong)", borderRadius: 6, padding: "8px 20px", fontFamily: "var(--font-jetbrains-mono), monospace", fontSize: 11, color: "var(--muted)", cursor: "pointer" }}>
          ← Back to analysis
        </button>
      </motion.div>
    );
  }

  // ─── Column renderer ─────────────────────────────────────────────────────────
  function renderColumn(side: "left" | "right") {
    const summaryState = changeStates.get("__summary__");

    return (
      <div style={colStyle}>
        {/* Column header */}
        <p style={{ fontFamily: "var(--font-jetbrains-mono), monospace", fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 20px" }}>
          {side === "left" ? "Original" : "Suggested"}
        </p>

        {/* Name & contact */}
        <p style={{ fontFamily: "var(--font-inter), sans-serif", fontWeight: 600, fontSize: 16, color: "var(--text)", margin: "0 0 4px" }}>
          {resume.name}
        </p>
        {(resume.email || resume.phone || resume.location) && (
          <p style={{ fontFamily: "var(--font-jetbrains-mono), monospace", fontSize: 11, color: "var(--muted)", margin: "0 0 8px" }}>
            {[resume.email, resume.phone, resume.location].filter(Boolean).join(" · ")}
          </p>
        )}

        {/* Summary */}
        {(resume.summary || improved?.summary) && (
          <>
            <SectionLabel label="Summary" />
            {summaryState === undefined ? (
              <p style={unchangedTextStyle}>{resume.summary}</p>
            ) : side === "left" ? (
              <p style={{
                ...unchangedTextStyle,
                color: summaryState === "pending" ? "var(--muted)" : "var(--text-dim)",
                textDecoration: summaryState === "pending" ? "line-through" : "none",
              }}>
                {summaryState === "accepted" ? (improved?.summary ?? resume.summary) : resume.summary}
              </p>
            ) : summaryState === "pending" ? (
              <div style={changedWrapStyle}>
                <p style={changedTextStyle}>{improved?.summary}</p>
                <div style={{ display: "flex", gap: 12 }}>
                  <button onClick={() => accept("__summary__")} style={ACCEPT_BTN}>✓ Accept</button>
                  <button onClick={() => reject("__summary__")} style={REJECT_BTN}>✗ Reject</button>
                </div>
              </div>
            ) : (
              <p style={unchangedTextStyle}>
                {summaryState === "accepted" ? improved?.summary : resume.summary}
              </p>
            )}
          </>
        )}

        {/* Experience */}
        {resume.experience.length > 0 && (
          <>
            <SectionLabel label="Experience" />
            {resume.experience.map((exp, ei) => (
              <div key={ei} style={{ marginBottom: 24 }}>
                <p style={{ fontFamily: "var(--font-inter), sans-serif", fontWeight: 600, fontSize: 14, color: "var(--text)", margin: "0 0 2px" }}>
                  {exp.role}
                </p>
                <p style={{ fontFamily: "var(--font-jetbrains-mono), monospace", fontSize: 11, color: "var(--muted)", margin: "0 0 10px", letterSpacing: "0.04em" }}>
                  {exp.company} · {exp.startDate} – {exp.endDate}
                </p>
                {exp.bullets.map((bullet, bi) => {
                  const rewritten = bulletRewriteMap.get(bullet);
                  if (!rewritten) {
                    return <p key={bi} style={{ ...unchangedTextStyle, paddingLeft: 12 }}>• {bullet}</p>;
                  }
                  const state = changeStates.get(bullet) ?? "pending";

                  if (side === "left") {
                    if (state === "pending") {
                      return (
                        <p key={bi} style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: 14, color: "var(--muted)", lineHeight: 1.7, margin: "0 0 6px", paddingLeft: 12, textDecoration: "line-through" }}>
                          • {bullet}
                        </p>
                      );
                    }
                    return (
                      <p key={bi} style={{ ...unchangedTextStyle, paddingLeft: 12 }}>
                        • {state === "accepted" ? rewritten : bullet}
                      </p>
                    );
                  }

                  // Right column
                  if (state === "pending") {
                    return (
                      <div key={bi} style={changedWrapStyle}>
                        <p style={changedTextStyle}>• {rewritten}</p>
                        <div style={{ display: "flex", gap: 12 }}>
                          <button onClick={() => accept(bullet)} style={ACCEPT_BTN}>✓ Accept</button>
                          <button onClick={() => reject(bullet)} style={REJECT_BTN}>✗ Reject</button>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <p key={bi} style={{ ...unchangedTextStyle, paddingLeft: 12 }}>
                      • {state === "accepted" ? rewritten : bullet}
                    </p>
                  );
                })}
              </div>
            ))}
          </>
        )}

        {/* Education */}
        {resume.education.length > 0 && (
          <>
            <SectionLabel label="Education" />
            {resume.education.map((edu, i) => (
              <p key={i} style={unchangedTextStyle}>
                {edu.degree} — {edu.institution} ({edu.year})
              </p>
            ))}
          </>
        )}

        {/* Skills */}
        {resume.skills.length > 0 && (
          <>
            <SectionLabel label="Skills" />
            <p style={unchangedTextStyle}>
              {side === "left"
                ? resume.skills.join(", ")
                : (improved?.skills ?? resume.skills).join(", ")}
            </p>
          </>
        )}
      </div>
    );
  }

  // ─── Main render ─────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      style={{ width: "100%", height: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)" }}
    >
      {/* Top bar */}
      <div style={topBarStyle}>
        <button onClick={() => onBack(buildAcceptedResume())} style={backBtnStyle}>
          <ChevronLeft size={16} />
          Back to analysis
        </button>

        <span style={{ fontFamily: "var(--font-jetbrains-mono), monospace", fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.12em" }}>
          Improved Resume
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {pendingCount > 0 && (
            <button
              onClick={acceptAll}
              style={{ background: "none", border: "1px solid var(--border-strong)", borderRadius: 6, padding: "6px 14px", fontFamily: "var(--font-inter), sans-serif", fontSize: 13, color: "var(--text)", cursor: "pointer" }}
            >
              Accept all ({pendingCount})
            </button>
          )}
          {hasExported ? (
            <button
              onClick={() => onDone(buildAcceptedResume())}
              style={{ background: "var(--accent)", color: "#000", border: "none", borderRadius: 6, padding: "6px 16px", fontFamily: "var(--font-inter), sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
            >
              Done → Write cover letter
            </button>
          ) : (
            <button
              onClick={handleExportPDF}
              disabled={exporting}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--accent)", color: "#000", border: "none", borderRadius: 6, padding: "6px 16px", fontFamily: "var(--font-inter), sans-serif", fontWeight: 600, fontSize: 13, cursor: exporting ? "not-allowed" : "pointer", opacity: exporting ? 0.75 : 1 }}
            >
              {exporting && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
              Export PDF →
            </button>
          )}
        </div>
      </div>

      {/* Two-column diff (tabs on mobile) */}
      {isMobile ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Tab switcher */}
          <div style={{ display: "flex", borderBottom: "1px solid var(--border)", background: "var(--bg)", flexShrink: 0 }}>
            {(["left", "right"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  background: "none",
                  border: "none",
                  borderBottom: activeTab === tab ? "2px solid var(--accent)" : "2px solid transparent",
                  padding: "10px 0",
                  fontFamily: "var(--font-jetbrains-mono), monospace",
                  fontSize: 11,
                  color: activeTab === tab ? "var(--accent)" : "var(--muted)",
                  cursor: "pointer",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  transition: "color 150ms ease, border-color 150ms ease",
                }}
              >
                {tab === "left" ? "Original" : "Suggested"}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, overflow: "auto" }}>
            {renderColumn(activeTab)}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "var(--border)", overflow: "hidden" }}>
          {renderColumn("left")}
          {renderColumn("right")}
        </div>
      )}
    </motion.div>
  );
}

// ─── Shared style constants ───────────────────────────────────────────────────
const topBarStyle: CSSProperties = {
  height: 56,
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 24px",
  background: "var(--bg)",
  borderBottom: "1px solid var(--border)",
  zIndex: 10,
};

const backBtnStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  background: "none",
  border: "none",
  cursor: "pointer",
  fontFamily: "var(--font-jetbrains-mono), monospace",
  fontSize: 11,
  color: "var(--muted)",
  letterSpacing: "0.04em",
  padding: 0,
};

const colStyle: CSSProperties = {
  background: "var(--bg)",
  padding: 32,
  height: "calc(100vh - 56px)",
  overflowY: "auto",
};

const unchangedTextStyle: CSSProperties = {
  fontFamily: "var(--font-inter), sans-serif",
  fontSize: 14,
  color: "var(--text-dim)",
  lineHeight: 1.7,
  margin: "0 0 6px",
};

const changedWrapStyle: CSSProperties = {
  background: "var(--accent-dim)",
  borderLeft: "2px solid var(--accent)",
  padding: "10px 14px",
  marginBottom: 8,
};

const changedTextStyle: CSSProperties = {
  fontFamily: "var(--font-inter), sans-serif",
  fontSize: 14,
  color: "var(--text)",
  lineHeight: 1.7,
  margin: "0 0 8px",
};
