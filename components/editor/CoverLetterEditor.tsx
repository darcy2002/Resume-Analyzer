"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, RefreshCw, Loader2 } from "lucide-react";
import { jsPDF } from "jspdf";
import type { CSSProperties } from "react";
import type { ParsedResume, CoverLetter } from "@/types";

interface Props {
  resume: ParsedResume;
  jd: string;
  onBack: () => void;
}

function SkelBlock({ height = 20 }: { height?: number }) {
  return (
    <motion.div
      animate={{ opacity: [0.3, 0.7, 0.3] }}
      transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
      style={{ height, background: "var(--surface)", borderRadius: 4, marginBottom: 16 }}
    />
  );
}

export default function CoverLetterEditor({ resume, jd, onBack }: Props) {
  const hasFetched = useRef(false);
  const [coverLetter, setCoverLetter] = useState<CoverLetter | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [wordCount, setWordCount] = useState(0);

  const greetingRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef<HTMLDivElement>(null);
  const bodyRefs = useRef<(HTMLDivElement | null)[]>([]);

  function countWords() {
    const parts = [
      greetingRef.current?.textContent ?? "",
      ...bodyRefs.current.map((r) => r?.textContent ?? ""),
      closingRef.current?.textContent ?? "",
    ];
    return parts.join(" ").trim().split(/\s+/).filter(Boolean).length;
  }

  function updateWordCount() {
    setWordCount(countWords());
  }

  async function fetchCoverLetter() {
    try {
      const res = await fetch("/api/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume, jd }),
      });
      const data = await res.json() as { coverLetter?: CoverLetter; error?: string };
      if (!res.ok || data.error) {
        setLoadError(data.error ?? "Failed to generate cover letter");
        return false;
      }
      setCoverLetter(data.coverLetter!);
      return true;
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Network error");
      return false;
    }
  }

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchCoverLetter().then(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!coverLetter) return;
    requestAnimationFrame(() => setWordCount(countWords()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coverLetter]);

  const regenerate = useCallback(async () => {
    setRegenerating(true);
    await fetchCoverLetter();
    setRegenerating(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function exportPDF() {
    if (!coverLetter) return;
    const greeting = greetingRef.current?.textContent ?? coverLetter.greeting;
    const bodyParas = coverLetter.body.map((p, i) => bodyRefs.current[i]?.textContent ?? p);
    const closing = closingRef.current?.textContent ?? coverLetter.closing;

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const lm = 20;
    const pw = 210;
    const cw = pw - lm * 2;
    let y = lm;

    const lh = (size: number) => size * 0.352778 * 1.4;

    function txt(text: string, size: number) {
      doc.setFontSize(size);
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(text, cw) as string[];
      if (y + lines.length * lh(size) > 277) { doc.addPage(); y = lm; }
      doc.text(lines, lm, y);
      y += lines.length * lh(size) + 4;
    }

    txt(greeting, 12);
    y += 4;
    for (const para of bodyParas) txt(para, 10);
    y += 4;
    txt(closing, 10);

    doc.save("cover_letter.pdf");
    setExporting(false);
  }

  function handleExportPDF() {
    setExporting(true);
    setTimeout(exportPDF, 50);
  }

  // ─── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        style={{ width: "100%", height: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)" }}
      >
        <div style={topBarStyle}>
          <button onClick={onBack} style={backBtnStyle}>
            <ChevronLeft size={16} />
            Back
          </button>
          <span style={centerLabelStyle}>Cover Letter</span>
          <div style={{ width: 160 }} />
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "clamp(24px, 5vw, 48px) clamp(16px, 4vw, 24px)" }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <div style={{ background: "var(--panel)", border: "1px solid var(--border)", padding: "clamp(32px, 6vw, 56px) clamp(24px, 6vw, 64px)", minHeight: 400 }}>
              <SkelBlock height={20} />
              <div style={{ marginBottom: 24 }} />
              <SkelBlock height={18} />
              <SkelBlock height={18} />
              <SkelBlock height={18} />
              <div style={{ marginBottom: 16 }} />
              <SkelBlock height={18} />
              <SkelBlock height={18} />
              <SkelBlock height={14} />
              <div style={{ marginBottom: 16 }} />
              <SkelBlock height={18} />
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // ─── Error ────────────────────────────────────────────────────────────────────
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
        <button onClick={onBack} style={{ background: "none", border: "1px solid var(--border-strong)", borderRadius: 6, padding: "8px 20px", fontFamily: "var(--font-jetbrains-mono), monospace", fontSize: 11, color: "var(--muted)", cursor: "pointer" }}>
          ← Back
        </button>
      </motion.div>
    );
  }

  if (!coverLetter) return null;

  // ─── Main render ──────────────────────────────────────────────────────────────
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
        <button onClick={onBack} style={backBtnStyle}>
          <ChevronLeft size={16} />
          Back
        </button>

        <span style={centerLabelStyle}>Cover Letter</span>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={regenerate}
            disabled={regenerating}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "none",
              border: "1px solid var(--border-strong)",
              borderRadius: 6,
              padding: "6px 14px",
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: 13,
              color: "var(--muted)",
              cursor: regenerating ? "not-allowed" : "pointer",
              opacity: regenerating ? 0.5 : 1,
              transition: "opacity 150ms ease",
            }}
          >
            <RefreshCw size={14} style={{ animation: regenerating ? "spin 1s linear infinite" : "none" }} />
            Regenerate
          </button>
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--accent)", color: "#000", border: "none", borderRadius: 6, padding: "6px 16px", fontFamily: "var(--font-inter), sans-serif", fontWeight: 600, fontSize: 13, cursor: exporting ? "not-allowed" : "pointer", opacity: exporting ? 0.75 : 1 }}
          >
            {exporting && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
            Export PDF →
          </button>
        </div>
      </div>

      {/* Completion banner */}
      <div
        style={{
          padding: "8px 24px",
          background: "var(--accent-dim)",
          borderBottom: "1px solid rgba(0,255,136,0.2)",
          textAlign: "center",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-jetbrains-mono), monospace",
            fontSize: 12,
            color: "var(--accent)",
            letterSpacing: "0.06em",
          }}
        >
          {"You're ready. Good luck. 🎯"}
        </span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "clamp(24px, 5vw, 48px) clamp(16px, 4vw, 24px)" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div
            style={{
              background: "var(--panel)",
              border: "1px solid var(--border)",
              padding: "clamp(32px, 6vw, 56px) clamp(24px, 6vw, 64px)",
              minHeight: 600,
              position: "relative",
            }}
          >
            {/* Greeting */}
            <div
              key={`greeting-${coverLetter.greeting.slice(0, 30)}`}
              ref={greetingRef}
              contentEditable
              suppressContentEditableWarning
              onInput={updateWordCount}
              onFocus={(e) => { e.currentTarget.style.outline = "1px solid var(--border-strong)"; e.currentTarget.style.outlineOffset = "4px"; }}
              onBlur={(e) => { e.currentTarget.style.outline = "none"; }}
              style={editableStyle}
            >
              {coverLetter.greeting}
            </div>

            {/* Body paragraphs */}
            {coverLetter.body.map((para, i) => (
              <div
                key={`body-${i}-${para.slice(0, 20)}`}
                ref={(el) => { bodyRefs.current[i] = el; }}
                contentEditable
                suppressContentEditableWarning
                onInput={updateWordCount}
                onFocus={(e) => { e.currentTarget.style.outline = "1px solid var(--border-strong)"; e.currentTarget.style.outlineOffset = "4px"; }}
                onBlur={(e) => { e.currentTarget.style.outline = "none"; }}
                style={editableStyle}
              >
                {para}
              </div>
            ))}

            {/* Closing */}
            <div
              key={`closing-${coverLetter.closing.slice(0, 30)}`}
              ref={closingRef}
              contentEditable
              suppressContentEditableWarning
              onInput={updateWordCount}
              onFocus={(e) => { e.currentTarget.style.outline = "1px solid var(--border-strong)"; e.currentTarget.style.outlineOffset = "4px"; }}
              onBlur={(e) => { e.currentTarget.style.outline = "none"; }}
              style={{ ...editableStyle, marginBottom: 0, marginTop: 24 }}
            >
              {coverLetter.closing}
            </div>

            {/* Word count */}
            <p
              style={{
                position: "absolute",
                bottom: 16,
                right: 20,
                fontFamily: "var(--font-jetbrains-mono), monospace",
                fontSize: 11,
                color: "var(--muted)",
                margin: 0,
                letterSpacing: "0.06em",
                pointerEvents: "none",
              }}
            >
              {wordCount} words
            </p>
          </div>
        </div>
      </div>
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

const centerLabelStyle: CSSProperties = {
  fontFamily: "var(--font-jetbrains-mono), monospace",
  fontSize: 12,
  color: "var(--muted)",
  textTransform: "uppercase",
  letterSpacing: "0.12em",
};

const editableStyle: CSSProperties = {
  fontFamily: "var(--font-inter), sans-serif",
  fontSize: 15,
  color: "var(--text)",
  lineHeight: 1.8,
  marginBottom: 20,
  outline: "none",
  borderRadius: 2,
  cursor: "text",
};
