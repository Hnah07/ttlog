import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Supabase stuurt de gebruiker hierheen na het klikken op de bevestigingslink in de mail
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}/`);
}
