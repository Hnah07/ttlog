"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowRight,
  CalendarDays,
  ListOrdered,
  LogOut,
  Menu,
  Plus,
  Trophy,
  X,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { formatDateForDisplay } from "@/lib/dates";
import { AppFooter } from "@/components/app-shell";

const supabase = createClient();

type DashboardSet = {
  id: string;
  label: string;
  score: string;
  set_nummer: number;
  eigen_score: number;
  tegenstander_score: number;
};

type DashboardMatch = {
  id: string;
  opponent: string;
  result: string;
  club: string;
  date: string;
  shortDate: string;
  rating: string;
  location: string;
  season: string;
  note: string;
  sets: DashboardSet[];
};

const navItems = [
  { label: "Dashboard", href: "/", active: true },
  { label: "Nieuwe wedstrijd", href: "/nieuw-wedstrijd", active: false },
  { label: "Alle wedstrijden", href: "/wedstrijden", active: false },
  { label: "Statistieken", href: "/statistieken", active: false },
  { label: "Profiel", href: "/profiel", active: false },
] as const;

function getNextGoal(matches: DashboardMatch[]) {
  const currentSeasonWins = matches.filter((match) =>
    match.result.startsWith("W"),
  ).length;

  if (currentSeasonWins === 0) {
    return {
      title: "Nog geen winst dit seizoen",
      text: "Maar daar zal je snel verandering in brengen!",
    };
  }

  const lostMatches = matches.filter((match) => match.result.startsWith("L"));
  if (lostMatches.length > 0) {
    const closestLoss = lostMatches.reduce((best, match) => {
      const currentDiff = Math.abs(
        Number.parseInt(match.result.split("-")[1] ?? "0", 10),
      );
      const bestDiff = Math.abs(
        Number.parseInt(best.result.split("-")[1] ?? "0", 10),
      );
      return currentDiff < bestDiff ? match : best;
    }, lostMatches[0]);

    return {
      title: "Dichtste wedstrijd verbeteren",
      text: `Je verloor laatst met maar ${closestLoss.result.split("-")[1]} set verschil, volgende keer beter!`,
    };
  }

  let streak = 0;
  for (const match of matches) {
    if (match.result.startsWith("W")) streak += 1;
    else break;
  }

  if (streak >= 2) {
    return {
      title: `Winstreek ${streak} op rij`,
      text: `Ga voor ${streak + 1}!`,
    };
  }

  const currentMonth = new Date().toISOString().slice(0, 7);
  const setsWonThisMonth = matches
    .filter((match) => match.date.startsWith(currentMonth))
    .flatMap((match) => match.sets)
    .filter((set) => set.eigen_score > set.tegenstander_score).length;

  return {
    title: "Sets gewonnen deze maand",
    text:
      setsWonThisMonth > 0
        ? `${setsWonThisMonth} set${setsWonThisMonth === 1 ? "" : "s"} gewonnen deze maand, kan je naar ${setsWonThisMonth + 3}?`
        : "Nog geen set gewonnen deze maand, je eerste kans komt eraan!",
  };
}

