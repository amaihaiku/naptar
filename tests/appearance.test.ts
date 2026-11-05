import { describe, it, expect } from "./assert";
import {
  defaultProject,
  updatePhotoStyle,
  linkPhotoStyle,
  updateAppearance,
  parseProject,
  serializeProject,
} from "../src/model";
import { createSlot } from "../src/engines/images";
import { emptySpaceTargets } from "../src/engines/alignment";
import { buildScene } from "../src/engines/layout";

describe("Element appearance and reusable photo styles", () => {
  it("shares mask styles without sharing geometry or per-page image edits", () => {
    let p = defaultProject();
    const a = createSlot(p);
    p.photos = [a];
    const b = {
      ...createSlot(p),
      box: { ...a.box, x: 80 },
      edits: { brightness: 25 },
    };
    p.photos.push(b);
    p = updatePhotoStyle(p, a.id, {
      border: 2,
      reflection: { opacity: 0.5, length: 0.3 },
      box: { ...a.box, x: 12 },
    });
    expect(p.photos[1].border).toBe(2);
    expect(p.photos[1].reflection).toEqual(p.photos[0].reflection);
    expect(p.photos[1].box.x).toBe(80);
    expect(p.photos[1].edits?.brightness).toBe(25);
    p = linkPhotoStyle(p, b.id, false);
    expect(p.photos[1].border).toBe(2);
    p = updatePhotoStyle(p, b.id, { border: 5 });
    expect(p.photos[0].border).toBe(2);
    p = linkPhotoStyle(p, b.id, true);
    expect(p.photos[1].border).toBe(2);
    p = updatePhotoStyle(p, a.id, {
      border: 0,
      reflection: undefined,
      shadow: 0,
    });
    expect(p.photos[1].reflection).toBe(undefined);
    expect(p.photos[1].border).toBe(0);
    expect(parseProject(serializeProject(p)).photos[1].sameStyle).toBe(true);
  });
  it("new masks inherit the active shared style", () => {
    const p = defaultProject();
    p.photos = [{ ...createSlot(p), border: 3, borderColor: "#123456" }];
    const copy = createSlot(p);
    expect(copy.border).toBe(3);
    expect(copy.borderColor).toBe("#123456");
    expect(copy.data).toBe("");
  });
  it("groups the weekday header independently and preserves its settings", () => {
    let p = defaultProject();
    p = updateAppearance(p, "header", {
      background: "#123456",
      backgroundOpacity: 0.4,
      opacity: 0.7,
      reflection: { opacity: 0.3, length: 0.2 },
    });
    const saved = parseProject(serializeProject(p));
    const scene = buildScene(saved);
    const header = scene.nodes.find(
      (n) => n.kind === "group" && n.elementId === "header",
    );
    expect(header?.kind).toBe("group");
    if (header?.kind !== "group") throw new Error("Missing header group");
    expect(header.appearance.background).toBe("#123456");
    expect(header.children.filter((n) => n.kind === "text")).toHaveLength(7);
    expect(header.opacity).toBe(0.7);
  });
  it("finds midpoint and thirds in empty gaps inside the margins", () => {
    const targets = emptySpaceTargets(
      { x: 55, y: 10, w: 10, h: 10 },
      [
        { x: 10, y: 10, w: 20, h: 10 },
        { x: 90, y: 10, w: 20, h: 10 },
        { x: 50, y: 80, w: 50, h: 10 },
      ],
      { x: 10, y: 10, w: 100, h: 100 },
      "x",
    );
    expect(targets).toEqual([
      { position: 60, label: "1/2" },
      { position: 50, label: "1/3" },
      { position: 70, label: "2/3" },
    ]);
  });
});
