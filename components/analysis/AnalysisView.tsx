"use client";

import { motion } from "framer-motion";
import type { ParsedResume } from "@/types";

interface AnalysisViewProps {
  resume: ParsedResume;
  jd: string;
  onReset: () => void;
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

function PanelHeader({ label, showDot }: { label: string; showDot?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        paddingBottom: 16,
        borderBottom: "1px solid var(--border)",
        marginBottom: 20,
        flexShrink: 0,
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

export default function AnalysisView({ resume, jd, onReset }: AnalysisViewProps) {
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

        {/* Center: status */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
        </div>

        {/* Right: score + reset */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span
              style={{
                fontFamily: "var(--font-jetbrains-mono), monospace",
                fontSize: 22,
                fontWeight: 700,
                color: "var(--muted)",
                lineHeight: 1,
              }}
            >
              —
            </span>
            <span
              style={{
                fontFamily: "var(--font-jetbrains-mono), monospace",
                fontSize: 11,
                color: "var(--muted)",
                letterSpacing: "0.06em",
              }}
            >
              / 100
            </span>
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

      {/* 3-column grid — gap IS the divider via background on wrapper */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 1,
          background: "var(--border)",
          overflow: "hidden",
        }}
      >
        {/* Left panel: resume */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, ease: "easeOut", delay: 0.1 }}
          style={{
            background: "var(--bg)",
            padding: 24,
            height: "calc(100vh - 56px)",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <PanelHeader label="Your Resume" />
          <div style={{ flex: 1 }}>
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
            padding: 24,
            height: "calc(100vh - 56px)",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <PanelHeader label="Job Description" />
          <p
            style={{
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: 13,
              color: "var(--text-dim)",
              lineHeight: 1.7,
              margin: 0,
              whiteSpace: "pre-wrap",
            }}
          >
            {jd}
          </p>
        </motion.div>

        {/* Right panel: analysis */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.35 }}
          style={{
            background: "var(--bg)",
            padding: 24,
            height: "calc(100vh - 56px)",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <PanelHeader label="Analysis" showDot />
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
            }}
          >
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", gap: 4 }}>
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    animate={{ scaleY: [1, 2.2, 1] }}
                    transition={{
                      duration: 0.9,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: i * 0.15,
                    }}
                    style={{
                      display: "inline-block",
                      width: 3,
                      height: 14,
                      borderRadius: 2,
                      background: "var(--accent)",
                      transformOrigin: "center",
                    }}
                  />
                ))}
              </div>
              <span
                style={{
                  fontFamily: "var(--font-jetbrains-mono), monospace",
                  fontSize: 11,
                  color: "var(--muted)",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                Running analysis…
              </span>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
