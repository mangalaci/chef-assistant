# Megvalósítási terv

## Állapot

> Ezt a táblázatot minden fázis végén frissítjük. Az alatta lévő terv szövege
> a korábbi (Claude Desktop) sessionben készült, változtatás nélkül átvéve.

| Fázis | Tartalom | Állapot |
|---|---|---|
| 0 | Önálló projekt, futó alap | Kész – adatbázis fut, migrációk lefutottak, OpenAI kulcs és hálózat beállítva; `CHAT_MODEL` env (alapértelmezés `gpt-5-mini`) |
| 1 | Adatmodell + migrációk + HNSW index | Kész – `documents` + `embeddings` (FK cascade, HNSW, 3 btree index), migráció `0002`; a `resources` kód törölve |
| 2 | Chunking modul | Kész – `lib/ai/chunking.ts` + `pnpm chunk:preview`: 254 chunk, min. 52 karakter, 0 `other` (hw2: 442 / 4 / 93) |
| 3 | `POST /api/upload` + `POST /api/process` | Kész – feltöltés validációval (kiterjesztés, MIME, 1 MB, UTF-8, üres fájl), duplikátum felülírása; feldolgozás chunkolással, 96-os embedding-batchekkel, hibás dokumentum `failed` státusszal; curl-lel tesztelve |
| 4 | `GET /api/documents`, `DELETE /api/documents/:id`, 85 fájl betöltése | Kész – lista (`?status=` szűrővel, tartalom nélkül), törlés (a chunkok cascade-del törlődnek, ellenőrizve); `pnpm seed`: 85/85 recept, 254 chunk, 22,7 mp, 34 196 token ≈ $0,0007; újrafuttatva sem duplikál |
| 5 | Keresés, **reranking**, tool-ok, magyar séf system prompt | Kész – keresés (küszöb, max. 2 chunk/recept), cross-encoder reranking (1,5 mp betöltés, utána 0,5–1,5 mp/keresés), 4 tool, magyar séf prompt; mind az 5 tesztkérdés hallucináció nélkül (`docs/results/phase5-test-questions.md`) |
| 6 | Frontend | Kész – magyar chat (Markdown, 5 tesztkérdés gombként, „Forrás a gyűjteményből” nyom, leállítás/újrapróbálás, sticky beviteli mező), `/documents` (drag&drop, kliens-oldali előszűrés, feltöltés után automatikus feldolgozás, újrafeldolgozás, törlés megerősítéssel, keresés), mobilon kártyás lista; `next build` hibátlan, Playwrighttal tesztelve (`docs/screenshots/`) |
| 7 | Tesztelés és mérés | Kész – `docs/results/`: keresési pontosság (rerank: MRR 0,77 → 0,85; magyar lekérdezés: 0,20), chunking A/B, negatív esetek, válaszidő (gpt-5-mini átl. 7,2 mp, gpt-5 15,6 mp), system prompt A/B, skálázás 10k chunkig (pontos keresés ~50 ms, HNSW ~4 ms, 96–99% egyezés) |
| 8 | README + git history | – |

**Eltérés a tervhez képest:** a fejlesztés Claude Code felhős sessionben folyik, nem a helyi
Windows gépen. Az adatbázis a felhős környezetben is futtatható tesztelésre; a valódi
OpenAI-hívásokhoz ott is be kell állítani az `OPENAI_API_KEY`-t.

A feladatleírás: [`docs/hw3/ASSIGNMENT.md`](./hw3/ASSIGNMENT.md).
A hw2 megoldása: [`docs/hw2/hw2_rag_notebook.ipynb`](./hw2/hw2_rag_notebook.ipynb).

**Döntések a terv elfogadása után:**

- **Reranking (5. fázis, kötelező):** a vektorkeresés ~15–20 jelöltet hoz, ezeket a hw2-ben
  is használt cross-encoder (`Xenova/ms-marco-MiniLM-L-6-v2`, helyben, Node.js-ben) rendezi
  újra, és a legjobb 5–6 megy a modellhez. A „nincs találat” küszöb a vektoros hasonlóságon
  marad, mert a reranker pontszáma nem abszolút (hw2 tanulság). A 7. fázis méri a hatását
  (reranking nélkül vs. rerankinggel).
