import type { Appearance } from "../model";
import { Section, Color, Slider, Toggle } from "./Controls";

export function AppearanceControls({
  value,
  onChange,
  title = "Elem megjelenése",
}: {
  value: Appearance;
  onChange: (value: Appearance) => void;
  title?: string;
}) {
  const shadow = value.shadowStyle;
  const reflection = value.reflection;
  return (
    <Section title={title}>
      <Toggle
        label="Elem háttérszíne"
        value={Boolean(value.background)}
        onChange={(on) =>
          onChange({ ...value, background: on ? "#ffffff" : undefined })
        }
      />
      {value.background && (
        <>
          <Color
            label="Háttérszín"
            value={value.background}
            onChange={(background) => onChange({ ...value, background })}
          />
          <Slider
            label="Háttér átlátszatlansága"
            min={0}
            max={100}
            step={1}
            unit="%"
            value={(value.backgroundOpacity ?? 1) * 100}
            onChange={(opacity) =>
              onChange({ ...value, backgroundOpacity: opacity / 100 })
            }
          />
        </>
      )}
      <Slider
        label="Elem átlátszatlansága"
        min={0}
        max={100}
        step={1}
        unit="%"
        value={(value.opacity ?? 1) * 100}
        onChange={(opacity) => onChange({ ...value, opacity: opacity / 100 })}
      />
      <Toggle
        label="Vetett árnyék"
        value={Boolean(shadow)}
        onChange={(on) =>
          onChange({
            ...value,
            shadowStyle: on
              ? {
                  kind: "drop",
                  blur: 2,
                  distance: 2,
                  angle: 45,
                  opacity: 0.35,
                  color: "#000000",
                }
              : undefined,
          })
        }
      />
      {shadow && (
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
              value={shadow[key] * (key === "opacity" ? 100 : 1)}
              onChange={(n) =>
                onChange({
                  ...value,
                  shadowStyle: {
                    ...shadow,
                    [key]: key === "opacity" ? n / 100 : n,
                  },
                })
              }
            />
          ))}
          <Color
            label="Árnyék színe"
            value={shadow.color}
            onChange={(color) =>
              onChange({ ...value, shadowStyle: { ...shadow, color } })
            }
          />
        </>
      )}
      <Toggle
        label="Tükröződés"
        value={Boolean(reflection)}
        onChange={(on) =>
          onChange({
            ...value,
            reflection: on ? { opacity: 0.4, length: 0.4 } : undefined,
          })
        }
      />
      {reflection && (
        <>
          <Slider
            label="Tükröződés erőssége"
            min={0}
            max={100}
            step={1}
            unit="%"
            value={reflection.opacity * 100}
            onChange={(n) =>
              onChange({
                ...value,
                reflection: { ...reflection, opacity: n / 100 },
              })
            }
          />
          <Slider
            label="Tükröződés hossza"
            min={10}
            max={100}
            step={1}
            unit="%"
            value={reflection.length * 100}
            onChange={(n) =>
              onChange({
                ...value,
                reflection: { ...reflection, length: n / 100 },
              })
            }
          />
        </>
      )}
    </Section>
  );
}
