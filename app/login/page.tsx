import { login, signup } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { AppFooter } from "@/components/app-shell";

type PublicStats = {
  totaal_gelogde_wedstrijden: number;
  gemiddeld_winstpercentage: number;
  actieve_spelers: number;
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: publicStats } = (await supabase
    .rpc("get_public_app_stats")
    .maybeSingle()) as { data: PublicStats | null };

  const stats = [
    [
      publicStats?.totaal_gelogde_wedstrijden != null
        ? String(publicStats.totaal_gelogde_wedstrijden)
        : "—",
      "Gelogde wedstrijden",
    ],
    [
      publicStats?.gemiddeld_winstpercentage != null
        ? `${Math.round(Number(publicStats.gemiddeld_winstpercentage))}%`
        : "—",
      "Gem. gewonnen",
    ],
    [
      publicStats?.actieve_spelers != null
        ? String(publicStats.actieve_spelers)
        : "—",
      "Actieve spelers",
    ],
  ];

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-5xl">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="hidden rounded-[32px] border border-[rgba(10,17,39,0.08)] bg-[rgba(255,255,255,0.72)] p-8 shadow-[0_25px_60px_rgba(10,17,39,0.06)] backdrop-blur-sm lg:flex lg:flex-col lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-[var(--muted)]">
              TTLog
            </p>
            <h1 className="mt-4 max-w-md text-5xl font-black tracking-[-0.08em] text-[var(--ink)]">
              Houd je tafeltennisseizoen overzichtelijk bij.
            </h1>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {stats.map(([value, label]) => (
              <div
                key={label}
                className="rounded-2xl bg-[var(--bg)] p-4 ring-1 ring-[rgba(22,20,31,0.06)]"
              >
                <div className="text-2xl font-bold text-[var(--ink)]">
                  {value}
                </div>
                <div className="mt-1 text-sm text-[var(--muted)]">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <Card className="w-full max-w-md justify-self-center border-[rgba(10,17,39,0.08)] bg-[rgba(255,255,255,0.8)] p-0 shadow-[0_25px_60px_rgba(10,17,39,0.08)] backdrop-blur-sm">
          <CardHeader className="px-6 pb-4 pt-7">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-[var(--muted)]">
              Inloggen
            </p>
            <CardTitle className="mt-2 text-3xl font-black tracking-[-0.05em]">
              Welkom terug
            </CardTitle>
            <CardDescription>
              Log in met je account om je wedstrijden te beheren.
            </CardDescription>
          </CardHeader>

          <CardContent className="px-6 pb-7">
            {params.error && (
              <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {params.error}
              </p>
            )}
            {params.message && (
              <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {params.message}
              </p>
            )}

            <form className="space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-[var(--muted)]"
                >
                  Email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="jij@email.com"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-[var(--muted)]"
                >
                  Wachtwoord
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" formAction={login} className="flex-1">
                  Inloggen
                </Button>
                <Button
                  type="submit"
                  formAction={signup}
                  variant="secondary"
                  className="flex-1"
                >
                  Registreren
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        </div>
        <div className="mt-8">
          <AppFooter />
        </div>
      </div>
    </main>
  );
}
