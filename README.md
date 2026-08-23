# ttlog 🏓

Persoonlijke tafeltennis-logboek app. Houdt bij tegen wie ik speel, mijn
klassement en dat van mijn tegenstander op het moment van de wedstrijd, waar
er gespeeld werd (thuis/uit), setstanden, en statistieken per seizoen.

Live: [ttlog-five.vercel.app](https://ttlog-five.vercel.app)

## Waarom dit bestaat

Ik speel competitief tafeltennis (Antwerpse provinciale competitie via
[Sporta](https://ttonline.sporta.be)) en wou een simpele, persoonlijke manier
om per wedstrijd bij te houden hoe het ging - inclusief het klassement van
mezelf en mijn tegenstander op dat moment, want dat verandert elk seizoen.

## Features

- 🔐 Login/registratie (Supabase Auth)
- 🏓 Wedstrijden loggen: tegenstander, klassement (van jezelf én de
  tegenstander, bevroren op het moment van invoer), locatie (thuis/uit),
  setstanden, notities
- 🙋 "Claim je naam": link je account aan je eigen naam in de spelersdata,
  zodat de app automatisch je club en klassement kent
- 📊 Statistieken per seizoen: winst/verlies, thuis/uit, gemiddeld
  klassement tegenstander
- 📈 Progressiegrafieken: rollend winpercentage over tijd, klassement van
  tegenstanders over tijd
- 🎯 Motiverend "volgend doel"-blok, gebaseerd op eigen voortgang (niet
  enkel winst-aantal - ook relevant als je (nog) niet veel wint)
- 🔄 Seizoenen worden automatisch aangemaakt elke 1 juli (via `pg_cron`)

## Tech stack

- [Next.js](https://nextjs.org) (App Router, TypeScript)
- [Supabase](https://supabase.com) (Postgres, Auth, Row Level Security)
- [Tailwind CSS](https://tailwindcss.com)
- [Recharts](https://recharts.org) voor de statistiekgrafieken
- Node.js import-script (axios + cheerio) voor spelersdata

## Databaseschema

Zie [`PROJECT-OVERZICHT.md`](./PROJECT-OVERZICHT.md) voor het volledige
schema, businessregels en architectuurkeuzes (snapshot-patroon, claim-
mechanisme, seizoenslogica, ...).

Belangrijkste tabellen: `clubs`, `personen`, `klassementen`, `seizoenen`,
`wedstrijden`, `sets`. Views: `statistieken_per_seizoen`,
`wedstrijden_met_setstand`.

## Aan de slag

### Vereisten

- Node.js 20+
- Een Supabase project

### Installatie

```bash
git clone https://github.com/Hnah07/ttlog.git
cd ttlog
npm install
```

### Environment variables

Maak `.env.local` aan in de root:

```
NEXT_PUBLIC_SUPABASE_URL=https://jouwproject.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=jouw-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Database opzetten

Run de SQL-bestanden in de Supabase SQL Editor (in deze volgorde, indien je
vanaf nul begint - zie de losse migratiebestanden voor de exacte historiek
als je een bestaand project bijwerkt):

1. Basisschema (tabellen, RLS-policies, views)
2. `insert-klassementen.sql` — vult de klassementenschaal (NG t.e.m. A)
3. Seizoenen-migratie — maakt de `seizoenen`-tabel en zet `pg_cron` op voor
   automatische jaarlijkse aanmaak (vereist de `pg_cron`-extensie: zet die
   aan via Database → Extensions in Supabase vóór je dit runt)

### Development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment

Automatisch gedeployed op [Vercel](https://vercel.com) via de `main`-branch.

## Licentie

Persoonlijk project, geen licentie voorzien.
