[rerank] Xenova/ms-marco-MiniLM-L-6-v2 loaded in 170 ms
## Keresési pontosság (12 pozitív eset)

| konfiguráció | Hit@1 | Recall@5 | MRR | átl. idő (ms) |
|---|---|---|---|---|
| angol lekérdezés, vektor | 0.58 | 0.79 | 0.77 | 252 |
| angol lekérdezés, vektor + rerank | 0.75 | 0.79 | 0.85 | 779 |
| magyar lekérdezés, vektor | 0.08 | 0.18 | 0.20 | 588 |
| magyar lekérdezés, vektor + rerank | 0.25 | 0.22 | 0.34 | 425 |

### Esetenként (angol lekérdezés)

| eset | lekérdezés | MRR vektor | MRR rerank | top 3 (rerank) |
|---|---|---|---|---|
| chicken-breast * | chicken breast | 1.00 | 1.00 | chicken-schnitzel, chicken-nuggets, halal-cart-chicken |
| tofu | tofu stir fry | 1.00 | 1.00 | phat-phrik-khing, sichuan-three-pepper-tofu, sesame-tofu |
| flour-eggs | what can I make with flour and eggs | 1.00 | 1.00 | homemade-pasta, samosa-pie, diner-style-pancakes |
| hot-sauce | homemade hot sauce | 1.00 | 1.00 | portuguese-hot-sauce, yemeni-hot-sauce, jalepeño-hot-sauce |
| pizza | pizza dough | 1.00 | 1.00 | pizza-dough, no-knead-pan-pizza, thin-crust-pizza |
| lentils | lentil dish | 0.50 | 1.00 | tarka-dal, black-pepper-rice, lubia-polo |
| chickpeas | chickpeas | 0.50 | 0.50 | vegetarian-chicken-salad, hummus, channa-masala |
| thai-noodles | Thai stir-fried noodles | 1.00 | 1.00 | pad-thai, pad-see-ew, stir-fried-morning-glory |
| salsa | salsa for tacos | 0.50 | 1.00 | toasted-guajillo-salsa, beef-tacos, carnitas-with-salsa-verde |
| smoked | smoked meat in a smoker | 1.00 | 1.00 | smoked-pork-shoulder, smoked-whole-turkey, mac-and-cheese |
| bread | homemade bread baking | 0.50 | 0.50 | garlic-bread, pita-bread, soft-pretzels-2 |
| potato-curry | Indian potato curry | 0.20 | 0.17 | vada, massaman-curry, black-pepper-rice |

\* a feladatkiírás kötelező tesztkérdése

## Negatív esetek (nincs rá recept)

| eset | lekérdezés | legjobb hasonlóság | legjobb találat |
|---|---|---|---|
| chocolate * | chocolate dessert | 0.413 | Enchilada Sauce |
| carbonara * | spaghetti carbonara | 0.432 | Dad's Spaghetti Sauce |
| sushi | sushi rolls | 0.336 | Thai fried rice with green beans and basil |

Összevetésül a pozitív esetek legjobb hasonlósága: 0.44–0.76 (átlag 0.56). A legjobb negatív (0.43) és a leggyengébb pozitív (0.44) között csak 0.01 a különbség: erre egy küszöböt építeni törékeny lenne, ezért a relevanciát a modell ítéli meg.

## Chunking: a starter pont szerinti darabolása vs. szekció-alapú

| chunking | keresés | chunk | hossz min / átl. / max | Hit@1 | Recall@5 | MRR | 1. chunk megnevezi a receptet |
|---|---|---|---|---|---|---|---|
| starter: split(".") | vektor | 1331 | 2 / 96 / 1343 | 0.75 | 0.88 | 0.88 | 0% |
| starter: split(".") | vektor + rerank | 1331 | 2 / 96 / 1343 | 0.67 | 0.84 | 0.82 | 25% |
| szekció-alapú (2. fázis) | vektor | 254 | 52 / 487 / 1266 | 0.58 | 0.79 | 0.77 | 100% |
| szekció-alapú (2. fázis) | vektor + rerank | 254 | 52 / 487 / 1266 | 0.75 | 0.79 | 0.85 | 100% |

(Memóriában, ugyanazzal a 20 jelölt + rerank logikával, angol lekérdezéssel. A pont szerinti chunkok embeddingje 34257 token volt.)
