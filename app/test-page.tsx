"use client";

import { useState } from "react";

export default function TestPage() {
  const [open, setOpen] = useState(false);

  return (
    <main style={{ padding: 20, fontFamily: "sans-serif" }}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "Menu sluiten" : "Menu openen"}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 56,
          height: 56,
          borderRadius: 12,
          border: "1px solid #ddd",
          background: "white",
          fontSize: 24,
          cursor: "pointer",
        }}
      >
        ☰
      </button>

      {open ? (
        <div
          style={{
            marginTop: 16,
            width: 220,
            border: "1px solid #ddd",
            borderRadius: 16,
            padding: 16,
            background: "#fff",
          }}
        >
          <button
            type="button"
            style={{ display: "block", width: "100%", marginBottom: 8 }}
          >
            Dashboard
          </button>
          <button
            type="button"
            style={{ display: "block", width: "100%", marginBottom: 8 }}
          >
            Statistieken
          </button>
          <button type="button" style={{ display: "block", width: "100%" }}>
            Profiel
          </button>
        </div>
      ) : null}
    </main>
  );
}
