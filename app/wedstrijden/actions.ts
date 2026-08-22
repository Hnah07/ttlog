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
  redirect(`/wedstrijden?error=${encodeURIComponent(message)}`);
}

function parseScores(formData: FormData): Score[] {
  const scores: Score[] = [];

  for (let setNumber = 1; setNumber <= 5; setNumber += 1) {
    const ownText = String(
      formData.get(`eigen_score_${setNumber}`) ?? "",
    ).trim();
    const opponentText = String(
      formData.get(`tegenstander_score_${setNumber}`) ?? "",
    ).trim();
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

  if (scores.length < 3) fail("Vul minstens drie sets in.");
  return scores;
}

export async function updateMatch(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const matchId = String(formData.get("wedstrijd_id") ?? "").trim();
  const location = String(formData.get("locatie") ?? "");
  const date = String(formData.get("datum") ?? "");
  const ownRanking = String(
    formData.get("eigen_klassement_snapshot") ?? "",
  ).trim();
  const note = String(formData.get("notitie_tekst") ?? "").trim();
  if (!matchId || !["thuis", "uit"].includes(location))
    fail("Kies een geldige locatie.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail("Kies een geldige datum.");
  if (!ownRanking) fail("Kies een geldig klassement.");

  const scores = parseScores(formData);
  const won =
    scores.filter((score) => score.eigen_score > score.tegenstander_score)
      .length >
    scores.filter((score) => score.eigen_score < score.tegenstander_score)
      .length;

  const { data: match, error: matchError } = await supabase
    .from("wedstrijden")
    .update({
      locatie: location,
      datum: date,
      notitie_tekst: note,
      eigen_klassement_snapshot: ownRanking,
      gewonnen: won,
    })
    .eq("id", matchId)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();
  if (matchError || !match) fail("De wedstrijd kon niet worden gewijzigd.");

  const { error: deleteSetsError } = await supabase
    .from("sets")
    .delete()
    .eq("wedstrijd_id", matchId);
  if (deleteSetsError) fail("De oude setstand kon niet worden vervangen.");
  const { error: setsError } = await supabase
    .from("sets")
    .insert(scores.map((score) => ({ wedstrijd_id: matchId, ...score })));
  if (setsError) fail("De nieuwe setstand kon niet worden opgeslagen.");

  revalidatePath("/wedstrijden");
  revalidatePath("/");
  revalidatePath("/statistieken");
  redirect("/wedstrijden?message=Wedstrijd gewijzigd");
}

export async function deleteMatch(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const matchId = String(formData.get("wedstrijd_id") ?? "").trim();
  if (!matchId) fail("Ongeldige wedstrijd.");

  const { error: setsError } = await supabase
    .from("sets")
    .delete()
    .eq("wedstrijd_id", matchId);
  if (setsError) fail("De setstand kon niet worden verwijderd.");
  const { data: match, error: matchError } = await supabase
    .from("wedstrijden")
    .delete()
    .eq("id", matchId)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();
  if (matchError || !match) fail("De wedstrijd kon niet worden verwijderd.");

  revalidatePath("/wedstrijden");
  revalidatePath("/");
  revalidatePath("/statistieken");
  redirect("/wedstrijden?message=Wedstrijd verwijderd");
}
