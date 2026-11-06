import { useEffect, useRef, useState } from "react";
import { Lock, Move, Maximize2 } from "lucide-react";
import {
  elementBox,
  elementAppearance,
  appearanceBounds,
  updateSlotCrop,
  updateElementBox,
  pageText,
  viewProject,
  yearBoxFor,
  pagePhotos,
  slotLabel,
  type Box,
  type Project,
} from "../model";
import type { Scene } from "../engines/layout";
import type { CivilDate } from "../engines/date";
import { Field } from "./Controls";
import { SceneView } from "./SceneView";
import { emptySpaceTargets } from "../engines/alignment";
import { cropGeometry } from "../engines/images";
function GeometryInput({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <Field label={label}>
      <span className="number-wrap">
        <input
          type="number"
          aria-label={`Aktív elem: ${label}`}
          min={min}
          max={max}
          step={0.1}
          value={draft ?? Number(value.toFixed(3))}
          onBlur={() => setDraft(null)}
          onChange={(e) => {
            setDraft(e.target.value);
            const n = e.target.valueAsNumber;
            if (Number.isFinite(n) && n >= min && n <= max) onChange(n);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
        />
        <i>mm</i>
      </span>
    </Field>
  );
}
export type Selection = "grid" | "title" | "year" | string;
export function Workspace({
  project,
  scene,
  selection,
  onSelect,
  onCommit,
  onPreview,
  onDate,
  previewMode,
  keyboardDisabled,
  guides,
}: {
  project: Project;
  scene: Scene;
  selection: Selection;
  onSelect: (id: Selection) => void;
  onCommit: (p: Project | ((root: Project) => Project)) => void;
  onPreview: (p: Project | null) => void;
  onDate: (d: CivilDate) => void;
  previewMode: boolean;
  keyboardDisabled: boolean;
  guides: boolean;
}) {
  const v = viewProject(project),
    photos = pagePhotos(project),
    container = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState({ w: 720, h: 820 }),
    [zoom, setZoom] = useState(1);
  const [showGuides, setShowGuides] = useState(true);
  const [magnet, setMagnet] = useState(false);
  const [alignment, setAlignment] = useState<{
    x?: number;
    y?: number;
    xLabel?: string;
    yLabel?: string;
  }>({});
  const drag = useRef<{
    p: Project;
    id: string;
    box: Box;
    x: number;
    y: number;
    scale: number;
    kind: "move" | "resize" | "crop";
    next: Project;
  } | null>(null);
  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const observer = new ResizeObserver(([e]) =>
      setAvailable({ w: e.contentRect.width, h: e.contentRect.height }),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const fit = Math.min(
      (available.w - 96) / project.page.width,
      (available.h - 80) / project.page.height,
    ),
    scale = Math.max(0.4, fit) * zoom;
  const actualBox = (id: string) => elementBox(project, id);
  const texts = pageText(project);
  function visualBox(id: string) {
    const b = actualBox(id);
    if (!b) return;
    const text = scene.textBounds?.[id];
    const photo = photos.find((photo) => photo.id === id);
    const appearance = photo ?? elementAppearance(project, id);
    if (text) return appearanceBounds({ ...b, ...text }, appearance);
    if (photo?.shape === "circle" && !photo.paddingX && !photo.paddingY) {
      const size = Math.min(b.w, b.h);
      return {
        ...b,
        x: b.x + (b.w - size) / 2,
        y: b.y + (b.h - size) / 2,
        w: size,
        h: size,
      };
    }
    return appearanceBounds(b, appearance);
  }
  useEffect(() => {
    if (previewMode || keyboardDisabled) return;
    const step = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || drag.current) return;
      if (
        e.target instanceof HTMLElement &&
        e.target.closest("input,textarea,select,[contenteditable]")
      )
        return;
      const direction = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      }[e.key];
      if (!direction) return;
      const b = elementBox(project, selection);
      if (!b || b.locked) return;
      e.preventDefault();
      const distance = e.shiftKey ? 10 : 1;
      onCommit((root) => {
        const current = elementBox(root, selection);
        if (!current || current.locked) return root;
        return updateElementBox(root, selection, {
          x: Math.max(
            -600,
            Math.min(1200, current.x + direction[0] * distance),
          ),
          y: Math.max(
            -600,
            Math.min(1200, current.y + direction[1] * distance),
          ),
        });
      });
    };
    window.addEventListener("keydown", step);
    return () => window.removeEventListener("keydown", step);
  }, [project, selection, previewMode, keyboardDisabled, onCommit]);
  function alignMove(id: string, before: Box, after: Box) {
    const anchors = (b: Pick<Box, "x" | "y" | "w" | "h">, axis: "x" | "y") => {
      const size = axis === "x" ? b.w : b.h;
      return [b[axis], b[axis] + size / 2, b[axis] + size];
    };
    const peers = [
      { x: 0, y: 0, w: project.page.width, h: project.page.height },
      {
        x: project.page.margin,
        y: project.page.marginY ?? project.page.margin,
        w: project.page.width - 2 * project.page.margin,
        h:
          project.page.height -
          2 * (project.page.marginY ?? project.page.margin),
      },
      ...[
        "grid",
        "title",
        "year",
        ...photos.filter((photo) => photo.visible).map((photo) => photo.id),
        ...texts.map((text) => text.id),
      ]
        .filter((key) => key !== id)
        .flatMap((key) => {
          const b = visualBox(key);
          return b ? [b] : [];
        }),
    ];
    const visual = visualBox(id);
    // Keep the drag's original ink offset when deriving the guides from a preview.
    const current = actualBox(id) ?? before;
    const shifted = visual
      ? {
          ...visual,
          x: visual.x + after.x - current.x,
          y: visual.y + after.y - current.y,
        }
      : after;
    const lines: { x?: number; y?: number; xLabel?: string; yLabel?: string } =
      {};
    for (const axis of ["x", "y"] as const) {
      const points = anchors(shifted, axis);
      let best = 6 / scale;
      let delta = 0;
      for (const target of peers.flatMap((peer) => anchors(peer, axis))) {
        for (const point of points) {
          const distance = target - point;
          if (Math.abs(distance) < best) {
            best = Math.abs(distance);
            delta = distance;
            lines[axis] = target;
          }
        }
      }
      const gapTargets = peers
        .slice(0, 2)
        .flatMap((boundary) =>
          emptySpaceTargets(shifted, peers.slice(2), boundary, axis),
        );
      const middle = points[1];
      for (const target of gapTargets) {
        const distance = target.position - middle;
        if (Math.abs(distance) < best) {
          best = Math.abs(distance);
          delta = distance;
          lines[axis] = target.position;
          if (axis === "x") lines.xLabel = target.label;
          else lines.yLabel = target.label;
        }
      }
      if (magnet)
        after[axis] = Math.max(-600, Math.min(1200, after[axis] + delta));
    }
    setAlignment(showGuides ? lines : {});
  }
  function start(
    e: React.PointerEvent,
    id: string,
    kind: "move" | "resize" | "crop" = "move",
  ) {
    e.stopPropagation();
    const b = actualBox(id);
    const already = selection === id;
    onSelect(id);
    if (!b || b.locked || (kind === "crop" && !already)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      p: project,
      id,
      box: b,
      x: e.clientX,
      y: e.clientY,
      scale,
      kind,
      next: project,
    };
  }
  function move(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.x) / d.scale,
      dy = (e.clientY - d.y) / d.scale;
    const photo = pagePhotos(d.p).find((p) => p.id === d.id);
    let next: Project;
    if (d.kind === "crop" && photo) {
      const c = cropGeometry(photo),
        extraX = c.extraX,
        extraY = c.extraY;
      next = updateSlotCrop(d.p, photo, {
        panX: Math.max(
          -1,
          Math.min(1, photo.panX + (extraX > 0.001 ? (2 * dx) / extraX : 0)),
        ),
        panY: Math.max(
          -1,
          Math.min(1, photo.panY + (extraY > 0.001 ? (2 * dy) / extraY : 0)),
        ),
      });
    } else {
      const snap = (n: number) => (e.altKey ? n : Math.round(n * 10) / 10);
      let b = { ...d.box };
      if (d.kind === "resize") {
        b.w = Math.max(10, Math.min(600, snap(d.box.w + dx)));
        b.h = Math.max(10, Math.min(600, snap(d.box.h + dy)));
      } else {
        b.x = Math.max(-600, Math.min(1200, snap(d.box.x + dx)));
        b.y = Math.max(-600, Math.min(1200, snap(d.box.y + dy)));
        if ((showGuides || magnet) && !e.altKey) alignMove(d.id, d.box, b);
        else setAlignment({});
      }
      next = updateElementBox(d.p, d.id, b);
    }
    d.next = next;
    onPreview(next);
  }
  function stop() {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    setAlignment({});
    onPreview(null);
    onCommit(d.next);
  }
  const selected = actualBox(selection),
    outline = visualBox(selection),
    styleBox = (b: Box) => ({
      left: b.x * scale,
      top: b.y * scale,
      width: b.w * scale,
      height: b.h * scale,
    });
  return (
    <div className="workspace-shell">
      <div className="workspace-top">
        <div className="canvas-label">
          <span className="status-dot" />
          {project.mode === "annual" ? "Borító" : "Havi kompozíció"}
          <span className="muted">
            {" "}
            / A4 • {project.page.orientation === "portrait" ? "álló" : "fekvő"}
          </span>
        </div>
        <span className="muted">
          {project.page.width} × {project.page.height} mm
        </span>
      </div>
      <div className="workspace" ref={container}>
        <div
          className="page-stage"
          style={{ width: scene.width * scale, height: scene.height * scale }}
        >
          {(
            [
              ["x", scene.width],
              ["y", scene.height],
            ] as const
          ).map(([axis, length]) => (
            <div
              key={axis}
              className={`ruler ruler-${axis}`}
              aria-label={`${length} mm`}
            >
              {[
                0,
                ...Array.from(
                  { length: Math.floor((length - 1) / 50) },
                  (_, i) => (i + 1) * 50,
                ),
                length,
              ].map((tick) => (
                <span
                  key={tick}
                  style={{
                    [axis === "x" ? "left" : "top"]:
                      `${(tick / length) * 100}%`,
                  }}
                >
                  {tick}
                </span>
              ))}
            </div>
          ))}
          <div
            className="paper"
            data-testid="calendar-paper"
            style={{ width: scene.width * scale, height: scene.height * scale }}
          >
            <SceneView scene={scene} project={project} />
            {!previewMode && (
              <div className="editor-overlay" aria-label="Naptár szerkesztése">
                {guides && (
                  <>
                    <div
                      className="margin-guide"
                      style={{
                        inset: `${(project.page.marginY ?? project.page.margin) * scale}px ${project.page.margin * scale}px`,
                      }}
                    />
                    <div className="center-guide" />
                  </>
                )}
                {showGuides && alignment.x !== undefined && (
                  <div
                    className="alignment-guide vertical"
                    style={{ left: alignment.x * scale }}
                  >
                    {alignment.xLabel && <span>{alignment.xLabel}</span>}
                  </div>
                )}
                {showGuides && alignment.y !== undefined && (
                  <div
                    className="alignment-guide horizontal"
                    style={{ top: alignment.y * scale }}
                  >
                    {alignment.yLabel && <span>{alignment.yLabel}</span>}
                  </div>
                )}
                {actualBox("grid") && (
                  <button
                    className="grid-hit"
                    aria-label="Naptárrács kiválasztása"
                    style={styleBox(visualBox("grid")!)}
                    onClick={() => onSelect("grid")}
                    onPointerDown={(e) => start(e, "grid")}
                    onPointerMove={move}
                    onPointerUp={stop}
                    onPointerCancel={stop}
                  />
                )}
                {actualBox("header") && (
                  <button
                    className="header-hit"
                    aria-label="Hétfejléc kiválasztása"
                    style={styleBox(visualBox("header")!)}
                    onClick={() => onSelect("header")}
                  />
                )}
                {photos
                  .filter((p) => p.visible)
                  .map((p) => (
                    <button
                      key={p.id}
                      aria-label={
                        p.data
                          ? `${p.name} kiválasztása és mozgatása a maszkban`
                          : slotLabel(p)
                      }
                      className={`photo-hit ${p.data ? "" : "empty-slot"} ${selection === p.id ? "active" : ""} ${p.role === "background" && p.z < 0 ? "behind-calendar" : ""}`}
                      style={{
                        ...styleBox(appearanceBounds(p.box, p)),
                        zIndex: p.z < 0 ? 1 : 5,
                      }}
                      onPointerDown={(e) =>
                        start(e, p.id, p.data ? "crop" : "move")
                      }
                      onPointerMove={move}
                      onPointerUp={stop}
                      onPointerCancel={stop}
                    >
                      {!p.data && slotLabel(p)}
                    </button>
                  ))}
                {project.mode === "monthly" &&
                  scene.cells.map((cell, i) => (
                    <button
                      className="cell-hit"
                      aria-label={`${cell.date.year}. ${cell.date.month}. ${cell.date.day}. – események szerkesztése`}
                      key={i}
                      style={styleBox(cell)}
                      onClick={() => {
                        onSelect("grid");
                        onDate(cell.date);
                      }}
                    />
                  ))}
                <button
                  aria-label="Cím kiválasztása"
                  className="title-hit"
                  style={styleBox(visualBox("title") ?? v.titleBox)}
                  onClick={() => onSelect("title")}
                  onPointerDown={(e) => start(e, "title")}
                  onPointerMove={move}
                  onPointerUp={stop}
                  onPointerCancel={stop}
                />
                {v.style.showYear && (
                  <button
                    aria-label="Évszám kiválasztása"
                    className="title-hit"
                    style={styleBox(visualBox("year") ?? yearBoxFor(project))}
                    onClick={() => onSelect("year")}
                    onPointerDown={(e) => start(e, "year")}
                    onPointerMove={move}
                    onPointerUp={stop}
                    onPointerCancel={stop}
                  />
                )}
                {texts.map((item, i) => (
                  <button
                    key={item.id}
                    className="title-hit custom-text-hit"
                    aria-label={`Szöveg ${i + 1} kiválasztása`}
                    style={styleBox(
                      appearanceBounds(item.box, item.appearance ?? {}),
                    )}
                    onClick={() => onSelect(item.id)}
                    onPointerDown={(e) => start(e, item.id)}
                    onPointerMove={move}
                    onPointerUp={stop}
                    onPointerCancel={stop}
                  />
                ))}
                {selected &&
                  !(
                    selection === "grid" &&
                    project.mode === "annual" &&
                    project.cover?.showCalendar === false
                  ) && (
                    <div
                      className="selection-box"
                      style={styleBox(outline ?? selected)}
                    >
                      <span className="selection-label">
                        {selection === "grid"
                          ? "Naptárrács"
                          : selection === "title"
                            ? "Cím"
                            : selection === "year"
                              ? "Évszám"
                              : texts.some((e) => e.id === selection)
                                ? "Szöveg"
                                : "Kép maszk"}
                        {selected.locked && <Lock size={10} />}
                      </span>
                      {!selected.locked && selection !== "header" && (
                        <>
                          <button
                            className="move-handle"
                            aria-label="Kijelölt elem mozgatása"
                            onPointerDown={(e) => start(e, selection)}
                            onPointerMove={move}
                            onPointerUp={stop}
                            onPointerCancel={stop}
                          >
                            <Move size={13} />
                          </button>
                          <button
                            className="resize-handle"
                            aria-label="Kijelölt elem átméretezése"
                            onPointerDown={(e) => start(e, selection, "resize")}
                            onPointerMove={move}
                            onPointerUp={stop}
                            onPointerCancel={stop}
                          />
                        </>
                      )}
                    </div>
                  )}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="workspace-bottom">
        {selected && !previewMode ? (
          <div className="element-geometry" aria-label="Aktív elem méretei">
            {(
              [
                ["x", "X", -600, 1200],
                ["y", "Y", -600, 1200],
                ["w", "Szélesség", 10, 600],
                ["h", "Magasság", 10, 600],
              ] as const
            ).map(([key, label, min, max]) => (
              <GeometryInput
                key={selection + key}
                label={label}
                value={selected[key]}
                min={min}
                max={max}
                onChange={(value) =>
                  onCommit(
                    updateElementBox(project, selection, { [key]: value }),
                  )
                }
              />
            ))}
          </div>
        ) : (
          <span>
            {previewMode ? "Nyomtatási előnézet" : "Válassz egy elemet"}
          </span>
        )}
        <div className="alignment-controls">
          <button
            aria-pressed={showGuides}
            title="Igazítási segédvonalak"
            onClick={() => setShowGuides(!showGuides)}
          >
            Guide
          </button>
          <button
            aria-pressed={magnet}
            title="Illesztés az igazítási pontokhoz"
            onClick={() => setMagnet(!magnet)}
          >
            Magnet
          </button>
        </div>
        <div className="zoom-controls">
          <input
            aria-label="Nagyítás"
            type="range"
            min={25}
            max={300}
            step={5}
            value={Math.round(zoom * 100)}
            onChange={(e) => setZoom(e.target.valueAsNumber / 100)}
          />
          <span>{Math.round(zoom * 100)}%</span>
          <button
            title="Laphoz igazítás"
            aria-label="Laphoz igazítás"
            onClick={() => setZoom(1)}
          >
            <Maximize2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
