import { AppHeader, AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PendingButton } from "@/components/ui/pending-button";
import { logout } from "@/app/auth/actions";
import { claimPerson } from "@/app/profiel/actions";
import { createClient } from "@/lib/supabase/server";
import { BadgeCheck, ExternalLink, LogOut, Mail } from "lucide-react";

type ProfilePageProps = {
  searchParams: Promise<{ error?: string; message?: string; q?: string }>;
};

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const params = await searchParams;
  const searchQuery = params.q?.trim() ?? "";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const candidatesQuery = supabase
    .from("personen")
    .select("id, naam, external_id, club_id, klassement_code")
    .is("claimed_by_user_id", null)
    .ilike("naam", `%${searchQuery}%`)
    .order("naam")
    .limit(20);

  const [
    { data: claimedPerson },
    { data: candidates },
    { data: clubs },
    { data: loggedMatches },
    { data: availableSeasons },
  ] = await Promise.all([
    supabase
      .from("personen")
      .select("id, naam, external_id, club_id, klassement_code")
      .eq("claimed_by_user_id", user?.id ?? "")
      .maybeSingle(),
    searchQuery ? candidatesQuery : Promise.resolve({ data: [], error: null }),
    supabase.from("clubs").select("id, naam").order("naam"),
    user
      ? supabase.from("wedstrijden").select("seizoen_id").eq("user_id", user.id)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("seizoenen")
      .select("id, naam, start_datum")
      .order("start_datum", { ascending: false }),
  ]);

  const clubNames = new Map((clubs ?? []).map((club) => [club.id, club.naam]));
  const claimedClub = claimedPerson
    ? (clubNames.get(claimedPerson.club_id) ?? "Onbekende club")
    : null;
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
  const seasonLogCounts = new Map<string, number>();
  for (const match of loggedMatches ?? []) {
    const seasonId = String(match.seizoen_id);
    seasonLogCounts.set(seasonId, (seasonLogCounts.get(seasonId) ?? 0) + 1);
  }
  const loggedSeasons = (availableSeasons ?? []).filter((season) =>
    seasonLogCounts.has(String(season.id)),
  );
  const currentSeason = availableSeasons?.[0];

  return (
    <AppShell current="profile">
      <AppHeader
        title="Profiel"
        subtitle="Claim je naam"
        actionLabel="Dashboard"
        actionHref="/"
      />

      <div className="grid gap-6">
        <Card className="border-[rgba(10,17,39,0.08)] bg-[rgba(255,255,255,0.8)]">
          <CardHeader>
            <CardTitle className="font-black tracking-[-0.04em]">
              Jouw gegevens
            </CardTitle>
            <CardDescription>
              {claimedPerson
                ? "Actuele persoonlijke status"
                : "Claim eerst je profiel door je naam te zoeken en te selecteren."}
            </CardDescription>
            {claimedPerson && (
              <Badge className="mt-2 w-fit gap-1.5 bg-sky-50 text-sky-700 hover:bg-sky-50">
                <BadgeCheck className="h-3.5 w-3.5 fill-sky-500 text-white" />
                Geclaimde speler
              </Badge>
            )}
          </CardHeader>

          <CardContent className="space-y-4">
            {params.message && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {params.message}
              </div>
            )}
            {params.error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {params.error}
              </div>
            )}

            {!claimedPerson && (
              <div className="rounded-2xl border border-[rgba(10,17,39,0.08)] bg-[var(--bg)] p-4">
                <form method="get" className="space-y-2">
                  <label className="text-sm font-medium text-[var(--muted)]">
                    Zoek je naam
                  </label>
                  <div className="flex gap-2">
                    <Input
                      name="q"
                      defaultValue={searchQuery}
                      placeholder="Typ je volledige of gedeeltelijke naam"
                    />
                    <button
                      type="submit"
                      className="shrink-0 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
                    >
                      Zoeken
                    </button>
                  </div>
                </form>

                {searchQuery && (
                  <div className="mt-4 space-y-3">
                    {(candidates ?? []).length > 0 ? (
                      (candidates ?? []).map((person) => (
                        <form key={person.id} action={claimPerson}>
                          <input
                            type="hidden"
                            name="person_id"
                            value={person.id}
                          />
                          <PendingButton
                            pendingText="Claimen..."
                            className="flex w-full items-center justify-between rounded-2xl border border-[rgba(10,17,39,0.08)] bg-white p-3 text-left transition hover:border-[rgba(4,51,255,0.35)]"
                          >
                            <div>
                              <div className="font-semibold text-[var(--ink)]">
                                {person.naam}
                              </div>
                              <div className="text-sm text-[var(--muted)]">
                                {person.klassement_code} ·{" "}
                                {clubNames.get(person.club_id) ??
                                  "Onbekende club"}
                              </div>
                            </div>
                            <Badge variant="secondary">Claim</Badge>
                          </PendingButton>
                        </form>
                      ))
                    ) : (
                      <div className="rounded-xl border border-dashed border-[rgba(10,17,39,0.12)] p-4 text-sm text-[var(--muted)]">
                        Geen ongeclaimde speler gevonden.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="rounded-2xl bg-[var(--bg)] p-4">
              <div className="text-sm text-[var(--muted)]">Naam</div>
              <div className="mt-1 text-xl font-semibold text-[var(--ink)]">
                {claimedPerson?.naam ?? user?.email ?? "Nog niet gekoppeld"}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-[var(--bg)] p-4">
                <div className="text-sm text-[var(--muted)]">Club</div>
                <div className="mt-1 font-semibold text-[var(--ink)]">
                  {claimedClub ?? "Nog niet gekoppeld"}
                </div>
              </div>
              <div className="rounded-2xl bg-[var(--bg)] p-4">
                <div className="text-sm text-[var(--muted)]">Klassement</div>
                <div className="mt-1 font-semibold text-[var(--ink)]">
                  {claimedPerson?.klassement_code ?? "Nog niet gekoppeld"}
                </div>
              </div>
            </div>

            {claimedPerson && (
              <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4">
                <div className="flex items-center gap-2 font-semibold text-[var(--ink)]">
                  <BadgeCheck className="h-4 w-4 text-sky-600" />
                  Claiminformatie
                </div>
                <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <div className="text-[var(--muted)]">Gekoppelde speler</div>
                    <div className="mt-1 font-medium text-[var(--ink)]">
                      {claimedPerson.naam}
                    </div>
                  </div>
                  <div>
                    <div className="text-[var(--muted)]">Spelersnummer</div>
                    <div className="mt-1 font-medium text-[var(--ink)]">
                      {claimedPerson.external_id}
                    </div>
                  </div>
                </div>
                {supportEmail ? (
                  <a
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-sky-700 hover:text-sky-900"
                    href={`mailto:${supportEmail}?subject=Verkeerde%20spelerskoppeling%20voor%20${encodeURIComponent(claimedPerson.naam)}`}
                  >
                    Verkeerde koppeling melden
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <p className="mt-4 text-sm text-sky-800">
                    Klopt deze koppeling niet? Neem contact op met de beheerder.
                  </p>
                )}
              </div>
            )}

            <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
              <div className="font-semibold text-[var(--ink)]">
                Over je klassement
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Je klassement hierboven is je actuele klassement. Wedstrijden
                bewaren het klassement dat op het moment van invoeren gold,
                zodat je historiek correct blijft wanneer je later promoveert of
                van klassement verandert.
              </p>
            </div>

            <div className="rounded-2xl border border-[rgba(22,20,31,0.06)] bg-[var(--bg)] p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--muted)]">
                  Huidig seizoen
                </span>
                <Badge variant="default">{currentSeason?.naam ?? "-"}</Badge>
              </div>
              <div className="mt-3 text-sm text-[var(--muted)]">
                Seizoenen waarin je wedstrijden hebt gelogd
              </div>
              <div className="mt-2 space-y-2">
                {loggedSeasons.length > 0 ? (
                  loggedSeasons.map((season) => (
                    <div
                      key={season.id}
                      className="flex justify-between text-sm"
                    >
                      <span className="text-[var(--ink)]">{season.naam}</span>
                      <span className="text-[var(--muted)]">
                        {seasonLogCounts.get(String(season.id))} gelogd
                      </span>
                    </div>
                  ))
                ) : (
                  <span className="text-sm text-[var(--muted)]">
                    Nog geen wedstrijden gelogd.
                  </span>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-[rgba(22,20,31,0.06)] bg-[var(--bg)] p-4">
              <div className="font-semibold text-[var(--ink)]">
                Accountinstellingen
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm text-[var(--muted)]">
                <Mail className="h-4 w-4" />
                {user?.email ?? "Geen e-mailadres beschikbaar"}
              </div>
              <form action={logout} className="mt-4">
                <PendingButton
                  pendingText="Uitloggen..."
                  className="inline-flex items-center gap-2 rounded-xl border border-[rgba(10,17,39,0.12)] bg-white px-3 py-2 text-sm font-medium text-[var(--ink)] transition hover:border-[rgba(10,17,39,0.25)]"
                >
                  <LogOut className="h-4 w-4" />
                  Uitloggen
                </PendingButton>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