- **0. fázis, modellválasztás:** a `gpt-5` elérhető, de reasoning modellként lassú: egy egyszavas
  válasz 5,6–6,7 mp (192 reasoning token), a `gpt-5-mini` 1,6–2,1 mp. Ezért a chat modell a
  `CHAT_MODEL` env-ből jön, alapértelmezés `gpt-5-mini`; a 7. fázis mindkettőt méri.
- **5. fázis, mérések és döntések:**
  - Magyar kérdéssel a keresés sokkal gyengébb (legjobb hasonlóság 0,31–0,39, gyakran rossz
    recept), angollal 0,48–0,71. Ezért a `searchRecipes` angol lekérdezést kap, amit a modell ír.
  - A hasonlósági küszöb (0,3) csak a zajt szűri: a „spaghetti carbonara” 0,43-mal a *Dad's
    Spaghetti Sauce*-t hozza. Hogy egy találat tényleg releváns-e, azt a prompt alapján a modell ítéli meg.
  - A hw2 `category` heurisztikája ételtípusra megbízhatatlan (Channa Masala → side_dish,
    Enchilada Sauce → main_dish), ezért a vegetáriánus főételeknél a modell a `vegetarian`
    listából maga válogat.
  - Reranking (első összevetés, a 7. fázis méri pontosan): a „chicken breast” kérdésnél a
    *Chicken Schnitzel* (az egyetlen valódi csirkemelles recept) kerül előre, a „spicy food”
    csípős ételeket hoz csípős szószok helyett; a „vegetarian curry” viszont romlik (a névben
    „vegetarian” szót tartalmazó recepteket részesíti előnyben). Ugyanaz a vegyes kép, mint a hw2-ben.
  - A modell hajlamos kéretlen szűrőket adni a kereséshez (pl. easy + main_dish egy csirkés
    kérdésre → 0 találat); a prompt és a tool-leírás ezt most kifejezetten tiltja.
  - `REASONING_EFFORT` env (alapértelmezés `low`): ugyanarra a kérdésre medium 26,7 mp,
    low 9,1 mp, minimal 6,0 mp, hasonló minőséggel.
- **7. fázis, eredmények (részletek: `docs/results/`):**
  - Reranking angol lekérdezéssel: Hit@1 0,58 → 0,75, MRR 0,77 → 0,85, kb. +0,5–1 mp/keresés.
  - Magyar lekérdezés: MRR 0,20 (rerankinggel 0,34) – ez igazolja, hogy a modell angolul keres.
  - Chunking A/B: a starter `split('.')` darabolása nyers vektoros rangsorban jobb (MRR 0,88), de a
    legjobb chunkjai közül egyik sem nevezi meg a receptet (pl. „Add 1”), és rerankinggel romlik
    (0,82); a szekció-alapú + rerank 0,85, és minden chunk megnevezi a receptjét.
  - Negatív esetek: a legjobb negatív hasonlóság (0,43) csak 0,01-gyel marad el a leggyengébb
    pozitívtól (0,44), ezért a „nincs találat” döntést a modell hozza, nem egy küszöb.
  - Válaszidő (5 kérdés × 3): gpt-5-mini átl. 7,2 mp (első token 4,2 mp), gpt-5 átl. 15,6 mp
    (első token 10,2 mp, max. 31 mp) → a gpt-5-mini marad az alapértelmezés.
  - System prompt A/B: a starter prompt a két „nincs ilyen recept” kérdésre angolul „Sorry, I don't
    know.”-t mond, alternatíva nélkül, és szószt ajánl vegetáriánus főételnek; a séf prompt magyarul,
    1–3 valódi alternatívával és jelölt általános tudással válaszol.
  - Skálázás: 10 160 chunknál 160 MB (ebből 79 MB HNSW index), pontos keresés ~50 ms, HNSW ~4 ms
    96% (ef_search=40) / 98–99% (ef_search=100) egyezéssel. A Next.js szerver a rerankerrel ~800 MB RAM.
