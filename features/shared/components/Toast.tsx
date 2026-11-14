"use client";

import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      position="top-right"
      closeButton
      toastOptions={{
        style: {
          background: "var(--color-surface-container-lowest)",
          border: "1px solid var(--color-outline-variant)",
          color: "var(--color-on-surface)",
          fontFamily: "var(--font-sans)",
          boxShadow: "var(--shadow-modal)",
        },
      }}
    />
  );
}
