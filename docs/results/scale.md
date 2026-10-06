## Skálázás (254 valódi + szintetikus chunk-vektor, 12 lekérdezés, top 20, maintenance_work_mem 256MB)

| chunk | tábla + index (MB) | ebből HNSW index (MB) | index építés (mp) | pontos keresés átl. / p95 (ms) | HNSW ef_search=40: átl. / p95 (ms), egyezés | HNSW ef_search=100: átl. / p95 (ms), egyezés |
|---|---|---|---|---|---|---|
| 254 | 4,1 | 2,0 | 0,11 | 4.5 / 4.7 | 4.1 / 4.9, 100% | 4.7 / 12.1, 100% |
| 2540 | 40,2 | 19,9 | 1,31 | 13.3 / 15.0 | 3.3 / 6.9, 100% | 3.7 / 4.8, 100% |
| 10160 | 160,5 | 79,4 | 4,78 | 53.0 / 74.6 | 4.2 / 5.1, 96% | 4.8 / 5.8, 99% |
[rerank] Xenova/ms-marco-MiniLM-L-6-v2 loaded in 175 ms

## Memória (Node folyamat)

| állapot | RSS (MB) | heap (MB) |
|---|---|---|
| indulás | 113,7 | 29,9 |
| skálateszt után, reranker nélkül | 257,7 | 38,6 |
| reranker betöltve, 1 keresés után | 602,2 | 48,5 |

A futó Next.js szerver memóriája (production, reranker betöltve, a válaszidő-mérés után): 801 MB és 812 MB (gpt-5-mini és gpt-5 példány).

Tanulság: az első próbálkozásnál a szintetikus vektorok egyetlen vektor 40 zajos másolatai voltak; ezek olyan szoros klasztereket alkottak, hogy a HNSW csak a pontos top 20 53–86%-át találta meg, és az ef_search növelése sem segített. Ez a tesztadat hibája volt, nem az indexé: két valódi vektor keverékével már 96–99% az egyezés.
