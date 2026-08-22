# Tafeltennis-app — projectoverzicht

Personal-use app om bijgehouden tafeltenniswedstrijden te loggen: tegen wie
gespeeld, klassement (van jezelf en tegenstander) op dat moment, waar
gespeeld, en statistieken per seizoen.

## Stack

- Next.js (App Router) + TypeScript
- Supabase (Postgres + Auth), via `@supabase/ssr`
- Data van tegenstanders komt uit een eigen scraper van ttonline.sporta.be
  (provincie Antwerpen)

## Status

- ✅ Database-schema staat volledig in Supabase (zie hieronder)
- ✅ Auth (login/registratie) werkt, met server actions in
  `app/auth/actions.ts`, clients in `lib/supabase/client.ts` en
  `lib/supabase/server.ts`, sessie-refresh via `middleware.ts` (ondertussen
  hernoemd naar de nieuwe `proxy.ts`-conventie in recente Next.js-versies)
- ✅ Database gevuld met clubs + personen (klassementen) via scraper +
  import-script
- ❌ Nog te bouwen: alle overige frontend-pagina's (zie "Te bouwen" onderaan)

## Databaseschema (huidige staat, na alle migraties)

```sql
-- Referentiedata (gevuld via scraper, read-only voor gewone users via RLS)
clubs (id, naam)
klassementen (code, volgorde)          -- NG, F, E6..E0, D6..D0, C6..C0, B6..B0, A
personen (id, naam, external_id, club_id, klassement_code, claimed_by_user_id, updated_at)
seizoenen (id, naam, start_datum, eind_datum)  -- bv. "2026-2027", auto-aangemaakt elke 1 juli via pg_cron

-- User-data (RLS: enkel eigen rijen zichtbaar/bewerkbaar)
wedstrijden (
  id, user_id, tegenstander_id,
  club_naam_snapshot,        -- snapshot van tegenstander's club op moment van invoer
  klassement_snapshot,       -- snapshot van tegenstander's klassement
  eigen_klassement_snapshot, -- snapshot van jouw eigen klassement
  locatie ('thuis' | 'uit'),
  seizoen_id,
  datum, notitie_tekst, gewonnen, created_at
)
sets (id, wedstrijd_id, set_nummer [1-5], eigen_score, tegenstander_score)

-- Views
statistieken_per_seizoen  -- per user+seizoen: aantal, gewonnen, verloren, thuis, uit
wedstrijden_met_setstand  -- wedstrijden + eigen_sets_gewonnen/tegenstander_sets_gewonnen
```

## Belangrijke businessregels

1. **Snapshot-patroon**: `club_naam_snapshot`, `klassement_snapshot` en
   `eigen_klassement_snapshot` op `wedstrijden` zijn bevroren op het moment
   van invoer. Als een speler later van club/klassement verandert, blijven
   oude wedstrijden ongewijzigd correct. Bij het aanmaken van een nieuwe
   wedstrijd: haal de _huidige_ waarden op uit `personen` en kopieer ze naar
   deze snapshot-kolommen, gebruik ze niet als live foreign key voor weergave.

2. **"Claim je naam"**: `personen.claimed_by_user_id` laat een ingelogde
   user toe om zijn eigen naam in de gescrapete lijst aan zijn account te
   linken (via een `update personen set claimed_by_user_id = auth.uid()
where id = ... and claimed_by_user_id is null`). Zo weet de app wie
   "jij" bent zonder apart profiel-formulier. RLS-policy staat dit al toe
   (enkel als het veld nog leeg is, of als het al van jezelf is).

3. **Setstand**: geen aparte kolom, altijd afleiden uit de `sets`-tabel
   (zie `wedstrijden_met_setstand`-view). Max 5 sets per wedstrijd
   (DB-constraint).

4. **Seizoenen**: bij het invullen van een nieuwe wedstrijd toon je een
   dropdown met de 2 meest recente seizoenen
   (`select * from seizoenen order by start_datum desc limit 2`), met de
   nieuwste als default. Gebruiker kan niet ouder kiezen.

5. **Klassementen zijn ordinaal**: gebruik `klassementen.volgorde` om te
   sorteren/vergelijken (niet de tekstcode `code`), bv. voor "gemiddeld
   klassement van tegenstanders" of het sorteren van een dropdown.

6. **Locatie ('thuis'/'uit') heeft geen aparte clubnaam nodig**: bij
   `thuis` haal je jouw eigen club op via je claim (`select club_id from
personen where claimed_by_user_id = auth.uid()`) - NIET hardcoden,
   want dit moet correct blijven werken voor eender welke gebruiker/club.
   Bij `uit` is dat gewoon dezelfde `club_naam_snapshot` die je toch al
   invult zodra je een tegenstander kiest. Geen extra kolom nodig - puur
   een UI-detail bij het tonen ("Thuis ({eigen club via claim})" vs
   "Uit ({club_naam_snapshot})").

