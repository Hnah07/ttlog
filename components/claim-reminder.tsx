"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BadgeCheck, X } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
const reminderSeenKey = "ttlog-claim-reminder-seen";

export function ClaimReminder() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function checkClaimStatus() {
      if (sessionStorage.getItem(reminderSeenKey) === "true") {
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      const { data: claimedPerson } = await supabase
        .from("personen")
        .select("id")
        .eq("claimed_by_user_id", user.id)
        .maybeSingle();

      if (isActive && !claimedPerson) {
        setIsOpen(true);
        sessionStorage.setItem(reminderSeenKey, "true");
      }
    }

    void checkClaimStatus();

    return () => {
      isActive = false;
    };
  }, []);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(10,17,39,0.55)] p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="claim-reminder-title"
        className="w-full max-w-md rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_28px_80px_rgba(10,17,39,0.24)]"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
            <BadgeCheck className="h-6 w-6" />
          </div>
          <button
            type="button"
            aria-label="Melding sluiten"
            onClick={() => setIsOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(10,17,39,0.08)] text-[var(--muted)] transition hover:bg-[var(--bg)] hover:text-[var(--ink)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
            Profiel instellen
          </p>
          <h2
            id="claim-reminder-title"
            className="mt-2 text-2xl font-black tracking-[-0.05em] text-[var(--ink)]"
          >
            Claim nu je naam
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            Koppel je account aan je speler om wedstrijden te kunnen loggen en
            je persoonlijke statistieken te bewaren.
          </p>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded-xl px-3 py-2 text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--bg)] hover:text-[var(--ink)]"
          >
            Later
          </button>
          <Link
            href="/profiel"
            onClick={() => setIsOpen(false)}
            className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white shadow-[0_12px_24px_rgba(4,51,255,0.2)] transition hover:brightness-95"
          >
            Naar profiel
          </Link>
        </div>
      </div>
    </div>
  );
}
