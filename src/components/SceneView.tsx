import { useEffect, useMemo, useState } from "react";
import { pagePhotos, type Project, type Photo } from "../model";
import type { Scene, SceneNode } from "../engines/layout";
import { advance, mmPerPt } from "../engines/fonts";
import {
  cropGeometry,
  decodeImage,
  imageCache,
  photoColorMatrix,
} from "../engines/images";
import {
  roundPath,
  cakeRects,
  flowerCircles,
  hasPhotoEffects,
  rasterPhoto,
} from "../engines/render";
function StyledPhoto({ photo }: { photo: Photo }) {
  const [decoded, setDecoded] = useState("");
  const ready = imageCache.has(photo.data);
  useEffect(() => {
    if (ready) return;
    let active = true;
    void decodeImage(photo.data, false)
      .then((image) => {
        if (!active) return;
        imageCache.set(photo.data, image);
        setDecoded(photo.data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [photo.data, ready]);
  const artwork = useMemo(() => {
    if (!ready) return null;
    const { canvas, bounds } = rasterPhoto(photo, 6);
    const href = canvas.toDataURL("image/png");
    canvas.width = 0;
    return { href, bounds };
  }, [photo, ready, decoded]);
  if (!artwork) return null;
  const { href, bounds } = artwork;
  return (
    <image
      href={href}
      x={bounds.x}
      y={bounds.y}
      width={bounds.w}
      height={bounds.h}
      preserveAspectRatio="none"
    />
  );
}
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
      const p = pagePhotos(project, scene.page).find((i) => i.id === n.photoId);
      if (p && hasPhotoEffects(p)) content = <StyledPhoto photo={p} />;
      else if (p) {
        const c = cropGeometry(p);
        const matrix = photoColorMatrix(p.edits);
        const cx = c.x + c.w / 2,
          cy = c.y + c.h / 2;
        const transform = `translate(${cx} ${cy}) rotate(${p.edits?.rotation ?? 0}) scale(${p.edits?.flipX ? -1 : 1} ${p.edits?.flipY ? -1 : 1}) translate(${-cx} ${-cy})`;
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
              {matrix && (
                <filter id={`color-${p.id}`} colorInterpolationFilters="sRGB">
                  <feColorMatrix type="matrix" values={matrix.join(" ")} />
                </filter>
              )}
            </defs>
            <g clipPath={`url(#photo-${p.id})`}>
              <image
                href={p.data}
                x={c.x}
                y={c.y}
                width={c.w}
                height={c.h}
                transform={transform}
                filter={matrix ? `url(#color-${p.id})` : undefined}
                preserveAspectRatio="none"
              />
            </g>
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