export default function Home() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [profileStatus, setProfileStatus] = useState<{
    club: string;
    klassement: string;
  } | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [recentMatches, setRecentMatches] = useState<DashboardMatch[]>([]);
  const [isMatchesLoading, setIsMatchesLoading] = useState(true);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const selectedMatch = selectedMatchId
    ? (recentMatches.find((match) => match.id === selectedMatchId) ?? null)
    : null;

  const openMatch = (matchId: string) => {
    setSelectedMatchId(matchId);
  };

  const stats = [
    {
      label: "Wedstrijden",
      value: String(recentMatches.length),
      detail: "Dit seizoen",
    },
    {
      label: "Gewonnen",
      value: String(
        recentMatches.filter((match) => match.result.startsWith("W")).length,
      ),
      detail: "Dit seizoen",
    },
    {
      label: "Win %",
      value: recentMatches.length
        ? `${Math.round((recentMatches.filter((match) => match.result.startsWith("W")).length / recentMatches.length) * 100)}%`
        : "0%",
      detail: "Dit seizoen",
    },
    {
      label: "Gem. tegenstander",
      value: recentMatches[0]?.rating ?? "-",
      detail: "Laatste wedstrijden",
    },
  ];

  const nextGoal = getNextGoal(recentMatches);
  const lastTenMatches = recentMatches.slice(0, 10);
  const lastTenWins = lastTenMatches.filter((match) =>
    match.result.startsWith("W"),
  ).length;
  const skillScore = lastTenMatches.length
    ? (lastTenWins / lastTenMatches.length) * 10
    : 0;
  const skillProgress = `${Math.round(skillScore * 10)}%`;
  const homeMatches = recentMatches.filter(
    (match) => match.location === "Thuis",
  );
  const awayMatches = recentMatches.filter((match) => match.location === "Uit");
  const recordLabel = (matches: DashboardMatch[]) =>
    `${matches.filter((match) => match.result.startsWith("W")).length}-${matches.filter((match) => match.result.startsWith("L")).length}`;

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
        .select("club_id, klassement_code")
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

  useEffect(() => {
    let isActive = true;

    async function loadDashboardMatches() {
      const { data: latestSeason } = await supabase
        .from("seizoenen")
        .select("id, naam")
        .order("start_datum", { ascending: false })
        .limit(1)
        .maybeSingle();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !latestSeason) {
        if (isActive) setIsMatchesLoading(false);
        return;
      }

      const { data: matches, error } = await supabase
        .from("wedstrijden")
        .select("*")
        .eq("user_id", user.id)
        .eq("seizoen_id", latestSeason.id)
        .order("datum", { ascending: false });

      if (error || !matches?.length) {
        if (isActive) {
          setRecentMatches([]);
          setIsMatchesLoading(false);
        }
        return;
      }

      const matchIds = matches.map((match) => match.id);
      const opponentIds = matches.map((match) => match.tegenstander_id);
      const [{ data: sets }, { data: opponents }] = await Promise.all([
        supabase.from("sets").select("*").in("wedstrijd_id", matchIds),
        supabase.from("personen").select("id, naam").in("id", opponentIds),
      ]);
      const opponentNames = new Map(
        (opponents ?? []).map((opponent) => [opponent.id, opponent.naam]),
      );
      const setsByMatch = new Map<string, DashboardSet[]>();

      for (const set of sets ?? []) {
        const dashboardSet = {
          ...set,
          label: `Set ${set.set_nummer}`,
          score: `${set.eigen_score}-${set.tegenstander_score}`,
        } as DashboardSet;
        setsByMatch.set(set.wedstrijd_id, [
          ...(setsByMatch.get(set.wedstrijd_id) ?? []),
          dashboardSet,
        ]);
      }

      const loadedMatches = matches.map((match) => {
        const matchSets = setsByMatch.get(match.id) ?? [];
        const ownSets = matchSets.filter(
          (set) => set.eigen_score > set.tegenstander_score,
        ).length;
        const opponentSets = matchSets.length - ownSets;
        return {
          id: match.id,
          opponent:
            opponentNames.get(match.tegenstander_id) ?? "Onbekende speler",
          result: `${match.gewonnen ? "W" : "L"} ${ownSets}-${opponentSets}`,
          club: match.club_naam_snapshot,
          date: match.datum,
          shortDate: formatDateForDisplay(match.datum),
          rating: match.klassement_snapshot ?? "-",
          location: match.locatie === "thuis" ? "Thuis" : "Uit",
          season: latestSeason.naam,
          note: match.notitie_tekst ?? "Geen notitie toegevoegd.",
          sets: matchSets,
        };
      });

      if (isActive) {
        setRecentMatches(loadedMatches);
        setIsMatchesLoading(false);
      }
    }

    void loadDashboardMatches();
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    const hasOpenModal = Boolean(selectedMatchId);
    const previousOverflow = document.body.style.overflow;

    if (hasOpenModal) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedMatchId]);

  return (
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
            id="mobile-menu-button"
            type="button"
            aria-expanded={isMobileOpen}
            aria-controls="mobile-sidebar"
            aria-label={isMobileOpen ? "Menu sluiten" : "Menu openen"}
            onClick={() => setIsMobileOpen((value) => !value)}
            style={{ touchAction: "manipulation" }}
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
            id="mobile-sidebar"
            className={`
              overflow-x-hidden rounded-[28px] border border-white/40 bg-[rgba(255,255,255,0.56)] p-5 pb-8 shadow-[0_24px_80px_rgba(10,17,39,0.14)] backdrop-blur-xl transition-all duration-300 ease-out
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
              {navItems.map(({ label, href, active }) => (
                <Link
                  key={label}
                  href={href}
                  onClick={() => setIsMobileOpen(false)}
                  className={`flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                    active
                      ? "bg-[var(--accent)] text-white shadow-[0_16px_32px_rgba(9,63,180,0.22)]"
                      : "text-[var(--muted)] hover:bg-[rgba(10,17,39,0.04)]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-current opacity-85" />
                    {label}
                  </span>
                  {active ? <ArrowRight className="h-4 w-4" /> : null}
                </Link>
              ))}
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
              className="mt-10 inline-flex h-11 w-full items-center justify-between rounded-xl px-4 py-2 text-sm font-medium text-[var(--ink)] transition hover:bg-[rgba(22,20,31,0.04)]"
            >
              <span className="flex items-center gap-2">
                <LogOut className="h-4 w-4" />
                Uitloggen
              </span>
            </Link>
          </aside>

          <div className="space-y-6">
            <header className="flex flex-col gap-4 rounded-[30px] border border-[rgba(10,17,39,0.08)] bg-[rgba(255,255,255,0.7)] p-5 shadow-[0_18px_55px_rgba(10,17,39,0.05)] backdrop-blur-sm md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                  Dashboard
                </p>
                <h1 className="mt-2 text-4xl font-black tracking-[-0.07em] text-[var(--ink)]">
                  Je wedstrijdoverzicht
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="outline"
                  className="gap-2 border border-[rgba(4,51,255,0.18)] bg-white/75 text-[var(--ink)] shadow-[0_10px_25px_rgba(10,17,39,0.05)] backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(10,17,39,0.08)]"
                >
                  <CalendarDays className="h-4 w-4" />
                  2026-2027
                </Button>
                <Link
                  href="/nieuw-wedstrijd"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white shadow-[0_18px_36px_rgba(9,63,180,0.25)] transition duration-200 hover:-translate-y-0.5 hover:bg-[color-mix(in_srgb,var(--accent)_85%,#000)]"
                >
                  <Plus className="h-4 w-4" />
                  Nieuwe wedstrijd
                </Link>
              </div>
            </header>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat) => (
                <Card
                  key={stat.label}
                  className="border border-white/40 bg-[rgba(255,255,255,0.7)] shadow-[0_18px_45px_rgba(10,17,39,0.05)] backdrop-blur-sm"
                >
                  <CardHeader className="pb-2">
                    <CardDescription>{stat.label}</CardDescription>
                    <CardTitle className="text-3xl font-bold">
                      {stat.value}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-[var(--muted)]">{stat.detail}</p>
                  </CardContent>
                </Card>
              ))}
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
              <Card className="border border-white/40 bg-[rgba(255,255,255,0.75)] shadow-[0_20px_50px_rgba(10,17,39,0.05)] backdrop-blur-sm">
                <CardHeader className="pb-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle>Recente wedstrijden</CardTitle>
                      <CardDescription>Je 4 laatste resultaten</CardDescription>
                    </div>

                    <Link
                      href="/wedstrijden"
                      className="inline-flex items-center gap-2 rounded-2xl border border-[rgba(9,63,180,0.12)] bg-[linear-gradient(180deg,#fffcfb,#fff1f1)] px-2.5 py-2 text-[var(--ink)] shadow-[0_12px_28px_rgba(9,63,180,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_32px_rgba(9,63,180,0.12)]"
                      aria-label="Bekijk alle wedstrijden"
                    >
                      <ListOrdered className="h-4 w-4" />
                      <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">
                        Alles
                      </span>
                    </Link>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {isMatchesLoading ? (
                      <div className="rounded-2xl border border-dashed border-[rgba(22,20,31,0.12)] bg-[rgba(246,247,251,0.8)] p-6 text-center text-sm text-[var(--muted)]">
                        Wedstrijden laden...
                      </div>
                    ) : recentMatches.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-[rgba(22,20,31,0.12)] bg-[rgba(246,247,251,0.8)] p-6 text-center text-sm text-[var(--muted)]">
                        Nog geen wedstrijden gelogd.
                      </div>
                    ) : (
                      recentMatches.slice(0, 4).map((match) => {
                        const isSelected = match.id === selectedMatchId;
                        const scoreSummary = match.sets
                          .map((set) => set.score)
                          .join("  ·  ");

                        return (
                          <button
                            key={match.id}
                            type="button"
                            onClick={() => openMatch(match.id)}
                            className={`block w-full rounded-2xl border p-4 text-left transition ${
                              isSelected
                                ? "border-[rgba(4,51,255,0.18)] bg-[rgba(4,51,255,0.05)] shadow-[0_10px_25px_rgba(4,51,255,0.08)]"
                                : "border-[rgba(22,20,31,0.08)] bg-[rgba(246,247,251,0.9)] hover:border-[rgba(22,20,31,0.12)] hover:bg-[rgba(250,251,255,0.98)]"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <div className="text-sm font-semibold text-[var(--ink)]">
                                    {match.opponent}
                                  </div>
                                  <span className="rounded-full border border-[rgba(22,20,31,0.08)] bg-white/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                                    {match.rating}
                                  </span>
                                </div>
                                <div className="mt-1 text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                                  {match.shortDate} · {match.club}
                                </div>
                              </div>

                              <Badge
                                className={
                                  match.result.startsWith("W")
                                    ? "bg-emerald-500 text-white hover:bg-emerald-600"
                                    : "bg-rose-500 text-white hover:bg-rose-600"
                                }
                              >
                                {match.result.startsWith("W") ? "W" : "L"}
                              </Badge>
                            </div>

                            <div className="mt-3 flex items-end justify-between gap-3">
                              <div className="text-sm text-[var(--muted)]">
                                Setstand
                              </div>
                              <div className="text-sm font-semibold text-[var(--ink)]">
                                {scoreSummary}
                              </div>
                            </div>

                            <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--ink)]/80">
                              {match.note}
                            </p>
                          </button>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>

              {selectedMatch && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(10,17,39,0.46)] p-3 backdrop-blur-sm sm:p-4 md:items-center">
                  <div className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-[28px] border border-white/60 bg-[rgba(255,255,255,0.92)] shadow-[0_28px_80px_rgba(10,17,39,0.22)]">
                    <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[rgba(10,17,39,0.06)] bg-[rgba(255,255,255,0.92)] px-5 pb-4 pt-5 backdrop-blur-sm">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                          Wedstrijd details
                        </div>
                        <h3 className="mt-2 text-2xl font-black tracking-[-0.06em] text-[var(--ink)]">
                          {selectedMatch.opponent}
                        </h3>
                      </div>

                      <button
                        type="button"
                        aria-label="Sluit wedstrijddetails"
                        onClick={() => setSelectedMatchId(null)}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[rgba(10,17,39,0.08)] bg-white text-[var(--ink)] transition hover:bg-[rgba(10,17,39,0.04)]"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="max-h-[calc(92vh-112px)] overflow-y-auto overscroll-contain px-5 pb-5 pt-4">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div className="text-sm text-[var(--muted)]">
                          Resultaat
                        </div>
                        <Badge
                          variant={
                            selectedMatch.result.startsWith("W")
                              ? "default"
                              : "secondary"
                          }
                        >
                          {selectedMatch.result}
                        </Badge>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl bg-[rgba(246,247,251,0.92)] p-3">
                          <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
                            Datum
                          </div>
                          <div className="mt-1 font-semibold text-[var(--ink)]">
                            {selectedMatch.date}
                          </div>
                        </div>

                        <div className="rounded-xl bg-[rgba(246,247,251,0.92)] p-3">
                          <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
                            Locatie
                          </div>
                          <div className="mt-1 font-semibold text-[var(--ink)]">
                            {selectedMatch.location}
                          </div>
                        </div>

                        <div className="rounded-xl bg-[rgba(246,247,251,0.92)] p-3">
                          <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
                            Club
                          </div>
                          <div className="mt-1 font-semibold text-[var(--ink)]">
                            {selectedMatch.club}
                          </div>
                        </div>

                        <div className="rounded-xl bg-[rgba(246,247,251,0.92)] p-3">
                          <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
                            Seizoen
                          </div>
                          <div className="mt-1 font-semibold text-[var(--ink)]">
                            {selectedMatch.season}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
                          Notitie
                        </div>
                        <p className="mt-2 text-sm leading-6 text-[var(--ink)]">
                          {selectedMatch.note}
                        </p>
                      </div>

                      <div className="mt-4">
                        <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
                          Setstand
                        </div>
                        <div className="mt-3 space-y-2">
                          {selectedMatch.sets.map((set) => (
                            <div
                              key={set.label}
                              className="flex items-center justify-between rounded-xl border border-[rgba(22,20,31,0.04)] bg-[rgba(246,247,251,0.9)] px-3 py-2 text-sm"
                            >
                              <span className="text-[var(--muted)]">
                                {set.label}
                              </span>
                              <span className="font-semibold text-[var(--ink)]">
                                {set.score}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-[rgba(10,17,39,0.06)] pt-4">
                        <Link
                          href="/wedstrijden"
                          className="inline-flex items-center justify-center rounded-xl border border-[rgba(22,20,31,0.08)] bg-white px-3 py-2 text-sm font-medium text-[var(--ink)] transition hover:bg-[rgba(22,20,31,0.03)]"
                        >
                          Beheren bij alle wedstrijden
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* {isEditOpen && selectedMatch && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(10,17,39,0.52)] p-4 backdrop-blur-sm">
                  <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-[28px] border border-white/60 bg-[rgba(255,255,255,0.96)] p-5 shadow-[0_28px_80px_rgba(10,17,39,0.22)]">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                          Wedstrijd bewerken
                        </div>
                        <h3 className="mt-2 text-2xl font-black tracking-[-0.06em] text-[var(--ink)]">
                          {selectedMatch.opponent}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={closeEditModal}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(10,17,39,0.08)] bg-white text-[var(--ink)]"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="max-h-[calc(92vh-120px)] space-y-4 overflow-y-auto pr-1">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-[var(--muted)]">
                            Club
                          </label>
                          <select
                            value={opponentClubId}
                            onChange={(event) => {
                              const nextClubId = Number(event.target.value);
                              setOpponentClubId(nextClubId);
                              const nextOpponents = persons.filter(
                                (person) => person.club_id === nextClubId,
                              );
                              setOpponentId(
                                nextOpponents[0]?.id ?? persons[0].id,
                              );
                            }}
                            className="flex h-11 w-full rounded-xl border border-[rgba(22,20,31,0.12)] bg-[rgba(255,255,255,0.7)] px-3 text-sm text-[var(--ink)]"
                          >
                            {clubs.map((club) => (
                              <option key={club.id} value={club.id}>
                                {club.naam}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-[var(--muted)]">
                            Tegenstander
                          </label>
                          <select
                            value={selectedOpponent.id}
                            onChange={(event) =>
                              setOpponentId(Number(event.target.value))
                            }
                            className="flex h-11 w-full rounded-xl border border-[rgba(22,20,31,0.12)] bg-[rgba(255,255,255,0.7)] px-3 text-sm text-[var(--ink)]"
                          >
                            {matchedOpponents.map((person) => (
                              <option key={person.id} value={person.id}>
                                {person.naam}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-[var(--muted)]">
                            Eigen klassement
                          </label>
                          <select
                            defaultValue={selectedMatch.rating}
                            className="flex h-11 w-full rounded-xl border border-[rgba(22,20,31,0.12)] bg-[rgba(255,255,255,0.7)] px-3 text-sm text-[var(--ink)]"
                          >
                            {rankingOptions.map((klassement) => (
                              <option key={klassement} value={klassement}>
                                {klassement}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-[var(--muted)]">
                            Locatie
                          </label>
                          <select
                            defaultValue={selectedMatch.location.toLowerCase()}
                            className="flex h-11 w-full rounded-xl border border-[rgba(22,20,31,0.12)] bg-[rgba(255,255,255,0.7)] px-3 text-sm text-[var(--ink)]"
                          >
                            <option value="thuis">Thuis</option>
                            <option value="uit">Uit</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-[var(--muted)]">
                            Datum
                          </label>
                          <DateInput
                            name="datum"
                            defaultValue={selectedMatch.date}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-[var(--muted)]">
                            Klassement tegenstander
                          </label>
                          <select
                            defaultValue={selectedOpponent.klassement_code}
                            className="flex h-11 w-full rounded-xl border border-[rgba(22,20,31,0.12)] bg-[rgba(255,255,255,0.7)] px-3 text-sm text-[var(--ink)]"
                          >
                            {rankingOptions.map((klassement) => (
                              <option key={klassement} value={klassement}>
                                {klassement}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="text-sm font-medium text-[var(--muted)]">
                          Setstand
                        </div>
                        <div className="space-y-3">
                          {selectedMatch.sets.map((set) => {
                            const [ownScore, opponentScore] =
                              set.score.split("-");
                            return (
                              <div
                                key={set.label}
                                className="rounded-xl border border-[rgba(22,20,31,0.08)] bg-[rgba(246,247,251,0.9)] p-3"
                              >
                                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                                  {set.label}
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <input
                                    aria-label={`${set.label} eigen score`}
                                    defaultValue={ownScore}
                                    className="flex h-10 w-full rounded-lg border border-[rgba(22,20,31,0.12)] bg-white px-2 text-sm text-[var(--ink)]"
                                  />
                                  <input
                                    aria-label={`${set.label} tegenstander score`}
                                    defaultValue={opponentScore}
                                    className="flex h-10 w-full rounded-lg border border-[rgba(22,20,31,0.12)] bg-white px-2 text-sm text-[var(--ink)]"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-[var(--muted)]">
                          Notitie
                        </label>
                        <textarea
                          rows={4}
                          defaultValue={selectedMatch.note}
                          className="w-full rounded-xl border border-[rgba(22,20,31,0.12)] bg-[rgba(255,255,255,0.7)] px-3 py-2 text-sm text-[var(--ink)]"
                        />
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={closeEditModal}
                        className="inline-flex items-center justify-center rounded-xl border border-[rgba(22,20,31,0.08)] bg-white px-3 py-2 text-sm font-medium text-[var(--ink)]"
                      >
                        Annuleren
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          closeEditModal();
                          setSelectedMatchId(null);
                        }}
                        className="inline-flex items-center justify-center rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white shadow-[0_12px_24px_rgba(4,51,255,0.22)]"
                      >
                        Opslaan
                      </button>
                    </div>
                  </div>
                </div>
              )} */}

              {/* {isDeleteDialogOpen && selectedMatch && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[rgba(10,17,39,0.6)] p-4 backdrop-blur-sm">
                  <div className="w-full max-w-md rounded-[28px] border border-rose-100 bg-white p-5 shadow-[0_28px_80px_rgba(10,17,39,0.22)]">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-500">
                      Verwijderen
                    </div>
                    <h3 className="mt-2 text-2xl font-black tracking-[-0.06em] text-[var(--ink)]">
                      Wedstrijd verwijderen?
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                      Weet je zeker dat je de wedstrijd tegen{" "}
                      {selectedMatch.opponent} wilt verwijderen? Deze actie kan
                      niet meer ongedaan worden gemaakt.
                    </p>

                    <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={closeDeleteDialog}
                        className="inline-flex items-center justify-center rounded-xl border border-[rgba(22,20,31,0.08)] bg-white px-3 py-2 text-sm font-medium text-[var(--ink)]"
                      >
                        Annuleren
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          closeDeleteDialog();
                          setSelectedMatchId(null);
                        }}
                        className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700"
                      >
                        Verwijderen
                      </button>
                    </div>
                  </div>
                </div>
              )} */}

              <Card className="border border-white/40 bg-[rgba(255,255,255,0.75)] shadow-[0_20px_50px_rgba(10,17,39,0.05)] backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Vaardigheid</CardTitle>
                  <CardDescription>Je huidige vorm</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="rounded-2xl border border-[rgba(22,20,31,0.05)] bg-[rgba(246,247,251,0.9)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                    <div className="mb-2 flex items-center justify-between text-sm text-[var(--muted)]">
                      <span>Form</span>
                      <span className="font-semibold text-[var(--ink)]">
                        {skillScore.toFixed(1)} / 10
                      </span>
                    </div>
                    <div className="mb-2 text-xs text-[var(--muted)]">
                      Op basis van de laatste {lastTenMatches.length}{" "}
                      wedstrijden
                    </div>
                    <div className="h-2.5 rounded-full bg-[rgba(22,20,31,0.06)]">
                      <div
                        className="h-2.5 rounded-full bg-[var(--accent)]"
                        style={{ width: skillProgress }}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    {[
                      ["Afgelopen 10", `${lastTenWins} gewonnen`],
                      ["Thuis", recordLabel(homeMatches)],
                      ["Uit", recordLabel(awayMatches)],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="flex items-center justify-between rounded-xl border border-[rgba(22,20,31,0.04)] bg-[rgba(246,247,251,0.9)] px-3 py-2 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
                      >
                        <span className="text-[var(--muted)]">{label}</span>
                        <span className="font-semibold text-[var(--ink)]">
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-[24px] bg-[linear-gradient(135deg,#093fb4,#2863c7)] p-4 text-white shadow-[0_18px_45px_rgba(9,63,180,0.22)]">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm text-white/80">
                          Volgend doel
                        </div>
                        <div className="mt-1 text-xl font-semibold">
                          {nextGoal.title}
                        </div>
                        <p className="mt-2 text-sm text-white/85">
                          {nextGoal.text}
                        </p>
                      </div>
                      <Trophy className="h-8 w-8 text-white/90" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>
          </div>

              <AppFooter className="lg:hidden" />
        </div>

          <AppFooter className="mt-8 hidden lg:flex" />
      </div>
    </main>
  );
}
