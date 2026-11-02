import { useEffect, useMemo, useRef, useState } from "react";
import { get, set } from "idb-keyval";
import {
  CalendarDays,
  Download,
  Undo2,
  Redo2,
  Save,
  FolderOpen,
  Plus,
  ImagePlus,
  Copy,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  Eye,
  SlidersHorizontal,
  LayoutTemplate,
  Image,
  Sparkles,
  AlertTriangle,
  Printer,
  Trash2,
  AlignCenter,
  Lock,
  Unlock,
  Search,
  FileJson,
  Flower2,
  Cake,
  LoaderCircle,
} from "lucide-react";
import { useProject } from "./hooks";
import {
  defaultProject,
  type Project,
  type Style,
  type Typography,
  type Category,
  type Box,
  type Photo,
  families,
  categories,
  effectiveStyle,
  applyPaper,
  parseProject,
  serializeProject,
  projectSchema,
} from "./model";
import { loadFonts } from "./engines/fonts";
import { buildScene } from "./engines/layout";
import { type CivilDate, months, daysInMonth } from "./engines/date";
import { holidayStatus } from "./engines/holidays";
import {
  presets,
  applyPreset,
  templateOf,
  loadTemplate,
} from "./engines/templates";
import { eventLabel, occurrence } from "./engines/events";
import { readPhoto, validatePhotos, pruneImages } from "./engines/images";
import { download, exportCalendar, validateExport } from "./engines/export";
import {
  Field,
  Num,
  Select,
  Color,
  Toggle,
  Section,
} from "./components/Controls";
import { EventEditor } from "./components/EventEditor";
import { Workspace, type Selection } from "./components/Workspace";
const categoryNames: Record<Category, string> = {
  year: "Évszám",
  month: "Hónap neve",
  weekday: "Hétköznapok",
  date: "Dátumszámok",
  nameday: "Hagyományos névnapok",
  birthday: "Születésnapok",
  personalNameday: "Személyes névnapok",
};
const RECOVERY = "naptar-studio-recovery-v1";
type Tab = "layout" | "design" | "photos" | "events";
export default function App() {
  const history = useProject();
  const [draft, setDraft] = useState<Project | null>(null);
  const p = draft ?? history.project;
  const [ready, setReady] = useState(false),
    [fontError, setFontError] = useState(""),
    [message, setMessage] = useState(""),
    [advanced, setAdvanced] = useState(false),
    [tab, setTab] = useState<Tab>("layout"),
    [selection, setSelection] = useState<Selection>("grid"),
    [category, setCategory] = useState<Category>("month"),
    [fontSearch, setFontSearch] = useState(""),
    [eventSearch, setEventSearch] = useState(""),
    [date, setDate] = useState<CivilDate | null>(null),
    [guides, setGuides] = useState(true),
    [preview, setPreview] = useState(false),
    [monthOnly, setMonthOnly] = useState(false),
    [recovery, setRecovery] = useState<Project | null>(null),
    [recoveryChecked, setRecoveryChecked] = useState(false),
    [autoStatus, setAutoStatus] = useState("Helyi helyreállítás előkészítése…"),
    [exportOpen, setExportOpen] = useState(false),
    [format, setFormat] = useState<"pdf" | "png" | "jpg">("pdf"),
    [allMonths, setAllMonths] = useState(false),
    [busy, setBusy] = useState(""),
    [warningsAccepted, setWarningsAccepted] = useState(false);
  const projectInput = useRef<HTMLInputElement>(null),
    templateInput = useRef<HTMLInputElement>(null),
    photoInput = useRef<HTMLInputElement>(null);
  const commit = history.commit;
  const s = effectiveStyle(p);
  const t = s.typography[category];
  const selectedPhoto = p.photos.find((i) => i.id === selection);
  const selectedBox =
    selection === "grid"
      ? p.grid
      : selection === "title"
        ? p.titleBox
        : selectedPhoto?.box;
  const initFonts = () => {
    setFontError("");
    loadFonts()
      .then(() => setReady(true))
      .catch((e) => setFontError(String(e.message)));
  };
  useEffect(initFonts, []);
  useEffect(() => {
    let active = true;
    get<string>(RECOVERY)
      .then(async (source) => {
        if (source) {
          const candidate = parseProject(source);
          await validatePhotos(candidate.photos);
          if (active) setRecovery(candidate);
        }
      })
      .catch(() => setAutoStatus("A helyi helyreállítás nem olvasható."))
      .finally(() => {
        if (active) setRecoveryChecked(true);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!recoveryChecked || recovery) return;
    const timer = setTimeout(() => {
      setAutoStatus("Helyi helyreállítás mentése…");
      set(RECOVERY, serializeProject(history.project))
        .then(() => setAutoStatus("Helyi helyreállítás mentve"))
        .catch(() =>
          setAutoStatus(
            "A helyi tárhely megtelt vagy nem elérhető. Ments projektfájlt!",
          ),
        );
    }, 1000);
    return () => clearTimeout(timer);
  }, [history.project, recovery, recoveryChecked]);
  useEffect(() => {
    const timer = setTimeout(() => setMessage(""), 8000);
    return () => clearTimeout(timer);
  }, [message]);
  useEffect(() => {
    if (!busy) pruneImages(history.project.photos);
  }, [history.project.photos, busy]);
  const save = () => {
    download(
      serializeProject(history.project),
      `naptar-${history.project.year}.naptar.json`,
    );
    setMessage(
      "A projektfájl letöltése elindult. Ezt őrizd meg tartós biztonsági mentésként.",
    );
  };
  useEffect(() => {
    function key(e: KeyboardEvent) {
      const input =
        e.target instanceof HTMLElement &&
        !!e.target.closest("input, textarea, select, [contenteditable]");
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
      }
      if (!input && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? history.redo() : history.undo();
      }
      if (!input && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        history.redo();
      }
      if (e.key === "Escape") {
        setExportOpen(false);
        setDate(null);
      }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [history.project]);
  const scene = useMemo(() => (ready ? buildScene(p) : null), [p, ready]);
  const preflight = useMemo(
    () => (ready && exportOpen ? validateExport(p, allMonths) : null),
    [p, allMonths, ready, exportOpen],
  );
  function change<K extends keyof Project>(key: K, value: Project[K]) {
    commit((v) => ({ ...v, [key]: value }));
  }
  function style<K extends keyof Style>(key: K, value: Style[K]) {
    commit((v) =>
      monthOnly && v.mode === "monthly"
        ? {
            ...v,
            monthOverrides: {
              ...v.monthOverrides,
              [v.month]: { ...v.monthOverrides[v.month], [key]: value },
            },
          }
        : { ...v, style: { ...v.style, [key]: value } },
    );
  }
  function type<K extends keyof Typography>(key: K, value: Typography[K]) {
    commit((v) => {
      if (monthOnly && v.mode === "monthly") {
        const o = v.monthOverrides[v.month] ?? {};
        return {
          ...v,
          monthOverrides: {
            ...v.monthOverrides,
            [v.month]: {
              ...o,
              typography: {
                ...o.typography,
                [category]: { ...o.typography?.[category], [key]: value },
              },
            },
          },
        };
      }
      return {
        ...v,
        style: {
          ...v.style,
          typography: {
            ...v.style.typography,
            [category]: { ...v.style.typography[category], [key]: value },
          },
        },
      };
    });
  }
  function boxChange(patch: Partial<Box>) {
    if (!selectedBox) return;
    commit((v) =>
      selection === "grid"
        ? { ...v, grid: { ...v.grid, ...patch } }
        : selection === "title"
          ? { ...v, titleBox: { ...v.titleBox, ...patch } }
          : {
              ...v,
              photos: v.photos.map((i) =>
                i.id === selection ? { ...i, box: { ...i.box, ...patch } } : i,
              ),
            },
    );
  }
  function photoChange(patch: Partial<Photo>) {
    commit((v) => ({
      ...v,
      photos: v.photos.map((i) =>
        i.id === selection ? { ...i, ...patch } : i,
      ),
    }));
  }
  async function importProject(file?: File, template = false) {
    if (!file) return;
    try {
      if (file.size > 80_000_000)
        throw new Error("A fájl legfeljebb 80 MB lehet.");
      const raw = await file.text();
      const next = template
        ? projectSchema.parse(loadTemplate(history.project, JSON.parse(raw)))
        : parseProject(raw);
      await validatePhotos(next.photos);
      commit(next);
      setMessage(
        template ? "A sablon betöltve." : "A teljes projekt betöltve.",
      );
    } catch (e) {
      setMessage(
        "Betöltési hiba: " + (e instanceof Error ? e.message : String(e)),
      );
    } finally {
      if (projectInput.current) projectInput.current.value = "";
      if (templateInput.current) templateInput.current.value = "";
    }
  }
  async function upload(file?: File) {
    if (!file) return;
    setBusy("Fénykép beolvasása…");
    try {
      if (p.photos.length >= 16)
        throw new Error("Legfeljebb 16 kép adható a projekthez.");
      const photo = await readPhoto(file, p.page.width, p.page.height);
      const next = projectSchema.parse({
        ...history.project,
        photos: [...history.project.photos, photo],
      });
      commit(next);
      setSelection(photo.id);
      setTab("photos");
    } catch (e) {
      setMessage(String((e as Error).message));
    } finally {
      setBusy("");
      if (photoInput.current) photoInput.current.value = "";
    }
  }
  function mode(value: "annual" | "monthly") {
    let next = { ...p, mode: value };
    if (value === "monthly" && p.page.size === "A7")
      next = applyPaper(next, "A6", p.page.orientation);
    commit(next);
  }
  const errors = preflight?.issues.filter((i) => i.severity === "error") ?? [],
    warnings = preflight?.issues.filter((i) => i.severity === "warning") ?? [];
  async function runExport() {
    setBusy("Export előkészítése…");
    try {
      await exportCalendar(history.project, format, allMonths, setBusy);
      setExportOpen(false);
      setMessage("Az export elkészült, a letöltés elindult.");
    } catch (e) {
      setMessage("Exporthiba: " + (e as Error).message);
    } finally {
      setBusy("");
    }
  }
  const toolbar = (
    <>
      <button
        title="Visszavonás (Ctrl+Z)"
        aria-label="Visszavonás"
        disabled={!history.canUndo}
        onClick={history.undo}
      >
        <Undo2 size={18} />
      </button>
      <button
        title="Újra (Ctrl+Y)"
        aria-label="Újra"
        disabled={!history.canRedo}
        onClick={history.redo}
      >
        <Redo2 size={18} />
      </button>
    </>
  );
  return (
    <div className="studio">
      <style>{`@page { size: ${p.page.width}mm ${p.page.height}mm; margin: 0; } @media print { .paper { width:${p.page.width}mm !important; height:${p.page.height}mm !important; } }`}</style>
      <div className="mobile-notice">
        <CalendarDays size={40} />
        <h1>Naptárstúdió</h1>
        <p>
          A pontos nyomdai szerkesztéshez legalább 1100 pixel széles asztali
          böngészőablak szükséges.
        </p>
        <p>A projektjeidet számítógépen tudod megnyitni és exportálni.</p>
      </div>
      <header className="app-header">
        <a className="brand" href="#" aria-label="Naptárstúdió">
          <span className="brand-icon">
            <CalendarDays size={23} />
          </span>
          <span>
            Naptár<span className="brand-light">stúdió</span>
            <small>ALKOSD MEG AZ ÉVED</small>
          </span>
        </a>
        <div className="project-heading">
          <input
            aria-label="Projekt neve"
            value={p.title}
            maxLength={100}
            onChange={(e) => {
              if (e.target.value) change("title", e.target.value);
            }}
          />
          <span className="project-badge">Személyes projekt</span>
        </div>
        <div className="header-actions">
          <div className="history-buttons">{toolbar}</div>
          <button onClick={save}>
            <Save size={16} /> Projekt mentése
          </button>
          <button
            className="primary export-button"
            disabled={!ready}
            onClick={() => {
              setWarningsAccepted(false);
              setExportOpen(true);
            }}
          >
            <Download size={17} /> Exportálás
          </button>
        </div>
      </header>
      <div className="sub-header">
        <div className="file-actions">
          <button
            onClick={() => {
              commit(defaultProject());
              setSelection("grid");
            }}
          >
            <Plus size={14} /> Új
          </button>
          <button onClick={() => projectInput.current?.click()}>
            <FolderOpen size={14} /> Megnyitás
          </button>
          <button
            onClick={() =>
              commit((v) => ({
                ...v,
                title: v.title.slice(0, 85) + " – másolat",
              }))
            }
          >
            <Copy size={14} /> Másolat
          </button>
        </div>
        <div className="preview-controls">
          <button
            className={guides ? "active" : ""}
            onClick={() => setGuides((v) => !v)}
          >
            Segédvonalak
          </button>
          <button
            className={preview ? "active" : ""}
            onClick={() => setPreview((v) => !v)}
          >
            <Eye size={14} /> Nyomtatási nézet
          </button>
          <button
            title="Böngésző nyomtatás"
            aria-label="Nyomtatás"
            disabled={!ready}
            onClick={() => window.print()}
          >
            <Printer size={15} />
          </button>
        </div>
        <label className="advanced-switch">
          Egyszerű
          <input
            type="checkbox"
            checked={advanced}
            onChange={(e) => {
              setAdvanced(e.target.checked);
              if (!e.target.checked) setMonthOnly(false);
            }}
          />
          Haladó
        </label>
      </div>
      <main className="editor-layout">
        <aside className="left-panel">
          <div className="panel-tabs">
            {(
              [
                ["layout", SlidersHorizontal, "Elrendezés"],
                ["design", Sparkles, "Stílus"],
                ["photos", Image, "Képek"],
                ["events", Cake, "Események"],
              ] as const
            ).map(([id, Icon, label]) => (
              <button
                key={id}
                className={tab === id ? "selected" : ""}
                onClick={() => setTab(id)}
                title={label}
              >
                <Icon size={18} />
                <span>{label}</span>
              </button>
            ))}
          </div>
          <div className="panel-content">
            {tab === "layout" && (
              <>
                <Section title="A naptárad">
                  <div className="segmented">
                    <button
                      className={p.mode === "monthly" ? "selected" : ""}
                      onClick={() => mode("monthly")}
                    >
                      Havi
                    </button>
                    <button
                      className={p.mode === "annual" ? "selected" : ""}
                      onClick={() => mode("annual")}
                    >
                      Éves
                    </button>
                  </div>
                  <Num
                    label="Év"
                    value={p.year}
                    min={1}
                    max={9999}
                    unit=""
                    onChange={(v) => change("year", Math.round(v))}
                  />
                  {p.mode === "monthly" && (
                    <div className="month-selector">
                      <button
                        aria-label="Előző hónap"
                        onClick={() =>
                          change("month", p.month === 1 ? 12 : p.month - 1)
                        }
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <select
                        aria-label="Hónap"
                        value={p.month}
                        onChange={(e) =>
                          change("month", Number(e.target.value))
                        }
                      >
                        {months.map((m, i) => (
                          <option key={m} value={i + 1}>
                            {m}
                          </option>
                        ))}
                      </select>
                      <button
                        aria-label="Következő hónap"
                        onClick={() =>
                          change("month", p.month === 12 ? 1 : p.month + 1)
                        }
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </Section>
                <Section title="Papír és méret">
                  <Select
                    label="Papírméret"
                    value={p.page.size}
                    options={(p.mode === "annual"
                      ? ["A4", "A5", "A6", "A7"]
                      : ["A4", "A5", "A6", "custom"]
                    ).map(
                      (v) => [v, v === "custom" ? "Egyedi méret" : v] as const,
                    )}
                    onChange={(v) =>
                      commit(
                        applyPaper(
                          p,
                          v as Project["page"]["size"],
                          p.page.orientation,
                        ),
                      )
                    }
                  />
                  <div className="segmented orientation">
                    <button
                      className={
                        p.page.orientation === "portrait" ? "selected" : ""
                      }
                      onClick={() =>
                        commit(
                          applyPaper(
                            p,
                            p.page.size,
                            "portrait",
                            p.page.size === "custom"
                              ? [
                                  Math.min(p.page.width, p.page.height),
                                  Math.max(p.page.width, p.page.height),
                                ]
                              : undefined,
                          ),
                        )
                      }
                    >
                      <span className="paper-icon portrait" /> Álló
                    </button>
                    <button
                      className={
                        p.page.orientation === "landscape" ? "selected" : ""
                      }
                      onClick={() =>
                        commit(
                          applyPaper(
                            p,
                            p.page.size,
                            "landscape",
                            p.page.size === "custom"
                              ? [
                                  Math.max(p.page.width, p.page.height),
                                  Math.min(p.page.width, p.page.height),
                                ]
                              : undefined,
                          ),
                        )
                      }
                    >
                      <span className="paper-icon landscape" /> Fekvő
                    </button>
                  </div>
                  {p.page.size === "custom" && (
                    <div className="two-col">
                      <Num
                        label="Lapszélesség"
                        value={p.page.width}
                        min={40}
                        max={600}
                        onChange={(v) =>
                          commit(
                            applyPaper(p, "custom", p.page.orientation, [
                              v,
                              p.page.height,
                            ]),
                          )
                        }
                      />
                      <Num
                        label="Lapmagasság"
                        value={p.page.height}
                        min={40}
                        max={600}
                        onChange={(v) =>
                          commit(
                            applyPaper(p, "custom", p.page.orientation, [
                              p.page.width,
                              v,
                            ]),
                          )
                        }
                      />
                    </div>
                  )}
                  <Num
                    label="Margó"
                    value={p.page.margin}
                    min={0}
                    max={40}
                    onChange={(v) => change("page", { ...p.page, margin: v })}
                  />
                  <div className="paper-info">
                    {p.page.width} × {p.page.height} mm{" "}
                    <span>300 DPI export</span>
                  </div>
                </Section>
                <Section title="Naptárbeállítások">
                  <Select
                    label="A hét első napja"
                    value={p.firstDay}
                    options={[
                      ["1", "Hétfő"],
                      ["7", "Vasárnap"],
                    ]}
                    onChange={(v) => change("firstDay", Number(v) as 1 | 7)}
                  />
                  <Toggle
                    label="ISO-hétszámok"
                    value={p.isoWeeks}
                    onChange={(v) => change("isoWeeks", v)}
                  />
                  {p.mode === "monthly" && (
                    <>
                      <Toggle
                        label="Szomszédos hónapok napjai"
                        value={p.adjacent}
                        onChange={(v) => change("adjacent", v)}
                      />
                      <Toggle
                        label="Hagyományos névnapok"
                        value={s.showNamedays}
                        onChange={(v) => style("showNamedays", v)}
                      />
                    </>
                  )}
                  <Toggle
                    label="Évszám megjelenítése"
                    value={s.showYear}
                    onChange={(v) => style("showYear", v)}
                  />
                  <Toggle
                    label="Ünnepnapok kiemelése"
                    value={s.highlight}
                    onChange={(v) => style("highlight", v)}
                  />
                  <p className="legal-note">
                    {holidayStatus(p.year)}. Áthelyezett pihenő- és munkanapok
                    nincsenek feltüntetve.
                  </p>
                </Section>
              </>
            )}
            {tab === "design" && (
              <>
                <Section title="Válassz hangulatot">
                  <p className="section-intro">
                    Egy kiindulópont. A részletek már a tieid.
                  </p>
                  <div className="preset-grid">
                    {presets.map((name, i) => (
                      <button
                        className={`preset preset-${i}`}
                        key={name}
                        onClick={() => commit(applyPreset(p, name))}
                      >
                        <span className="preset-preview">
                          <i />
                          <b>23</b>
                          <i />
                        </span>
                        <span>{name}</span>
                      </button>
                    ))}
                  </div>
                </Section>
                <Section title="Saját sablon">
                  <button
                    className="outlined full"
                    onClick={() =>
                      download(
                        JSON.stringify(templateOf(p)),
                        `naptar-sablon.json`,
                      )
                    }
                  >
                    <LayoutTemplate size={16} /> Sablon mentése
                  </button>
                  <button
                    className="full"
                    onClick={() => templateInput.current?.click()}
                  >
                    <FolderOpen size={16} /> Sablon betöltése
                  </button>
                  <p className="small-note">
                    A sablon az arculatot és a képeket menti; az évet és a
                    személyes eseményeket a projektedből tartja meg.
                  </p>
                </Section>
                <Section title="Háttér">
                  <Color
                    label="Papír színe"
                    value={s.background}
                    onChange={(v) => style("background", v)}
                  />
                  <Select
                    label="Dekoratív minta"
                    value={s.pattern}
                    options={[
                      ["none", "Nincs"],
                      ["dots", "Pontozott"],
                      ["lines", "Rövid vonalak"],
                    ]}
                    onChange={(v) => style("pattern", v as Style["pattern"])}
                  />
                  <Field label="Vízjel">
                    <input
                      value={s.watermark}
                      maxLength={80}
                      placeholder="Például: Családi pillanatok"
                      onChange={(e) => style("watermark", e.target.value)}
                    />
                  </Field>
                  {s.watermark && (
                    <Num
                      label="Vízjel átlátszatlansága"
                      unit=""
                      value={s.watermarkOpacity}
                      min={0.02}
                      max={0.6}
                      step={0.02}
                      onChange={(v) => style("watermarkOpacity", v)}
                    />
                  )}
                </Section>
              </>
            )}
            {tab === "photos" && (
              <>
                <Section title="Képek és rétegek">
                  <button
                    className="upload-zone"
                    onClick={() => photoInput.current?.click()}
                  >
                    <ImagePlus size={28} />
                    <strong>Adj hozzá egy fényképet</strong>
                    <span>JPG, PNG vagy WebP • legfeljebb 25 MB</span>
                  </button>
                  <p className="small-note">
                    A képek és személyes adatok a böngésződben maradnak. A
                    kivágás megőrzi az eredeti képet.
                  </p>
                  {p.photos.map((i) => (
                    <button
                      className={`layer-item ${selection === i.id ? "selected" : ""}`}
                      key={i.id}
                      onClick={() => setSelection(i.id)}
                    >
                      <img src={i.data} alt="" />
                      <span>
                        {i.name}
                        <small>
                          {i.pixelWidth} × {i.pixelHeight} px
                          {i.visible ? "" : " • rejtett"}
                        </small>
                      </span>
                    </button>
                  ))}
                  {!p.photos.length && (
                    <p className="empty-state">
                      Egy fotóval személyesebb lesz az éved.
                    </p>
                  )}
                </Section>
                <Section title="Fotónaptár elrendezés">
                  <button
                    className="outlined full"
                    onClick={() => commit(applyPreset(p, "Fotónaptár"))}
                  >
                    <LayoutTemplate size={16} /> Fotó + éves naptár
                  </button>
                  <p className="small-note">
                    A fénykép és a naptár területe külön méretezhető. A6-os
                    lapra az éves rács például 74 × 105 mm-re állítható.
                  </p>
                </Section>
              </>
            )}
            {tab === "events" && (
              <>
                <Section title="Személyes események">
                  <p className="section-intro">
                    Kattints egy napra a havi naptárban, és add hozzá a
                    születésnapot vagy névnapot.
                  </p>
                  {p.mode === "annual" && (
                    <button
                      className="outlined full"
                      onClick={() => mode("monthly")}
                    >
                      Havi naptár megnyitása
                    </button>
                  )}
                  <div className="search-input">
                    <Search size={15} />
                    <input
                      aria-label="Események keresése"
                      placeholder="Keresés név alapján…"
                      value={eventSearch}
                      onChange={(e) => setEventSearch(e.target.value)}
                    />
                  </div>
                  {p.events
                    .filter((e) =>
                      e.name
                        .toLocaleLowerCase("hu")
                        .includes(eventSearch.toLocaleLowerCase("hu")),
                    )
                    .map((e) => (
                      <button
                        className="event-overview"
                        key={e.id}
                        onClick={() => {
                          const d = occurrence(e, p.year, p.leapPolicy) ?? {
                            year: p.year,
                            month: e.month,
                            day: Math.min(e.day, daysInMonth(p.year, e.month)),
                          };
                          setDate(d);
                        }}
                      >
                        {e.kind === "birthday" ? (
                          <Cake size={17} />
                        ) : (
                          <Flower2 size={17} />
                        )}
                        <span>
                          {eventLabel(e, p.year)}
                          <small>
                            {months[e.month - 1]} {e.day}.
                            {e.hidden ? " • elrejtve" : ""}
                          </small>
                        </span>
                      </button>
                    ))}
                  {!p.events.length && (
                    <p className="empty-state">
                      A fontos napok itt gyűlnek majd.
                    </p>
                  )}
                </Section>
                <Section title="Február 29-i ismétlődés">
                  <Select
                    label="Nem szökőévben"
                    value={p.leapPolicy}
                    options={[
                      ["feb28", "Február 28-án"],
                      ["mar1", "Március 1-jén"],
                    ]}
                    onChange={(v) =>
                      change("leapPolicy", v as Project["leapPolicy"])
                    }
                  />
                </Section>
              </>
            )}
          </div>
          <div className="panel-foot">
            <span className="status-dot" />
            <span>{autoStatus}</span>
          </div>
        </aside>
        {ready && scene ? (
          <Workspace
            project={p}
            scene={scene}
            selection={selection}
            onSelect={setSelection}
            onCommit={commit}
            onPreview={setDraft}
            onDate={setDate}
            previewMode={preview}
            guides={guides}
          />
        ) : (
          <div className="loading-canvas">
            {fontError ? (
              <>
                <AlertTriangle />
                <h2>A betűk nem tölthetők be</h2>
                <p>{fontError}</p>
                <button onClick={initFonts}>Újrapróbálás</button>
              </>
            ) : (
              <>
                <LoaderCircle className="spin" size={30} />
                <h2>Előkészítjük az alkotóteret</h2>
                <p>Magyar karakterek és nyomdai betűk betöltése…</p>
              </>
            )}
          </div>
        )}
        <aside className="right-panel">
          <div className="properties-heading">
            <SlidersHorizontal size={16} />
            <h2>Tulajdonságok</h2>
          </div>
          <div className="panel-content">
            <Section title="Kijelölt elem">
              <Select
                label="Elem"
                value={selection}
                options={[
                  ["grid", "Naptárrács"],
                  ["title", "Hónap / év címe"],
                  ...p.photos.map((i) => [i.id, i.name] as const),
                ]}
                onChange={setSelection}
              />
              {selectedBox && (
                <>
                  <div className="two-col">
                    <Num
                      label="X pozíció"
                      value={selectedBox.x}
                      min={-600}
                      max={1200}
                      onChange={(v) => boxChange({ x: v })}
                    />
                    <Num
                      label="Y pozíció"
                      value={selectedBox.y}
                      min={-600}
                      max={1200}
                      onChange={(v) => boxChange({ y: v })}
                    />
                    <Num
                      label="Szélesség"
                      value={selectedBox.w}
                      min={10}
                      max={600}
                      onChange={(v) =>
                        boxChange({
                          w: v,
                          ...(selectedPhoto?.aspectLock
                            ? {
                                h: Math.min(
                                  600,
                                  Math.max(
                                    10,
                                    (v * selectedBox.h) / selectedBox.w,
                                  ),
                                ),
                              }
                            : {}),
                        })
                      }
                    />
                    <Num
                      label="Magasság"
                      value={selectedBox.h}
                      min={10}
                      max={600}
                      onChange={(v) =>
                        boxChange({
                          h: v,
                          ...(selectedPhoto?.aspectLock
                            ? {
                                w: Math.min(
                                  600,
                                  Math.max(
                                    10,
                                    (v * selectedBox.w) / selectedBox.h,
                                  ),
                                ),
                              }
                            : {}),
                        })
                      }
                    />
                  </div>
                  <div className="button-row">
                    <button
                      title="Vízszintes középre igazítás"
                      onClick={() =>
                        boxChange({ x: (p.page.width - selectedBox.w) / 2 })
                      }
                    >
                      <AlignCenter size={15} /> Középre
                    </button>
                    <button
                      aria-label={
                        selectedBox.locked ? "Elem feloldása" : "Elem zárolása"
                      }
                      onClick={() => boxChange({ locked: !selectedBox.locked })}
                    >
                      {selectedBox.locked ? (
                        <Lock size={15} />
                      ) : (
                        <Unlock size={15} />
                      )}
                    </button>
                  </div>
                </>
              )}
            </Section>
            {selectedPhoto ? (
              <>
                <Section title="Képkivágás">
                  <Select
                    label="Kép szerepe"
                    value={selectedPhoto.role}
                    options={[
                      ["photo", "Fénykép"],
                      ["background", "Háttérkép"],
                      ["logo", "Logó"],
                    ]}
                    onChange={(v) =>
                      photoChange({
                        role: v as Photo["role"],
                        ...(v === "background"
                          ? {
                              z: -20,
                              box: {
                                ...selectedPhoto.box,
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
                    label="Kivágás alakja"
                    value={selectedPhoto.shape}
                    options={[
                      ["rectangle", "Téglalap"],
                      ["ellipse", "Ovális"],
                      ["circle", "Kör"],
                    ]}
                    onChange={(v) =>
                      photoChange({ shape: v as Photo["shape"] })
                    }
                  />
                  <Num
                    label="Kép nagyítása"
                    value={selectedPhoto.zoom}
                    min={1}
                    max={8}
                    step={0.1}
                    unit="×"
                    onChange={(v) => photoChange({ zoom: v })}
                  />
                  <div className="two-col">
                    <Num
                      label="Vízszintes képkivágás"
                      value={selectedPhoto.panX}
                      min={-1}
                      max={1}
                      step={0.05}
                      unit=""
                      onChange={(v) => photoChange({ panX: v })}
                    />
                    <Num
                      label="Függőleges képkivágás"
                      value={selectedPhoto.panY}
                      min={-1}
                      max={1}
                      step={0.05}
                      unit=""
                      onChange={(v) => photoChange({ panY: v })}
                    />
                  </div>
                  <Toggle
                    label="Keret képarányának megtartása"
                    value={selectedPhoto.aspectLock}
                    onChange={(v) => photoChange({ aspectLock: v })}
                  />
                  <Num
                    label="Lekerekítés"
                    value={selectedPhoto.radius}
                    min={0}
                    max={50}
                    onChange={(v) => photoChange({ radius: v })}
                  />
                  <Num
                    label="Képkeret vastagsága"
                    value={selectedPhoto.border}
                    min={0}
                    max={10}
                    step={0.1}
                    onChange={(v) => photoChange({ border: v })}
                  />
                  <Color
                    label="Képkeret színe"
                    value={selectedPhoto.borderColor}
                    onChange={(v) => photoChange({ borderColor: v })}
                  />
                  <Num
                    label="Árnyék mérete"
                    value={selectedPhoto.shadow}
                    min={0}
                    max={15}
                    step={0.5}
                    onChange={(v) => photoChange({ shadow: v })}
                  />
                  <Num
                    label="Rétegsorrend"
                    unit=""
                    value={selectedPhoto.z}
                    min={-20}
                    max={20}
                    onChange={(v) => photoChange({ z: v })}
                  />
                  <Toggle
                    label="Kép látható"
                    value={selectedPhoto.visible}
                    onChange={(v) => photoChange({ visible: v })}
                  />
                  {advanced && (
                    <Num
                      label="Kép átlátszatlansága"
                      unit=""
                      value={selectedPhoto.opacity}
                      min={0.05}
                      max={1}
                      step={0.05}
                      onChange={(v) => photoChange({ opacity: v })}
                    />
                  )}
                  <button
                    className="danger full"
                    onClick={() => {
                      change(
                        "photos",
                        p.photos.filter((i) => i.id !== selection),
                      );
                      setSelection("grid");
                    }}
                  >
                    <Trash2 size={15} /> Kép eltávolítása
                  </button>
                </Section>
              </>
            ) : (
              <>
                {p.mode === "monthly" && advanced && (
                  <Section title="Havi stílusfelülírás">
                    <Toggle
                      label="Csak erre a hónapra szerkesztek"
                      value={monthOnly}
                      onChange={setMonthOnly}
                    />
                    {p.monthOverrides[p.month] && (
                      <button
                        onClick={() => {
                          const next = { ...p.monthOverrides };
                          delete next[p.month];
                          change("monthOverrides", next);
                        }}
                      >
                        Havi felülírások törlése
                      </button>
                    )}
                    <p className="small-note">
                      A nem módosított tulajdonságok továbbra is az alapstílust
                      követik.
                    </p>
                  </Section>
                )}
                <Section title="Tipográfia">
                  <Select
                    label="Szövegelem"
                    value={category}
                    options={categories.map(
                      (c) => [c, categoryNames[c]] as const,
                    )}
                    onChange={(v) => setCategory(v as Category)}
                  />
                  {advanced && (
                    <Field label="Betűcsalád keresése">
                      <input
                        value={fontSearch}
                        placeholder="Google Fonts…"
                        onChange={(e) => setFontSearch(e.target.value)}
                      />
                    </Field>
                  )}
                  <Select
                    label="Betűcsalád"
                    value={t.family}
                    options={families.filter(
                      (f) =>
                        !fontSearch ||
                        f.toLowerCase().includes(fontSearch.toLowerCase()) ||
                        f === t.family,
                    )}
                    onChange={(v) => type("family", v as Typography["family"])}
                  />
                  <div className="two-col">
                    <Num
                      label="Betűméret"
                      unit="pt"
                      value={t.size}
                      min={2}
                      max={100}
                      step={0.5}
                      onChange={(v) => type("size", v)}
                    />
                    <Select
                      label="Vastagság"
                      value={t.weight}
                      options={[
                        ["400", "Normál"],
                        ["700", "Félkövér"],
                      ]}
                      onChange={(v) => type("weight", Number(v) as 400 | 700)}
                    />
                  </div>
                  <Color
                    label="Betűszín"
                    value={t.color}
                    onChange={(v) => type("color", v)}
                  />
                  <Select
                    label="Szöveg igazítása"
                    value={t.align}
                    options={[
                      ["left", "Balra"],
                      ["center", "Középre"],
                      ["right", "Jobbra"],
                    ]}
                    onChange={(v) => type("align", v as Typography["align"])}
                  />
                  {advanced && (
                    <>
                      <Num
                        label="Betűköz"
                        value={t.spacing}
                        min={-1}
                        max={5}
                        step={0.05}
                        onChange={(v) => type("spacing", v)}
                      />
                      <Num
                        label="Sorköz szorzója"
                        unit="×"
                        value={t.lineHeight}
                        min={0.8}
                        max={3}
                        step={0.05}
                        onChange={(v) => type("lineHeight", v)}
                      />
                      <Toggle
                        label="Nagybetűs"
                        value={t.uppercase}
                        onChange={(v) => type("uppercase", v)}
                      />
                    </>
                  )}
                </Section>
                <Section title="Rács és térközök">
                  <div className="two-col">
                    <Num
                      label="Cellabelső"
                      value={s.padding}
                      min={0}
                      max={10}
                      step={0.25}
                      onChange={(v) => style("padding", v)}
                    />
                    <Num
                      label="Rácsvonal"
                      value={s.gridLine}
                      min={0}
                      max={3}
                      step={0.05}
                      onChange={(v) => style("gridLine", v)}
                    />
                  </div>
                  <Color
                    label="Rácsvonal színe"
                    value={s.gridColor}
                    onChange={(v) => style("gridColor", v)}
                  />
                  <div className="two-col">
                    <Num
                      label="Külső keret"
                      value={s.border}
                      min={0}
                      max={5}
                      step={0.05}
                      onChange={(v) => style("border", v)}
                    />
                    <Num
                      label="Sarkok sugara"
                      value={s.radius}
                      min={0}
                      max={30}
                      step={0.5}
                      onChange={(v) => style("radius", v)}
                    />
                  </div>
                  {advanced && (
                    <>
                      <Color
                        label="Külső keret színe"
                        value={s.borderColor}
                        onChange={(v) => style("borderColor", v)}
                      />
                      <Color
                        label="Cellák alapszíne"
                        value={s.cellBackground}
                        onChange={(v) => style("cellBackground", v)}
                      />
                      <Num
                        label="Cím és rács térköze"
                        value={s.titleGap}
                        min={-30}
                        max={50}
                        onChange={(v) => style("titleGap", v)}
                      />
                      {p.mode === "annual" ? (
                        <div className="two-col">
                          <Num
                            label="Hónapok vízszintes köze"
                            value={s.gapX}
                            min={0}
                            max={20}
                            onChange={(v) => style("gapX", v)}
                          />
                          <Num
                            label="Hónapok függőleges köze"
                            value={s.gapY}
                            min={0}
                            max={20}
                            onChange={(v) => style("gapY", v)}
                          />
                        </div>
                      ) : (
                        <Num
                          label="Hétfejléc magassága"
                          value={s.headerHeight}
                          min={3}
                          max={20}
                          onChange={(v) => style("headerHeight", v)}
                        />
                      )}
                      <Toggle
                        label="Hétfejléc megjelenítése"
                        value={s.showWeekdays}
                        onChange={(v) => style("showWeekdays", v)}
                      />
                      <Select
                        label="Hétköznapok felirata"
                        value={s.weekdayStyle}
                        options={[
                          ["full", "Teljes név"],
                          ["short", "Rövid név"],
                          ["single", "Kezdőbetűk"],
                        ]}
                        onChange={(v) =>
                          style("weekdayStyle", v as Style["weekdayStyle"])
                        }
                      />
                    </>
                  )}
                </Section>
                <Section
                  title={
                    p.mode === "annual"
                      ? "Ünnepnapok"
                      : "Hétvégék és ünnepnapok"
                  }
                >
                  <Color
                    label="Kiemelt számok színe"
                    value={s.holidayColor}
                    onChange={(v) => style("holidayColor", v)}
                  />
                  <Color
                    label="Kiemelt napok háttere"
                    value={s.holidayBackground}
                    onChange={(v) => style("holidayBackground", v)}
                  />
                </Section>
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
                  {scene.issues.length > 5 && (
                    <small>
                      További {scene.issues.length - 5} jelzés az
                      exportellenőrzésben.
                    </small>
                  )}
                </div>
              </Section>
            )}
          </div>
        </aside>
      </main>
      <input
        hidden
        ref={projectInput}
        type="file"
        accept=".json"
        onChange={(e) => void importProject(e.target.files?.[0])}
      />
      <input
        hidden
        ref={templateInput}
        type="file"
        accept=".json"
        onChange={(e) => void importProject(e.target.files?.[0], true)}
      />
      <input
        hidden
        ref={photoInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => void upload(e.target.files?.[0])}
      />
      {message && (
        <div className="toast" role="status">
          <span>{message}</span>
          <button
            aria-label="Értesítés bezárása"
            onClick={() => setMessage("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {busy && (
        <div className="busy-bar" role="status">
          <LoaderCircle size={17} className="spin" />
          {busy}
        </div>
      )}
      {date && (
        <EventEditor
          project={p}
          date={date}
          onChange={commit}
          onClose={() => setDate(null)}
        />
      )}
      {recovery && (
        <div className="modal-backdrop">
          <section
            className="modal recovery-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="recovery-title"
          >
            <span className="eyebrow">FOLYTASD AZ ALKOTÁST</span>
            <h2 id="recovery-title">Megőriztük a legutóbbi munkádat</h2>
            <p>
              „{recovery.title}” • {recovery.year}. A helyi helyreállítás ezen a
              böngészőn érhető el. A tartós mentéshez töltsd le a projektfájlt.
            </p>
            <div className="button-row">
              <button
                className="primary"
                onClick={() => {
                  commit(recovery);
                  setRecovery(null);
                }}
              >
                Munka helyreállítása
              </button>
              <button onClick={() => setRecovery(null)}>
                Új projekttel kezdek
              </button>
            </div>
          </section>
        </div>
      )}
      {exportOpen && (
        <div className="modal-backdrop">
          <section
            className="modal export-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="export-title"
          >
            <header>
              <div>
                <span className="eyebrow">PAPÍRON IS A TIED</span>
                <h2 id="export-title">Naptár exportálása</h2>
                <p>Pontos méretek. Magyar betűk. Nyomtatásra készen.</p>
              </div>
              <button
                aria-label="Exportablak bezárása"
                disabled={!!busy}
                onClick={() => setExportOpen(false)}
              >
                <X size={20} />
              </button>
            </header>
            <div className="export-formats">
              {(["pdf", "png", "jpg"] as const).map((f) => (
                <button
                  className={format === f ? "selected" : ""}
                  key={f}
                  onClick={() => setFormat(f)}
                >
                  <FileJson size={23} />
                  <strong>{f.toUpperCase()}</strong>
                  <small>
                    {f === "pdf"
                      ? "Vektoros szöveg és rács"
                      : f === "png"
                        ? "Veszteségmentes • 300 DPI"
                        : "Fotóbarát • 300 DPI"}
                  </small>
                  {format === f && <Check size={16} />}
                </button>
              ))}
            </div>
            {p.mode === "monthly" && (
              <Select
                label="Exportált oldalak"
                value={allMonths ? "all" : "one"}
                options={[
                  [
                    "one",
                    `Csak ${months[p.month - 1].toLocaleLowerCase("hu")}`,
                  ],
                  [
                    "all",
                    format === "pdf"
                      ? "Teljes év • 12 oldalas PDF"
                      : "Teljes év • 12 kép ZIP-ben",
                  ],
                ]}
                onChange={(v) => {
                  setAllMonths(v === "all");
                  setWarningsAccepted(false);
                }}
              />
            )}
            <div className="export-summary">
              <span>
                {p.page.width} × {p.page.height} mm
              </span>
              <span>
                {format === "pdf"
                  ? "Beágyazott betűk"
                  : `${Math.round((p.page.width / 25.4) * 300)} × ${Math.round((p.page.height / 25.4) * 300)} px`}
              </span>
            </div>
            <div className="export-issues">
              {errors.map((i, k) => (
                <p className="error" key={k}>
                  <AlertTriangle size={15} />
                  {i.message}
                </p>
              ))}
              {warnings.map((i, k) => (
                <p className="warning" key={k}>
                  <AlertTriangle size={15} />
                  {i.message}
                </p>
              ))}
              {!errors.length && !warnings.length && (
                <p className="success">
                  <Check size={16} /> Az ellenőrzések nem találtak problémát.
                </p>
              )}
            </div>
            {warnings.length > 0 && (
              <Toggle
                label="Átnéztem a figyelmeztetéseket"
                value={warningsAccepted}
                onChange={setWarningsAccepted}
              />
            )}
            <p className="small-note">
              Az export a naptárt tartalmazza, segédvonalak és szerkesztőelemek
              nélkül. Személyes adataid a böngészőben maradnak.
            </p>
            <footer>
              <button onClick={() => setExportOpen(false)} disabled={!!busy}>
                Vissza a szerkesztéshez
              </button>
              <button
                className="primary"
                disabled={
                  !!busy ||
                  errors.length > 0 ||
                  (warnings.length > 0 && !warningsAccepted)
                }
                onClick={() => void runExport()}
              >
                <Download size={17} />
                {busy ? "Folyamatban…" : "Letöltés"}
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
