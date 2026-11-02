const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(a: Uint8Array) {
  let c = 0xffffffff;
  for (const b of a) c = crcTable[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
export function withDpi(bytes: Uint8Array, format: "png" | "jpg"): Uint8Array {
  if (format === "jpg") {
    const out = bytes.slice();
    for (let i = 2; i < Math.min(out.length - 16, 2048); i++) {
      if (
        out[i] === 0xff &&
        out[i + 1] === 0xe0 &&
        String.fromCharCode(...out.slice(i + 4, i + 9)) === "JFIF\0"
      ) {
        out[i + 11] = 1;
        out[i + 12] = 1;
        out[i + 13] = 44;
        out[i + 14] = 1;
        out[i + 15] = 44;
        return out;
      }
    }
    throw new Error(
      "A böngésző JPEG-kódolója nem adott JFIF fejlécet a 300 DPI jelöléshez.",
    );
  }
  const payload = new Uint8Array(9),
    view = new DataView(payload.buffer);
  view.setUint32(0, 11811);
  view.setUint32(4, 11811);
  payload[8] = 1;
  const chunk = new Uint8Array(21),
    cv = new DataView(chunk.buffer);
  cv.setUint32(0, 9);
  chunk.set([112, 72, 89, 115], 4);
  chunk.set(payload, 8);
  cv.setUint32(17, crc32(chunk.slice(4, 17)));
  const parts: Uint8Array[] = [bytes.slice(0, 8)];
  let i = 8,
    inserted = false;
  while (i < bytes.length) {
    const len = new DataView(bytes.buffer, bytes.byteOffset + i, 4).getUint32(
      0,
    );
    const kind = String.fromCharCode(...bytes.slice(i + 4, i + 8));
    if (kind !== "pHYs") parts.push(bytes.slice(i, i + len + 12));
    if (kind === "IHDR" && !inserted) {
      parts.push(chunk);
      inserted = true;
    }
    i += len + 12;
  }
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let off = 0;
  for (const part of parts) {
    out.set(part, off);
    off += part.length;
  }
  return out;
}
export const rasterDimensions = (width: number, height: number) => ({
  width: Math.round((width / 25.4) * 300),
  height: Math.round((height / 25.4) * 300),
});