7. **Claim is verplicht vóór je een wedstrijd kan aanmaken**: zonder
   geclaimde `personen`-rij is er geen `club_id` (voor "thuis") en geen
   `klassement_code` (voor `eigen_klassement_snapshot`) om vanuit te
   vertrekken. UI-gedrag: check bij het laden van de "nieuwe
   wedstrijd"-pagina of `personen where claimed_by_user_id = auth.uid()`
   een resultaat geeft; zo niet, toon een melding/redirect naar de
   claim-stap op de profielpagina in plaats van het formulier te tonen.

## Dropdown-flow bij het aanmaken van een wedstrijd

Vereenvoudigd (geen ploeg-tussenstap, dat bleek niet betrouwbaar te
scrapen):

1. Kies **club** (`select * from clubs order by naam`)
2. Kies **persoon** binnen die club (`select * from personen where club_id
= ... order by naam`) — toon klassement erbij in de lijst
3. Vul **eigen klassement** in (default: opzoeken via `personen where
claimed_by_user_id = auth.uid()`, indien geclaimed)
4. Vul **locatie**, **datum**, **seizoen** (dropdown, zie regel 4 hierboven),
   **sets** (1 t.e.m. 5, elk met score), **notitie_tekst** in
5. `gewonnen` afleiden uit de sets (meeste sets gewonnen) of apart laten
   aanvinken — projectkeuze, nog te bepalen in de UI

## Te bouwen (frontend)

- [ ] Dashboard/homepage: lijst van recente wedstrijden
- [ ] "Nieuwe wedstrijd"-formulier met de dropdown-flow hierboven +
      dynamische sets-invoer (1 t.e.m. 5 rijen, elk eigen_score/tegenstander_score)
- [ ] Wedstrijd-detail/edit-pagina
- [ ] Profielpagina: "claim je naam" (zoek+selecteer uit `personen` als nog
      niet geclaimed - VERPLICHTE stap, zie businessregel 7 hierboven), en
      overzicht van eigen statistieken
- [ ] Statistiekenpagina per seizoen (gebruik `statistieken_per_seizoen`-view):
      aantal wedstrijden, gewonnen/verloren, thuis/uit, gemiddeld klassement
      tegenstander (via join met `klassementen.volgorde`)
- [ ] Navigatie/layout met logout-knop (server action `logout` bestaat al
      in `app/auth/actions.ts`)

## Losse scripts (niet in de Next.js-app zelf, apart gedraaid)

- `scraper/scrape-ttonline.js` — haalt clubs+personen op uit ttonline.sporta.be
  (provincie Antwerpen), schrijft naar `data/club-*.json` +
  `clubs-overview.json`
- `scraper/import-to-supabase.js` — leest die JSON, zet namen om naar
  "Voornaam Achternaam", upsert naar Supabase (`clubs`, `personen`) via
  service_role key, met `external_id` (federatienummer) als stabiele
  upsert-sleutel

# "Volgend doel"-blok — spec

## Uitgangspunt

Focus op **vooruitgang en moeite**, niet enkel op gewonnen wedstrijden. Zeker
voor iemand die weinig wint, is "aantal overwinningen" een demotiverende
maatstaf. Sets-niveau data (je hebt dit al: `sets`-tabel) laat toe om ook
kleine progressie te belonen binnen verloren wedstrijden.

## Kandidaat-doelen (in prioriteitsvolgorde)

Het blok toont steeds het EERSTE doel in onderstaande lijst dat van
toepassing is - zo krijg je altijd iets haalbaars en positief te zien,
nooit "0 van de 12 gewonnen".

### 1. Eerste winst van het seizoen (indien nog geen enkele winst)

```sql
select count(*) as wins
from wedstrijden
where user_id = auth.uid() and seizoen_id = :huidig_seizoen_id and gewonnen = true;
```

Tekst: "Nog geen winst dit seizoen, maar daar zal je snel verandering in brengen!"

### 2. Dichtste wedstrijd verbeteren (kleinste setverschil in een verlies)

```sql
select w.id, wms.eigen_sets_gewonnen, wms.tegenstander_sets_gewonnen,
       (wms.tegenstander_sets_gewonnen - wms.eigen_sets_gewonnen) as verschil
from wedstrijden_met_setstand wms
join wedstrijden w on w.id = wms.id
where w.user_id = auth.uid() and w.gewonnen = false
order by verschil asc
limit 1;
```

Tekst: bv. "Je verloor laatst met maar 1 set verschil, volgende keer beter!"

### 3. Sets gewonnen deze maand (progressie tonen, los van matchresultaat)

```sql
select count(*) as sets_gewonnen
from sets s
join wedstrijden w on w.id = s.wedstrijd_id
where w.user_id = auth.uid()
  and w.datum >= date_trunc('month', current_date)
  and s.eigen_score > s.tegenstander_score;
```

Tekst: bv. "5 sets gewonnen deze maand, kan je naar 8?"
(doel = vorige-maand-waarde + een haalbare marge, bv. +3)

