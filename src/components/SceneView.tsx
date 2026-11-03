import type { Project } from "../model";
import type { Scene, SceneNode } from "../engines/layout";
import { advance, mmPerPt } from "../engines/fonts";
import { cropGeometry } from "../engines/images";
import { roundPath, cakeRects, flowerCircles } from "../engines/render";
export function SceneView({
  scene,
  project,
}: {
  scene: Scene;
  project: Project;
}) {
  function node(n: SceneNode) {
    const clip = n.clip ? `clip-${n.id}` : undefined;
    let content;
    if (n.kind === "rect")
      content = (
        <rect
          x={n.x}
          y={n.y}
          width={n.w}
          height={n.h}
          rx={n.radius}
          fill={n.fill}
          stroke={n.stroke}
          strokeWidth={n.line}
        />
      );
    if (n.kind === "text") {
      let x = n.x;
      content = (
        <text
          y={n.y}
          fontFamily={n.type.family}
          fontSize={n.type.size * mmPerPt}
          fontWeight={n.type.weight}
          fontStyle={n.type.italic ? "italic" : "normal"}
          fill={n.type.color}
          style={{ fontKerning: "none" }}
        >
          {Array.from(n.text).map((c, i) => {
            const pos = x;
            x += advance(c, n.type) + n.type.spacing;
            return (
              <tspan key={i} x={pos}>
                {c}
              </tspan>
            );
          })}
        </text>
      );
    }
    if (n.kind === "icon")
      content =
        n.icon === "cake" ? (
          <g fill={n.color}>
            {cakeRects(n.x, n.y, n.w, n.h).map(([x, y, w, h], i) => (
              <rect key={i} x={x} y={y} width={w} height={h} />
            ))}
          </g>
        ) : (
          <g fill={n.color}>
            {flowerCircles(n.x, n.y, n.w, n.h).map(([x, y, r], i) => (
              <circle key={i} cx={x} cy={y} r={r} />
            ))}
          </g>
        );
    if (n.kind === "image") {
      const p = project.photos.find((i) => i.id === n.photoId);
      if (p) {
        const c = cropGeometry(p);
        const shape =
          p.shape === "rectangle" ? (
            <rect
              x={p.box.x}
              y={p.box.y}
              width={p.box.w}
              height={p.box.h}
              rx={p.radius}
            />
          ) : (
            <ellipse
              cx={p.box.x + p.box.w / 2}
              cy={p.box.y + p.box.h / 2}
              rx={
                p.shape === "circle"
                  ? Math.min(p.box.w, p.box.h) / 2
                  : p.box.w / 2
              }
              ry={
                p.shape === "circle"
                  ? Math.min(p.box.w, p.box.h) / 2
                  : p.box.h / 2
              }
            />
          );
        content = (
          <g>
            <defs>
              <clipPath id={`photo-${p.id}`}>{shape}</clipPath>
            </defs>
            <image
              href={p.data}
              x={c.x}
              y={c.y}
              width={c.w}
              height={c.h}
              clipPath={`url(#photo-${p.id})`}
              preserveAspectRatio="none"
            />
            <g fill="none" stroke={p.borderColor} strokeWidth={p.border}>
              {shape}
            </g>
          </g>
        );
      }
    }
    return (
      <g
        key={n.id}
        opacity={n.opacity}
        clipPath={clip ? `url(#${clip})` : undefined}
      >
        {n.clip && (
          <defs>
            <clipPath id={clip}>
              <path d={roundPath(n.clip)} />
            </clipPath>
          </defs>
        )}
        {content}
      </g>
    );
  }
  return (
    <svg
      className="document-svg"
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      height="100%"
      viewBox={`0 0 ${scene.width} ${scene.height}`}
      role="img"
      aria-label={`${project.mode === "annual" ? "Éves" : "Havi"} naptár előnézete`}
    >
      {scene.nodes.map(node)}
    </svg>
  );
}