- **2. fázis:** az `info` és a `based on` szekció nem lesz önálló chunk (a hw2-ben ezek rövid,
  zajos találatok voltak); az `info` tartalma (idő, adag) minden chunk fejlécébe kerül, a
  `based on` linkjei a metaadatba (`sources`). Ezért lett ~440 helyett 254 chunk.
- **3. fázis:** a Drizzle 0.31 `jsonb()` oszlopa postgres.js-sel JSON *szövegként* mentette a
  metaadatot (dupla kódolás), ezért az `embeddings.metadata` saját `customType`-ot kapott.
  Hibakódok: 400 rossz kérés, 404 ismeretlen dokumentum, 422 egyik fájl sem érvényes, 500 szerverhiba.
- **2. fázis:** új metaadat a hw2-höz képest: `vegetarian` (kulcsszó-heurisztika a
  hozzávalókon, szigorú: pl. a csirkealaplé is kizáró) és `prepMinutes` (a hw2
  `parse_prep_minutes` logikája).

---

# hw3 — Recept RAG asszisztens webapp (`chef-assistant`)

## Kontextus

A 3. modul házi feladata: a hw2-ben Jupyter notebookban megépített recept-RAG prototípust
**működő webappá** kell alakítani — dokumentum-feltöltéssel, pgvector tárolással, testreszabott
system prompttal, chat felülettel és tesztelési jelentéssel. Leadás: GitHub repo link + README +
5 perces Loom videó + reflexió.

**Döntés a helyszínről:** külön, önálló projekt és repó (`C:\Users\Laci\projects\chef-assistant`),
NEM a RezsiRadarba épül. Indok: a leadás repo-linket kér, a RezsiRadar viszont a felhasználó éles,
pre-launch terméke (a `naplo/` a teljes üzleti gondolkodást tartalmazza, az audit-motor konstansai
üzleti titkok), és a két stack ütközik (Prisma+Neon+Gemini vs. Drizzle+pgvector+OpenAI).
A munka mégsem vész el: a *feltöltés → chunkolás → embedding → pgvector → RAG-chat* lánc
pontosan a RezsiRadar Fázis 4-e, tehát ez egy főpróba eldobható adaton, amit a felhasználó
később saját ütemben portolhat.

**Környezeti döntések:** Docker + Postgres/pgvector (a starter `docker-compose.yml`-je),
OpenAI (van kulcs) — tehát a feladatleírást szó szerint követjük, nincs szükség helyettesítésekre,
mint a hw2-nél.

**Munkamódszer:** a felhasználó kifejezetten kérte, hogy **nagyon lassan, lépésenként** haladjunk.
Ezért 9 fázis, mindegyik önmagában demózható eredménnyel és 1-3 git committal zárul.
**Minden fázis után megállunk és megvárjuk a jóváhagyást.**

---

## Előfeltétel (a felhasználó oldalán, mielőtt a 0. fázis indul)