### 4. Sterkste tegenstander waarvan je al sets gepakt hebt

```sql
select w.id, w.klassement_snapshot, k.volgorde
from wedstrijden w
join sets s on s.wedstrijd_id = w.id
join klassementen k on k.code = w.klassement_snapshot
where w.user_id = auth.uid() and s.eigen_score > s.tegenstander_score
order by k.volgorde desc
limit 1;
```

Tekst: bv. "Je pakte al een set van een B4-speler, dat is niet niks!"

### 5. Fallback: winstreak (enkel tonen als er effectief wat te vieren valt)

```sql
-- laatste x wedstrijden op rij gewonnen, aflopend vanaf de meest recente
select w.gewonnen, w.datum
from wedstrijden w
where w.user_id = auth.uid()
order by w.datum desc
limit 10;
-- in de app: tel opeenvolgende 'true' vanaf het begin van deze lijst
```

Tekst: "3 op rij gewonnen, ga voor 4!"
(dit is de enige puur winst-gebaseerde tekst, en enkel tonen als streak >= 2)

## Implementatie-aanpak

Bouw dit als één server-side functie (bv. `lib/doelen.ts`) die de queries
hierboven na elkaar afgaat (in prioriteitsvolgorde) en de eerste match
teruggeeft als `{ titel, tekst, icoon }`. Render dat resultaat in het
bestaande kaart-component (het gradient-blok dat VS Code al gemaakt heeft) -
enkel de tekst/titel wordt dynamisch, de styling blijft hetzelfde.

# Progressie-grafiek — spec

## Aanbevolen library

`recharts` — werkt vlot met React/Next.js, licht, goed gedocumenteerd.
`npm install recharts`

## Grafiek 1 (hoofdgrafiek): rollend winpercentage over tijd

**Waarom rollend gemiddelde i.p.v. ruwe data**: 1 losse winst/verlies zegt
weinig, een trend over je laatste ~5 wedstrijden toont wél vooruitgang -
en blijft motiverend ook als je totale winratio nog laag is.

**Data ophalen** (haal alle wedstrijden op, sorteer op datum, bereken het
rollend gemiddelde client-side - simpeler dan een SQL window function en je
hebt toch weinig data per user):

```sql
select w.datum, w.gewonnen, s.naam as seizoen
from wedstrijden w
join seizoenen s on s.id = w.seizoen_id
where w.user_id = auth.uid()
order by w.datum asc;
```

**Rollend gemiddelde berekenen (in de frontend, bv. `lib/stats.ts`)**:

```ts
function rollendGemiddelde(
  wedstrijden: { datum: string; gewonnen: boolean }[],
  window = 5,
) {
  return wedstrijden.map((_, i) => {
    const slice = wedstrijden.slice(Math.max(0, i - window + 1), i + 1);
    const winratio = slice.filter((w) => w.gewonnen).length / slice.length;
    return {
      datum: wedstrijden[i].datum,
      winratio: Math.round(winratio * 100),
    };
  });
}
```

**Weergave**: één lijn per seizoen (aparte kleur), x-as = wedstrijdvolgnummer
binnen het seizoen (niet de kalenderdatum, anders lopen seizoenen niet
mooi naast elkaar), y-as = winpercentage 0-100%. Zo vergelijk je meteen
"hoe snel kwam ik op gang dit seizoen t.o.v. vorig seizoen".

`<LineChart>` met per seizoen een `<Line dataKey="winratio">`, data
gegroepeerd per seizoen met `wedstrijd_nummer` (1, 2, 3...) als gedeelde x-as.

## Grafiek 2 (bonus, zelfde pagina): speel ik tegen sterkere tegenstanders?

Toont per wedstrijd het verschil in klassement (jij vs tegenstander) over
tijd - stijgt dat, dan daagt je niveau effectief uit.

```sql
select
  w.datum,
  s.naam as seizoen,
  (keig.volgorde - kteg.volgorde) as klassement_verschil
from wedstrijden w
join seizoenen s on s.id = w.seizoen_id
join klassementen keig on keig.code = w.eigen_klassement_snapshot
join klassementen kteg on kteg.code = w.klassement_snapshot
where w.user_id = auth.uid()
order by w.datum asc;
```

Positief verschil = jij was hoger geklasseerd dan je tegenstander (dus
"makkelijkere" match op papier); negatief = je daagde jezelf uit tegen
een sterkere speler. Toon als `<BarChart>` met positieve/negatieve balken
(bv. groen/oranje), of als lijn met een 0-referentielijn.

## Plaatsing

Zet beide grafieken op de statistiekenpagina, onder de bestaande
per-seizoen-kaarten die je al hebt. Gebruik dezelfde kleuren/stijl
(`var(--accent2)`, `var(--ink)`, `var(--muted)`, `var(--bg)`) zodat het
visueel aansluit bij wat VS Code al gegenereerd heeft.
