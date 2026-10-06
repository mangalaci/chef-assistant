# 5. fázis – a kötelező tesztkérdések

Futtatva: `pnpm ask ...`, modell: gpt-5-mini, reasoningEffort: low. Reranking: még nem aktív (a Hugging Face modell letöltését a hálózati szabály tiltja), a keresés a vektoros sorrendet használja.

### Milyen édességet tudok csinálni csokival?

- `searchRecipes` {"query":"chocolate","sectionTypes":["text","ingredients","steps","notes"]} → 1 találat
- `searchRecipes` {"query":"mole","sectionTypes":["text","ingredients","steps","notes"]} → 0 találat

Sajnálom, a gyűjteményben nincsenek desszertek vagy sütemények – ezért nincs kifejezetten csokis édesség sem.

Van viszont egy recept, ami megemlíti a csokoládét/sötét mexikói csokoládét, ezért hasznos lehet, ha csokival szeretnél kísérletezni:
- Enchilada szósz (Enchilada Sauce) — a recept megjegyzéseiben azt javasolják, hogy a kakaó helyett jobb az Abeulita mexikói csokoládé (12 g ≈ 1/8 tablet). Ez nem desszert, de ötletet ad, hogyan építhetsz csokoládét ízesítőként sós szószokban vagy ragukban.

Ha szeretnéd, megnyissam az Enchilada szósz (Enchilada Sauce) teljes receptjét?

_(első token: 9191 ms, teljes: 12835 ms)_

### Mit főzhetek, ha van otthon csirkemellfilém?

- `searchRecipes` {"query":"chicken breast","sectionTypes":["ingredients","text","steps"],"vegetarian":false} → 6 találat

Szuper — néhány recept a gyűjteményből, amit otthoni csirkemellfilével is érdemes megfontolni (megadtam, ha a recept eredetileg combbal számol):

- Rántott csirkemell / csirke schnitzel (Chicken Schnitzel) — ez kifejezetten csirkemellre van megírva. Hearty, egyszerű panírozott szeletek, jó választás, ha gyors, kényelmes, klasszikus ételt szeretnél.
- Halal cart stílusú citromos-fűszeres csirke (Halal Cart Chicken) — a receptben boneless skinless chicken thighs szerepel, de az eljárás (pác, serpenyős sütés) csirkemellre is jól alkalmazható (általános konyhai tudás, nem a gyűjteményből). Ízletes, fűszeres, rizssel vagy salátával tálalható.
- Csirke nuggetek (Chicken Nuggets) — a gyűjteményben combokhoz van leírva, de ha nuggeteket szeretnél, csirkemellből is lehet készíteni (általános konyhai tudás). Jó, ha panírozott, gyerekbarát falatokat akarsz.
- Teriyaki csirke (Teriyaki Chicken) — itt is comb szerepel a hozzávalóknál, de a teriyaki páccal és grillezéssel/sütéssel csirkemell is finom lesz (ált. konyhai tudás). Édes-sós, gyors vacsora.

Melyik recept teljes részletét nyissam meg (mennyiségek, lépések)? (Pl. Rántott csirkemell (Chicken Schnitzel) vagy Halal Cart Chicken.)

_(első token: 3930 ms, teljes: 7851 ms)_

### Van valami gyors vacsora ötleted?

- `filterRecipes` {"maxPrepMinutes":30,"limit":10} → 10 találat

Szuper — van néhány gyors, a gyűjteményben található ötletem. Itt három, gyors vacsora-javaslat, miért érdemes őket választani, és hogy hány perc az előkészítés:

- Marhahúsos taco (Beef Tacos) — gyors és egyszerű, kb. 15 perc. Jó, ha gyors, húsos, és kevés hozzávalóból szeretnél teljes ételt.
- Fekete babos enchilada (Black Bean Enchiladas) — vegetáriánus, kb. 15 perc. Gyors, laktató, növényi fehérjével.
- Fokhagymás kel káposzta halszósszal (Garlicky Cabbage and Fish Sauce) — nagyon gyors oldal- vagy könnyű főétel, kb. 10 perc; karakteres ízű, ha szereted a halszószt.

Melyik receptet nyissam meg teljes részletekkel (hozzávalók, mennyiségek, lépések) a gyűjteményből?

_(első token: 2411 ms, teljes: 4627 ms)_

### Hogyan készítsek carbonarát?

- `searchRecipes` {"query":"carbonara","sectionTypes":["text","ingredients","steps"]} → 6 találat

Sajnos ilyen recept nincs a gyűjteményben — nincs carbonara a forrásban.

Rövid áttekintés a carbonaráról (általános konyhai tudás, nem a gyűjteményből):
- A klasszikus spaghetti alla carbonara fő összetevői: tojás (általában csak sárgája), pecorino vagy parmezán, guanciale (vagy pancetta/bekon helyettesítésként), frissen őrölt fekete bors és spagetti.  
- A lényeg: a forró, éppen leszűrt tészta és a forró guanciale zsírja „szinte” megfőzi a tojásporhalmot, így krémes szósz alakul ki száraz tejszín nélkül.  
- Tipikus hibák elkerülése: ne add túl forró tűzre a tojásos keveréket, különben rántotta lesz; tartsd vissza a tészta főzővizéből némi keményítőt, azzal higíthatod és krémesítheted a szószt.

Ha szeretnél a gyűjteményből kapcsolódó recepteket, ajánlom ezeket:
- Házi tészta (Homemade Pasta) — hasznos, ha friss tésztát akarsz készíteni carbonarához; tartalmaz tészta hozzávalókat és lépéseket.  
- Mac and Cheese (Mac and Cheese) — nem carbonara, de jól magyarázza a sajt- és tejalapú krémes tészta készítését; ötletnek jó a sajt-választáshoz és krémes állaghoz.  

Megnyissam a „Házi tészta (Homemade Pasta)” teljes receptjét, vagy a „Mac and Cheese” receptjét megnézzük részletesen?

_(első token: 2757 ms, teljes: 6344 ms)_

### Milyen vegetáriánus főételeket ajánlasz?

- `filterRecipes` {"vegetarian":true,"limit":100} → 52 találat

Szuper — megnéztem a gyűjteményt, és több jó vegetáriánus főétel van benne. Íme 6 ajánlat, rövid indoklással:

- Fekete babos enchilada (Black Bean Enchiladas) — gyors (kb. 15 perc előkészítés), laktató, jól variálható.  
- Szecsuáni hárompaprikás tofu (Sichuan Three-Pepper Tofu) — erősebb ízek, jó ha szereted a csípőset és a tofu textúráját.  
- Phat Phrik Khing (Phat Phrik Khing) — thai száraz curry tofuval és hosszúbabbal; fűszeres, egytálos jellegű.  
- Channa Masala (Channa Masala) — fűszeres csicseriborsó curry; klasszikus indiai, könnyen főzhető körettel (rizs/kenyér).  
- Tarka Dal (Tarka Dal) — fűszeres lencsefőzelék/tálalás; jó fehérje- és ízforrás, rizs vagy naan mellé tökéletes.  
- Vegetáriánus pho (Vegetarian Pho) — ízletes, illatos vietnami leves, lehet önálló főétel (kb. 1 óra készítési idő).

Szeretnéd, hogy megnyissam valamelyik teljes receptjét (összetevők és pontos lépések)? Keresd ki melyiket: Black Bean Enchiladas; Sichuan Three-Pepper Tofu; Phat Phrik Khing; Channa Masala; Tarka Dal; vagy Vegetarian Pho?

_(első token: 2805 ms, teljes: 5730 ms)_
