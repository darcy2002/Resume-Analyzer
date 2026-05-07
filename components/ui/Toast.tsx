"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type ToastType = "error" | "success" | "info";

interface ToastProps {
  message: string;
  type: ToastType;
  visible: boolean;
  onDismiss: () => void;
}

const BORDER_COLORS: Record<ToastType, string> = {
  error: "var(--gap)",
  success: "var(--match)",
  info: "var(--border-strong)",
};

export default function Toast({ message, type, visible, onDismiss }: ToastProps) {
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [visible, onDismiss]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ x: 120, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 120, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          onClick={onDismiss}
          style={{
            position: "fixed",
            top: 16,
            right: 16,
            zIndex: 1000,
            minWidth: 280,
            background: "var(--surface)",
            border: `1px solid ${BORDER_COLORS[type]}`,
            borderRadius: 8,
            padding: "12px 16px",
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: 14,
            color: "var(--text)",
            cursor: "pointer",
            boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
          }}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