Docker telepítése. **Előtte érdemes ellenőrizni**, hogy a korábbi telepítési hiba tényleg a Smart
App Control miatt volt-e: a PyTorch-blokk bizonyított (CodeIntegrity napló, Policy ID
`{0283ac0f-...}` = „VerifiedAndReputableDesktop"), a Dockeré **nem**. A Docker Desktop aláírt,
reputált telepítő; Windowson jellemzően a **WSL2 vagy a BIOS-virtualizáció** hiányán bukik el.
A Smart App Control kikapcsolása visszafordíthatatlan (csak Windows-újratelepítéssel vonható vissza),
ezért csak akkor tegye meg, ha a WSL2/virtualizáció kizárható.

---

## Fázis 0 — Önálló projekt, futó alap

- A starter átmásolása `docs/hw3/_extracted/ai-sdk-rag-starter` alól
  → `C:\Users\Laci\projects\chef-assistant` (node_modules/.next nélkül). **Fontos**: ki kell kerülnie
  a rezsiradar repóból, mert jelenleg abba van ágyazva.
- `git init`, `.gitignore` ellenőrzés (`.env*` benne legyen), első commit.
- `package.json`: `name` → `chef-assistant` (most `test-application`).
- `.env.local`: `DATABASE_URL`, `OPENAI_API_KEY`.
- `docker compose up -d` → `pnpm install` → `pnpm db:migrate` → `pnpm dev`.
- **Azonnal leteszteljük a `gpt-5` modellnevet** (a starterben hardkódolva,
  `app/api/chat/route.ts:20`). Ha nem elérhető vagy túl lassú, `CHAT_MODEL` env-be kerül
  (`lib/env.mjs` bővítése).

**Demó:** a starter chat elindul és válaszol.

## Fázis 1 — Adatmodell + migrációk + HNSW index

A `resources` tábla **kivezetése** (csak `content`-et tud, nincs fájlnév/status) és helyette:

- `lib/db/schema/documents.ts` (új): `id, filename, mimeType, sizeBytes, content, status
  (uploaded|processing|processed|failed), chunkCount, errorMessage, createdAt, processedAt`.
  A nyers fájltartalom a DB-ben marad → a `/api/process` újrafuttatható (re-chunking).
- `lib/db/schema/embeddings.ts` (új, a `resources.ts`-ből kiemelve): `documentId` **FK
  ON DELETE CASCADE** (eddig nem volt FK!), `content`, `recipeName`, `sectionType`, `category`,
  `difficulty`, `chunkIndex`, `metadata jsonb`, `embedding vector(1536)`.
  Hibrid metaadat: amire szűrünk → saját oszlop; a többi → `jsonb`.
- **HNSW index** a vektoroszlopon (`vector_cosine_ops`) + sima index `documentId`/`sectionType`/`category`.
  Drizzle 0.31.2-ben a `pgTable` 3. argumentuma **objektumot** ad vissza (nem tömböt, az csak 0.36+).
  A generált SQL-t kézzel ellenőrizzük; ha a kit nem generálja, a migrációba kézzel írt
  `CREATE INDEX ... USING hnsw` is legitim.
- Törlés: `lib/db/schema/resources.ts`, `lib/actions/resources.ts`, `lib/ai/tools.ts` (utóbbi
  eddig is holt kód volt, senki nem importálta).

**Demó:** `pnpm db:studio` — üres `documents` tábla, az `embeddings`-en ott a HNSW index.

## Fázis 2 — Chunking modul (DB és OpenAI nélkül tesztelhető)

`lib/ai/chunking.ts` (új) — a hw2 „B" (szekció-alapú) stratégiája TypeScriptben, a két ismert
hibájának javításával. Nincs `unstructured` (Python), de nem is kell: a formátum kötött, regex-parser
determinisztikusabb.

1. Normalizálás: CRLF→LF; a 6 kettőspontos fejléc (`## notes:`) levágása; `based on` → `based_on`.
2. H1 → `recipeName`; a 22 fájl H1 alatti alcíme **nem** lesz önálló chunk (ez volt a „4 karakteres
   chunk" hiba).
3. Szekciókra vágás `^##` mentén; ismeretlen fejléc → `sectionType='other'`, semmit nem dobunk el.
4. **Kontextus-injektálás** (hw2 tanulság): minden chunk így kezdődik:
   `"<recipeName> — <sectionType>\n<body>"` — így a szekció-chunk önmagában is tudja, melyik recept.
5. Túl nagy szekció (>~1200 kar.) felvágása listaelem-határon, ~800 karakteres darabokra, 1 elem
   overlappal.
6. Metaadat-kinyerés a hw2 logikájával: `ingredientsCount`, `stepsCount`, `prepTime`, `servings`,
   `difficulty` (≤3 easy, ≤7 medium, egyébként hard), `category` (fájlnév-heurisztika).
7. Fallback `.txt`-re vagy struktúra nélküli fájlra: fix 500/100 karakteres chunker (hw2 „C").

**Demó:** `scripts/chunk-preview.ts` végigmegy a 85 fájlon → chunkszám (~440), hisztogram,
min/max hossz, 2 minta-chunk. Elvárás: nincs 50 karakternél rövidebb chunk, mindegyik tartalmazza
a recept nevét. Ez egyben README-adat.

## Fázis 3 — `POST /api/upload` + `POST /api/process`

- **Upload**: `await req.formData()` (Next 14 App Routerben natív, nem kell multer),
  több fájl egyszerre. Validáció zoddal: `.md|.txt` kiterjesztés, mime-whitelist — **üres `File.type`
  esetén kiterjesztésre esünk vissza** (a böngésző `.md`-re gyakran `""`-t küld), max 1 MB/fájl,
  nem üres tartalom. Duplikátum: overwrite + jelzés a válaszban. Státusz `uploaded`, **nem embeddel**.
- **Process**: `{ documentIds? }`; per dokumentum `processing` → `chunkDocument()` →
  `embedMany` **batchelve (max ~96 chunk/kérés)** → régi embeddingek törlése + bulk insert →
  `processed` + `chunkCount`. Egy dokumentum hibája nem állítja meg a többit (`failed` + `errorMessage`).
  `export const maxDuration = 60`.
- Üzleti logika `lib/services/documents.ts`-be, az API route-ok csak validálnak és HTTP-re fordítanak
  (így a seed script ugyanazt a kódot hívja). Egységes válaszformátum: `lib/api/response.ts`.
- `lib/ai/embedding.ts`: a `generateChunks` (pont szerinti vágás) **törlendő**, helyette
  `embedChunks(chunks)`; a `generateEmbedding` (single) változatlanul jó a kereséshez.

**Demó:** 2 recept feltöltése és feldolgozása curl-lel; a chunkok metaadatokkal megjelennek.

## Fázis 4 — `GET /api/documents`, `DELETE /api/documents/:id`, 85 fájl beöltése

- `GET`: lista `content` nélkül (payload), opcionális `?status=` szűrő.
- `DELETE`: 404 ha nincs; az embeddingek **FK cascade**-del mennek (ezért kellett az 1. fázisban).
  Next 14-ben a `params` **szinkron** (`{ params }: { params: { id: string } }`) — a `Promise<params>`
  csak Next 15.
- A 85 recept bemásolása `data/recipes/`-be + `data/README.md` a forrással
  (github.com/jeffThompson/Recipes) és licenccel → a projekt önmagában reprodukálható.
- `scripts/seed-recipes.ts`: 20-as batchekben hívja a futó app `/api/upload` + `/api/process`
  endpointjait (nem mellékcsatorna — ugyanazt teszteli, amit az UI használ), és kiírja a mért időket.

**Demó:** `pnpm seed` → 85 dokumentum `processed`, ~440 chunk, mért idő + becsült költség.

## Fázis 5 — Keresés, tool-ok, magyar séf system prompt

- `findRelevantContent` → **strukturált** `searchRecipes(query, opts)`: visszaadja a `recipeName`-t,
  `sectionType`-ot, `similarity`-t, `filename`-t (JOIN `documents`) — enélkül a modell nem tudja
  megnevezni a receptet. Küszöb 0.3 → ~0.25, limit 4 → 6-8.
  **Diverzifikálás**: egy receptből max 2-3 chunk a top-K-ban (különben egyetlen recept
  ingredients+steps+notes chunkja kitölti a listát, és a „Milyen vegetáriánus főételeket ajánlasz?"
  típusú kérdés elromlik). Üres találat → `{ results: [] }`, nem hibaszöveg.
- `lib/ai/tools.ts` **újraírva** és a chat route végre **importálja** (megszűnik az inline duplikáció):
  `searchRecipes`, `filterRecipes` (tisztán metaadat-alapú SQL — ez kezeli a „gyors vacsora" és
  „vegetáriánus" kérdéseket pontosan, nem vektorhasonlósággal), `getRecipe` (teljes recept egy
  konkrét kérésre), opcionálisan `listCategories` (hallucináció-gátló). Az `addResource` kimarad.
- `lib/ai/prompts.ts` (új, külön fájlban hogy verziózható és README-ben idézhető): magyar séf szerep,
  magyar válasz angol korpuszból (recept eredeti neve zárójelben a visszakereshetőségért),
  tool-használati szabályok, és a két kulcsszabály:
  - **Anti-hallucináció:** receptet/hozzávalót/mennyiséget kizárólag tool-kimenetből; ha nincs
    találat, mondja ki őszintén és ajánljon létező alternatívát.
  - **Megengedett általános tudás, jelölve:** főzési *technika* és *helyettesítő alapanyag* általános
    tudásból is adható (a feladat kéri!), de megjelölve. A starter prompt („Only respond using
    information from tool calls") ezt a két feladatot ellehetetlenítené.

**Demó:** mind az 5 teszt-kérdés; a csoki-kérdésre korrekt „nincs a gyűjteményben, de…" válasz.

## Fázis 6 — Frontend

- `app/page.tsx` (chat) + `app/documents/page.tsx` (dokumentumkezelő) + nav a layoutban,
  `<Toaster />` (a `sonner` már dependency).
- `components/upload-dropzone.tsx`: natív HTML5 drag&drop + fájlválasztó, nincs új library.
  Kliens-oldali előszűrés a szerver-validáció **mellett**, nem helyette. Fájlonkénti státuszsor.
- `components/document-list.tsx`: táblázat (fájlnév, méret, status-badge, chunk-szám), „Feldolgozás"
  és törlés gomb megerősítéssel, üres állapot.
- Chat komponensekre bontva; `suggested-questions.tsx` az 5 teszt-kérdéssel kattintható chipként
  (demó-barát); `tool-trace.tsx` — „Megnézett receptek: X, Y" a strukturált találatokból
  (ez mutatja a RAG átláthatóságát a videón).
- Hiányzó shadcn primitívek kézi bemásolása (`card`, `badge`, `table`, `skeleton`, `alert-dialog`).
- Responsive: `md:` breakpointok, a táblázat mobilon kártyákká esik szét. A starter fix
  pozícionált chat-inputja hibás (`max-w-md` a `max-w-2xl` konténerben) → sticky bottomra javítva.

## Fázis 7 — Tesztelés és mérés

Nincs Jest/Vitest (overkill); helyette **futtatható mérőscriptek**, amik markdown táblát írnak
a stdoutra → egy az egyben a README-be.

- `scripts/test-retrieval.ts`: az 5 kötelező + ~7 saját kérdés, mindegyikhez várt recept(ek)
  (`expectNoResults: true` a negatív eseteknél) → **Precision@5, MRR**, top-1 similarity, idő.
- `scripts/test-latency.ts`: `/api/chat` végponti mérés, kérdésenként 3 futás → első token ideje,
  teljes válaszidő, tool-hívások száma, min/átlag/max.
- **System prompt A/B**: ugyanaz az 5 kérdés a starter angol prompttal vs. a magyar séf prompttal →
  2-3 válaszpár a README-be (ez a feladatkiírás „system prompt hatásának vizsgálata" sora).
- **Chunking A/B** (hw2 folytatása, kreativitás-pont): naiv (`split('.')`) vs. szekció-alapú
  chunkolás ugyanazon a retrieval teszten → számszerű javulás.

## Fázis 8 — README + git history

README: mit csinál (screenshot) · setup (`docker compose up -d`, `pnpm install`, `db:migrate`,
`seed`, `dev`) · architektúra-ábra · **API dokumentáció** (4 endpoint, curl példák, hibakód-tábla) ·
chunking stratégia a hw2 A/B/C eredményeivel · a teljes system prompt + A/B összehasonlítás ·
teszteredmény-táblák · tanulságok és korlátok (a „nincs desszert/carbonara" eset kezelése, költségek).

Git: fázisonként 1-3 értelmes, konvencionális commit (a 20%-os „git history" szempont).

---

## Fontos lelet, ami a tervet alakította

A korpuszban **nincs carbonara, nincs csokis desszert, és nincs csirkemellfilé-recept**
(`chocolate` csak az `enchilada-sauce.md`-ben; `chicken breast` csak a `chicken-schnitzel.md`-ben).
Az 5 kötelező teszt-kérdésből tehát **3 negatív vagy részleges eset**. Ez nem baj, hanem a terv egyik
fő célja: a rendszernek hallucináció nélkül, alternatíva-ajánlással kell válaszolnia — és ez a
legjobb hely a kreativitás-pontok (10%) megszerzésére. Opcionális plusz: 2-3 saját magyar receptet
(pl. csokis süti) **az UI-n keresztül** feltöltve egyszerre demózzuk a feltöltő funkciót és oldjuk
meg a csoki-kérdést.

## Kockázatok

| Kockázat | Kezelés |
|---|---|
| `gpt-5` modellnév a starterben hardkódolva; ha nem elérhető → 404, ha reasoning-modell → lassú | 0. fázisban azonnal teszt; `CHAT_MODEL` env, README-ben mérés |
| **Magyar kérdés ↔ angol korpusz** (cross-lingual embedding) | `text-embedding-3-small` kezeli, de gyengébben. **A 7. fázis mérése döntse el**, ne előre: ha gyenge, query-expansion vagy `-3-large` |
| OpenAI költség | ~440 chunk ≈ 70k token ≈ **0,002 USD** a teljes beöltés; elhanyagolható |
| Rate limit `embedMany`-nél | batchelés (~96/kérés) + retry backoffal |
| Next 14 fájlfeltöltés | `req.formData()` jó, de üres `File.type` → kiterjesztés-fallback; `runtime: 'nodejs'` (ne edge, a `postgres` driver miatt) |
| Drizzle 0.31.2 vector index szintaxis | objektum-forma + `.op('vector_cosine_ops')`; a generált SQL kézi ellenőrzése |

## Ellenőrzés (end-to-end)

1. `docker compose up -d` && `pnpm db:migrate` → `pnpm db:studio`: `documents` + `embeddings` tábla, HNSW index.
2. `pnpm dev` → `/documents`: fájl bedobása → megjelenik → „Feldolgozás" → `processed` + chunk-szám.
3. `pnpm seed` → 85 dokumentum, ~440 chunk, kiírt időmérés.
4. `/` chaten mind az 5 kötelező teszt-kérdés; a csoki/carbonara kérdésre nincs hallucináció.
5. Törlés az UI-ból → az embeddingek is eltűnnek (cascade ellenőrzése `db:studio`-ban).
6. `pnpm tsx scripts/test-retrieval.ts` és `test-latency.ts` → README-be illeszthető táblák.

## Kritikus fájlok

**Módosul:** `lib/ai/embedding.ts` (chunker csere, strukturált keresés) ·
`app/api/chat/route.ts` (tool-import + magyar prompt) · `app/page.tsx` (komponensekre bontás) ·
`lib/env.mjs` (`CHAT_MODEL`) · `package.json`

**Új:** `lib/ai/chunking.ts` · `lib/ai/prompts.ts` · `lib/ai/tools.ts` (újraírva) ·
`lib/db/schema/documents.ts` · `lib/db/schema/embeddings.ts` · `lib/services/documents.ts` ·
`app/api/upload|process|documents/route.ts` · `app/documents/page.tsx` · `components/*` ·
`scripts/chunk-preview|seed-recipes|test-retrieval|test-latency.ts` · `data/recipes/*` (85 fájl)

**Törlendő:** `lib/db/schema/resources.ts` · `lib/actions/resources.ts` (a `lib/ai/tools.ts` holt kód helyére új tartalom)
