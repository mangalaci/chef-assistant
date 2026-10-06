# 3. modul – Házi feladat: AI asszisztens webapp fejlesztés

> A `b5eba8874dd79517de21aafe550df729f799cb67.pdf` szövege, olvasható formában.
> Ebben a projektben **kizárólag a receptes témát** valósítjuk meg.

## Feladat áttekintés

Az előző héten Jupyter notebookokban implementáltatok egy RAG rendszert Qdrant vector
adatbázissal és Jeff Thompson receptgyűjteményével. Most eljött az idő, hogy ezt a tudást egy
teljes webapplikációba integráljátok!

Ebben a házi feladatban egy működő AI asszisztens webappot fogtok létrehozni, amely:

- Dokumentum feltöltési funkcióval rendelkezik
- Recepteket vagy saját adatokat tárol vector adatbázisban
- Testreszabott system prompt-tal rendelkezik
- Teljes körű tesztelést tesz lehetővé

## Feladat részei

### 1. Dokumentum feltöltési endpoint fejlesztése

Készítsetek új API endpoint-okat:

- `POST /api/upload` – dokumentumok feltöltése
- `POST /api/process` – feltöltött dokumentumok feldolgozása és chunking
- `GET /api/documents` – feltöltött dokumentumok listázása
- `DELETE /api/documents/:id` – dokumentum törlése

Követelmények:

- Támogassa markdown (`.md`) és text (`.txt`) fájlokat
- Implementáljon chunking stratégiát (használjátok az előző heti tapasztalatokat)
- Generáljon embedding-eket és tárolja pgvector-ban
- Megfelelő hibakezelés és validáció

### 2. Adatok feltöltése

Töltsetek fel adatokat a vector adatbázisba:

- Használjátok Jeff Thompson receptgyűjteményét VAGY
- Gyűjtsetek saját adathalmazt (min. 20-30 dokumentum)
- Lehetséges témák: receptek, útleírók, termékleírások, FAQ-k, tutorial-ok

Ajánlott adatforrások:

- Receptek: Jeff Thompson's Recipes (előző heti)
- Utazás: város/hely leírások
- Technológia: programozási útmutatók
- Hobbi: sport/játék szabályok

### 3. System prompt testreszabása

Módosítsátok a system prompt-ot az adataitokhoz:

- Definiáljátok az AI asszisztens szerepét
- Adjatok meg válaszadási irányelveket
- Specifikáljátok az adatforrás típusát
- Állítsatok be hangnemet és stílust

Példa receptes asszisztenshez:

```
Te egy szakértő séf asszisztens vagy. A felhasználók receptekkel kapcsolatos
kérdéseket tesznek fel neked.

Feladataid:
- Receptek keresése és ajánlása
- Hozzávalók alapján ételek javaslása
- Főzési technikák magyarázata
- Helyettesítő alapanyagok ajánlása

Válaszolj mindig magyarul, barátságos hangnemben. Ha nem találsz releváns
receptet, ajánlj hasonló ételeket.
```

### 4. Frontend fejlesztés

Bővítsétek a meglévő chat interface-t:

- Dokumentum feltöltési felület
- Feltöltött dokumentumok kezelése
- Chat interface finomhangolása a témához
- Responsive design alapok

### 5. Fejlesztői tesztelés

**A) Funkcionalitási tesztek:**

- Dokumentum feltöltés működése
- Keresési pontosság különböző query-kkel
- System prompt hatásának vizsgálata
- Tool használat hatékonysága

**B) Tesztkérdések példái (receptes asszisztenshez):**

1. „Milyen édességet tudok csinálni csokival?”
2. „Mit főzhetek, ha van otthon csirkemellfilém?”
3. „Van valami gyors vacsora ötleted?”
4. „Hogyan készítsek carbonarát?”
5. „Milyen vegetáriánus főételeket ajánlasz?”

**C) Teljesítmény tesztek:**

- Válaszidő mérése különböző query típusoknál
- Embedding keresés pontossága
- Memory használat nagyobb adathalmaznál

### 6. Dokumentáció

Készítsetek `README.md` fájlt:

- Projekt setup instrukciók
- API dokumentáció
- Tesztelési eredmények összefoglalása
- Tanulságok és fejlesztési lehetőségek

## Technikai követelmények

**Backend:**

- Node.js/TypeScript Next.js API routes
- PostgreSQL pgvector extension
- OpenAI API integration
- Proper error handling és logging

**Frontend:**

- React komponensek
- File upload funkció
- Chat interface továbbfejlesztése
- User feedback megjelenítés

**Infrastruktúra:**

- Docker compose setup (PostgreSQL + webapp)
- Environment változók kezelése
- Database migráció/seed scriptek

## Videó prezentáció követelmények

Készíts 1 db Loom videót a megoldásotokról (5 perc):

### 7. Videó – megoldás bemutatása (5 perc)

- Architektúra áttekintés (backend + frontend + adatbázis) (1 perc)
- Dokumentum feltöltés és feldolgozás bemutatása (1.5 perc)
- Chat működés és system prompt hatásának demonstrálása (1.5 perc)
- Tesztelési eredmények összefoglalása (1 perc)

## Leadási követelmények

A feladatot a következő hét vasárnap éjfélig kell leadni:

- GitHub repository link
- `README.md` setup instrukciókkal
- Loom videó link (5 perc) a működésről
- Rövid reflekció a tanulságokról

## Értékelési szempontok

**Alapfunkciók (70%):**

- Dokumentum feltöltés működik
- Vector adatbázis integráció működik
- Chat interface válaszol releváns információkkal
- System prompt megfelelően testreszabott
- Alapvető tesztek lefutottak

**Minőség (20%):**

- Tiszta, olvasható kód
- Megfelelő error handling
- Responsive UI alapok
- Git commit history és dokumentáció

**Kreativitás (10%):**

- Érdekes/hasznos adathalmaz választás
- Innovatív system prompt
- Extra funkciók (pl. képfeltöltés, advanced search)
- Részletes tesztelési jelentés

## Kezdési tippek

- Kezdjétek a backend endpoint-okkal
- Teszteljétek minden lépést Postman-nel vagy curl-lel
- Használjátok az előző heti chunking tapasztalatokat
- Legyetek kreatívak az adatforrás választásánál
- Ne felejtsetek el tesztelni különböző edge case-eket

## Segítség és támogatás

- Használjátok a kurzus Discord csatornáját kérdésekhez
- Az előző heti notebook-ok jó kiindulási pont
- OpenAI dokumentáció reference-hez
- Next.js tutorial-ok a frontend fejlesztéshez

## A mappa tartalma

| Fájl | Leírás |
|---|---|
| `b5eba8874dd79517de21aafe550df729f799cb67.pdf` | Az eredeti feladatleírás |
| `ASSIGNMENT.md` | A feladatleírás szövege (ez a fájl) |
| `high_level_architecture.jpg` | A kurzus magas szintű architektúra-ábrája |
| `module-03-code.zip` | A kiinduló kód (`ai-sdk-rag-starter`) a Module-04/05 branchekkel együtt |
