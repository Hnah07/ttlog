"use client";

import { useState } from "react";

import { formatDateForDisplay, parseDisplayDate } from "@/lib/dates";

type DateInputProps = {
  name: string;
  defaultValue?: string;
  required?: boolean;
  className?: string;
};

export function DateInput({
  name,
  defaultValue = "",
  required = false,
  className = "",
}: DateInputProps) {
  const [displayValue, setDisplayValue] = useState(
    formatDateForDisplay(defaultValue),
  );
  const [isoValue, setIsoValue] = useState(defaultValue);

  return (
    <>
      <input type="hidden" name={name} value={isoValue} />
      <input
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={(event) => {
          const nextValue = event.target.value;
          setDisplayValue(nextValue);
          setIsoValue(parseDisplayDate(nextValue));
        }}
        onBlur={() => {
          const parsedValue = parseDisplayDate(displayValue);
          if (parsedValue) setDisplayValue(formatDateForDisplay(parsedValue));
        }}
        placeholder="dd-mm-jjjj"
        aria-label="Datum (dag-maand-jaar)"
        required={required}
        className={`flex h-11 w-full rounded-xl border border-[rgba(22,20,31,0.12)] bg-[rgba(255,255,255,0.7)] px-3 text-sm text-[var(--ink)] placeholder:text-[var(--muted)]/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(202,108,67,0.3)] ${className}`}
      />
    </>
  );
}
