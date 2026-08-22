"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type Score = {
  set_nummer: number;
  eigen_score: number;
  tegenstander_score: number;
};

function fail(message: string): never {
  redirect(`/nieuw-wedstrijd?error=${encodeURIComponent(message)}`);
}

function parseScores(formData: FormData): Score[] {
  const scores: Score[] = [];

  for (let setNumber = 1; setNumber <= 5; setNumber += 1) {
    const ownValue = formData.get(`eigen_score_${setNumber}`);
    const opponentValue = formData.get(`tegenstander_score_${setNumber}`);
    const ownText = String(ownValue ?? "").trim();
    const opponentText = String(opponentValue ?? "").trim();

    if (!ownText && !opponentText) continue;

    const eigenScore = Number(ownText);
    const tegenstanderScore = Number(opponentText);
    if (
      !Number.isInteger(eigenScore) ||
      !Number.isInteger(tegenstanderScore) ||
      eigenScore < 0 ||
      tegenstanderScore < 0 ||
      eigenScore > 30 ||
      tegenstanderScore > 30 ||
      eigenScore === tegenstanderScore
    ) {
      fail(`Vul geldige scores in voor set ${setNumber}.`);
    }

    scores.push({
      set_nummer: setNumber,
      eigen_score: eigenScore,
      tegenstander_score: tegenstanderScore,
    });
  }

  if (scores.length < 3) {
    fail("Vul minstens drie sets in.");
  }

  const eigenSetsGewonnen = scores.filter(
    (score) => score.eigen_score > score.tegenstander_score,
  ).length;
  const tegenstanderSetsGewonnen = scores.length - eigenSetsGewonnen;

  if (eigenSetsGewonnen === tegenstanderSetsGewonnen) {
    fail("De setstand kan niet gelijk eindigen.");
  }

  return scores;
}

export async function createMatch(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const opponentId = String(formData.get("tegenstander_id") ?? "").trim();
  const clubId = String(formData.get("club_id") ?? "").trim();
  const location = String(formData.get("locatie") ?? "");
  const date = String(formData.get("datum") ?? "");
  const seasonId = String(formData.get("seizoen_id") ?? "").trim();
  const note = String(formData.get("notitie_tekst") ?? "").trim();

  if (!opponentId || !clubId || !["thuis", "uit"].includes(location)) {
    fail("Kies een club, tegenstander en locatie.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    fail("Kies een geldige datum.");
  }
  if (!seasonId) {
    fail("Kies een geldig seizoen.");
  }

  const scores = parseScores(formData);
  const [claimedResult, opponentResult, clubsResult, seasonsResult] =
    await Promise.all([
      supabase
        .from("personen")
        .select("club_id, klassement_code")
        .eq("claimed_by_user_id", user.id)
        .maybeSingle(),
      supabase
        .from("personen")
        .select("id, club_id, klassement_code")
        .eq("id", opponentId)
        .maybeSingle(),
      supabase.from("clubs").select("id, naam"),
      supabase
        .from("seizoenen")
        .select("id")
        .order("start_datum", { ascending: false })
        .limit(2),
    ]);

  if (claimedResult.error || !claimedResult.data) {
    fail("Claim eerst je speler op je profielpagina.");
  }
  if (opponentResult.error || !opponentResult.data) {
    fail("De gekozen tegenstander bestaat niet.");
  }
  const opponent = opponentResult.data;
  if (String(opponent.club_id) !== clubId) {
    fail("De gekozen tegenstander hoort niet bij de gekozen club.");
  }
  if (clubsResult.error || !clubsResult.data) {
    fail("De clubgegevens konden niet worden geladen.");
  }
  if (
    seasonsResult.error ||
    !seasonsResult.data?.some((season) => String(season.id) === seasonId)
  ) {
    fail("Kies een van de twee meest recente seizoenen.");
  }

  const opponentClub = clubsResult.data.find(
    (club) => club.id === opponent.club_id,
  );
  if (!opponentClub) fail("De club van de tegenstander bestaat niet.");

  const { data: match, error: matchError } = await supabase
    .from("wedstrijden")
    .insert({
      user_id: user.id,
      tegenstander_id: opponent.id,
      club_naam_snapshot: opponentClub.naam,
      klassement_snapshot: opponent.klassement_code,
      eigen_klassement_snapshot: claimedResult.data.klassement_code,
      locatie: location,
      seizoen_id: seasonId,
      datum: date,
      notitie_tekst: note,
      gewonnen:
        scores.filter((score) => score.eigen_score > score.tegenstander_score)
          .length >
        scores.filter((score) => score.eigen_score < score.tegenstander_score)
          .length,
    })
    .select("id")
    .single();

  if (matchError || !match) {
    fail("De wedstrijd kon niet worden opgeslagen.");
  }

  const { error: setsError } = await supabase.from("sets").insert(
    scores.map((score) => ({
      wedstrijd_id: match.id,
      ...score,
    })),
  );

  if (setsError) {
    await supabase.from("wedstrijden").delete().eq("id", match.id);
    fail("De wedstrijd kon niet volledig worden opgeslagen.");
  }

  revalidatePath("/");
  revalidatePath("/wedstrijden");
  revalidatePath("/statistieken");
  redirect("/nieuw-wedstrijd?message=Wedstrijd opgeslagen");
}
