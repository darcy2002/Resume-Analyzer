"use client";

import { useState, useCallback, useRef } from "react";
import Toast, { type ToastType } from "@/components/ui/Toast";
import { createElement } from "react";

interface ToastState {
  message: string;
  type: ToastType;
  visible: boolean;
}

export function useToast() {
  const [toast, setToast] = useState<ToastState>({ message: "", type: "info", visible: false });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ message, type, visible: true });
  }, []);

  const dismiss = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  const ToastComponent = createElement(Toast, {
    message: toast.message,
    type: toast.type,
    visible: toast.visible,
    onDismiss: dismiss,
  });

  return { showToast, ToastComponent };
}
