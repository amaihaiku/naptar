import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Lock,
  Unlock,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import {
  type Project,
  type Style,
  type Typography,
  type Category,
  type Box,
  type Photo,
  categories,
  families,
  viewProject,
  updateView,
  defaultCover,
  pagePhotos,
  pageText,
  currentPage,
  elementBox,
  updateElementBox,
  slotLabel,
  emptyPhoto,
  setSlotAsset,
  yearBoxFor,
} from "../model";
import { months } from "../engines/date";
import { fontVariants, validTypography } from "../engines/fonts";
import type { Scene } from "../engines/layout";
import { Field, Num, Select, Color, Toggle, Section, Slider } from "./Controls";
const names: Record<Category, string> = {
  title: "Cím",
  year: "Évszám",
  month: "Borító hónapfeliratai",
  weekday: "Hétköznapok",
  week: "Hétszámok",
  date: "Nap száma",
  nameday: "Névnapok",
  birthday: "Születésnapok",
  personalNameday: "Személyes névnapok",
  otherEvent: "Egyéb események",
};
export function Properties({
  project: p,
  selection,
  onSelect,
  commit,
  scene,
  onLoadPhoto,
}: {
  project: Project;
  selection: string;
  onSelect: (id: string) => void;
  commit: (p: Project | ((p: Project) => Project)) => void;
  scene: Scene | null;
  onLoadPhoto: (id: string) => void;
}) {
  const v = viewProject(p),
    s = v.style,
    cover = p.mode === "annual";
  const photos = pagePhotos(p),
    photo = photos.find((i) => i.id === selection);
  const [category, setCategory] = useState<Category>("title");
  useEffect(() => {
    if (selection === "title") setCategory("title");
    else if (selection === "year") setCategory("year");
    else if (!cover && category === "month") setCategory("date");
  }, [selection, cover]);
  const showGrid = !cover || p.cover?.showCalendar !== false;
  const cat =
    (category === "week" && (cover || !p.isoWeeks)) ||
    (cover &&
      ["nameday", "birthday", "personalNameday", "otherEvent"].includes(
        category,
      )) ||
    (!showGrid && ["month", "weekday", "date"].includes(category))
      ? "title"
      : category;
  const texts = pageText(p);
  const custom = texts.find((item) => item.id === selection);
  const t =
    custom?.typography ??
    s.typography[cat] ??
    (cat === "otherEvent"
      ? s.typography.personalNameday
      : { ...s.typography.weekday, size: 5 });
  const b = elementBox(p, selection);
  function addText() {
    if ((p.textElements?.length ?? 0) >= 100) return;
    const id = crypto.randomUUID();
    const item = {
      id,
      page: currentPage(p),
      text: "Új szöveg",
      box: {
        x: p.page.margin,
        y: (p.page.marginY ?? p.page.margin) + 35,
        w: Math.min(100, p.page.width - 2 * p.page.margin),
        h: 18,
        locked: false,
      },
      typography: { ...s.typography.title, size: 18 },
    };
    commit((root) => ({
      ...root,
      textElements: [...(root.textElements ?? []), item],
    }));
    onSelect(id);
  }
  function style<K extends keyof Style>(key: K, value: Style[K]) {
    commit((root) => {
      const old = viewProject(root).style;
      return updateView(root, {
        style: {
          ...old,
          [key]: value,
          ...(key === "gridColor" ? { borderColor: value as string } : {}),
        },
      });
    });
  }
  function typography(patch: Partial<Typography>) {
    if (custom) {
      commit((root) => ({
        ...root,
        textElements: root.textElements?.map((item) =>
          item.id === custom.id
            ? {
                ...item,
                typography: validTypography({ ...item.typography, ...patch }),
              }
            : item,
        ),
      }));
      return;
    }
    commit((root) => {
      const old = viewProject(root).style;
      return updateView(root, {
        style: {
          ...old,
          typography: {
            ...old.typography,
            [cat]: validTypography({
              ...(old.typography[cat] ??
                (cat === "otherEvent"
                  ? old.typography.personalNameday
                  : { ...old.typography.weekday, size: 5 })),
              ...patch,
            }),
          },
        },
      });
    });
  }
  function box(patch: Partial<Box>) {
    commit((root) => updateElementBox(root, selection, patch));
  }
  function image(patch: Partial<Photo>) {
    commit((root) => ({
      ...root,
      photos: root.photos.map((i) =>
        i.id === selection ? { ...i, ...patch } : i,
      ),
    }));
  }
  function align(a: "left" | "center" | "right") {
    if (!b) return;
    const x =
      a === "left"
        ? p.page.margin
        : a === "right"
          ? p.page.width - p.page.margin - b.w
          : (p.page.width - b.w) / 2;
    commit((root) => {
      const old = viewProject(root);
      const key = selection === "year" ? "yearBox" : "titleBox";
      const ty = selection === "year" ? "year" : "title";
      return updateView(root, {
        [key]: { ...b, x },
        style: {
          ...old.style,
          typography: {
            ...old.style.typography,
            [ty]: { ...old.style.typography[ty], align: a },
          },
        },
      });
    });
  }
  function editPhoto(patch: NonNullable<Photo["edits"]>) {
    if (!photo?.data) return;
    const { name, data, pixelWidth, pixelHeight } = photo;
    commit((root) =>
      setSlotAsset(root, photo.id, p.mode === "annual" ? 0 : p.month, {
        name,
        data,
        pixelWidth,
        pixelHeight,
        edits: { ...photo.edits, ...patch },
      }),
    );
  }
  function reorder(direction: -1 | 1) {
    if (photo) image({ z: Math.max(-20, Math.min(20, photo.z + direction)) });
  }
  const variants = fontVariants(t.family);
  const visibleCategories = categories.filter((c) =>
    cover
      ? ![
          "nameday",
          "birthday",
          "personalNameday",
          "otherEvent",
          "week",
        ].includes(c) &&
        (showGrid || !["month", "weekday", "date"].includes(c))
      : c !== "month" && (c !== "week" || p.isoWeeks),
  );
  return (
    <>
      <Section title={cover ? "Borító elemei" : "Havi naptár elemei"}>
        {cover && (
          <Toggle
            label="Naptár megjelenítése a borítón"
            value={p.cover?.showCalendar ?? true}
            onChange={(showCalendar) => {
              if (!showCalendar) onSelect("title");
              commit((root) => ({
                ...root,
                cover: { ...(root.cover ?? defaultCover(root)), showCalendar },
              }));
            }}
          />
        )}
        <button
          className="outlined full"
          onClick={addText}
          disabled={(p.textElements?.length ?? 0) >= 100}
        >
          Szöveg hozzáadása
        </button>
        {custom && (
          <>
            <Field label="Szöveg">
              <textarea
                aria-label="Szöveg"
                value={custom.text}
                maxLength={500}
                onChange={(e) => {
                  const text = e.target.value;
                  commit((root) => ({
                    ...root,
                    textElements: root.textElements?.map((item) =>
                      item.id === custom.id ? { ...item, text } : item,
                    ),
                  }));
                }}
              />
            </Field>
            <button
              className="danger full"
              onClick={() => {
                commit((root) => ({
                  ...root,
                  textElements: root.textElements?.filter(
                    (item) => item.id !== custom.id,
                  ),
                }));
                onSelect("title");
              }}
            >
              Szöveg törlése
            </button>
          </>
        )}
        <Select
          label="Elem"
          value={selection}
          options={[
            ["title", "Cím"],
            ["year", "Évszám"],
            ...(!cover || p.cover?.showCalendar !== false
              ? [["grid", "Naptárrács"] as const]
              : []),
            ...photos.map((i) => [i.id, slotLabel(i)] as const),
            ...texts.map(
              (item, i) =>
                [
                  item.id,
                  `Szöveg ${i + 1} – ${item.text.trim().slice(0, 30)}`,
                ] as const,
            ),
          ]}
          onChange={onSelect}
        />
        {photo ? (
          <>
            <button
              className="outlined full"
              onClick={() => onLoadPhoto(photo.id)}
            >
              {photo.data ? "Képcsere" : "Kép betöltése"}
            </button>
            {photo.data && <p className="small-note">{photo.name}</p>}
            {photo.data && (
              <Slider
                label="Kép mérete a maszkban"
                value={photo.zoom}
                min={1}
                max={8}
                step={0.05}
                unit="×"
                onChange={(zoom) => image({ zoom })}
              />
            )}
            <button
              className="full"
              onClick={() => box({ x: (p.page.width - photo.box.w) / 2 })}
            >
              <AlignCenter size={16} /> Vízszintesen az oldal közepére
            </button>
          </>
        ) : (
          b && (
            <>
              {(selection === "title" || selection === "year") && (
                <>
                  {(!cover || selection !== "year") && (
                    <Field
                      label={
                        selection === "year" ? "Évszám szövege" : "Cím szövege"
                      }
                    >
                      {selection === "year" ? (
                        <input
                          type="number"
                          min={1}
                          max={9999}
                          value={p.year}
                          onChange={(e) => {
                            const year = e.target.valueAsNumber;
                            if (
                              Number.isInteger(year) &&
                              year >= 1 &&
                              year <= 9999
                            )
                              commit((root) => ({ ...root, year }));
                          }}
                        />
                      ) : (
                        <input
                          value={
                            cover
                              ? (p.cover?.title ?? "Naptár")
                              : months[p.month - 1]
                          }
                          readOnly={!cover}
                          maxLength={100}
                          onChange={(e) => {
                            const title = e.target.value;
                            commit((root) => ({
                              ...root,
                              cover: {
                                ...(root.cover ?? defaultCover(root)),
                                title,
                              },
                            }));
                          }}
                        />
                      )}
                    </Field>
                  )}
                  <div
                    className="segmented text-placement"
                    aria-label="Szöveg vízszintes elhelyezése"
                  >
                    {(
                      [
                        ["left", AlignLeft, "Balra"],
                        ["center", AlignCenter, "Középre"],
                        ["right", AlignRight, "Jobbra"],
                      ] as const
                    ).map(([a, Icon, label]) => (
                      <button
                        key={a}
                        aria-label={`${selection === "year" ? "Évszám" : "Cím"} ${label.toLowerCase()}`}
                        onClick={() => align(a)}
                      >
                        <Icon size={16} />
                        {label}
                      </button>
                    ))}
                  </div>
                </>
              )}
              {(selection === "title" || selection === "year") && (
                <>
                  <div className="two-col">
                    <Num
                      label="X pozíció"
                      value={b.x}
                      min={-600}
                      max={1200}
                      onChange={(x) => box({ x })}
                    />
                    <Num
                      label="Y pozíció"
                      value={b.y}
                      min={-600}
                      max={1200}
                      onChange={(y) => box({ y })}
                    />
                    <Num
                      label="Szélesség"
                      value={b.w}
                      min={10}
                      max={600}
                      onChange={(w) => box({ w })}
                    />
                    <Num
                      label="Magasság"
                      value={b.h}
                      min={10}
                      max={600}
                      onChange={(h) => box({ h })}
                    />
                  </div>
                  <Toggle
                    label="Szöveg zárolása"
                    value={b.locked}
                    onChange={(locked) => box({ locked })}
                  />
                </>
              )}
              {cover && selection === "grid" && (
                <div className="two-col">
                  <Num
                    label="X pozíció"
                    value={b.x}
                    min={-600}
                    max={1200}
                    onChange={(x) => box({ x })}
                  />
                  <Num
                    label="Y pozíció"
                    value={b.y}
                    min={-600}
                    max={1200}
                    onChange={(y) => box({ y })}
                  />
                  <Num
                    label="Naptár szélessége"
                    value={b.w}
                    min={10}
                    max={600}
                    onChange={(w) => box({ w })}
                  />
                  <Num
                    label="Naptár magassága"
                    value={b.h}
                    min={10}
                    max={600}
                    onChange={(h) => box({ h })}
                  />
                </div>
              )}
              {selection === "grid" && (
                <div className="button-row">
                  <button
                    title="Vízszintes középre igazítás"
                    onClick={() => box({ x: (p.page.width - b.w) / 2 })}
                  >
                    <AlignCenter size={15} /> Középre
                  </button>
                  <button
                    aria-label={b.locked ? "Elem feloldása" : "Elem zárolása"}
                    onClick={() => box({ locked: !b.locked })}
                  >
                    {b.locked ? <Lock size={15} /> : <Unlock size={15} />}
                  </button>
                </div>
              )}
            </>
          )
        )}
      </Section>
      {photo?.data && (
        <Section title="Képszerkesztés">
          <div className="button-row">
            <button
              aria-pressed={photo.edits?.flipX ?? false}
              onClick={() => editPhoto({ flipX: !photo.edits?.flipX })}
            >
              Tükrözés vízszintesen
            </button>
            <button
              aria-pressed={photo.edits?.flipY ?? false}
              onClick={() => editPhoto({ flipY: !photo.edits?.flipY })}
            >
              Tükrözés függőlegesen
            </button>
          </div>
          {(
            [
              ["rotation", "Elforgatás", 180, "°"],
              ["brightness", "Fényerő", 100, "%"],
              ["contrast", "Kontraszt", 100, "%"],
              ["saturation", "Telítettség", 100, "%"],
              ["temperature", "Színhőmérséklet", 100, "%"],
            ] as const
          ).map(([key, label, max, unit]) => (
            <Slider
              key={key}
              label={label}
              value={photo.edits?.[key] ?? 0}
              min={-max}
              max={max}
              step={1}
              unit={unit}
              onChange={(value) => editPhoto({ [key]: value })}
            />
          ))}
        </Section>
      )}
      {photo && (
        <Section title="Árnyék és tükröződés">
          <Select
            label="Árnyék típusa"
            value={photo.shadowStyle?.kind ?? "none"}
            options={[
              ["none", "Nincs"],
              ["drop", "Vetett árnyék"],
              ["contact", "Érintkezési árnyék"],
              ["curved", "Ívelt árnyék"],
            ]}
            onChange={(kind) =>
              image({
                shadowStyle:
                  kind === "none"
                    ? undefined
                    : {
                        blur: 2,
                        distance: 2,
                        angle: 45,
                        opacity: 0.35,
                        color: "#000000",
                        ...photo.shadowStyle,
                        kind: kind as NonNullable<Photo["shadowStyle"]>["kind"],
                      },
              })
            }
          />
          {photo.shadowStyle && (
            <>
              {(
                [
                  ["blur", "Árnyék életlensége", 20, "mm"],
                  ["distance", "Árnyék távolsága", 20, "mm"],
                  ["angle", "Árnyék szöge", 360, "°"],
                  ["opacity", "Árnyék átlátszatlansága", 100, "%"],
                ] as const
              ).map(([key, label, max, unit]) => (
                <Slider
                  key={key}
                  label={label}
                  min={0}
                  max={max}
                  step={key === "blur" || key === "distance" ? 0.1 : 1}
                  unit={unit}
                  value={
                    photo.shadowStyle![key] * (key === "opacity" ? 100 : 1)
                  }
                  onChange={(value) =>
                    image({
                      shadowStyle: {
                        ...photo.shadowStyle!,
                        [key]: key === "opacity" ? value / 100 : value,
                      },
                    })
                  }
                />
              ))}
              <Color
                label="Árnyék színe"
                value={photo.shadowStyle.color}
                onChange={(color) =>
                  image({ shadowStyle: { ...photo.shadowStyle!, color } })
                }
              />
            </>
          )}
          <Toggle
            label="Tükröződés"
            value={Boolean(photo.reflection)}
            onChange={(on) =>
              image({
                reflection: on ? { opacity: 0.4, length: 0.4 } : undefined,
              })
            }
          />
          {photo.reflection && (
            <>
              <Slider
                label="Tükröződés erőssége"
                min={0}
                max={100}
                step={1}
                unit="%"
                value={photo.reflection.opacity * 100}
                onChange={(value) =>
                  image({
                    reflection: { ...photo.reflection!, opacity: value / 100 },
                  })
                }
              />
              <Slider
                label="Tükröződés hossza"
                min={10}
                max={100}
                step={1}
                unit="%"
                value={photo.reflection.length * 100}
                onChange={(value) =>
                  image({
                    reflection: { ...photo.reflection!, length: value / 100 },
                  })
                }
              />
            </>
          )}
        </Section>
      )}
      {photo ? (
        <Section title="Kép maszk tulajdonságok">
          <Select
            label="Kép szerepe"
            value={photo.role}
            options={[
              ["photo", "Fénykép"],
              ["background", "Háttérkép"],
              ["logo", "Logó"],
            ]}
            onChange={(role) =>
              image({
                role: role as Photo["role"],
                ...(role === "background"
                  ? {
                      z: -20,
                      box: {
                        ...photo.box,
                        x: 0,
                        y: 0,
                        w: p.page.width,
                        h: p.page.height,
                      },
                    }
                  : {}),
              })
            }
          />
          <Select
            label="Maszk alakja"
            value={photo.shape}
            options={[
              ["rectangle", "Téglalap"],
              ["ellipse", "Ovális"],
              ["circle", "Kör"],
            ]}
            onChange={(shape) => image({ shape: shape as Photo["shape"] })}
          />
          <Slider
            label="Maszk lekerekítése"
            value={photo.radius}
            min={0}
            max={50}
            step={0.1}
            onChange={(radius) => image({ radius })}
          />
          <Select
            label="Keret stílusa"
            value={photo.borderStyle ?? "solid"}
            options={[
              ["solid", "Folytonos"],
              ["dashed", "Szaggatott"],
              ["dotted", "Pontozott"],
              ["double", "Dupla"],
              ["frame", "Képkeret"],
            ]}
            onChange={(value) =>
              image({
                borderStyle: value as Photo["borderStyle"],
                border: photo.border || 0.8,
              })
            }
          />
          <Slider
            label="Maszk keret vastagsága"
            value={photo.border}
            min={0}
            max={10}
            step={0.1}
            onChange={(border) => image({ border })}
          />
          <Color
            label="Maszk keret színe"
            value={photo.borderColor}
            onChange={(borderColor) => image({ borderColor })}
          />
          <Field label="Rétegsorrend">
            <div className="button-row">
              <button onClick={() => reorder(-1)}>
                <ArrowDown size={15} />
                Lejjebb
              </button>
              <button onClick={() => reorder(1)}>
                <ArrowUp size={15} />
                Feljebb
              </button>
            </div>
          </Field>
          <Slider
            label="Kép átlátszatlansága"
            value={photo.opacity * 100}
            min={5}
            max={100}
            step={1}
            unit="%"
            onChange={(opacity) => image({ opacity: opacity / 100 })}
          />
          <Toggle
            label="Kép látható"
            value={photo.visible}
            onChange={(visible) => image({ visible })}
          />
          {photo.data && (
            <button
              className="danger full"
              onClick={() =>
                commit((root) =>
                  setSlotAsset(
                    root,
                    photo.id,
                    cover ? 0 : root.month,
                    emptyPhoto,
                  ),
                )
              }
            >
              <Trash2 size={15} /> Kép eltávolítása
            </button>
          )}
        </Section>
      ) : (
        <>
          <Section title="Tipográfia">
            {!custom && (
              <Select
                label="Szövegelem"
                value={cat}
                options={visibleCategories.map((c) => [c, names[c]] as const)}
                onChange={(c) => setCategory(c as Category)}
              />
            )}
            <Select
              label="Betűtípus"
              value={t.family}
              options={families}
              onChange={(family) =>
                typography({ family: family as Typography["family"] })
              }
            />
            <div className="two-col">
              <Num
                label="Betűméret"
                unit="pt"
                value={t.size}
                min={2}
                max={100}
                step={0.5}
                onChange={(size) => typography({ size })}
              />
              <Select
                label="Típus"
                value={`${t.weight}-${t.italic ? "italic" : "normal"}`}
                options={variants.map(
                  (v) =>
                    [
                      `${v.weight}-${v.italic ? "italic" : "normal"}`,
                      v.weight === 700
                        ? v.italic
                          ? "Bold italic"
                          : "Bold"
                        : v.italic
                          ? "Italic"
                          : "Regular",
                    ] as const,
                )}
                onChange={(value) => {
                  const [weight, slant] = value.split("-");
                  typography({
                    weight: Number(weight) as 400 | 700,
                    italic: slant === "italic",
                  });
                }}
              />
            </div>
            <Color
              label={
                cat === "date"
                  ? "Nap színe"
                  : cat === "nameday"
                    ? "Névnapok színe"
                    : "Betűszín"
              }
              value={t.color}
              onChange={(color) => typography({ color })}
            />
            <Select
              label={
                cat === "date"
                  ? "Nap elhelyezése"
                  : cat === "nameday"
                    ? "Névnapok elhelyezése"
                    : "Szöveg igazítása"
              }
              value={t.align}
              options={[
                ["left", "Balra"],
                ["center", "Középre"],
                ["right", "Jobbra"],
              ]}
              onChange={(align) =>
                typography({ align: align as Typography["align"] })
              }
            />
            {(custom ||
              (!cover &&
                (cat === "date" || cat === "nameday" || cat === "week"))) && (
              <Select
                label={
                  custom
                    ? "Szöveg függőleges igazítása"
                    : cat === "date"
                      ? "Nap függőleges elhelyezése"
                      : cat === "week"
                        ? "Hétszámok függőleges elhelyezése"
                        : "Névnapok függőleges elhelyezése"
                }
                value={t.vertical}
                options={[
                  [
                    "auto",
                    !custom && cat === "nameday" ? "Nap száma alatt" : "Felül",
                  ],
                  ...(!custom && cat === "nameday"
                    ? [["top", "Felül"] as const]
                    : []),
                  ["middle", "Középen"],
                  ["bottom", "Alul"],
                ]}
                onChange={(vertical) =>
                  typography({ vertical: vertical as Typography["vertical"] })
                }
              />
            )}
            {!custom && cat === "nameday" && (
              <>
                <Select
                  label="Névnapok elrendezése"
                  value={s.namedayLayout ?? "auto"}
                  options={[
                    ["auto", "Automatikus"],
                    ["row", "Egy sorba"],
                    ["stack", "Egymás alá"],
                  ]}
                  onChange={(value) =>
                    style(
                      "namedayLayout",
                      value === "auto"
                        ? undefined
                        : (value as Style["namedayLayout"]),
                    )
                  }
                />
                <Slider
                  label="Névnapok vízszintes eltolása"
                  value={s.namedayX ?? 0}
                  min={-30}
                  max={30}
                  step={0.1}
                  onChange={(value) => style("namedayX", value)}
                />
                <Slider
                  label="Névnapok függőleges eltolása"
                  value={s.namedayY ?? 0}
                  min={-30}
                  max={30}
                  step={0.1}
                  onChange={(value) => style("namedayY", value)}
                />
              </>
            )}
            {!custom && cat === "week" && (
              <>
                <Slider
                  label="Hétszámok vízszintes eltolása"
                  value={s.weekX ?? 0}
                  min={-20}
                  max={20}
                  step={0.1}
                  onChange={(value) => style("weekX", value)}
                />
                <Slider
                  label="Hétszámok függőleges eltolása"
                  value={s.weekY ?? 0}
                  min={-20}
                  max={20}
                  step={0.1}
                  onChange={(value) => style("weekY", value)}
                />
              </>
            )}
            {!cover &&
              !custom &&
              (cat === "birthday" ||
                cat === "personalNameday" ||
                cat === "otherEvent") &&
              (() => {
                const kind =
                  cat === "birthday"
                    ? "birthday"
                    : cat === "otherEvent"
                      ? "other"
                      : "nameday";
                const values = s.eventOffsets?.[kind] ?? [0, 0];
                return (["Vízszintes", "Függőleges"] as const).map(
                  (axis, index) => (
                    <Slider
                      key={axis}
                      label={`${axis} eltolás`}
                      value={values[index]}
                      min={-30}
                      max={30}
                      step={0.1}
                      onChange={(value) =>
                        style("eventOffsets", {
                          ...s.eventOffsets,
                          [kind]:
                            index === 0
                              ? [value, values[1]]
                              : [values[0], value],
                        })
                      }
                    />
                  ),
                );
              })()}
            <Num
              label="Betűköz"
              value={t.spacing}
              min={-1}
              max={5}
              step={0.05}
              onChange={(spacing) => typography({ spacing })}
            />
            <Num
              label="Sorköz szorzója"
              unit="×"
              value={t.lineHeight}
              min={0.8}
              max={3}
              step={0.05}
              onChange={(lineHeight) => typography({ lineHeight })}
            />
            <Toggle
              label="Nagybetűs"
              value={t.uppercase}
              onChange={(uppercase) => typography({ uppercase })}
            />
          </Section>
          {showGrid && (
            <>
              <Section title="Rács és térközök">
                <div className="two-col">
                  <Num
                    label="Cella belső margó"
                    value={s.padding}
                    min={0}
                    max={10}
                    step={0.1}
                    onChange={(n) => style("padding", n)}
                  />
                  <Num
                    label="Rács vastagsága"
                    value={s.gridLine}
                    min={0}
                    max={3}
                    step={0.1}
                    onChange={(n) => style("gridLine", n)}
                  />
                </div>
                <Color
                  label="Keret és rács színe"
                  value={s.gridColor}
                  onChange={(n) => style("gridColor", n)}
                />
                <div className="two-col">
                  <Num
                    label="Külső keret"
                    value={s.border}
                    min={0}
                    max={5}
                    step={0.1}
                    onChange={(n) => style("border", n)}
                  />
                  <Num
                    label="Sarkok sugara"
                    value={s.radius}
                    min={0}
                    max={30}
                    step={0.1}
                    onChange={(n) => style("radius", n)}
                  />
                </div>
                <Color
                  label="Cellák alapszíne"
                  value={s.cellBackground}
                  onChange={(n) => style("cellBackground", n)}
                />
                <Num
                  label="Cím és rács térköze"
                  value={s.titleGap}
                  min={-30}
                  max={50}
                  step={0.1}
                  onChange={(n) => style("titleGap", n)}
                />
                {cover ? (
                  <div className="two-col">
                    <Num
                      label="Hónapok vízszintes köze"
                      value={s.gapX}
                      min={0}
                      max={20}
                      step={0.1}
                      onChange={(n) => style("gapX", n)}
                    />
                    <Num
                      label="Hónapok függőleges köze"
                      value={s.gapY}
                      min={0}
                      max={20}
                      step={0.1}
                      onChange={(n) => style("gapY", n)}
                    />
                  </div>
                ) : (
                  <Num
                    label="Hétfejléc magassága"
                    value={s.headerHeight}
                    min={3}
                    max={20}
                    step={0.1}
                    onChange={(n) => style("headerHeight", n)}
                  />
                )}
                <Toggle
                  label="Hétfejléc megjelenítése"
                  value={s.showWeekdays}
                  onChange={(n) => style("showWeekdays", n)}
                />
                <Select
                  label="Hétköznapok felirata"
                  value={s.weekdayStyle}
                  options={[
                    ["full", "Teljes név"],
                    ["short", "Rövid név"],
                    ["single", "Kezdőbetűk"],
                  ]}
                  onChange={(n) =>
                    style("weekdayStyle", n as Style["weekdayStyle"])
                  }
                />
              </Section>
              {!cover && (
                <Section title="Hétvégék és ünnepnapok">
                  <Color
                    label="Kiemelt számok színe"
                    value={s.holidayColor}
                    onChange={(n) => style("holidayColor", n)}
                  />
                  <Color
                    label="Kiemelt napok háttere"
                    value={s.holidayBackground}
                    onChange={(n) => style("holidayBackground", n)}
                  />
                  <Color
                    label="Munkaszüneti/ünnepnap"
                    value={s.customHolidayBackground ?? s.holidayBackground}
                    onChange={(value) =>
                      style("customHolidayBackground", value)
                    }
                  />

                  {!cover && (
                    <>
                      <Color
                        label="Személyes születésnapok színe"
                        value={s.typography.birthday.color}
                        onChange={(color) =>
                          commit((root) => {
                            const old = viewProject(root).style;
                            return updateView(root, {
                              style: {
                                ...old,
                                typography: {
                                  ...old.typography,
                                  birthday: {
                                    ...old.typography.birthday,
                                    color,
                                  },
                                },
                              },
                            });
                          })
                        }
                      />
                      <Color
                        label="Személyes névnapok színe"
                        value={s.typography.personalNameday.color}
                        onChange={(color) =>
                          commit((root) => {
                            const old = viewProject(root).style;
                            return updateView(root, {
                              style: {
                                ...old,
                                typography: {
                                  ...old.typography,
                                  personalNameday: {
                                    ...old.typography.personalNameday,
                                    color,
                                  },
                                },
                              },
                            });
                          })
                        }
                      />
                    </>
                  )}
                </Section>
              )}
            </>
          )}
        </>
      )}
      {scene && scene.issues.length > 0 && (
        <Section title="Nyomtatási ellenőrzés">
          <div className="issue-list">
            {scene.issues.slice(0, 5).map((i, k) => (
              <p
                key={k}
                className={i.severity === "error" ? "error" : "warning"}
              >
                <AlertTriangle size={14} />
                {i.message}
              </p>
            ))}
          </div>
        </Section>
      )}
    </>
  );
}
