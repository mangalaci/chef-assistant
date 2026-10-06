# 5. fázis – a kötelező tesztkérdések

Futtatva: `pnpm ask ...`, modell: gpt-5-mini, reasoningEffort: low, reranking: be (Xenova/ms-marco-MiniLM-L-6-v2).

### Milyen édességet tudok csinálni csokival?

- `searchRecipes` {"query":"chocolate"} → 1 találat
- `listRecipeCatalog` {} → 8 találat

Sajnálom — a gyűjteményben nincsenek desszertek vagy csokis sütik. Egyértelműen: Ilyen recept sajnos nincs a gyűjteményben.

Van viszont egy recept, amelyben megemlítik a mexikói csokit mint hozzávalót, így ez az egyetlen, ami kapcsolódik a csokoládéhoz:
- Enchilada-szósz (Enchilada Sauce) — a jegyzetekben ajánlott alternatíva: "Abeulita Mexican chocolate" használata kakaó helyett. Emiatt ezt tudom ajánlani, ha kifejezetten mexikói csokira vagy kíváncsi, de ez nem desszert.

Mit szeretnél? Megnyissam az Enchilada-szósz (Enchilada Sauce) teljes receptjét, hogy megnézhessük a pontos megjegyzést és mennyiségeket?

_(első token: 5315 ms, teljes: 6916 ms)_

### Mit főzhetek, ha van otthon csirkemellfilém?

- `searchRecipes` {"query":"chicken breast","sectionTypes":["ingredients"]} → 6 találat

Találtam a gyűjteményben egy receptet, ami kifejezetten csirkemellfiléhez való:

- Rántott csirkemell (Chicken Schnitzel) — ez kifejezetten boneless, skinless chicken breasts-szel (boneless csirkemell) készül.

Szeretnéd, hogy megnyissam a teljes receptet (hozzávalók pontos mennyiségei és lépések)?

_(első token: 4096 ms, teljes: 5068 ms)_

### Van valami gyors vacsora ötleted?

- `filterRecipes` {"maxPrepMinutes":30,"limit":10} → 10 találat

Persze — itt van 3 gyors vacsoraötlet a gyűjteményből (mind ≲30 perc): 

- Marhahúsos taco (Beef Tacos) — kb. 15 perc. Gyors, laktató, könnyen variálható feltétekkel.  
- Fekete babos enchilada (Black Bean Enchiladas) — kb. 15 perc, vegetáriánus. Jó választás, ha húsmentes, de mégis tömény, fűszeres ízekre vágysz.  
- Fokhagymás káposzta halszósszal (Garlicky Cabbage and Fish Sauce) — kb. 10 perc. Gyors, könnyű, izgalmas umami jegyekkel (halas szósszal).

Melyik recept teljes részletét nyissam meg (összetevők és lépések)?

_(első token: 2787 ms, teljes: 4749 ms)_

### Hogyan készítsek carbonarát?

- `searchRecipes` {"query":"carbonara"} → 6 találat

Sajnálom — a gyűjteményben sajnos nincs carbonara recept (a gyűjteményben amúgy nincsenek olasz tészta- vagy desszertreceptek). 

Rövid, általános áttekintés a carbonara készítéséről (általános konyhai tudás, nem a gyűjteményből):
- Fő hozzávalók: száraz spagetti (vagy más hosszú tészta), tojássárgák (vagy egész tojások részben), kemény sajt (tradicionálisan pecorino romano; helyettesíthető parmezánnal), guanciale (sertéspofa) vagy pancetta, frissen őrölt fekete bors. Nincs tejszín a hagyományos változatban.
- Lényeg: a tésztát sós, lobogó vízben al dente-re főzöd; közben a felkockázott guancialét/pancettát megpirítod, hogy kiengedje a zsírját. A forró, leszűrt (de egy kis főzővízzel megtartott) tésztát a zsírhoz és a felvert tojás–sajt keverékhez kevered gyorsan, a tojásokat a tészta melegétől krémesre főzve — nem rántottához hasonlóan. Bőséges fekete bors a végén.
- Tippek: tarts meg egy keveset a tészta főzővizéből — az keményítőt ad, és segít krémesre emulgeálni a szószt. Ha nincs guanciale, pancetta vagy jó minőségű szalonna is működik (ízben eltér). 

Szeretnéd, hogy megnyissam a gyűjteményből a „Homemade Pasta” (házi tészta) receptjét, vagy keressek hasonló, tészta-szósszal kapcsolatos recepteket a gyűjteményben?

_(első token: 3728 ms, teljes: 8257 ms)_

### Milyen vegetáriánus főételeket ajánlasz?

- `filterRecipes` {"vegetarian":true,"limit":100} → 52 találat

Szuper — megnéztem a gyűjteményt, itt van néhány jó vegetáriánus főétel-ajánlat (magyar név — angol eredeti):

- Fekete babos enchilada (Black Bean Enchiladas) — gyors (kb. 15 perc előkészítés), laktató, mexikói ízek.  
- Tojásos biryani (Egg Biryani) — gazdag, „egy fogásos” indiai étel; időigényes, de különleges.  
- Szichuani hárompaprikás tofu (Sichuan Three-Pepper Tofu) — intenzív, fűszeres ázsiai főétel, jó, ha szereted a csípőset és a tofu-t.  
- Aloo Matar (Aloo Matar) — burgonya-borsó curry, klasszikus indiai kenyérrel vagy rizzsel főételként.  
- Channa Masala (Channa Masala) — fűszeres csicseriborsó curry; kiváló főétel naan-nal vagy rizzsel.  
- Tarka Dal (Tarka Dal) — lencsecurry, egyszerű, tápláló indiai főétel.  
- Phat Phrik Khing (Phat Phrik Khing) — thai száraz-curry tofuval és hosszúbabbal; illik, ha stir-fry stílust szeretnél.  
- Vegetáriánus pho (Vegetarian Pho) — illatos, leveses „egytál” vietnami stílusban (kb. 1 óra).

Szeretnéd, hogy megnyissam valamelyik teljes receptjét (összetevők és lépések)? Ha igen, mondd meg melyiket.

_(első token: 3355 ms, teljes: 7450 ms)_
