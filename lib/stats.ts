export type StatisticsMatch = {
  id: string;
  datum: string;
  gewonnen: boolean;
  locatie: "thuis" | "uit";
  seizoen_id: string;
  eigen_klassement_snapshot: string | null;
  klassement_snapshot: string | null;
};
export type StatisticsSet = {
  wedstrijd_id: string;
  eigen_score: number;
  tegenstander_score: number;
};

export type SeasonReference = { id: string; naam: string };
export type RankingReference = { code: string; volgorde: number };

export type SeasonSummary = {
  seizoen: string;
  wedstrijden: number;
  gewonnen: number;
  verloren: number;
  thuis: number;
  uit: number;
  gemiddeldKlassement: string;
};

export type ProgressionPoint = { wedstrijdNummer: number; winratio: number };
export type ChallengePoint = {
  wedstrijdNummer: number;
  datum: string;
  seizoen: string;
  klassementVerschil: number;
};

export type StatisticsData = {
  summaries: SeasonSummary[];
  setBalance: { seizoen: string; gewonnen: number; verloren: number }[];
  challenges: ChallengePoint[];
};

export function buildStatistics(
  matches: StatisticsMatch[],
  seasons: SeasonReference[],
  rankings: RankingReference[],
  sets: StatisticsSet[],
): StatisticsData {
  const seasonNames = new Map(
    seasons.map((season) => [String(season.id), season.naam]),
  );
  const rankingCodes = new Map(
    rankings.map((ranking) => [ranking.volgorde, ranking.code]),
  );
  const rankingOrder = new Map(
    rankings.map((ranking) => [ranking.code, ranking.volgorde]),
  );
  const grouped = new Map<string, StatisticsMatch[]>();

  for (const match of matches) {
    const current = grouped.get(String(match.seizoen_id)) ?? [];
    current.push(match);
    grouped.set(String(match.seizoen_id), current);
  }

  const summaries = [...grouped.entries()]
    .sort(([, first], [, second]) =>
      first[0].datum.localeCompare(second[0].datum),
    )
    .map(([seasonId, seasonMatches]) => {
      const opponentOrders = seasonMatches
        .map((match) => rankingOrder.get(match.klassement_snapshot ?? ""))
        .filter((order): order is number => order !== undefined);
      const averageOrder = opponentOrders.length
        ? Math.round(
            opponentOrders.reduce((sum, order) => sum + order, 0) /
              opponentOrders.length,
          )
        : null;

      return {
        seizoen: seasonNames.get(seasonId) ?? "Onbekend seizoen",
        wedstrijden: seasonMatches.length,
        gewonnen: seasonMatches.filter((match) => match.gewonnen).length,
        verloren: seasonMatches.filter((match) => !match.gewonnen).length,
        thuis: seasonMatches.filter((match) => match.locatie === "thuis")
          .length,
        uit: seasonMatches.filter((match) => match.locatie === "uit").length,
        gemiddeldKlassement:
          averageOrder === null ? "-" : (rankingCodes.get(averageOrder) ?? "-"),
      };
    });

  const matchSeasons = new Map(
    matches.map((match) => [match.id, String(match.seizoen_id)]),
  );
  const setCounts = new Map<string, { gewonnen: number; verloren: number }>();
  for (const set of sets) {
    const seasonId = matchSeasons.get(String(set.wedstrijd_id));
    if (!seasonId) continue;
    const count = setCounts.get(seasonId) ?? { gewonnen: 0, verloren: 0 };
    if (set.eigen_score > set.tegenstander_score) count.gewonnen += 1;
    else if (set.eigen_score < set.tegenstander_score) count.verloren += 1;
    setCounts.set(seasonId, count);
  }
  const setBalance = [...grouped.keys()]
    .filter((seasonId) => setCounts.has(seasonId))
    .map((seasonId) => ({
      seizoen: seasonNames.get(seasonId) ?? "Onbekend seizoen",
      ...setCounts.get(seasonId)!,
    }));

  const challenges = [...matches]
    .sort((a, b) => a.datum.localeCompare(b.datum))
    .map((match, index) => ({
      wedstrijdNummer: index + 1,
      datum: match.datum,
      seizoen: seasonNames.get(String(match.seizoen_id)) ?? "Onbekend seizoen",
      klassementVerschil:
        (rankingOrder.get(match.eigen_klassement_snapshot ?? "") ?? 0) -
        (rankingOrder.get(match.klassement_snapshot ?? "") ?? 0),
    }));

  return { summaries, setBalance, challenges };
}
