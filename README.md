# Naptárstúdió

Magyar, böngészőben működő naptártervező React, TypeScript és Vite alapon. Statikus GitHub Pages alkalmazás, háttérszerver, regisztráció és API-kulcs nélkül. A fényképek és személyes események a böngészőben maradnak.

## Indítás

Node.js 24 szükséges.

```sh
npm ci
npm run dev
```

```sh
npm test
npm run build
npm run preview
```

A `npm test` a Node.js beépített tesztfuttatóját használja, szigorú assert állításokkal. A matematikai, projekt-, elrendezés- és nyomdai tesztek futnak benne. A natív tesztrajzoló elkülönített, kilépő segédfolyamatban fut; ez csak fejlesztési függőség, a webalkalmazásban nincs natív kód.

## Funkciók

- Éves, háromoszlopos és négysoros naptár; havi, automatikus 4/5/6 soros naptár.
- 1–9999 közötti évek, időzónától független Gergely-naptár; ISO-hetek, húsvét és mozgó ünnepek.
- A4/A5/A6/A7 éves lapok, A4/A5/A6 és egyedi havi lapok; álló és fekvő tájolás, milliméteres pozíció és méret.
- Hétkezdés váltása, háromféle hétköznapfelirat, szomszédos havi dátumok, névnapok felülírása.
- Kattintható dátumcellák: születésnapok, választható életkor, személyes névnapok, szerkesztés, törlés, elrejtés, február 29-i ismétlődés.
- Hat összehangolt stílus, letölthető és betölthető sablonok, egyedi havi tulajdonságfelülírások.
- Hárompaneles szerkesztő; egyszerű/haladó mód, betűk kategóriánként, színek, rács, keret, lekerekítés, margó és térközök.
- Képek, logók, háttérképek, veszteségmentes szerkesztési paraméterek; kitöltő kivágás, nagyítás, eltolás, kör/ovális maszk, keret, eltolt árnyék, rétegsorrend.
- Egérrel mozgatható és méretezhető rács, cím és kép; milliméteres illesztés, középre illesztés, zárolás, képarányvédelem, nagyítás, margó- és középsegédvonal.
- Hordozható, képeket is tartalmazó JSON-projekt; szigorú verzió- és sémaellenőrzés; helyi IndexedDB-helyreállítás.
- Visszavonás/újra, új projekt, másolat, Ctrl+S, Ctrl+Z, Ctrl+Y és Ctrl+Shift+Z.
- 300 DPI PNG/JPG valódi célpixelmérettel és felbontás-metaadattal; pontos milliméteres PDF, vektoros szöveg és rács, beágyazott betűk.
- Teljes év: 12 oldalas PDF vagy 12 PNG/JPG egy ZIP-ben. Az export túlcsordulás, lapból kilógás és hiányzó karakter esetén letilt.

A papírméret váltásakor a havi alapbetűméretek és belső térközök arányosan változnak; a tényleges értékek a tulajdonságpanelben láthatók. Az éves hónap- és dátumbetűk a rendelkezésre álló hónapterülethez arányosan skálázódnak. Az önálló havi felülírások megmaradnak; export előtt a teljes évet ellenőrizni kell.

## GitHub Pages

1. A tároló **Settings → Pages → Build and deployment → Source** mezőjében válaszd a **GitHub Actions** lehetőséget.
2. A `main` ágra feltöltött alkalmazáskód-változás elindítja a `.github/workflows/pages.yml` munkafolyamatot.
3. A workflow tesztel és fordít, Chrome/Chromium, Firefox és Edge motorral böngészős teszteket futtat, majd minden sikeres ellenőrzés után publikál.
4. A cím repository-site esetén `https://amaihaiku.github.io/naptar/`. Ezt csak sikeres deployment után tekintsd működő szolgáltatásnak.

