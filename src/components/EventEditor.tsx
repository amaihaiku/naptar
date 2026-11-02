import { useState } from "react";
import { X, Plus, Trash2, Pencil, Cake, Flower2 } from "lucide-react";
import type { CivilDate } from "../engines/date";
import { months, dateKey } from "../engines/date";
import { eventsFor, eventLabel } from "../engines/events";
import { namedays } from "../engines/namedays";
import { eventSchema, type Project, type PersonalEvent } from "../model";
import { Field, Num, Select, Toggle } from "./Controls";
export function EventEditor({
  project,
  date,
  onChange,
  onClose,
}: {
  project: Project;
  date: CivilDate;
  onChange: (p: Project) => void;
  onClose: () => void;
}) {
  const [editing, setEditing] = useState<PersonalEvent | null>(null),
    [names, setNames] = useState(
      namedays(date.month, date.day, project.namedayOverrides, date.year).join(
        ", ",
      ),
    ),
    [error, setError] = useState("");
  const events = eventsFor(project, date, true);
  const blank = (): PersonalEvent => ({
    id: crypto.randomUUID(),
    kind: "birthday",
    name: "",
    month: date.month,
    day: date.day,
    birthYear: null,
    showAge: true,
    hidden: false,
  });
  function save() {
    const result = eventSchema.safeParse(editing);
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    const event = result.data;
    if (
      project.events.length >= 2000 &&
      !project.events.some((e) => e.id === event.id)
    ) {
      setError("Legfeljebb 2000 személyes esemény tárolható.");
      return;
    }
    onChange({
      ...project,
      events: [...project.events.filter((e) => e.id !== event.id), event],
    });
    setEditing(null);
    setError("");
  }
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className="modal event-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-title"
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
      >
        <header>
          <div>
            <span className="eyebrow">SZEMÉLYES PILLANATOK</span>
            <h2 id="event-title">
              {months[date.month - 1]} {date.day}.
            </h2>
            <p>Az események minden évben megismétlődnek.</p>
          </div>
          <button
            className="icon-button"
            aria-label="Bezárás"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </header>
        <div className="event-list">
          {events.length === 0 && (
            <p className="empty-state">
              Ehhez a naphoz még nincs személyes esemény.
            </p>
          )}
          {events.map((e) => (
            <div className="event-item" key={e.id}>
              {e.kind === "birthday" ? (
                <Cake size={19} />
              ) : (
                <Flower2 size={19} />
              )}
              <span>
                <strong>{eventLabel(e, date.year)}</strong>
                <small>
                  {e.kind === "birthday" ? "Születésnap" : "Személyes névnap"}
                  {e.hidden ? " • Elrejtve" : ""}
                  {e.kind === "birthday" &&
                  e.birthYear !== null &&
                  e.birthYear > date.year
                    ? " • Ebben az évben még nem jelenik meg"
                    : ""}
                  {e.month !== date.month || e.day !== date.day
                    ? " • február 29-i ismétlődés"
                    : ""}
                </small>
              </span>
              <button
                aria-label={`${e.name} szerkesztése`}
                className="icon-button"
                onClick={() => {
                  setEditing(e);
                  setError("");
                }}
              >
                <Pencil size={16} />
              </button>
              <button
                aria-label={`${e.name} törlése`}
                className="icon-button danger"
                onClick={() =>
                  onChange({
                    ...project,
                    events: project.events.filter((v) => v.id !== e.id),
                  })
                }
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
        {editing ? (
          <div className="event-form">
            <Select
              label="Eseménytípus"
              value={editing.kind}
              options={[
                ["birthday", "Születésnap"],
                ["nameday", "Személyes névnap"],
              ]}
              onChange={(v) =>
                setEditing({ ...editing, kind: v as PersonalEvent["kind"] })
              }
            />
            <Field label="Keresztnév">
              <input
                autoFocus
                maxLength={80}
                value={editing.name}
                onChange={(e) =>
                  setEditing({ ...editing, name: e.target.value })
                }
              />
            </Field>
            <div className="two-col">
              <Num
                label="Hónap"
                min={1}
                max={12}
                unit=""
                value={editing.month}
                onChange={(v) =>
                  setEditing({ ...editing, month: Math.round(v) })
                }
              />
              <Num
                label="Nap"
                min={1}
                max={31}
                unit=""
                value={editing.day}
                onChange={(v) => setEditing({ ...editing, day: Math.round(v) })}
              />
            </div>
            {editing.kind === "birthday" && (
              <>
                <Field label="Születési év (nem kötelező)">
                  <input
                    type="number"
                    min={1}
                    max={9999}
                    value={editing.birthYear ?? ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        birthYear: e.target.value
                          ? Number(e.target.value)
                          : null,
                      })
                    }
                  />
                </Field>
                <Toggle
                  label="Életkor megjelenítése"
                  value={editing.showAge}
                  onChange={(v) => setEditing({ ...editing, showAge: v })}
                />
              </>
            )}
            <Toggle
              label="Elrejtés a naptárban és exportban"
              value={editing.hidden}
              onChange={(v) => setEditing({ ...editing, hidden: v })}
            />
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <div className="button-row">
              <button className="primary" onClick={save}>
                Esemény mentése
              </button>
              <button onClick={() => setEditing(null)}>Mégse</button>
            </div>
          </div>
        ) : (
          <button className="outlined full" onClick={() => setEditing(blank())}>
            <Plus size={17} /> Új esemény ezen a napon
          </button>
        )}
        <details className="nameday-editor">
          <summary>Hagyományos névnapok szerkesztése</summary>
          <p>
            A személyes eseményektől külön kezelt adat. Legfeljebb két név,
            vesszővel elválasztva.
          </p>
          <Field label="Megjelenő névnapok">
            <input
              value={names}
              maxLength={120}
              onChange={(e) => setNames(e.target.value)}
            />
          </Field>
          <div className="button-row">
            <button
              onClick={() => {
                const values = names
                  .split(",")
                  .map((v) => v.trim())
                  .filter(Boolean);
                if (values.length > 2 || values.some((v) => v.length > 60)) {
                  setError(
                    "Legfeljebb két, egyenként 60 karakteres név adható meg.",
                  );
                  return;
                }
                onChange({
                  ...project,
                  namedayOverrides: {
                    ...project.namedayOverrides,
                    [dateKey(date)]: values,
                  },
                });
                setError("");
              }}
            >
              Névnapok mentése
            </button>
            <button
              onClick={() => {
                const next = { ...project.namedayOverrides };
                delete next[dateKey(date)];
                onChange({ ...project, namedayOverrides: next });
                setNames(
                  namedays(date.month, date.day, {}, date.year).join(", "),
                );
              }}
            >
              Eredeti visszaállítása
            </button>
          </div>
        </details>
        <footer>
          <button className="primary" onClick={onClose}>
            Kész
          </button>
        </footer>
      </section>
    </div>
  );
}
