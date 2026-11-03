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
};
export function Properties({
  project: p,
  selection,
  onSelect,
  commit,
  scene,
}: {
  project: Project;
  selection: string;
  onSelect: (id: string) => void;
  commit: (p: Project | ((p: Project) => Project)) => void;
  scene: Scene | null;
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
    (cover && ["nameday", "birthday", "personalNameday"].includes(category)) ||
    (!showGrid && ["month", "weekday", "date"].includes(category))
      ? "title"
      : category;
  const t = s.typography[cat] ?? { ...s.typography.weekday, size: 5 };
  const b =
    selection === "grid"
      ? v.grid
      : selection === "title"
        ? v.titleBox
        : selection === "year"
          ? yearBoxFor(p)
          : photo?.box;
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
    commit((root) => {
      const old = viewProject(root).style;
      return updateView(root, {
        style: {
          ...old,
          typography: {
            ...old.typography,
            [cat]: validTypography({
              ...(old.typography[cat] ?? {
                ...old.typography.weekday,
                size: 5,
              }),
              ...patch,
            }),
          },
        },
      });
    });
  }
  function box(patch: Partial<Box>) {
    if (!b) return;
    commit((root) =>
      selection === "grid"
        ? updateView(root, { grid: { ...viewProject(root).grid, ...patch } })
        : selection === "title"
          ? updateView(root, {
              titleBox: { ...viewProject(root).titleBox, ...patch },
            })
          : selection === "year"
            ? updateView(root, { yearBox: { ...yearBoxFor(root), ...patch } })
            : {
                ...root,
                photos: root.photos.map((i) =>
                  i.id === selection
                    ? { ...i, box: { ...i.box, ...patch } }
                    : i,
                ),
              },
    );
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
  function reorder(direction: -1 | 1) {
    if (photo) image({ z: Math.max(-20, Math.min(20, photo.z + direction)) });
  }
  const variants = fontVariants(t.family);
  const visibleCategories = categories.filter((c) =>
    cover
      ? !["nameday", "birthday", "personalNameday", "week"].includes(c) &&
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
        <Select
          label="Elem"
          value={selection}
          options={[
            ["title", "Cím"],
            ["year", "Évszám"],
            ...(!cover || p.cover?.showCalendar !== false
              ? [["grid", "Naptárrács"] as const]
              : []),
            ...photos.map((i) => [i.id, i.name] as const),
          ]}
          onChange={onSelect}
        />
        {photo ? (
          <>
            <Slider
              label="Kép mérete a maszkban"
              value={photo.zoom}
              min={1}
              max={8}
              step={0.05}
              unit="×"
              onChange={(zoom) => image({ zoom })}
            />
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
          <button
            className="danger full"
            onClick={() => {
              commit((root) => ({
                ...root,
                photos: root.photos.flatMap((i) =>
                  i.id !== selection
                    ? [i]
                    : i.monthlyImages
                      ? [
                          {
                            ...i,
                            monthlyImages: {
                              ...i.monthlyImages,
                              [root.month]: null,
                            },
                          },
                        ]
                      : [],
                ),
              }));
              onSelect("title");
            }}
          >
            <Trash2 size={15} />
            Kép eltávolítása
          </button>
        </Section>
      ) : (
        <>
          <Section title="Tipográfia">
            <Select
              label="Szövegelem"
              value={cat}
              options={visibleCategories.map((c) => [c, names[c]] as const)}
              onChange={(c) => setCategory(c as Category)}
            />
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
            {!cover &&
              (cat === "date" || cat === "nameday" || cat === "week") && (
                <Select
                  label={
                    cat === "date"
                      ? "Nap függőleges elhelyezése"
                      : cat === "week"
                        ? "Hétszámok függőleges elhelyezése"
                        : "Névnapok függőleges elhelyezése"
                  }
                  value={t.vertical}
                  options={[
                    ["auto", cat === "nameday" ? "Nap száma alatt" : "Felül"],
                    ...(cat === "nameday" ? [["top", "Felül"] as const] : []),
                    ["middle", "Középen"],
                    ["bottom", "Alul"],
                  ]}
                  onChange={(vertical) =>
                    typography({ vertical: vertical as Typography["vertical"] })
                  }
                />
              )}
            {cat === "nameday" && (
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
            {cat === "week" && (
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
