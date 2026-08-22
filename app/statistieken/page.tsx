import { AppHeader, AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProgressCharts } from "@/components/progress-charts";
import {
  buildStatistics,
  type StatisticsMatch,
  type StatisticsSet,
} from "@/lib/stats";
import { createClient } from "@/lib/supabase/server";

export default async function StatisticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ data: matches }, { data: seasons }, { data: rankings }] =
    await Promise.all([
      supabase
        .from("wedstrijden")
        .select(
          "id, datum, gewonnen, locatie, seizoen_id, eigen_klassement_snapshot, klassement_snapshot",
        )
        .eq("user_id", user.id)
        .order("datum", { ascending: true }),
      supabase
        .from("seizoenen")
        .select("id, naam")
        .order("start_datum", { ascending: false }),
      supabase.from("klassementen").select("code, volgorde").order("volgorde"),
    ]);
  const matchIds = (matches ?? []).map((match) => match.id);
  const { data: sets } = matchIds.length
    ? await supabase
        .from("sets")
        .select("wedstrijd_id, eigen_score, tegenstander_score")
        .in("wedstrijd_id", matchIds)
    : { data: [] };

  const statistics = buildStatistics(
    (matches ?? []) as StatisticsMatch[],
    seasons ?? [],
    rankings ?? [],
    (sets ?? []) as StatisticsSet[],
  );

  return (
    <AppShell current="stats">
      <AppHeader
        title="Statistieken"
        subtitle="Per seizoen"
        actionLabel="Nieuwe wedstrijd"
        actionHref="/nieuw-wedstrijd"
      />

      {statistics.summaries.length === 0 ? (
        <Card className="border-[rgba(10,17,39,0.08)] bg-[rgba(255,255,255,0.8)]">
          <CardContent className="p-8 text-center text-sm text-[var(--muted)]">
            Log je eerste wedstrijd om je statistieken te zien.
          </CardContent>
        </Card>
      ) : (
        <>
          <ProgressCharts
            setBalance={statistics.setBalance}
            challenges={statistics.challenges}
          />
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {statistics.summaries.map((season) => (
              <Card
                key={season.seizoen}
                className="border-[rgba(10,17,39,0.08)] bg-[rgba(255,255,255,0.8)]"
              >
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="font-black tracking-[-0.04em]">
                      {season.seizoen}
                    </CardTitle>
                    <Badge variant="secondary">
                      {season.wedstrijden} wedstrijden
                    </Badge>
                  </div>
                  <CardDescription>
                    Samenvatting van het seizoen
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-[var(--bg)] p-3">
                      <div className="text-sm text-[var(--muted)]">
                        Gewonnen
                      </div>
                      <div className="mt-1 text-xl font-semibold text-[var(--ink)]">
                        {season.gewonnen}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-[var(--bg)] p-3">
                      <div className="text-sm text-[var(--muted)]">
                        Verloren
                      </div>
                      <div className="mt-1 text-xl font-semibold text-[var(--ink)]">
                        {season.verloren}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 rounded-2xl bg-[var(--bg)] p-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[var(--muted)]">Thuis</span>
                      <span className="font-semibold text-[var(--ink)]">
                        {season.thuis}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--muted)]">Uit</span>
                      <span className="font-semibold text-[var(--ink)]">
                        {season.uit}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--muted)]">
                        Gem. klassement
                      </span>
                      <span className="font-semibold text-[var(--ink)]">
                        {season.gemiddeldKlassement}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>
        </>
      )}
    </AppShell>
  );
}
