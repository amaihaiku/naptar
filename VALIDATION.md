# Ellenőrzési jelentés

Dátum: 2026. november 2. A dokumentum a ténylegesen végrehajtott ellenőrzéseket és a még nem igazolt területeket külön jelzi.

## Sikeresen végrehajtva

- A TypeScript strict fordítás és a Vite production build sikeresen elkészült.
- A Node.js tesztfuttatóval 58 teszt sikeres, nulla sikertelen, nulla kihagyott teszttel.
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

## Nem végrehajtott vagy még nem teljesen igazolt

- A kezelt felhős böngészős előnézet daemonja nem volt elérhető (`sites-previewd mailbox unavailable`). A helyi Playwright, Chrome, Firefox és Edge végponttól végpontig ellenőrzés ezért ebben a környezetben nem futott le. Az ehhez tartozó tesztek és GitHub Actions feladatok a tárolóban szerepelnek; sikerüket az Actions eredménye igazolhatja.
- A tényleges böngészős fényképfeltöltés, EXIF-tájolás, egérhúzás, IndexedDB-helyreállítás, billentyűparancsok és letöltések teljes felületi útja ugyanebből az okból nincs helyben igazolva.
- A tizenkét képes ZIP böngészős tesztje meg van írva, de itt nem futott. A 12 oldalas PDF-et ténylegesen előállítottuk.
- Nincs elfogadott, több böngészőből származó képernyőképes regressziós baseline. Az ismételhetőségi raszterteszt nem helyettesíti az SVG-előnézet és az összes export teljes vizuális regressziós tesztjét.
- A tesztrajzoló natív Canvas backendet használ; a böngészős Canvas-kódoló működését csak a böngészős tesztek igazolhatják. A célméret és a metaadatkód közös.
- Élő GitHub Pages szolgáltatás csak sikeres Pages-deployment és elérhetőség-ellenőrzés után tekinthető igazoltnak. A munkafolyamat elkészítése önmagában nem jelent sikeres publikálást. A tároló Pages-forrását GitHub Actionsre kell állítani.

## Dokumentált műszaki kompromisszumok

- A szövegmérés karakterenkénti fontkit előtolásra épül; a nyomdai egyezés érdekében nincs ligatúra vagy kontextusfüggő formázás. A választék magyar és latin szövegre készült. Nem támogatott karakter esetén az export hibát jelez.
- A képek megtartják a forrásuk képarányát. A keret kör/ovális maszkja ettől független. Az árnyék egyszerű eltolt vektorfelület, nem elmosott fényhatás.
- A keret, a cím és a naptárrács önálló szerkeszthető elem; a dátumok logikai szerkezetét nem lehet egyenként szabadon széttördelni.
- A dátumcellák túlcsordulását a determinisztikus szövegméret és sortörés alapján ellenőrizzük. A kurzortartományban a látható betűk raszterezési eltérése néhány pixel lehet, ezért extrém betűköz/sorköz/kis lap esetén nyomtatási próba indokolt.
- Az export sorban dolgozza fel a hónapokat, és lapok között átadja a vezérlést a felületnek. Külön export-Web Worker nincs; a böngészős PDF- és vászonműveletek főszálon futnak. Nagy anyagnál a felület átmenetileg foglalt lehet.
- A felülírások a stílus egyedi tulajdonságaira vonatkoznak. A lapméret és az elemgeometria projekt-szintű.
- A történelmi joganyag és a jövőbeli munkarend-áthelyezések nem teljes adatbázisai a projektnek; az ellenőrzött szabálytartományon kívül vetítést használunk.
- A jelenlegi projektverzió 1. Korábbi verzióra nincs migráció, mert ez az első formátum. Az ismeretlen verziót a program elutasítja.

A teljes eredeti specifikáció minden elfogadási forgatókönyvének éles, több böngészős igazolása még nem tekinthető befejezettnek.
