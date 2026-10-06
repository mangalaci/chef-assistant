## Válaszidő: gpt-5-mini (3 futás kérdésenként)

| kérdés | első token, átl. (mp) | teljes min / átl. / max (mp) | tool-hívás |
|---|---|---|---|
| Milyen édességet tudok csinálni csokival? | 4,1 | 6,0 / 6,9 / 8,1 | 1–2 |
| Mit főzhetek, ha van otthon csirkemellfilém? | 6,6 | 8,0 / 9,8 / 11,1 | 1–2 |
| Van valami gyors vacsora ötleted? | 2,9 | 4,9 / 5,5 / 5,8 | 1–1 |
| Hogyan készítsek carbonarát? | 3,6 | 6,1 / 6,6 / 6,9 | 1–1 |
| Milyen vegetáriánus főételeket ajánlasz? | 3,8 | 6,9 / 7,1 / 7,4 | 1–1 |
| **összesen** | **4,2** | **4,9 / 7,2 / 11,1** | |

## Válaszidő: gpt-5 (3 futás kérdésenként)

| kérdés | első token, átl. (mp) | teljes min / átl. / max (mp) | tool-hívás |
|---|---|---|---|
| Milyen édességet tudok csinálni csokival? | 15,0 | 15,7 / 21,9 / 31,0 | 2–4 |
| Mit főzhetek, ha van otthon csirkemellfilém? | 10,5 | 13,8 / 15,0 / 17,1 | 1–2 |
| Van valami gyors vacsora ötleted? | 7,3 | 9,6 / 11,2 / 14,0 | 1–1 |
| Hogyan készítsek carbonarát? | 7,7 | 11,5 / 12,7 / 13,3 | 1–1 |
| Milyen vegetáriánus főételeket ajánlasz? | 10,4 | 15,1 / 17,4 / 19,1 | 1–1 |
| **összesen** | **10,2** | **9,6 / 15,6 / 31,0** | |

Mérve: `pnpm build && pnpm start` (production), reasoningEffort low, reranking be, mindkét szerver ugyanazon a gépen, párhuzamosan futtatva.
