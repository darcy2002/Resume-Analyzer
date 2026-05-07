"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Lock, CheckCircle } from "lucide-react";
import type { ParsedResume } from "@/types";
import { useToast } from "@/lib/hooks/useToast";

interface IntakeViewProps {
  onAnalyze: (resume: ParsedResume, jd: string) => void;
}

type UploadState = "idle" | "dragging" | "uploading" | "done" | "error";

export default function IntakeView({ onAnalyze }: IntakeViewProps) {
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [parsedResume, setParsedResume] = useState<ParsedResume | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [jd, setJd] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast, ToastComponent } = useToast();

  const jdTrimmedLength = jd.trim().length;
  const canAnalyze = parsedResume !== null && jdTrimmedLength >= 50;
  const disabledHint = !parsedResume
    ? "Upload your resume to continue"
    : jdTrimmedLength < 50
    ? `Add more detail to the job description (min 50 characters) — ${jdTrimmedLength}/50`
    : null;
  const isDragging = uploadState === "dragging";
  const isUploading = uploadState === "uploading";
  const isDone = uploadState === "done";
  const isError = uploadState === "error";

  const uploadFile = useCallback(async (file: File) => {
    if (!file.type.includes("pdf")) {
      setUploadError("Please upload a PDF file.");
      setUploadState("error");
      return;
    }
    setUploadState("uploading");
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/parse-resume", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.status === 429) {
        showToast("Too many requests. Try again in an hour.", "error");
        setUploadState("idle");
        return;
      }
      if (!res.ok || data.error) {
        showToast("Couldn't read this PDF. Try another file.", "error");
        setUploadError(data.error || "Parse failed");
        setUploadState("error");
        return;
      }
      setParsedResume(data.resume);
      setUploadState("done");
    } catch (err) {
      showToast("Couldn't read this PDF. Try another file.", "error");
      setUploadError(err instanceof Error ? err.message : "Upload failed");
      setUploadState("error");
    }
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (uploadState !== "done") setUploadState("dragging");
    },
    [uploadState]
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
        if (uploadState === "dragging") setUploadState("idle");
      }
    },
    [uploadState]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (uploadState === "done") return;
      const file = e.dataTransfer.files[0];
      if (file) uploadFile(file);
      else setUploadState("idle");
    },
    [uploadState, uploadFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) uploadFile(file);
      e.target.value = "";
    },
    [uploadFile]
  );

  const handleSwap = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setParsedResume(null);
    setUploadState("idle");
    setUploadError(null);
    setJd("");
  }, []);

  const handleAnalyze = useCallback(() => {
    if (!parsedResume || !canAnalyze) return;
    onAnalyze(parsedResume, jd);
  }, [parsedResume, jd, canAnalyze, onAnalyze]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && canAnalyze) {
        e.preventDefault();
        handleAnalyze();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [canAnalyze, handleAnalyze]);

  const dropZoneBorder = isDragging || isDone
    ? "var(--accent)"
    : isError
    ? "var(--gap)"
    : "var(--border-strong)";

  return (
    <>
      <style>{`
        .jd-textarea::placeholder { color: var(--muted); opacity: 1; }
      `}</style>

      {ToastComponent}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, transition: { duration: 0.35, ease: "easeOut" } }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        style={{
          width: "100%",
          maxWidth: 640,
          margin: "0 auto",
          padding: "clamp(24px, 6vw, 48px) clamp(16px, 4vw, 24px)",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          boxSizing: "border-box",
          position: "relative",
        }}
      >
        {/* Logo + label */}
        <div style={{ marginBottom: 48 }}>
          <div
            style={{
              width: 28,
              height: 28,
              background: "var(--accent)",
              borderRadius: 4,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 8,
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
          <div>
            <span
              style={{
                fontFamily: "var(--font-jetbrains-mono), monospace",
                fontSize: 11,
                letterSpacing: "0.15em",
                color: "var(--muted)",
                textTransform: "uppercase",
              }}
            >
              Resume × JD
            </span>
          </div>
        </div>

        {/* Headline */}
        <div style={{ marginBottom: 16 }}>
          <h1
            style={{
              fontFamily: "var(--font-inter), sans-serif",
              fontWeight: 700,
              fontSize: "clamp(32px, 8vw, 44px)",
              letterSpacing: "-1.5px",
              lineHeight: 1.05,
              color: "var(--text)",
              margin: 0,
            }}
          >
            Find what&apos;s missing.
          </h1>
          <p
            style={{
              fontFamily: "var(--font-instrument-serif), serif",
              fontStyle: "italic",
              fontSize: 28,
              color: "var(--text-dim)",
              margin: "4px 0 0",
              lineHeight: 1.2,
            }}
          >
            before the recruiter does.
          </p>
        </div>

        {/* Subtitle */}
        <p
          style={{
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: 15,
            color: "var(--muted)",
            maxWidth: 480,
            lineHeight: 1.6,
            margin: "0 0 48px",
          }}
        >
          Drop your resume and a job description. Get a match score, keyword
          gaps, rewritten bullets, and a cover letter — in 30 seconds.
        </p>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          style={{ display: "none" }}
          onChange={handleFileInput}
        />

        {/* Step 1: Drop zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isDone && !isUploading && fileInputRef.current?.click()}
          role={isDone ? undefined : "button"}
          tabIndex={isDone ? undefined : 0}
          onKeyDown={(e) => {
            if (!isDone && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          style={{
            border: `1px ${isDone ? "solid" : "dashed"} ${dropZoneBorder}`,
            borderRadius: 8,
            padding: "48px 32px",
            textAlign: "center",
            cursor: isDone || isUploading ? "default" : "pointer",
            background: isDragging ? "rgba(0, 255, 136, 0.04)" : "transparent",
            transform: isDragging ? "scale(1.01)" : "scale(1)",
            transition: "all 200ms ease",
            position: "relative",
            marginBottom: 24,
            outline: "none",
          }}
        >
          {isDone && parsedResume ? (
            <div style={{ textAlign: "left" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 16,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontFamily: "var(--font-inter), sans-serif",
                      fontWeight: 600,
                      fontSize: 16,
                      color: "var(--text)",
                      margin: "0 0 2px",
                    }}
                  >
                    {parsedResume.name}
                  </p>
                  {parsedResume.email && (
                    <p
                      style={{
                        fontFamily: "var(--font-jetbrains-mono), monospace",
                        fontSize: 12,
                        color: "var(--muted)",
                        margin: "0 0 8px",
                      }}
                    >
                      {parsedResume.email}
                    </p>
                  )}
                  {parsedResume.summary && (
                    <p
                      style={{
                        fontFamily: "var(--font-inter), sans-serif",
                        fontSize: 13,
                        color: "var(--text-dim)",
                        margin: 0,
                        lineHeight: 1.5,
                      }}
                    >
                      {parsedResume.summary.length > 120
                        ? `${parsedResume.summary.slice(0, 120)}…`
                        : parsedResume.summary}
                    </p>
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexShrink: 0,
                  }}
                >
                  <CheckCircle size={16} color="var(--accent)" />
                  <button
                    onClick={handleSwap}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontFamily: "var(--font-jetbrains-mono), monospace",
                      fontSize: 11,
                      color: "var(--muted)",
                      padding: "2px 0",
                      textDecoration: "underline",
                      textUnderlineOffset: 2,
                    }}
                  >
                    swap file
                  </button>
                </div>
              </div>
            </div>
          ) : isUploading ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  border: "2px solid var(--border-strong)",
                  borderTopColor: "var(--accent)",
                  marginBottom: 16,
                }}
              />
              <p
                style={{
                  fontFamily: "var(--font-inter), sans-serif",
                  fontSize: 15,
                  fontWeight: 500,
                  color: "var(--text)",
                  margin: 0,
                }}
              >
                Parsing resume…
              </p>
            </div>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginBottom: 16,
                }}
              >
                <FileText size={32} color="var(--muted)" />
              </div>
              <p
                style={{
                  fontFamily: "var(--font-inter), sans-serif",
                  fontSize: 15,
                  fontWeight: 500,
                  color: isError ? "var(--gap)" : "var(--text)",
                  margin: "0 0 4px",
                }}
              >
                {isError
                  ? uploadError || "Upload failed. Try again."
                  : "Drop your resume PDF here"}
              </p>
              <p
                style={{
                  fontFamily: "var(--font-inter), sans-serif",
                  fontSize: 13,
                  color: "var(--muted)",
                  margin: 0,
                }}
              >
                {isError ? "Click to try again" : "or click to browse"}
              </p>
            </>
          )}
        </div>

        {/* Parsing status */}
        <AnimatePresence>
          {isUploading && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}
            >
              <motion.span
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }}
              />
              <span style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: 13, color: "var(--muted)" }}>
                Parsing resume…
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step 2: JD + button — slides in after resume parsed */}
        <AnimatePresence>
          {isDone && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <label
                style={{
                  display: "block",
                  fontFamily: "var(--font-jetbrains-mono), monospace",
                  fontSize: 11,
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  marginBottom: 8,
                }}
              >
                Paste the job description
              </label>

              <textarea
                className="jd-textarea"
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                placeholder="Paste the full JD here. The more detail, the better the analysis."
                style={{
                  width: "100%",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: 16,
                  minHeight: 200,
                  fontFamily: "var(--font-inter), sans-serif",
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: "var(--text)",
                  resize: "vertical",
                  outline: "none",
                  boxSizing: "border-box",
                  display: "block",
                  transition: "border-color 200ms ease, box-shadow 200ms ease",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "var(--accent)";
                  e.target.style.boxShadow = "0 0 0 3px var(--accent-dim)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "var(--border)";
                  e.target.style.boxShadow = "none";
                }}
              />

              <div
                style={{ textAlign: "right", marginTop: 4, marginBottom: 16 }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-jetbrains-mono), monospace",
                    fontSize: 11,
                    color: "var(--muted)",
                  }}
                >
                  {jd.length.toLocaleString()} chars
                </span>
              </div>

              {/* Analyze button */}
              <button
                onClick={handleAnalyze}
                disabled={!canAnalyze}
                style={{
                  width: "100%",
                  background: canAnalyze ? "var(--accent)" : "var(--surface)",
                  color: canAnalyze ? "#000" : "var(--muted)",
                  border: "none",
                  borderRadius: 8,
                  padding: "14px",
                  fontFamily: "var(--font-inter), sans-serif",
                  fontWeight: 600,
                  fontSize: 15,
                  cursor: canAnalyze ? "pointer" : "not-allowed",
                  transition: "box-shadow 200ms ease, background 200ms ease",
                  marginBottom: 12,
                }}
                onMouseEnter={(e) => {
                  if (canAnalyze)
                    e.currentTarget.style.boxShadow =
                      "0 4px 20px var(--accent-glow)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                Analyze resume
              </button>

              {disabledHint && (
                <p
                  style={{
                    fontFamily: "var(--font-inter), sans-serif",
                    fontSize: 12,
                    color: "var(--muted)",
                    textAlign: "center",
                    margin: "0 0 12px",
                  }}
                >
                  {disabledHint}
                </p>
              )}

              {/* Privacy note */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <Lock size={12} color="var(--muted)" />
                <span
                  style={{
                    fontFamily: "var(--font-inter), sans-serif",
                    fontSize: 12,
                    color: "var(--muted)",
                  }}
                >
                  We don&apos;t store your resume. Analysis runs in your browser
                  session.
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Keyboard shortcut hint — fixed bottom-right */}
        <motion.div
          animate={{ opacity: canAnalyze ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            pointerEvents: "none",
          }}
        >
          <span className="kbd">⌘ + Enter to analyze</span>
        </motion.div>
      </motion.div>
    </>
  );
}
