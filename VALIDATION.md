# Ellenőrzési jelentés

Dátum: 2026. november 2. A dokumentum a ténylegesen végrehajtott ellenőrzéseket és a még nem igazolt területeket külön jelzi.

## Sikeresen végrehajtva

- A TypeScript strict fordítás és a Vite production build sikeresen elkészült.
- A Node.js tesztfuttatóval 59 teszt sikeres, nulla sikertelen, nulla kihagyott teszttel.
- A kijelölt határévek és a teljes 400 éves Gergely-ciklus hétköznapjainak összevetése független Sakamoto-számítással.
- Húsvét összevetése a Gauss-féle computusszal mind az 1–9999 közötti évben, négy konkrét referenciaév és a mozgó ünnepek napeltolásaival.
- Szökőévek, 4/5/6 soros hónapok, hétkezdés, évhatári ISO-hetek és tartományon kívüli szomszédos napok vizsgálata.
- Személyes események, nem negatív életkor, február 29-i ismétlődés, névnapfelülírás, szökőévi névnapadat és kétneves maximum.
- Szigorú projektvalidálás, beágyazott képadat szöveges mentési körútja, sablon öröklés és havi tulajdonság-öröklés.
- Éves 3 × 4 elrendezés, havi állandó rácsmagasság, túlcsordulás, hiányzó karakter és lapból kilógás jelzése.
- Mind a tizenkét A6 hónap export-előellenőrzése az adaptív alapstílussal, túlcsordulási hiba nélkül.
- Natív Canvas tesztbackenddel A4 JPG és A5 PNG létrehozása. A célpixelméretek 2480 × 3508 és 1748 × 2480; a JPG JFIF 300 DPI, a PNG pHYs 11811 pixel/méter jelölést tartalmaz.
- A6 PDF létrehozása 105 × 148 mm-es médiamérettel; beágyazott betűk és vektoros szöveg/rács, képi helyettesítés nélkül.
- Tizenkét oldalas PDF létrehozása és oldalszámának visszaolvasása.
- A7 éves raszterkimenet létrehozása a tesztsegédben.
- A kijelölt alapraszter ismételt rajzolásakor bájtra azonos eredmény.
- A6 PDF kirajzolása Popplerrel és képi megtekintése; a részleges fontbeágyazásnál talált karakterhibát teljes fontbeágyazással javítottuk. A javított változatban a dátumszámok és magyar ékezetek láthatók.

## GitHub felhős böngészőtesztek: sikeres

