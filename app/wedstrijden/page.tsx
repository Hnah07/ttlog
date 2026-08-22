"use client";

import { useEffect, useState } from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { AppHeader, AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateInput } from "@/components/ui/date-input";
import { updateMatch, deleteMatch } from "@/app/wedstrijden/actions";
import { createClient } from "@/lib/supabase/client";
import { formatDateForDisplay } from "@/lib/dates";

const PAGE_SIZE = 6;

const supabase = createClient();

type ClubReference = { id: string; naam: string };
type PersonReference = {
  id: string;
  naam: string;
  club_id: string;
  klassement_code: string;
};
type SeasonReference = { id: string; naam: string };
type MatchSet = {
  id: string;
  wedstrijd_id: string;
  set_nummer: number;
  eigen_score: number;
  tegenstander_score: number;
};
type Match = {
  id: string;
  tegenstander_id: string;
  tegenstander_naam: string;
  club_naam_snapshot: string;
  klassement_snapshot: string;
  eigen_klassement_snapshot: string;
  locatie: "thuis" | "uit";
  seizoen_id: string;
  datum: string;
  notitie_tekst: string;
  gewonnen: boolean;
  sets: MatchSet[];
};

function MatchesPageContent() {
  const searchParams = useSearchParams();
  const reloadKey = searchParams.toString();
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [opponentClubId, setOpponentClubId] = useState("");
  const [opponentId, setOpponentId] = useState("");
  const [clubs, setClubs] = useState<ClubReference[]>([]);
  const [persons, setPersons] = useState<PersonReference[]>([]);
  const [seasons, setSeasons] = useState<SeasonReference[]>([]);
  const [rankingOptions, setRankingOptions] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClub, setSelectedClub] = useState("alle");
  const [selectedRanking, setSelectedRanking] = useState("alle");
  const [selectedSeason, setSelectedSeason] = useState("alle");
  const [selectedResult, setSelectedResult] = useState("alle");
  const [sortBy, setSortBy] = useState("datum-desc");

  useEffect(() => {
    async function loadReferences() {
      const [
        { data: clubsData },
        { data: personsData },
        { data: seasonsData },
        { data: rankingsData },
      ] = await Promise.all([
        supabase.from("clubs").select("id, naam").order("naam"),
        supabase
          .from("personen")
          .select("id, naam, club_id, klassement_code")
          .order("naam"),
        supabase
          .from("seizoenen")
          .select("id, naam")
          .order("start_datum", { ascending: false }),
        supabase
          .from("klassementen")
          .select("code, volgorde")
          .order("volgorde"),
      ]);
      setClubs(clubsData ?? []);
      setPersons(personsData ?? []);
      setSeasons(seasonsData ?? []);
      setRankingOptions((rankingsData ?? []).map((ranking) => ranking.code));
    }

    void loadReferences();
  }, []);

  useEffect(() => {
    let isActive = true;

    async function loadMatches() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (isActive) setIsLoading(false);
        return;
      }

      const { data: matches, error: matchesError } = await supabase
        .from("wedstrijden")
        .select("*")
        .eq("user_id", user.id)
        .order("datum", { ascending: false });

      if (matchesError || !matches?.length) {
        if (isActive) {
          setAllMatches([]);
          setIsLoading(false);
        }
        return;
      }

      const matchIds = matches.map((match) => match.id);
      const opponentIds = matches.map((match) => match.tegenstander_id);
      const [{ data: matchSets }, { data: opponents }] = await Promise.all([
        supabase.from("sets").select("*").in("wedstrijd_id", matchIds),
        supabase.from("personen").select("id, naam").in("id", opponentIds),
      ]);

      const opponentNames = new Map(
        (opponents ?? []).map((opponent) => [opponent.id, opponent.naam]),
      );
      const setsByMatch = new Map<string, Match["sets"]>();

      for (const set of matchSets ?? []) {
        const currentSets = setsByMatch.get(set.wedstrijd_id) ?? [];
        currentSets.push(set);
        setsByMatch.set(set.wedstrijd_id, currentSets);
      }

      const loadedMatches = matches.map((match) => ({
        ...match,
        tegenstander_naam:
          opponentNames.get(match.tegenstander_id) ?? "Onbekende speler",
        sets: setsByMatch.get(match.id) ?? [],
      })) as Match[];

      if (isActive) {
        setAllMatches(loadedMatches);
        setIsLoading(false);
      }
    }

    void loadMatches();
    return () => {
      isActive = false;
    };
  }, [reloadKey]);

  const selectedMatch = selectedMatchId
    ? (allMatches.find((match) => match.id === selectedMatchId) ?? null)
    : null;

  const filteredMatches = [...allMatches]
    .filter((match) => {
      const searchableText = [
        match.tegenstander_naam,
        match.club_naam_snapshot,
        match.eigen_klassement_snapshot,
        match.klassement_snapshot,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchableText.includes(searchQuery.toLowerCase());
      const matchesClub =
        selectedClub === "alle" || match.club_naam_snapshot === selectedClub;
      const matchesRanking =
        selectedRanking === "alle" ||
        match.eigen_klassement_snapshot === selectedRanking;
      const matchesSeason =
        selectedSeason === "alle" ||
        String(match.seizoen_id) === selectedSeason;
      const matchesResult =
        selectedResult === "alle" ||
        (selectedResult === "wins" && match.gewonnen) ||
        (selectedResult === "losses" && !match.gewonnen);

      return (
        matchesSearch &&
        matchesClub &&
        matchesRanking &&
        matchesSeason &&
        matchesResult
      );
    })
    .sort((a, b) => {
      if (sortBy === "datum-desc") return b.datum.localeCompare(a.datum);
      if (sortBy === "datum-asc") return a.datum.localeCompare(b.datum);
      if (sortBy === "naam-asc")
        return a.tegenstander_naam.localeCompare(b.tegenstander_naam);
      if (sortBy === "naam-desc")
        return b.tegenstander_naam.localeCompare(a.tegenstander_naam);
      return 0;
    });

  const totalPages = Math.ceil(filteredMatches.length / PAGE_SIZE) || 1;
  const paginatedMatches = filteredMatches.slice(0, PAGE_SIZE);

  const openMatch = (matchId: string) => {
    const match = allMatches.find((item) => item.id === matchId);
    const matchPerson = persons.find(
      (person) => String(person.id) === String(match?.tegenstander_id),
    );

    if (matchPerson) {
      setOpponentClubId(String(matchPerson.club_id));
      setOpponentId(String(matchPerson.id));
    }

    setSelectedMatchId(matchId);
  };

  const matchedOpponents = persons.filter(
    (person) => String(person.club_id) === opponentClubId,
  );

  const selectedOpponent =
    matchedOpponents.find((person) => person.id === opponentId) ??
    matchedOpponents[0] ??
    null;

  return (
    <AppShell current="matches">
      <AppHeader
        title="Alle wedstrijden"
        subtitle="Wedstrijdoverzicht"
        actionLabel="Nieuwe wedstrijd"
        actionHref="/nieuw-wedstrijd"
      />

      <Card className="border-[rgba(22,20,31,0.08)] bg-[rgba(255,255,255,0.8)]">
        <CardHeader className="pb-3">
          <CardTitle>Wedstrijden</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {searchParams.get("message") && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              {searchParams.get("message")}
            </div>
          )}
          {searchParams.get("error") && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {searchParams.get("error")}
            </div>
          )}
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="space-y-2 md:col-span-2 xl:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                Zoeken
              </label>
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Naam of club"
                className="flex h-11 w-full rounded-xl border border-[rgba(22,20,31,0.12)] bg-[rgba(255,255,255,0.7)] px-3 text-sm text-[var(--ink)]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                Sorteren
              </label>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="flex h-11 w-full rounded-xl border border-[rgba(22,20,31,0.12)] bg-[rgba(255,255,255,0.7)] px-3 text-sm text-[var(--ink)]"
              >
                <option value="datum-desc">Datum: nieuwste</option>
                <option value="datum-asc">Datum: oudste</option>
                <option value="naam-asc">Naam: A-Z</option>
                <option value="naam-desc">Naam: Z-A</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                Resultaat
              </label>
              <select
                value={selectedResult}
                onChange={(event) => setSelectedResult(event.target.value)}
                className="flex h-11 w-full rounded-xl border border-[rgba(22,20,31,0.12)] bg-[rgba(255,255,255,0.7)] px-3 text-sm text-[var(--ink)]"
              >
                <option value="alle">Alle</option>
                <option value="wins">Wins</option>
                <option value="losses">Losses</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                Club
              </label>
              <select
                value={selectedClub}
                onChange={(event) => setSelectedClub(event.target.value)}
                className="flex h-11 w-full rounded-xl border border-[rgba(22,20,31,0.12)] bg-[rgba(255,255,255,0.7)] px-3 text-sm text-[var(--ink)]"
              >
                <option value="alle">Alle clubs</option>
                {clubs.map((club) => (
                  <option key={club.id} value={club.naam}>
                    {club.naam}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                Klassement
              </label>
              <select
                value={selectedRanking}
                onChange={(event) => setSelectedRanking(event.target.value)}
                className="flex h-11 w-full rounded-xl border border-[rgba(22,20,31,0.12)] bg-[rgba(255,255,255,0.7)] px-3 text-sm text-[var(--ink)]"
              >
                <option value="alle">Alle</option>
                {rankingOptions.map((klassement) => (
                  <option key={klassement} value={klassement}>
                    {klassement}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                Seizoen
              </label>
              <select
                value={selectedSeason}
                onChange={(event) => setSelectedSeason(event.target.value)}
                className="flex h-11 w-full rounded-xl border border-[rgba(22,20,31,0.12)] bg-[rgba(255,255,255,0.7)] px-3 text-sm text-[var(--ink)]"
              >
                <option value="alle">Alle</option>
                {seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.naam}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="rounded-2xl border border-dashed border-[rgba(22,20,31,0.12)] bg-[rgba(246,247,251,0.8)] p-6 text-center text-sm text-[var(--muted)]">
              Wedstrijden laden...
            </div>
          ) : paginatedMatches.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[rgba(22,20,31,0.12)] bg-[rgba(246,247,251,0.8)] p-6 text-center text-sm text-[var(--muted)]">
              Geen wedstrijden gevonden voor deze filters.
            </div>
          ) : (
            paginatedMatches.map((match) => {
              const won = match.gewonnen;
              const scoreSummary = match.sets
                .map((set) => `${set.eigen_score}-${set.tegenstander_score}`)
                .join("  ·  ");

              return (
                <button
                  key={match.id}
                  type="button"
                  onClick={() => openMatch(match.id)}
                  className="block w-full rounded-2xl border border-[rgba(22,20,31,0.08)] bg-[rgba(246,247,251,0.9)] p-4 text-left transition hover:border-[rgba(22,20,31,0.12)] hover:bg-[rgba(250,251,255,0.98)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-semibold text-[var(--ink)]">
                          {match.tegenstander_naam}
                        </div>
                        <span className="rounded-full border border-[rgba(22,20,31,0.08)] bg-white/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                          {match.eigen_klassement_snapshot}
                        </span>
                      </div>
                      <div className="mt-1 text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                        {formatDateForDisplay(match.datum)} ·{" "}
                        {match.club_naam_snapshot}
                      </div>
                    </div>

                    <Badge
                      className={
                        won
                          ? "bg-emerald-500 text-white hover:bg-emerald-600"
                          : "bg-rose-500 text-white hover:bg-rose-600"
                      }
                    >
                      {won ? "W" : "L"}
                    </Badge>
                  </div>

                  <div className="mt-3 flex items-end justify-between gap-3">
                    <div className="text-sm text-[var(--muted)]">Setstand</div>
                    <div className="text-sm font-semibold text-[var(--ink)]">
                      {scoreSummary}
                    </div>
                  </div>

                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--ink)]/80">
                    {match.notitie_tekst}
                  </p>
                </button>
              );
            })
          )}
        </CardContent>
      </Card>

      <div className="rounded-[24px] border border-[rgba(22,20,31,0.08)] bg-[rgba(255,255,255,0.7)] p-4 shadow-[0_18px_50px_rgba(10,17,39,0.04)]">
        <div className="flex items-center justify-between gap-3 text-sm text-[var(--muted)]">
          <span>Pagina 1 van {totalPages}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[rgba(22,20,31,0.08)] bg-white text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-40"
              disabled
            >
              ←
            </button>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[rgba(22,20,31,0.08)] bg-white text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-40"
              disabled={totalPages <= 1}
            >
              →
            </button>
          </div>
        </div>
      </div>

      {selectedMatch && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(10,17,39,0.46)] p-3 backdrop-blur-sm sm:p-4 md:items-center">
          <div className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-[28px] border border-white/60 bg-[rgba(255,255,255,0.92)] shadow-[0_28px_80px_rgba(10,17,39,0.22)]">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[rgba(10,17,39,0.06)] bg-[rgba(255,255,255,0.92)] px-5 pb-4 pt-5 backdrop-blur-sm">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                  Wedstrijd details
                </div>
                <h3 className="mt-2 text-2xl font-black tracking-[-0.06em] text-[var(--ink)]">
                  {selectedMatch.tegenstander_naam}
                </h3>
              </div>

              <button
                type="button"
                aria-label="Sluit wedstrijddetails"
                onClick={() => setSelectedMatchId(null)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[rgba(10,17,39,0.08)] bg-white text-[var(--ink)] transition hover:bg-[rgba(10,17,39,0.04)]"
              >
                ×
              </button>
            </div>

            <div className="max-h-[calc(92vh-112px)] overflow-y-auto overscroll-contain px-5 pb-5 pt-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="text-sm text-[var(--muted)]">Resultaat</div>
                <Badge
                  className={
                    selectedMatch.gewonnen
                      ? "bg-emerald-500 text-white hover:bg-emerald-600"
                      : "bg-rose-500 text-white hover:bg-rose-600"
                  }
                >
                  {selectedMatch.gewonnen ? "W" : "L"}
                </Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-[rgba(246,247,251,0.92)] p-3">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
                    Datum
                  </div>
                  <div className="mt-1 font-semibold text-[var(--ink)]">
                    {formatDateForDisplay(selectedMatch.datum)}
                  </div>
                </div>

                <div className="rounded-xl bg-[rgba(246,247,251,0.92)] p-3">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
                    Locatie
                  </div>
                  <div className="mt-1 font-semibold text-[var(--ink)]">
                    {selectedMatch.locatie}
                  </div>
                </div>

                <div className="rounded-xl bg-[rgba(246,247,251,0.92)] p-3">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
                    Club
                  </div>
                  <div className="mt-1 font-semibold text-[var(--ink)]">
                    {selectedMatch.club_naam_snapshot}
                  </div>
                </div>

                <div className="rounded-xl bg-[rgba(246,247,251,0.92)] p-3">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
                    Eigen klassement
                  </div>
                  <div className="mt-1 font-semibold text-[var(--ink)]">
                    {selectedMatch.eigen_klassement_snapshot}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
                  Notitie
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--ink)]">
                  {selectedMatch.notitie_tekst}
                </p>
              </div>

              <div className="mt-4">
                <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
                  Setstand
                </div>
                <div className="mt-3 space-y-2">
                  {selectedMatch.sets.map((set) => (
                    <div
                      key={set.id}
                      className="flex items-center justify-between rounded-xl border border-[rgba(22,20,31,0.04)] bg-[rgba(246,247,251,0.9)] px-3 py-2 text-sm"
                    >
                      <span className="text-[var(--muted)]">
                        Set {set.set_nummer}
                      </span>
                      <span className="font-semibold text-[var(--ink)]">
                        {set.eigen_score}-{set.tegenstander_score}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-[rgba(10,17,39,0.06)] pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(true)}
                  className="inline-flex items-center justify-center rounded-xl border border-[rgba(22,20,31,0.08)] bg-white px-3 py-2 text-sm font-medium text-[var(--ink)] transition hover:bg-[rgba(22,20,31,0.03)]"
                >
                  Wijzigen
                </button>
                <button
                  type="button"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
                >
                  Verwijderen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isEditOpen && selectedMatch && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(10,17,39,0.52)] p-4 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-[28px] border border-white/60 bg-[rgba(255,255,255,0.96)] p-5 shadow-[0_28px_80px_rgba(10,17,39,0.22)]">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                  Wedstrijd bewerken
                </div>
                <h3 className="mt-2 text-2xl font-black tracking-[-0.06em] text-[var(--ink)]">
                  {selectedMatch.tegenstander_naam}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(10,17,39,0.08)] bg-white text-[var(--ink)]"
              >
                ×
              </button>
            </div>

            <form action={updateMatch}>
              <input
                type="hidden"
                name="wedstrijd_id"
                value={selectedMatch.id}
              />
              <div className="max-h-[calc(92vh-140px)] space-y-4 overflow-y-auto pr-1">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--muted)]">
                      Club
                    </label>
                    <select
                      value={opponentClubId}
                      onChange={(event) => {
                        const nextClubId = event.target.value;
                        setOpponentClubId(nextClubId);
                        const nextOpponents = persons.filter(
                          (person) => String(person.club_id) === nextClubId,
                        );
                        setOpponentId(String(nextOpponents[0]?.id ?? ""));
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
                      value={selectedOpponent?.id ?? ""}
                      onChange={(event) => setOpponentId(event.target.value)}
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
                      defaultValue={selectedMatch.eigen_klassement_snapshot}
                      name="eigen_klassement_snapshot"
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
                      defaultValue={selectedMatch.locatie}
                      name="locatie"
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
                      defaultValue={selectedMatch.datum}
                      className="flex h-11 w-full min-w-0 rounded-xl border border-[rgba(22,20,31,0.12)] bg-[rgba(255,255,255,0.7)] px-3 text-sm text-[var(--ink)]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--muted)]">
                      Klassement tegenstander
                    </label>
                    <select
                      defaultValue={selectedOpponent?.klassement_code ?? ""}
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
                    {selectedMatch.sets.map((set) => (
                      <div
                        key={set.id}
                        className="rounded-xl border border-[rgba(22,20,31,0.08)] bg-[rgba(246,247,251,0.9)] p-3"
                      >
                        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                          Set {set.set_nummer}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            aria-label={`Set ${set.set_nummer} eigen score`}
                            name={`eigen_score_${set.set_nummer}`}
                            defaultValue={set.eigen_score}
                            className="flex h-10 w-full rounded-lg border border-[rgba(22,20,31,0.12)] bg-white px-2 text-sm text-[var(--ink)]"
                          />
                          <input
                            aria-label={`Set ${set.set_nummer} tegenstander score`}
                            name={`tegenstander_score_${set.set_nummer}`}
                            defaultValue={set.tegenstander_score}
                            className="flex h-10 w-full rounded-lg border border-[rgba(22,20,31,0.12)] bg-white px-2 text-sm text-[var(--ink)]"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--muted)]">
                    Notitie
                  </label>
                  <textarea
                    name="notitie_tekst"
                    rows={4}
                    defaultValue={selectedMatch.notitie_tekst}
                    className="w-full rounded-xl border border-[rgba(22,20,31,0.12)] bg-[rgba(255,255,255,0.7)] px-3 py-2 text-sm text-[var(--ink)]"
                  />
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="inline-flex items-center justify-center rounded-xl border border-[rgba(22,20,31,0.08)] bg-white px-3 py-2 text-sm font-medium text-[var(--ink)]"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white shadow-[0_12px_24px_rgba(4,51,255,0.22)]"
                >
                  Opslaan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDeleteDialogOpen && selectedMatch && (
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
              {selectedMatch.tegenstander_naam} wilt verwijderen? Deze actie kan
              niet meer ongedaan worden gemaakt.
            </p>

            <form
              action={deleteMatch}
              className="mt-5 flex flex-wrap items-center justify-end gap-2"
            >
              <input
                type="hidden"
                name="wedstrijd_id"
                value={selectedMatch.id}
              />
              <button
                type="button"
                onClick={() => setIsDeleteDialogOpen(false)}
                className="inline-flex items-center justify-center rounded-xl border border-[rgba(22,20,31,0.08)] bg-white px-3 py-2 text-sm font-medium text-[var(--ink)]"
              >
                Annuleren
              </button>
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700"
              >
                Verwijderen
              </button>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}

export default function MatchesPage() {
  return (
    <Suspense>
      <MatchesPageContent />
    </Suspense>
  );
}
