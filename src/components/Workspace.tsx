import { useEffect, useRef, useState } from "react";
import { Lock, Move, Maximize2, Minus, Plus } from "lucide-react";
import { effectiveStyle, type Box, type Project } from "../model";
import type { Scene } from "../engines/layout";
import type { CivilDate } from "../engines/date";
import { SceneView } from "./SceneView";
export type Selection = "grid" | "title" | string;
export function Workspace({
  project,
  scene,
  selection,
  onSelect,
  onCommit,
  onPreview,
  onDate,
  previewMode,
  guides,
}: {
  project: Project;
  scene: Scene;
  selection: Selection;
  onSelect: (id: Selection) => void;
  onCommit: (p: Project) => void;
  onPreview: (p: Project | null) => void;
  onDate: (d: CivilDate) => void;
  previewMode: boolean;
  guides: boolean;
}) {
  const container = useRef<HTMLDivElement>(null),
    page = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState({ w: 720, h: 820 }),
    [zoom, setZoom] = useState(1);
  const drag = useRef<{
    p: Project;
    id: string;
    box: Box;
    x: number;
    y: number;
    scale: number;
    resize: boolean;
    next: Project;
  } | null>(null);
  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const o = new ResizeObserver(([e]) =>
      setAvailable({ w: e.contentRect.width, h: e.contentRect.height }),
    );
    o.observe(el);
    return () => o.disconnect();
  }, []);
  const fit = Math.min(
    (available.w - 96) / project.page.width,
    (available.h - 80) / project.page.height,
  );
  const scale = Math.max(0.4, fit) * zoom;
  const actualBox = (id: string) =>
    id === "grid"
      ? {
          ...project.grid,
          y: project.grid.y + (effectiveStyle(project).titleGap - 10),
        }
      : id === "title"
        ? project.titleBox
        : project.photos.find((i) => i.id === id)?.box;
  function start(e: React.PointerEvent, id: string, resize = false) {
    e.stopPropagation();
    const b = actualBox(id);
    onSelect(id);
    if (!b || b.locked) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      p: project,
      id,
      box: b,
      x: e.clientX,
      y: e.clientY,
      scale,
      resize,
      next: project,
    };
  }
  function move(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.x) / d.scale,
      dy = (e.clientY - d.y) / d.scale;
    let b = { ...d.box };
    const snap = (n: number) => (e.altKey ? n : Math.round(n));
    if (d.resize) {
      b.w = Math.max(10, Math.min(600, snap(d.box.w + dx)));
      b.h = Math.max(10, Math.min(600, snap(d.box.h + dy)));
      const photo = d.p.photos.find((v) => v.id === d.id);
      if (photo?.aspectLock) {
        b.h = Math.min(600, Math.max(10, (b.w * d.box.h) / d.box.w));
      }
    } else {
      b.x = snap(d.box.x + dx);
      b.y = snap(d.box.y + dy);
      if (Math.abs(b.x + b.w / 2 - project.page.width / 2) < 1.5)
        b.x = (project.page.width - b.w) / 2;
      if (Math.abs(b.y + b.h / 2 - project.page.height / 2) < 1.5)
        b.y = (project.page.height - b.h) / 2;
    }
    b = {
      ...b,
      x: Math.max(-600, Math.min(1200, b.x)),
      y: Math.max(-600, Math.min(1200, b.y)),
    };
    let next = { ...d.p };
    if (d.id === "grid")
      next.grid = { ...b, y: b.y - (effectiveStyle(project).titleGap - 10) };
    else if (d.id === "title") next.titleBox = b;
    else
      next.photos = d.p.photos.map((i) =>
        i.id === d.id ? { ...i, box: b } : i,
      );
    d.next = next;
    onPreview(next);
  }
  function stop() {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    onPreview(null);
    onCommit(d.next);
  }
  const selected = actualBox(selection);
  const styleBox = (b: Box) => ({
    left: b.x * scale,
    top: b.y * scale,
    width: b.w * scale,
    height: b.h * scale,
  });
  return (
    <div className="workspace-shell">
      <div className="workspace-top">
        <div className="canvas-label">
          <span className="status-dot" />{" "}
          {project.mode === "annual" ? "Éves kompozíció" : "Havi kompozíció"}
          <span className="muted">
            {" "}
            / {project.page.size === "custom"
              ? "Egyedi"
              : project.page.size} •{" "}
            {project.page.orientation === "portrait" ? "álló" : "fekvő"}
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
          <div className="ruler ruler-x">
            MM <span>50</span>
            <span>100</span>
            <span>150</span>
            <span>200</span>
          </div>
          <div className="ruler ruler-y">
            0 <span>50</span>
            <span>100</span>
            <span>150</span>
          </div>
          <div
            ref={page}
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
                      style={{ inset: project.page.margin * scale }}
                    />
                    <div className="center-guide" />
                  </>
                )}
                {project.photos
                  .filter((i) => i.visible)
                  .map((i) => (
                    <button
                      key={i.id}
                      aria-label={`${i.name} kiválasztása`}
                      className={`photo-hit ${selection === i.id ? "active" : ""}`}
                      style={styleBox(i.box)}
                      onClick={() => onSelect(i.id)}
                    />
                  ))}
                <button
                  aria-label="Cím kiválasztása"
                  className="title-hit"
                  style={styleBox(project.titleBox)}
                  onClick={() => onSelect("title")}
                />
                {project.mode === "monthly" &&
                  scene.cells.map((cell, i) => (
                    <button
                      className="cell-hit"
                      aria-label={`${cell.date.year}. ${cell.date.month}. ${cell.date.day}. – események szerkesztése`}
                      key={i}
                      style={styleBox(cell)}
                      onClick={() => onDate(cell.date)}
                    />
                  ))}
                {selected && (
                  <div className="selection-box" style={styleBox(selected)}>
                    <span className="selection-label">
                      {selection === "grid"
                        ? "Naptárrács"
                        : selection === "title"
                          ? "Cím"
                          : "Fénykép"}{" "}
                      {selected.locked && <Lock size={10} />}
                    </span>
                    {!selected.locked && (
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
                          onPointerDown={(e) => start(e, selection, true)}
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
        <span>
          {previewMode
            ? "Nyomtatási előnézet"
            : "Kattints egy dátumra esemény hozzáadásához"}
        </span>
        <div className="zoom-controls">
          <button
            aria-label="Kicsinyítés"
            onClick={() => setZoom((z) => Math.max(0.25, z - 0.1))}
          >
            <Minus size={15} />
          </button>
          <span>{Math.round(zoom * 100)}%</span>
          <button
            aria-label="Nagyítás"
            onClick={() => setZoom((z) => Math.min(3, z + 0.1))}
          >
            <Plus size={15} />
          </button>
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
