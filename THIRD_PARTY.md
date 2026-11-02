# Külső források és licencek

## Névnapadatok

A `src/data/namedays.json` a [froccsos/nevnapok-json](https://github.com/froccsos/nevnapok-json) adattára. Az importált fájl Git blob SHA-ja a `src/engines/namedays.ts` forrásában szerepel. A tároló MIT-licencet ad; a szerzői jogi és licencszöveg változtatás nélkül a `src/data/NAMEDAYS-LICENSE.txt` fájlban található.

A gyűjtemény saját dokumentációja az [OSZK Magyar Elektronikus Könyvtár névnapi felsorolására](https://mek.oszk.hu/00000/00056/html/196.htm) hivatkozik, 1997. júliusi módosítási idővel. Hagyományos, szerkesztett névnapadatokról van szó, nem hatóság által kihirdetett, kizárólagos magyar névnaptárról. A program a fő nevek után az egyéb nevek közül tölt fel, legfeljebb két különböző nevet mutat. Nem generál hiányzó neveket.

A 365 napos alapadat nem tartalmazott február 29-i rekordot. A külön `namedays-leap.json` explicit szökőévi táblát ad február 24–29-re. A 24-i üres nap és a következő napok eltolása a dokumentált Mátyás-ugrás hagyományát követi. Február 29-re az Elemér és Antónia neveket a [Magyar Csillagászati Egyesület cikke](https://www.csillagaszat.hu/csilltort/egyetemes-csillagaszattortenet/egyetemes-kesokozepkor-csillagaszata/szokonapi-matematika-es-csillagaszat/) nevesíti. Ezek tényadatok; a cikk szövege nincs átvéve. A többi szökőévi rekord az MIT-adatbázis megfelelő, eltolódó bejegyzése. A személyes február 29-i események megünneplési szabálya ettől teljesen külön működik.

## Ünnepnapok

Forrás: [2012. évi I. törvény 102. §](https://njt.hu/jogszabaly/2012-1-00-00), a nagypénteket hozzáadó [2017. évi XIII. törvény](https://mkogy.jogtar.hu/jogszabaly?docid=A1700013.TV). A strukturált szabályrekord ellenőrzési dátuma 2026. november 2.; ellenőrzött tartománya 2017–2026. Ez a tartomány az alap munkaszüneti napok szabályaira vonatkozik, nem éves munkarend-áthelyezési rendeletekre.

Ezen kívül a program minden évben egyértelműen modern szabályrendszer szerinti vetítést jelöl. Nem állítja, hogy a jelenkori ünnepek az ókorban vagy a távoli jövőben jogilag munkaszüneti napok lennének. Történelmi naptárreformok kihagyott napjait sem modellezi: a dátumrendszer proleptikus Gergely-naptár.

## Betűk

Az alkalmazás három, helyben csomagolt Google Fonts családot kínál normál (400) és félkövér (700) változattal: **Noto Sans**, **PT Serif**, **Montserrat**. A teljes Google Fonts katalógus hálózati keresése nincs beépítve; a kereső az ellenőrzött helyi választékot szűri. Nincs futásidejű Google Fonts hálózati kérés.

Forrás: [google/fonts](https://github.com/google/fonts), `ofl/notosans`, `ofl/ptserif`, `ofl/montserrat`. Mindhárom család SIL Open Font License 1.1 alatt érhető el. A licencszövegek a `public/fonts/*-OFL.txt` fájlokban vannak.

A PT Serif fájljai az upstream statikus web-TTF-ek, változatlan betűtartalommal. A Noto Sans és Montserrat változó forrásából fontTools segítségével 400/700 súlyú statikus példány készült; Noto Sans esetén a szélességtengely 100. E két forrás licencfejlécében nincs Reserved Font Name kikötés. A magyar kis- és nagybetűk tényleges cmap-lefedettségét a feldolgozás és a futásidejű betöltő is ellenőrzi. A csomagolt binárisok SHA-256 lenyomata a `public/fonts/sources.json` fájlban található.

A PDF a betűfájlokat teljes egészükben ágyazza be, így a szöveg másik gépen is használható, a magyar ékezetek megmaradnak. A betűk külön nem értékesíthetők; a licenc feltételeit további terjesztésnél is meg kell tartani.

## Futtatási függőségek

| Csomag | Licenc | Feladat |
| --- | --- | --- |
| React, React DOM | MIT | Szerkesztőfelület |
| Zod | MIT | Szigorú projekt- és sablonséma |
| pdf-lib | MIT | Vektoros PDF és betűbeágyazás |
| @pdf-lib/fontkit | MIT | TTF-feldolgozás, karakterek mérése |
| JSZip | MIT opció választva | 12 hónapos képcsomag |
| idb-keyval | Apache-2.0 | Böngészős helyreállítás |
| lucide-react | ISC | Kezelőfelületi ikonok |

A pontos telepített verziókat a `package-lock.json` rögzíti. Fejlesztéshez TypeScript (Apache-2.0), Vite és tsx (MIT), Playwright (Apache-2.0), valamint @napi-rs/canvas és pngjs (MIT) használatos. A fejlesztői Canvas nem kerül a böngészős csomagba. A torta- és virágikonok az exportban a projekt saját egyszerű vektoralakzatai, nem emoji-betűk.

## Adatkezelés

A feltöltött fotó, személynév és születési adat nem kerül külső szolgáltatóhoz. A projektfájl letöltése tartalmazza ezeket az adatokat; a fájl megosztása már a felhasználó döntése. Az alkalmazás nem tartalmaz analitikát, külső képfeltöltést, privát API-kulcsot vagy szerveroldali adattárolást. A forráskód GitHubra feltöltése nem tölti fel a felhasználók böngészőben szerkesztett projektjeit.
