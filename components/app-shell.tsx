"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, type ReactNode } from "react";
import { useEffect } from "react";
import { ArrowRight, Coffee, LogOut, Menu, Plus, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ClaimReminder } from "@/components/claim-reminder";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/nieuw-wedstrijd", label: "Nieuwe wedstrijd" },
  { href: "/wedstrijden", label: "Alle wedstrijden" },
  { href: "/statistieken", label: "Statistieken" },
  { href: "/profiel", label: "Profiel" },
] as const;

const supabase = createClient();

export function AppFooter({ className = "" }: { className?: string }) {
  return (
    <footer
      className={`flex flex-col items-center justify-between gap-3 border-t border-[rgba(10,17,39,0.08)] px-1 pt-5 text-xs text-[var(--muted)] sm:flex-row ${className}`}
    >
      <p>© Hannah Casier</p>
      <a
        href="https://buymeacoffee.com/hannahcasier"
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-xl px-3 py-2 font-medium text-[var(--ink)] transition hover:bg-[rgba(10,17,39,0.04)]"
      >
        <Coffee className="h-4 w-4 text-[var(--accent)]" />
          Vind je TTLog handig? Trakteer Hannah op een koffie
      </a>
    </footer>
  );
}

export function AppShell({
  children,
  current,
}: {
  children: ReactNode;
  current: "dashboard" | "new-match" | "matches" | "stats" | "profile";
}) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [profileStatus, setProfileStatus] = useState<{
    naam: string;
    club: string;
    klassement: string;
  } | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function loadProfileStatus() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (isActive) setIsProfileLoading(false);
        return;
      }

      const { data: person } = await supabase
        .from("personen")
        .select("naam, club_id, klassement_code")
        .eq("claimed_by_user_id", user.id)
        .maybeSingle();

      if (!isActive || !person) {
        if (isActive) setIsProfileLoading(false);
        return;
      }

      const { data: club } = await supabase
        .from("clubs")
        .select("naam")
        .eq("id", person.club_id)
        .maybeSingle();

      if (isActive) {
        setProfileStatus({
          naam: person.naam,
          club: club?.naam ?? "Onbekende club",
          klassement: person.klassement_code,
        });
        setIsProfileLoading(false);
      }
    }

    void loadProfileStatus();

    return () => {
      isActive = false;
    };
  }, []);

  const activeLabel =
    current === "dashboard"
      ? "Dashboard"
      : current === "new-match"
        ? "Nieuwe wedstrijd"
        : current === "matches"
          ? "Alle wedstrijden"
          : current === "stats"
            ? "Statistieken"
            : "Profiel";

  return (
    <>
      <main className="min-h-screen px-4 py-6 md:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-4 flex items-center justify-between lg:hidden">
            <div className="flex items-center gap-3">
              <Image
                src="/logo-ttlog.jpg?v=2"
                alt="TTLog logo"
                width={40}
                height={40}
                className="h-10 w-10 rounded-2xl object-cover shadow-[0_12px_24px_rgba(9,63,180,0.25)]"
              />
              <div>
                <div className="text-lg font-black tracking-[-0.06em] text-[var(--ink)]">
                  TTLog
                </div>
                <div className="text-[9px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                  Seizoen 2026
                </div>
              </div>
            </div>

            <button
              type="button"
              aria-expanded={isMobileOpen}
              aria-label={isMobileOpen ? "Menu sluiten" : "Menu openen"}
              onClick={() => setIsMobileOpen((value) => !value)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[rgba(10,17,39,0.08)] bg-[rgba(255,255,255,0.7)] text-[var(--ink)] shadow-[0_10px_30px_rgba(10,17,39,0.08)] md:hidden"
            >
              {isMobileOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>

          <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
            <aside
              className={`
              min-h-0 overflow-x-hidden rounded-[30px] border border-white/40 bg-[rgba(255,255,255,0.56)] p-5 pb-8 shadow-[0_24px_80px_rgba(10,17,39,0.14)] backdrop-blur-xl transition-all duration-300 ease-out
              ${
                isMobileOpen
                  ? "pointer-events-auto max-h-none translate-y-0 opacity-100"
                  : "pointer-events-none max-h-0 translate-y-2 opacity-0"
              }
              md:block md:max-h-none md:translate-y-0 md:opacity-100 md:pointer-events-auto
            `}
            >
              <div className="hidden items-center gap-3 lg:flex">
                <Image
                  src="/logo-ttlog.jpg?v=2"
                  alt="TTLog logo"
                  width={44}
                  height={44}
                  className="h-11 w-11 rounded-2xl object-cover shadow-[0_12px_24px_rgba(9,63,180,0.25)]"
                />
                <div>
                  <div className="text-xl font-black tracking-[-0.06em] text-[var(--ink)]">
                    TTLog
                  </div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[var(--muted)]">
                    Seizoen 2026
                  </div>
                </div>
              </div>

              <nav className="mt-8 space-y-2">
                {navItems.map(({ href, label }) => {
                  const isActive = label === activeLabel;
                  return (
                    <Link
                      key={label}
                      href={href}
                      onClick={() => setIsMobileOpen(false)}
                      className={`flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                        isActive
                          ? "bg-[var(--accent)] text-white shadow-[0_16px_32px_rgba(9,63,180,0.22)]"
                          : "text-[var(--muted)] hover:bg-[rgba(10,17,39,0.04)]"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="inline-block h-2 w-2 rounded-full bg-current opacity-85" />
                        {label}
                      </span>
                      {isActive ? <ArrowRight className="h-4 w-4" /> : null}
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-10 rounded-3xl border border-[rgba(9,63,180,0.08)] bg-[linear-gradient(180deg,#fffcfb,#fff1f1)] p-4 shadow-[0_12px_28px_rgba(9,63,180,0.06)]">
                {isProfileLoading ? (
                  <div
                    className="animate-pulse space-y-3"
                    aria-label="Profiel laden"
                  >
                    <div className="h-4 w-16 rounded bg-[rgba(10,17,39,0.08)]" />
                    <div className="h-6 w-36 rounded bg-[rgba(10,17,39,0.08)]" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between text-sm text-[var(--muted)]">
                      <span className="font-medium">Club</span>
                      <Badge variant="secondary">
                        {profileStatus?.klassement ?? "-"}
                      </Badge>
                    </div>
                    <div className="mt-3 text-lg font-black tracking-[-0.04em] text-[var(--ink)]">
                      {profileStatus?.club ?? "Nog niet geclaimd"}
                    </div>
                  </>
                )}
                {!isProfileLoading && !profileStatus && (
                  <div className="mt-1 text-xs text-[var(--muted)]">
                    Claim je naam via je profiel
                  </div>
                )}
              </div>

              <Link
                href="/login"
                onClick={() => setIsMobileOpen(false)}
                className="mt-10 flex h-11 w-full items-center justify-between rounded-xl px-4 py-2 text-sm font-medium text-[var(--ink)] transition hover:bg-[rgba(22,20,31,0.04)]"
              >
                <span className="flex items-center gap-2">
                  <LogOut className="h-4 w-4" />
                  Uitloggen
                </span>
              </Link>
            </aside>

            <div className="space-y-6">
              {children}

              <AppFooter className="lg:hidden" />
            </div>
          </div>

          <AppFooter className="mt-8 hidden lg:flex" />
        </div>
      </main>
      <ClaimReminder />
    </>
  );
}

export function AppHeader({
  title,
  subtitle,
  actionLabel,
  actionHref,
}: {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <header className="flex flex-col gap-4 rounded-[30px] border border-[rgba(10,17,39,0.08)] bg-[rgba(255,255,255,0.7)] p-5 shadow-[0_18px_55px_rgba(10,17,39,0.05)] backdrop-blur-sm md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
          {subtitle ?? "Overzicht"}
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-[-0.07em] text-[var(--ink)]">
          {title}
        </h1>
      </div>

      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white shadow-[0_18px_36px_rgba(9,63,180,0.25)] transition duration-200 hover:-translate-y-0.5 hover:bg-[color-mix(in_srgb,var(--accent)_85%,#000)]"
        >
          {actionHref === "/nieuw-wedstrijd" ? (
            <Plus className="h-4 w-4" />
          ) : null}
          {actionLabel}
        </Link>
      ) : null}
    </header>
  );
}
