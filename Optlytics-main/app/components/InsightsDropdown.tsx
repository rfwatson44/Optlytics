"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";

interface InsightsDropdownProps {
  accountId: string;
}

export default function InsightsDropdown({ accountId }: InsightsDropdownProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close dropdown on click outside
  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
    } else {
      document.removeEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const [dropdownStyle, setDropdownStyle] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownStyle({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        className="px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 transition font-medium focus:outline-none"
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
      >
        Insights
        <svg className="inline ml-2 w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && typeof window !== "undefined" && createPortal(
        <div
          style={{
            position: "absolute",
            top: 200,
            left: 200,
            zIndex: 999999,
            background: "white",
            border: "4px solid red",
            padding: 20,
            pointerEvents: "auto"
          }}
        >
          <a
            href={`/video-analytics/${accountId}`}
            style={{ fontSize: 24, color: "blue" }}
          >
            TEST VIDEO ANALYTICS
          </a>
        </div>,
        document.body
      )}
    </>
  );
}
