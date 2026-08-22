import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Gebruik deze client in Server Components, Server Actions en Route Handlers
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll wordt soms aangeroepen vanuit een Server Component,
            // wat niet mag in Next.js. Dat is oké zolang je middleware.ts
            // (hieronder) de sessie ververst - dit try/catch voorkomt
            // dat de app crasht op die aanroep.
          }
        },
      },
    }
  )
}
