import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { calendarHolidays } from "../engines/holidays";
import type { Project, HolidaySetting } from "../model";
import { months, daysInMonth } from "../engines/date";
import { Section, Field, Num, Select, Toggle } from "./Controls";

export function HolidayList({
  project: p,
  commit,
}: {
  project: Project;
  commit: (action: Project | ((root: Project) => Project)) => void;
}) {
  const [month, setMonth] = useState(p.month);
  const [day, setDay] = useState(1);
  const [name, setName] = useState("");
  const entries = calendarHolidays(p);
  function update(id: string, custom: boolean, patch: Partial<HolidaySetting>) {
    commit((root) => {
      if (custom)
        return {
          ...root,
          customHolidays: root.customHolidays?.map((item) =>
            item.id === id ? { ...item, ...patch } : item,
          ),
        };
      const current = calendarHolidays(root).find((item) => item.id === id);
      if (!current) return root;
      return {
        ...root,
        holidayOverrides: {
          ...root.holidayOverrides,
          [id]: {
            name: current.name,
            showName: current.showName,
            highlight: current.highlight,
            ...patch,
          },
        },
      };
    });
  }
  return (
    <Section title="Munkaszüneti napok">
      <p className="small-note">
        Az alaplista az adott év magyar ünnepnapjait tartalmazza. A saját napok
        évente ismétlődnek.
      </p>
      {entries.map((item) => (
        <div
          className="holiday-entry"
          key={item.id}
          role="group"
          aria-label={months[item.month - 1] + " " + item.day + ". ünnepnap"}
        >
          <div className="button-row">
            <strong>
              {String(item.month).padStart(2, "0")}.
              {String(item.day).padStart(2, "0")}.
            </strong>
            <small>{item.custom ? "Saját nap" : "Alaplista"}</small>
            <button
              className="icon-button danger"
              aria-label={
                String(item.month).padStart(2, "0") +
                "." +
                String(item.day).padStart(2, "0") +
                ". törlése"
              }
              onClick={() =>
                commit((root) =>
                  item.custom
                    ? {
                        ...root,
                        customHolidays: root.customHolidays?.filter(
                          (entry) => entry.id !== item.id,
                        ),
                      }
                    : {
                        ...root,
                        holidayOverrides: {
                          ...root.holidayOverrides,
                          [item.id]: null,
                        },
                      },
                )
              }
            >
              <Trash2 size={15} />
            </button>
          </div>
          <Field label="Nap neve">
            <input
              aria-label="Nap neve"
              value={item.name}
              maxLength={100}
              onChange={(e) =>
                update(item.id, item.custom, { name: e.target.value })
              }
            />
          </Field>
          <Toggle
            label="Név megjelenítése"
            value={item.showName}
            onChange={(showName) => update(item.id, item.custom, { showName })}
          />
          <Toggle
            label="Háttérszínezés"
            value={item.highlight}
            onChange={(highlight) =>
              update(item.id, item.custom, { highlight })
            }
          />
        </div>
      ))}
      <details className="add-holiday">
        <summary>Új munkaszüneti nap hozzáadása</summary>
        <div className="two-col">
          <Select
            label="Új nap hónapja"
            value={String(month)}
            options={months.map((name, i) => [String(i + 1), name] as const)}
            onChange={(value) => {
              const next = Number(value);
              setMonth(next);
              setDay(Math.min(day, daysInMonth(2000, next)));
            }}
          />
          <Num
            label="Új nap dátuma"
            value={day}
            min={1}
            max={daysInMonth(2000, month)}
            unit=""
            onChange={(value) => setDay(Math.round(value))}
          />
        </div>
        <Field label="Új nap neve">
          <input
            value={name}
            maxLength={100}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <button
          className="outlined full"
          disabled={(p.customHolidays?.length ?? 0) >= 366}
          onClick={() => {
            const item = {
              id: crypto.randomUUID(),
              month,
              day,
              name: name.trim(),
              showName: Boolean(name.trim()),
              highlight: true,
            };
            commit((root) => ({
              ...root,
              customHolidays: [...(root.customHolidays ?? []), item],
            }));
            setName("");
          }}
        >
          <Plus size={15} /> Nap hozzáadása
        </button>
      </details>
      <button
        className="full"
        onClick={() => commit((root) => ({ ...root, holidayOverrides: {} }))}
      >
        Alaplista visszaállítása
      </button>
    </Section>
  );
}
