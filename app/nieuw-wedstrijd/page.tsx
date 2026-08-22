"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { AppHeader, AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { createMatch } from "@/app/nieuw-wedstrijd/actions";
import { createClient } from "@/lib/supabase/client";

const setRows = Array.from({ length: 5 }, (_, i) => i + 1);
const supabase = createClient();

type PersonReference = {
  id: string;
  naam: string;
  club_id: string;
  klassement_code: string;
};

type ClubReference = { id: string; naam: string };
type SeasonReference = { id: string; naam: string };

function getLocalDateISO() {
  const now = new Date();
  const offsetMinutes = now.getTimezoneOffset();
  const localNow = new Date(now.getTime() - offsetMinutes * 60 * 1000);

  return localNow.toISOString().slice(0, 10);
}

function NewMatchForm() {
  const searchParams = useSearchParams();
  const today = getLocalDateISO();
  const [showExtraSets, setShowExtraSets] = useState(false);
  const [claimedPerson, setClaimedPerson] = useState<PersonReference | null>(
    null,
  );
  const [selectedClubId, setSelectedClubId] = useState<string>("");
  const [clubQuery, setClubQuery] = useState("");
  const [opponentQuery, setOpponentQuery] = useState("");
  const [selectedOpponentId, setSelectedOpponentId] = useState("");
  const [isOpponentOpen, setIsOpponentOpen] = useState(false);
  const [formClubs, setFormClubs] = useState<ClubReference[]>([]);
  const [formPersons, setFormPersons] = useState<PersonReference[]>([]);
  const [formSeasons, setFormSeasons] = useState<SeasonReference[]>([]);
  const [formRankingOptions, setFormRankingOptions] = useState<string[]>([]);
  const [ownRanking, setOwnRanking] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const visibleSetRows = showExtraSets ? setRows : setRows.slice(0, 3);
  const invalidFieldClass = hasSubmitted
    ? "invalid:border-rose-500 invalid:ring-2 invalid:ring-rose-200"
    : "";

  useEffect(() => {
    let isActive = true;

    async function loadReferenceData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const [clubsResult, seasonsResult, rankingsResult, claimedResult] =
        await Promise.all([
          supabase.from("clubs").select("id, naam").order("naam"),
          supabase
            .from("seizoenen")
            .select("id, naam, start_datum, eind_datum")
            .order("start_datum", { ascending: false })
            .limit(2),
          supabase
            .from("klassementen")
            .select("code, volgorde")
            .order("volgorde"),
          user
            ? supabase
                .from("personen")
                .select("id, naam, club_id, klassement_code")
                .eq("claimed_by_user_id", user.id)
                .maybeSingle()
            : Promise.resolve({ data: null, error: null }),
        ]);

      if (!isActive) return;

      if (!clubsResult.error && clubsResult.data?.length)
        setFormClubs(clubsResult.data);
      if (!seasonsResult.error && seasonsResult.data?.length)
        setFormSeasons(seasonsResult.data);
      if (!rankingsResult.error && rankingsResult.data?.length) {
        setFormRankingOptions(
          rankingsResult.data.map((ranking) => ranking.code),
        );
      }
      if (!claimedResult.error && claimedResult.data) {
        setClaimedPerson(claimedResult.data);
        setOwnRanking(claimedResult.data.klassement_code);
      }
    }

    void loadReferenceData();
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (selectedClubId === "") {
      return;
    }

    let isActive = true;

    async function loadClubPersons() {
      const { data, error } = await supabase
        .from("personen")
        .select(
          "id, naam, external_id, club_id, klassement_code, claimed_by_user_id, updated_at",
        )
        .eq("club_id", selectedClubId)
        .order("naam");

      if (isActive && !error && data) {
        setFormPersons(data);
      }
    }

    void loadClubPersons();

    return () => {
      isActive = false;
    };
  }, [selectedClubId]);

  const filteredClubs = formClubs.filter((club) =>
    club.naam.toLowerCase().includes(clubQuery.toLowerCase()),
  );
  const selectedClub = formClubs.find(
    (club) => club.naam.toLowerCase() === clubQuery.trim().toLowerCase(),
  );
  const activeClubId = selectedClubId || selectedClub?.id || "";

  const filteredOpponents = formPersons.filter((person) => {
    const matchesClub =
      activeClubId === "" || String(person.club_id) === String(activeClubId);
    const matchesQuery = person.naam
      .toLowerCase()
      .includes(opponentQuery.toLowerCase());

    return matchesClub && matchesQuery;
  });

  const handleClubChange = (value: string) => {
    setClubQuery(value);
    setOpponentQuery("");
    setSelectedOpponentId("");
    const match = formClubs.find(
      (club) => club.naam.toLowerCase() === value.trim().toLowerCase(),
    );
    setSelectedClubId(match ? String(match.id) : "");
    if (!match) setFormPersons([]);
  };

  const handleOpponentChange = (value: string) => {
    setOpponentQuery(value);
    setSelectedOpponentId("");
    setIsOpponentOpen(true);
  };

  return (
    <AppShell current="new-match">
      <AppHeader
        title="Nieuwe wedstrijd"
        subtitle="Wedstrijd invoeren"
        actionLabel="Terug naar dashboard"
        actionHref="/"
      />

      <Card className="border-[rgba(22,20,31,0.08)] bg-[rgba(255,255,255,0.8)]">
        <CardHeader>
          <CardTitle>Wedstrijdgegevens</CardTitle>
          <CardDescription>
            {claimedPerson
              ? `Je bent geclaimd als ${claimedPerson.naam}.`
              : "Maak eerst je profielclaim af op de profielpagina."}
          </CardDescription>
        </CardHeader>

        <form
          action={createMatch}
          noValidate
          onSubmit={(event) => {
            setHasSubmitted(true);
            if (!event.currentTarget.checkValidity()) {
              event.preventDefault();
              event.currentTarget
                .querySelector<HTMLElement>(":invalid")
                ?.focus();
            }
          }}
        >
          <input type="hidden" name="club_id" value={activeClubId} required />
          <input
            type="hidden"
            name="tegenstander_id"
            value={selectedOpponentId}
            required
          />
          <CardContent className="space-y-6">
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
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--muted)]">
                  Club
                </label>
                <input
                  list="club-options"
                  value={clubQuery}
                  required
                  placeholder="Typ om een club te zoeken"
                  onChange={(event) => handleClubChange(event.target.value)}
                  className={`flex h-11 w-full rounded-xl border border-[rgba(22,20,31,0.12)] bg-[rgba(255,255,255,0.7)] px-3 text-sm text-[var(--ink)] ${invalidFieldClass}`}
                />
                <datalist id="club-options">
                  {filteredClubs.map((club) => (
                    <option key={club.id} value={club.naam} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--muted)]">
                  Tegenstander
                </label>
                <input
                  value={opponentQuery}
                  placeholder={
                    activeClubId === ""
                      ? "Typ naam of kies eerst een club"
                      : "Typ om een tegenstander te zoeken"
                  }
                  required
                  disabled={Boolean(activeClubId === "")}
                  onFocus={() => setIsOpponentOpen(true)}
                  onChange={(event) => handleOpponentChange(event.target.value)}
                  className={`flex h-11 w-full rounded-xl border border-[rgba(22,20,31,0.12)] bg-[rgba(255,255,255,0.7)] px-3 text-sm text-[var(--ink)] ${invalidFieldClass} disabled:cursor-not-allowed disabled:opacity-50`}
                />
                {isOpponentOpen && activeClubId !== "" && (
                  <div className="relative z-20">
                    <div className="absolute left-0 right-0 top-1 max-h-56 overflow-y-auto rounded-xl border border-[rgba(22,20,31,0.12)] bg-white p-1 shadow-[0_16px_35px_rgba(10,17,39,0.14)]">
                      {filteredOpponents.length > 0 ? (
                        filteredOpponents.map((person) => (
                          <button
                            key={person.id}
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              setOpponentQuery(person.naam);
                              setSelectedOpponentId(String(person.id));
                              setIsOpponentOpen(false);
                            }}
                            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-[var(--ink)] hover:bg-[var(--bg)]"
                          >
                            <span>{person.naam}</span>
                            <span className="text-xs text-[var(--muted)]">
                              {person.klassement_code}
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-[var(--muted)]">
                          Geen tegenstanders gevonden voor deze club.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--muted)]">
                  Eigen klassement
                </label>
                <select
                  value={ownRanking}
                  name="eigen_klassement"
                  required
                  onChange={(event) => setOwnRanking(event.target.value)}
                  className={`flex h-11 w-full rounded-xl border border-[rgba(22,20,31,0.12)] bg-[rgba(255,255,255,0.7)] px-3 text-sm text-[var(--ink)] ${invalidFieldClass}`}
                >
                  {formRankingOptions.map((klassement) => (
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
                  defaultValue=""
                  name="locatie"
                  required
                  className={`flex h-11 w-full rounded-xl border border-[rgba(22,20,31,0.12)] bg-[rgba(255,255,255,0.7)] px-3 text-sm text-[var(--ink)] ${invalidFieldClass}`}
                >
                  <option value="" disabled>
                    Kies een locatie
                  </option>
                  <option value="thuis">Thuis</option>
                  <option value="uit">Uit</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--muted)]">
                  Datum
                </label>
                <DateInput
                  name="datum"
                  defaultValue={today}
                  required
                  className={`min-w-0 ${invalidFieldClass}`}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--muted)]">
                  Seizoen
                </label>
                <select
                  defaultValue={formSeasons[0]?.id ?? ""}
                  name="seizoen_id"
                  required
                  className={`flex h-11 w-full rounded-xl border border-[rgba(22,20,31,0.12)] bg-[rgba(255,255,255,0.7)] px-3 text-sm text-[var(--ink)] ${invalidFieldClass}`}
                >
                  {formSeasons.map((season) => (
                    <option key={season.id} value={season.id}>
                      {season.naam}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-2xl border border-[rgba(22,20,31,0.08)] bg-[var(--bg)] p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-[var(--ink)]">
                  Setstand
                </h3>
                <Badge variant="secondary">Max 5 sets</Badge>
              </div>

              <div className="space-y-3">
                {visibleSetRows.map((setNr) => (
                  <div
                    key={setNr}
                    className="rounded-xl border border-[rgba(22,20,31,0.06)] bg-white/65 p-3"
                  >
                    <div className="mb-2 flex items-center justify-between text-sm font-medium text-[var(--muted)]">
                      <span>Set {setNr}</span>
                      {setNr >= 4 && (
                        <span className="text-[10px] uppercase tracking-[0.12em]">
                          Extra
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-[1fr_1fr] gap-2 sm:grid-cols-[1fr_1fr]">
                      <Input
                        type="number"
                        name={`eigen_score_${setNr}`}
                        min="0"
                        max="30"
                        required={setNr <= 3}
                        placeholder="Jij"
                        defaultValue=""
                        className={invalidFieldClass}
                      />
                      <Input
                        type="number"
                        name={`tegenstander_score_${setNr}`}
                        min="0"
                        max="30"
                        required={setNr <= 3}
                        placeholder="Tegenstander"
                        defaultValue=""
                        className={invalidFieldClass}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {!showExtraSets && (
                <button
                  type="button"
                  onClick={() => setShowExtraSets(true)}
                  className="mt-3 inline-flex items-center justify-center rounded-xl border border-[rgba(22,20,31,0.08)] bg-white px-3 py-2 text-sm font-medium text-[var(--ink)] transition hover:bg-[rgba(22,20,31,0.03)]"
                >
                  5e set toevoegen
                </button>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--muted)]">
                Notitie
              </label>
              <textarea
                name="notitie_tekst"
                rows={4}
                placeholder="Schrijf hier je notitie over de wedstrijd..."
                className="w-full rounded-xl border border-[rgba(22,20,31,0.12)] bg-[rgba(255,255,255,0.7)] px-3 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--muted)]/80"
                defaultValue=""
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" className="gap-2">
                Opslaan
              </Button>
              <Link
                href="/"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-[rgba(22,20,31,0.12)] bg-white px-4 py-2 text-sm font-medium text-[var(--ink)] transition hover:bg-[rgba(22,20,31,0.03)]"
              >
                Annuleren
              </Link>
            </div>
          </CardContent>
        </form>
      </Card>
    </AppShell>
  );
}

export default function NewMatchPage() {
  return (
    <Suspense>
      <NewMatchForm />
    </Suspense>
  );
}
