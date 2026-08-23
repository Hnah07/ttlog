import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <section className="w-full max-w-md rounded-[28px] border border-[rgba(10,17,39,0.08)] bg-[rgba(255,255,255,0.8)] p-6 text-center shadow-[0_25px_60px_rgba(10,17,39,0.08)] backdrop-blur-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          TTLog
        </p>
        <h1 className="mt-3 text-3xl font-black text-[var(--ink)]">
          Je bent offline
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          Maak opnieuw verbinding met internet om je wedstrijden te bekijken of
          toe te voegen.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[var(--accent)] px-4 text-sm font-medium text-white"
        >
          Opnieuw proberen
        </Link>
      </section>
    </main>
  );
}