A `VITE_BASE_PATH` környezeti változó támogatja az `/` felhasználói oldalt és a `/repo-neve/` repository-oldalt. Alapértéke `./`, ezért a build más statikus alkönyvtárba is telepíthető. A `/naptar/` alapútvonallal készült buildet is ellenőriztük. Az alkalmazás nem használ szerveres útvonal-átírást. Saját doménhez a buildben `/` alapútvonal szükséges.

## Böngészős ellenőrzés

```sh
npx playwright install --with-deps chromium firefox msedge
npm run test:e2e
```

A tesztek saját Vite szervert indítanak. Automatizálják az eseménykezelést, a visszavonást, a projektmentést/betöltést, a helyreállítást, az éves PDF-exportot és a 12 képes ZIP-et. A munkafolyamat letölthető tesztképeket, nyomdai mintákat és hiba esetén trace fájlokat ment.

A végső kódállapot ellenőrzése sikeres: **59 matematikai/projekt/export teszt**, továbbá **30 böngészőteszt (Chromium, Firefox, Edge: 10–10)** és a production build. Az SVG-előnézet és a 300 DPI-s PNG képi összevetése mindhárom motorban sikeres. A [VALIDATION.md](VALIDATION.md) tartalmazza a futás hivatkozását és a még nem teljesen lefedett eseteket.

**Az éles publikálás még nem sikerült:** a tárolóban először engedélyezni kell a GitHub Pagest a fenti beállításban. Ezután az Actions felületen a **Run workflow** indítja a teljes ellenőrzést és telepítést. A munkafolyamatban minden ellenőrzés zöld volt; a deploy lépés az engedélyezés hiánya miatt 404-et kapott. A csak Markdown-dokumentációt módosító commitok nem indítanak új telepítést.

## Szerkezet

| Terület | Forrás |
| --- | --- |
| Verziózott projekt és validálás | `src/model.ts` |
| Dátumok, ISO-hetek, computus | `src/engines/date.ts` |
| Jogi szabályadatok | `src/engines/holidays.ts` |
| Névnapok és forrásadatok | `src/engines/namedays.ts`, `src/data/` |
| Személyes események | `src/engines/events.ts` |
| Közös milliméteres dokumentum | `src/engines/layout.ts` |
| Betűmérés és magyar karakterek | `src/engines/fonts.ts`, `public/fonts/` |
| SVG-előnézet, Canvas-rajzolás | `src/components/SceneView.tsx`, `src/engines/render.ts` |
| Export és 300 DPI metaadat | `src/engines/export.ts`, `src/engines/metadata.ts` |
| Fotók és kivágás | `src/engines/images.ts` |
| Sablonok, előzmények | `src/engines/templates.ts`, `src/hooks.ts` |
| Szerkesztő | `src/App.tsx`, `src/components/` |

A jelenet pozíciói milliméteresek, a betűméret pontban megadott. A betűelőtolás mindhárom rajzolóban azonos, fontkit alapján számított karakterenkénti előtolás; nincs implicit betűhelyettesítés. A PDF teljes betűfájlokat ágyaz be, mert a részleges beágyazás ellenőrzésekor hiányzó karakterek jelentkeztek. A fényképek a PDF-ben raszterképként, 300 DPI keretméretre feldolgozva szerepelnek; a szöveg és a rács vektoros marad.

## Dokumentáció

- [Magyar használati útmutató](USER_GUIDE.hu.md)
- [Források, licencek és adatkezelési döntések](THIRD_PARTY.md)
- [Tesztelés és ismert korlátok](VALIDATION.md)
- [Eredeti követelményleírás](SPECIFICATION.md)

## Működési korlátok

A támogatott képméret 40 megapixel, a fájlméret 25 MB, a projekt 80 MB, a képek száma 16, a személyes események száma 2000. A teljes éves képexport sorban készíti el a lapokat, de a ZIP tartalma a befejezésig memóriában marad. Memóriahiba esetén egyetlen hónap exportja javasolt; felbontáscsökkentés nincs. 1100 pixelnél keskenyebb ablakban tájékoztató jelenik meg. CMYK, kifutó, vágójel, felhős fiók és digitális jegyzetfüzet nincs.
