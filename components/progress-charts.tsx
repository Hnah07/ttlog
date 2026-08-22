"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { ChallengePoint } from "@/lib/stats";

const axisStyle = { fill: "#56627a", fontSize: 11 };

function ChartTooltip({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string | number;
  unit?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-[rgba(10,17,39,0.08)] bg-white px-3 py-2 text-xs shadow-[0_12px_30px_rgba(10,17,39,0.14)]">
      <div className="mb-1 font-semibold text-[var(--ink)]">
        Wedstrijd {label}
      </div>
      {payload.map((entry) => (
        <div
          key={entry.name}
          className="flex items-center gap-2 text-[var(--muted)]"
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span>{entry.name}</span>
          <span className="ml-auto font-semibold text-[var(--ink)]">
            {entry.value}
            {unit}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ProgressCharts({
  setBalance,
  challenges,
}: {
  setBalance: { seizoen: string; gewonnen: number; verloren: number }[];
  challenges: ChallengePoint[];
}) {
  if (setBalance.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[rgba(10,17,39,0.12)] bg-[var(--bg)] p-8 text-center text-sm text-[var(--muted)]">
        Log wedstrijden om je progressie te zien.
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="rounded-2xl border border-[rgba(10,17,39,0.08)] bg-[rgba(255,255,255,0.78)] p-5 shadow-[0_18px_45px_rgba(10,17,39,0.04)]">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-black tracking-[-0.04em] text-[var(--ink)]">
              Setbalans per seizoen
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Hoeveel sets je gewonnen en verloren hebt per seizoen
            </p>
          </div>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={setBalance}
              margin={{ top: 8, right: 12, left: -12, bottom: 4 }}
            >
              <CartesianGrid stroke="rgba(10,17,39,0.06)" vertical={false} />
              <XAxis
                dataKey="seizoen"
                tick={axisStyle}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={axisStyle}
                axisLine={false}
                tickLine={false}
                width={42}
              />
              <Tooltip content={<ChartTooltip unit="" />} />
              <Bar
                dataKey="gewonnen"
                name="Sets gewonnen"
                fill="#093fb4"
                radius={[5, 5, 0, 0]}
              />
              <Bar
                dataKey="verloren"
                name="Sets verloren"
                fill="#ed3500"
                radius={[5, 5, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border border-[rgba(10,17,39,0.08)] bg-[rgba(255,255,255,0.78)] p-5 shadow-[0_18px_45px_rgba(10,17,39,0.04)]">
        <div className="mb-4">
          <h2 className="font-black tracking-[-0.04em] text-[var(--ink)]">
            Uitdaging per wedstrijd
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Jouw klassement minus dat van je tegenstander
          </p>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={challenges}
              margin={{ top: 8, right: 12, left: -12, bottom: 4 }}
            >
              <CartesianGrid stroke="rgba(10,17,39,0.06)" vertical={false} />
              <XAxis
                dataKey="wedstrijdNummer"
                allowDecimals={false}
                tick={axisStyle}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={axisStyle}
                axisLine={false}
                tickLine={false}
                width={32}
              />
              <ReferenceLine y={0} stroke="rgba(10,17,39,0.2)" />
              <Tooltip content={<ChartTooltip unit="" />} />
              <Bar
                dataKey="klassementVerschil"
                name="Klassementsverschil"
                fill="#ed3500"
                radius={[5, 5, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
