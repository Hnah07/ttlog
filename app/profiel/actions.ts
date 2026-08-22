"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function claimPerson(formData: FormData) {
  const personId = String(formData.get("person_id") ?? "").trim();

  if (!personId) {
    redirect("/profiel?error=Ongeldige+speler");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("personen")
    .update({ claimed_by_user_id: user.id })
    .eq("id", personId)
    .is("claimed_by_user_id", null)
    .select("id");

  if (error || !data?.length) {
    redirect(
      "/profiel?error=" +
        encodeURIComponent("Deze speler kon niet worden geclaimd."),
    );
  }

  revalidatePath("/profiel");
  revalidatePath("/nieuw-wedstrijd");
  redirect("/profiel?message=Je+naam+is+geclaimd");
}