A [41532649543-as GitHub Actions futás](https://github.com/amaihaiku/naptar/actions/runs/41532649543) a `71f6e12dec56aa54337d4351104f3d79ea0f6106` kódállapoton igazolta:

| Feladat | Eredmény |
| --- | --- |
| Node.js tesztek, TypeScript és production build | Sikeres, 59 teszt |
| Chromium | 10/10 böngészőteszt sikeres |
| Firefox | 10/10 böngészőteszt sikeres |
| Microsoft Edge | 10/10 böngészőteszt sikeres |
| GitHub Pages publikálás | Sikertelen: a tároló Pages szolgáltatása még nincs engedélyezve |

A 30 sikeres böngészőteszt tartalma: tényleges A4 JPG pixelméret és JFIF 300 DPI; születésnap és személyes névnap mentése/szerkesztése/törlése; projekt letöltése és visszatöltése; visszavonás/újra; éves A4 fekvő PDF-letöltés; IndexedDB-helyreállítás újratöltés után; teljes év 12 PNG-t tartalmazó ZIP-je; képernyőkép; fénykép kivágási paramétereinek hordozható mentése/visszatöltése; nagyítástól független PNG-pixelméret; SVG-előnézet és PNG-export képi összehasonlítása.

A képi összehasonlítás a teljes 300 DPI-s PNG-t olvassa vissza, és minden böngészőnél ugyanazzal a független, területarányosan súlyozott átméretezéssel illeszti az előnézet felbontására. A látható szöveg tintamaszkjainak kétirányú eltérését vizsgálja: egy képernyőpixelnyi élsimítási tűrés mellett mindkét irányban 8% alatti nem illeszkedő tintapixel szükséges. A tűrés mindhárom böngészőben változatlan. A teljes PNG és a két összehasonlító kép az Actions artifact része. Ez egy reprezentatív alapelrendezés tényleges összevetése, nem az összes stíluskombináció teljes körű bizonyítása.

A kezelt helyi előnézet kezdetben nem volt elérhető; ezt a korlátot a GitHub felhős tesztgépein futó Playwright ellenőrzés oldotta fel. Az elrendezési tulajdonságok natív tesztjei mellett így tényleges böngészős letöltéseket és képi kimenetet is ellenőriztünk.

## Publikálási akadály és folytatás

A deployment naplója: `Failed to create deployment (status: 404) ... Ensure GitHub Pages has been enabled`. Ez nem fordítási vagy böngészőteszt-hiba: az összes megelőző ellenőrzés sikeres.

1. Nyisd meg a [tároló Pages-beállítását](https://github.com/amaihaiku/naptar/settings/pages).
2. A **Build and deployment → Source** mezőben válaszd a **GitHub Actions** lehetőséget.
3. Az **Actions → Ellenőrzés és GitHub Pages → Run workflow** paranccsal indíts új futást a `main` ágon.
4. A webcímet a sikeres deploy lépés adja vissza. Az élő oldal elérhetősége jelenleg nincs igazolva.

A használt GitHub-kapcsolat forrásfájlokat, commitokat és munkafolyamat-eredményeket kezel, Pages-adminisztrációs műveletet nem kínál. Az [hivatalos configure-pages művelet](https://github.com/actions/configure-pages/blob/main/action.yml) a szolgáltatás első engedélyezéséhez a munkafolyamat alap `GITHUB_TOKEN`-jénél több jogosultságot igényel. Nem került privát token az alkalmazásba vagy a tárolóba.

## Nem teljesen igazolt területek

- A fénykép feltöltése és PNG-projektbeli körútja böngészőben igazolt; külön EXIF-tájolásos fotók, extrém felbontások és minden maszkolás/keret PDF-beli kombinációja nincs teljes fixture-készlettel lefedve.
- Az egérhúzás, minden illesztési helyzet, teljes billentyűzetes navigáció és tárhelykvóta-hibák összes felületi esete nincs automatizálva.
- A 12 képes ZIP-et PNG-vel teszteltük. Az egyoldalas JPG mindhárom böngészőben tesztelt, a 12 JPG-s ZIP külön teljes felületi tesztet még nem kapott.
- Nincs minden papírméretet, betűbeállítást, sablont és fényképes elrendezést lefedő, elfogadott képernyőkép-baseline gyűjtemény. Az alapelrendezés SVG–PNG képi összehasonlítása és a natív ismételhetőségi teszt sikeres.
- Éles GitHub Pages betöltés és fizikai nyomtatási próba még nem történt.

## Dokumentált műszaki kompromisszumok

- A szövegmérés karakterenkénti fontkit előtolásra épül; a nyomdai egyezés érdekében nincs ligatúra vagy kontextusfüggő formázás. A választék magyar és latin szövegre készült. Nem támogatott karakter esetén az export hibát jelez.
- A képek megtartják a forrásuk képarányát. A keret kör/ovális maszkja ettől független. Az árnyék egyszerű eltolt vektorfelület, nem elmosott fényhatás.
- A keret, a cím és a naptárrács önálló szerkeszthető elem; a dátumok logikai szerkezetét nem lehet egyenként szabadon széttördelni.
- A dátumcellák túlcsordulását a determinisztikus szövegméret és sortörés alapján ellenőrizzük. A beállítható tartományban a látható betűk raszterezési eltérése néhány pixel lehet, ezért extrém betűköz/sorköz/kis lap esetén nyomtatási próba indokolt.
- Az export sorban dolgozza fel a hónapokat, és lapok között átadja a vezérlést a felületnek. Külön export-Web Worker nincs; a böngészős PDF- és vászonműveletek főszálon futnak. Nagy anyagnál a felület átmenetileg foglalt lehet.
- A felülírások a stílus egyedi tulajdonságaira vonatkoznak. A lapméret és az elemgeometria projekt-szintű.
- A történelmi joganyag és a jövőbeli munkarend-áthelyezések nem teljes adatbázisai a projektnek; az ellenőrzött szabálytartományon kívül vetítést használunk.
- A jelenlegi projektverzió 1. Korábbi verzióra nincs migráció, mert ez az első formátum. Az ismeretlen verziót a program elutasítja.

Az alkalmazás forrása és a fenti ellenőrzések elkészültek. A teljes eredeti specifikáció minden lehetséges kombinációjának és az éles Pages-betöltésnek az igazolása még nem tekinthető befejezettnek.
